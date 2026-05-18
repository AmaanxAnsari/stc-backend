import fs from 'fs/promises';
import path from 'path';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

/**
 * Recursively collects all file paths (strings) from an object/array
 * Avoids circular references and handles Mongoose Documents
 */
function collectFilePaths(obj, visited = new WeakSet()) {
  const paths = [];

  const traverse = (value) => {
    if (!value) return;

    // Handle Mongoose docs
    if (typeof value.toObject === 'function') {
      value = value.toObject();
    }

    // Only track objects in WeakSet
    if (typeof value === 'object' && value !== null) {
      if (visited.has(value)) return;
      visited.add(value);
    }

    if (typeof value === 'string') {
      // Check if looks like an uploaded file
      if (
        value.includes('/uploads/') ||
        value.match(/\.(jpg|jpeg|png|webp|gif|pdf|doc|docx|xls|xlsx)$/i)
      ) {
        paths.push(value.replace(/\\/g, '/'));
      }
    } else if (Array.isArray(value)) {
      value.forEach(traverse);
    } else if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach(traverse);
    }
  };

  traverse(obj);
  return paths;
}

/**
 * Recursively get all files in a folder and subfolders
 */
async function getAllFiles(dirPath) {
  let results = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue; // ignore hidden files
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = await getAllFiles(fullPath);
      results = results.concat(nestedFiles);
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Deletes a file safely
 */
async function safeDeleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    console.log(`🧹 Deleted unused file: ${filePath}`);
  } catch (err) {
    console.warn(`❌ Failed to delete file: ${filePath}`, err.message);
  }
}

/**
 * Auto Folder Cleaner
 * @param {string} slug - slug stored in DB (e.g., products/lavender-soap-xxxx)
 * @param {Object} dbDoc - document from DB to check against
 */
export async function autoFolderCleaner(slug, dbDoc) {
  try {
    if (!slug) return;

    const folderPath = path.join(UPLOADS_ROOT, slug);

    // Ensure folder exists
    try {
      const stat = await fs.stat(folderPath);
      if (!stat.isDirectory()) return;
    } catch {
      return;
    }

    // Collect all file paths referenced in DB
    const referencedFiles = new Set(collectFilePaths(dbDoc));

    // Get all files physically present
    const allFiles = await getAllFiles(folderPath);

    for (const filePath of allFiles) {
      const fileName = path.basename(filePath);

      // Keep file if any referenced path ends with the same filename
      const isReferenced = Array.from(referencedFiles).some((ref) =>
        ref.endsWith(fileName),
      );

      if (!isReferenced) {
        await safeDeleteFile(filePath);
      }
    }
  } catch (err) {
    console.error('❌ autoFolderCleaner error:', err);
  }
}

export default {
  autoFolderCleaner,
  collectFilePaths,
};
