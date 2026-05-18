import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { pipeline } from 'stream/promises';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];

/**
 * Decide whether a file is an image or a doc by extension.
 */
function classifyByExt(filePath) {
  const ext = path.extname(filePath || '').toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (DOC_EXTENSIONS.includes(ext)) return 'doc';
  return 'other';
}
/**
 * Convert absolute path to relative-to-uploads path.
 */
function toRelativePath(absPath) {
  const uploadsBase = path.join(process.cwd(), 'uploads');
  return path.relative(uploadsBase, absPath).replace(/\\/g, '/');
}

function prependSlugToFilenames(slug, filenames, base = 'optimized') {
  return filenames.map((name) => `${base}/${slug}/${name}`);
}

/**
 * Upload one or more documents into a type-specific folder.
 */
async function uploadDocuments(type, files) {
  if (!type) throw new Error('Type is required.');
  if (!Array.isArray(files)) throw new Error('Files must be an array.');

  const uploadsBase = path.join(process.cwd(), 'uploads');
  const targetFolder = path.join(uploadsBase, type);

  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  const savedPaths = [];

  for (const file of files) {
    if (!file || !file.filename) continue;

    const destPath = path.join(targetFolder, file.filename);
    fs.renameSync(file.path, destPath);

    // return relative path automatically
    savedPaths.push(toRelativePath(destPath));
  }

  return savedPaths;
}

/**
 * Optimize one or more images and delete originals.
 */
async function optimizeImage(filePaths, options = {}) {
  const { quality = 80, outputDir } = options;

  const uploadsBase = path.join(process.cwd(), 'uploads');
  const finalOutputDir = outputDir ? path.join(uploadsBase, outputDir) : null;

  const optimizedResults = [];

  const processOne = async (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath);
    const dir = path.dirname(filePath);

    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      console.log(`[optimizeImage] Skipped non-image file: ${filePath}`);
      return toRelativePath(filePath);
    }

    const optimizedDir = finalOutputDir || path.join(dir, 'optimized');
    await fsp.mkdir(optimizedDir, { recursive: true });

    const optimizedPath = path.join(optimizedDir, basename);

    const readStream = fs.createReadStream(filePath);
    const transform = sharp().toFormat(ext === '.png' ? 'png' : 'jpeg', {
      quality,
      mozjpeg: true,
    });
    const writeStream = fs.createWriteStream(optimizedPath);

    await pipeline(readStream, transform, writeStream);

    console.log(`[optimizeImage] Optimized copy saved: ${optimizedPath}`);

    // delete original
    try {
      await fsp.unlink(filePath);
      console.log(`[optimizeImage] Deleted original: ${filePath}`);
    } catch (err) {
      console.error(
        `[optimizeImage] Failed to delete original: ${filePath}`,
        err,
      );
    }

    return toRelativePath(optimizedPath);
  };

  if (Array.isArray(filePaths)) {
    for (const fp of filePaths) {
      const optimized = await processOne(fp);
      optimizedResults.push(optimized);
    }
    return optimizedResults;
  } else {
    return await processOne(filePaths);
  }
}

function extractFilePaths(multerInput) {
  // console.log("Extract Helper", multerInput);

  if (!multerInput) return {};

  const result = {};

  // Case 1: .single() => req.file
  if (multerInput.fieldname && multerInput.path) {
    result[multerInput.fieldname] = multerInput.path;
    return result;
  }

  // Case 2: .array() or .any() => req.files (array of files)
  if (Array.isArray(multerInput)) {
    for (const file of multerInput) {
      if (!file?.fieldname || !file?.path) continue;

      if (!result[file.fieldname]) {
        result[file.fieldname] = [];
      }
      result[file.fieldname].push(file.path);
    }

    // Flatten single-item arrays for convenience
    for (const key of Object.keys(result)) {
      if (result[key].length === 1) {
        result[key] = result[key][0];
      }
    }

    return result;
  }

  // Case 3: .fields() => req.files (object of arrays)
  if (typeof multerInput === 'object') {
    for (const [fieldName, files] of Object.entries(multerInput)) {
      if (!Array.isArray(files)) continue;

      if (files.length === 1) {
        result[fieldName] = files[0].path;
      } else if (files.length > 1) {
        result[fieldName] = files.map((f) => f.path);
      }
    }

    return result;
  }

  return {};
}

/**
 * Delete file with retries.
 */
async function deleteFile(filePath, retries = 5, delayMs = 200) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await fsp.unlink(filePath);
      console.log(`[deleteFile] Deleted: ${filePath}`);
      return;
    } catch (err) {
      if (err.code === 'EPERM' && attempt < retries) {
        console.warn(
          `[deleteFile] EPERM on attempt ${attempt}, retrying in ${delayMs}ms…`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error(`[deleteFile] Failed to delete: ${filePath}`, err);
        throw err;
      }
    }
  }
}

/**
 * Validate file type.
 */
function validateFileType(file, allowedTypes) {
  if (!file?.mimetype) return false;
  return allowedTypes.includes(file.mimetype);
}

async function mergeUploadedFiles({
  oldValue,
  newUploaded,
  filesToReplace = [],
  outputDir = 'optimized',
}) {
  const uploadsBase = path.join(process.cwd(), `uploads`);

  // Normalize oldValue
  const oldArray = Array.isArray(oldValue)
    ? [...oldValue]
    : oldValue
      ? [oldValue]
      : [];

  // Normalize newUploaded
  const newFilesArray = Array.isArray(newUploaded)
    ? newUploaded
    : newUploaded
      ? [newUploaded]
      : [];

  // Optimize new uploaded files
  const optimizedNewFiles =
    newFilesArray.length > 0
      ? await optimizeImage(newFilesArray, { outputDir })
      : [];

  // Delete specified old files
  const updatedOldArray = oldArray.filter((f) => {
    if (filesToReplace.includes(f)) {
      const fullPath = path.join(uploadsBase, f); // f already includes folder usually
      deleteFile(fullPath).catch(console.error);
      return false;
    }
    return true;
  });

  // If single file field:
  if (!Array.isArray(oldValue)) {
    if (optimizedNewFiles.length > 0) {
      // Delete old single file
      if (oldValue) {
        const fullPath = path.join(uploadsBase, oldValue); // ensure full path
        await deleteFile(fullPath).catch(console.error);
      }
      return optimizedNewFiles[0]; // return single optimized path
    } else {
      return oldValue;
    }
  }

  // If array field:
  return [...updatedOldArray, ...optimizedNewFiles];
}

async function mapFilesToSections(
  req,
  { sectionFieldName = 'sections', fileFieldName = 'file', outputDir },
) {
  if (!outputDir) {
    throw new Error('outputDir is required');
  }

  let parsedSections = [];
  try {
    parsedSections = JSON.parse(req.body[sectionFieldName] || '[]');
  } catch (err) {
    throw new Error(`Invalid ${sectionFieldName} JSON`);
  }
  console.log("Parsed Sections",parsedSections)

  const filesByField = {};
  const fileArray = Array.isArray(req.files)
    ? req.files
    : Object.values(req.files || {}).flat();

  fileArray.forEach((file) => {
    if (!filesByField[file.fieldname]) {
      filesByField[file.fieldname] = [];
    }
    filesByField[file.fieldname].push(file.path);
  });

  const finalSections = [];

  for (let index = 0; index < parsedSections.length; index++) {
    const section = parsedSections[index];
    console.log('Section', section);
    const sectionFiles =
      filesByField[`${sectionFieldName}[${index}][${fileFieldName}]`] || [];

    let updatedFile = section[fileFieldName] || null;
    console.log('UpdatedFiles', updatedFile);

    if (sectionFiles.length > 0) {
      const newFilePath = sectionFiles[0];
      console.log('New uploaded file:', newFilePath);

      // 🔥 Delete previous file if it existed
      if (section[fileFieldName]) {
        const prevRelative = section[fileFieldName].split('/').join(path.sep);
        const prevAbsolutePath = path.resolve(
          process.cwd(),
          'uploads',
          prevRelative,
        );

        console.log('Resolved previous file for deletion:', prevAbsolutePath);

        try {
          await deleteFile(prevAbsolutePath);
          console.log(`Deleted old file: ${prevAbsolutePath}`);
        } catch (err) {
          console.warn(
            `Could not delete old file: ${prevAbsolutePath}`,
            err.message,
          );
        }
      }

      const optimized = await optimizeImage(newFilePath, { outputDir });
      updatedFile = optimized;
    }

    finalSections.push({
      ...section,
      [fileFieldName]: updatedFile,
    });
  }

  return finalSections;
}

export const processFiles = async (filesByField, fileLocation) => {
  const processedFiles = {};

  for (const [field, filePaths] of Object.entries(filesByField)) {
    // Normalize to array
    const pathsArray = Array.isArray(filePaths) ? filePaths : [filePaths];
    if (!pathsArray.length) continue;

    const optimizedOrUploaded = [];

    for (const filePath of pathsArray) {
      const ext = path.extname(filePath).toLowerCase();

      if (IMAGE_EXTENSIONS.includes(ext)) {
        // Pass single file path to optimizeImage (it accepts array or string)
        const optimized = await optimizeImage(filePath, {
          outputDir: fileLocation,
        });
        optimizedOrUploaded.push(optimized);
      } else if (DOC_EXTENSIONS.includes(ext)) {
        // uploadDocuments expects array of files with filename property (multer output)
        const fileObj = { path: filePath, filename: path.basename(filePath) };
        const uploaded = await uploadDocuments(fileLocation, [fileObj]);
        optimizedOrUploaded.push(uploaded[0]);
      } else {
        console.warn(
          `[processFiles] Unsupported file type for field ${field}: ${ext}`,
        );
      }
    }

    // Flatten if single file, else keep array
    processedFiles[field] =
      pathsArray.length === 1 ? optimizedOrUploaded[0] : optimizedOrUploaded;
  }

  return processedFiles;
};


/**
 * Update file fields inside a target section object.
 * - oldSection: current section data from DB
 * - filesByField: from extractFilePaths(req.files) or equivalent
 * - fieldsMap: list of field names in this section that are files (string or array)
 * - outputDir: uploads subdir like 'role/slug' to store new optimized files
 *
 * Behavior:
 * - For single file field: if new upload exists, optimize/upload and delete old file.
 * - For array file field: merge; if replacing exact old items, remove those; append new items.
 *   To remove a specific old item, pass a "filesToReplace" array in payload for that field.
 *   Example payload: { gstDocument: existingPathOrArray, gstDocument_filesToReplace: [old1, old2] }
 */
export async function updateProcessedFiles({
  oldSection,
  filesByField,
  fieldsMap,
  outputDir,
  payloadForReplaceHints = {},
}) {
  const updatedSection = { ...(oldSection || {}) };

  // For each known file field, check if new uploads came for that exact field name
  for (const field of fieldsMap) {
    const uploaded = filesByField[field]; // could be string or array of tmp paths
    if (!uploaded) continue;

    // Normalize new uploads to array of paths
    const newUploads = Array.isArray(uploaded) ? uploaded : [uploaded];

    // Decide per-file handling using optimizeImage or uploadDocuments, based on extension
    const processedNew = [];
    for (const tmpPath of newUploads) {
      const kind = classifyByExt(tmpPath);
      if (kind === 'image') {
        const optimized = await optimizeImage(tmpPath, { outputDir }); // returns relative path
        processedNew.push(optimized);
      } else if (kind === 'doc') {
        const fileObj = { path: tmpPath, filename: path.basename(tmpPath) };
        const uploadedDocs = await uploadDocuments(outputDir, [fileObj]); // array of relative paths
        processedNew.push(uploadedDocs[0]);
      } else {
        // Skip unsupported extensions silently
      }
    }

    // Handle single vs array shape based on existing value type
    const oldValue = updatedSection[field];
    const filesToReplace = payloadForReplaceHints?.[`${field}_filesToReplace`] || [];

    if (Array.isArray(oldValue)) {
      // Remove any specified old items and append new ones
      const kept = oldValue.filter((p) => !filesToReplace.includes(p));
      // delete removed ones on disk
      for (const removed of oldValue) {
        if (filesToReplace.includes(removed)) {
          const absolute = path.join(process.cwd(), 'uploads', removed);
          await deleteFile(absolute).catch(() => {});
        }
      }
      updatedSection[field] = [...kept, ...processedNew];
    } else {
      // single file field
      // If new is provided, delete old single, set single new
      if (processedNew.length > 0) {
        if (oldValue) {
          const absolute = path.join(process.cwd(), 'uploads', oldValue);
          await deleteFile(absolute).catch(() => {});
        }
        // If multiple uploaded for a single field, pick first for single-valued semantics
        updatedSection[field] = processedNew[0];
      }
    }
  }

  return updatedSection;
}


  /**
   * 🔹 Safely deletes a single file if it exists
   * @param {string} filePath - Absolute or relative path to file
   */
 export async function deleteFileIfExists(filePath) {
    try {
      if (!filePath) return;

      const fullPath = path.resolve(filePath);

      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        console.log(`🗑️ Deleted file: ${fullPath}`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to delete file: ${filePath}`, err.message);
    }
  }

  /**
   * 🔹 Safely deletes multiple files if they exist
   * @param {string[]} filePaths - Array of file paths
   */
  export async function deleteFilesIfExist(filePaths = []) {
    if (!Array.isArray(filePaths)) return;

    for (const file of filePaths) {
      await this.deleteFileIfExists(file);
    }
}
  
// utils/uploadHelper.js (add this new method)

export const syncUploadedFiles = async ({
  oldFiles,
  newFiles,
  uploadedFiles,
  outputDir,
}) => {
  try {
    const oldArray = Array.isArray(oldFiles) ? oldFiles : oldFiles ? [oldFiles] : [];
    const newArray = Array.isArray(newFiles) ? newFiles : newFiles ? [newFiles] : [];
    const uploadedArray = Array.isArray(uploadedFiles) ? uploadedFiles : uploadedFiles ? [uploadedFiles] : [];

    // ✅ 1. Keep only files still present in frontend request
    const retainedFiles = oldArray.filter((file) => newArray.includes(file));

    // ✅ 2. Detect removed files (present before, but not now)
    const removedFiles = oldArray.filter((file) => !newArray.includes(file));

    // ✅ 3. Add any new uploaded images
    const addedFiles = uploadedArray.length > 0 ? uploadedArray : [];

    // ✅ 4. Merge: old kept + new added
    const finalFiles = [...retainedFiles, ...addedFiles];

    // Optional cleanup of removed files
    if (removedFiles.length > 0) {
      await Promise.all(
        removedFiles.map(async (filePath) => {
          try {
            await uploadHelper.deleteFile(filePath);
          } catch (err) {
            console.warn('Failed to delete old file:', filePath, err.message);
          }
        }),
      );
    }

    return finalFiles;
  } catch (error) {
    console.error('syncUploadedFiles error:', error);
    return oldFiles || [];
  }
};
// In uploadHelper.js
export const saveBase64Image = async (base64String, outputDir, filename) => {
  try {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const fullDir = path.join('uploads', outputDir);
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }

    const filePath = path.join(fullDir, `${filename}.png`);
    fs.writeFileSync(filePath, buffer);

    return path.join(outputDir, `${filename}.png`).replace(/\\/g, '/');
  } catch (error) {
    console.error('Save base64 image error:', error);
    throw error;
  }
};



export default {
  uploadDocuments,
  optimizeImage,
  deleteFile,
  validateFileType,
  extractFilePaths,
  mergeUploadedFiles,
  prependSlugToFilenames,
  mapFilesToSections,
  processFiles,
  updateProcessedFiles,
  deleteFileIfExists,
  deleteFilesIfExist,
  syncUploadedFiles,
  saveBase64Image,
};
