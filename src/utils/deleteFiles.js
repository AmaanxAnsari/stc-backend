import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Deletes files from the uploads directory.
 * @param {string[]} filenames - Array of filenames to delete.
 * @param {string} relativeDir - (Optional) relative path to the folder, default is '../../uploads'
 */
export const deleteFiles = (filenames, relativeDir = '../../uploads') => {
  if (!Array.isArray(filenames) || filenames.length === 0) {
    console.warn('⚠️ No files to delete.');
    return;
  }

  filenames.forEach((filename) => {
    const filePath = path.join(__dirname, relativeDir, filename);

    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (!err) {
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error(`❌ Error deleting file ${filename}:`, unlinkErr);
          } else {
            console.log(`🗑️  Deleted file: ${filename}`);
          }
        });
      } else {
        console.warn(`⚠️ File not found for deletion: ${filename}`);
      }
    });
  });
};
