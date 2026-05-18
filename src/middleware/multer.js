// middleware/upload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type!'), false);
  }
};

/* -------------------------- DISK STORAGE -------------------------- */
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads');

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
  // filename: (req, file, cb) => {
  //   const timestamp = Date.now();
  //   const ext = path.extname(file.originalname);
  //   const base = path.basename(file.originalname, ext).replace(/\s+/g, '-');
  //   cb(null, `${base}-${timestamp*5}${ext}`);
  // },
});

/* -------------------------- MEMORY STORAGE -------------------------- */
const memoryStorage = multer.memoryStorage();

/* -------------------------- UPLOAD INSTANCES -------------------------- */
// Disk storage upload (for saving files to disk)
export const uploadDisk = multer({
  storage: diskStorage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// Memory storage upload (for saving files to database as Buffer)
export const uploadMemory = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});
 
/* -------------------------- PARSE NESTED FORM DATA -------------------------- */
export const parseNestedFormData = (storageType = 'disk') => {
  return (req, res, next) => {
    try {
      const parsed = {};

      // Recursive function to set nested value
      const setNestedValue = (obj, keys, value) => {
        const key = keys[0];

        if (keys.length === 1) {
          obj[key] = value;
          return;
        }

        const nextKey = keys[1];

        // Check if next key is array index
        if (!isNaN(nextKey)) {
          if (!obj[key]) obj[key] = [];
          if (!obj[key][nextKey]) obj[key][nextKey] = {};
          setNestedValue(obj[key][nextKey], keys.slice(2), value);
        } else {
          if (!obj[key]) obj[key] = {};
          setNestedValue(obj[key], keys.slice(1), value);
        }
      };

      // Parse form fields
      for (const [key, value] of Object.entries(req.body)) {
        const keys = key.split(/[\[\]]+/).filter(Boolean);
        setNestedValue(parsed, keys, value);
      }

      // Handle files based on storage type
      if (req.files) {
        let filesArray = [];

        // Normalize files to array format
        if (Array.isArray(req.files)) {
          filesArray = req.files;
        } else if (typeof req.files === 'object') {
          // Convert fields object to array
          filesArray = Object.values(req.files).flat();
        }

        // Process each file
        filesArray.forEach((file) => {
          const keys = file.fieldname.split(/[\[\]]+/).filter(Boolean);

          if (storageType === 'memory') {
            // For memory storage, store file data for DB
            const fileData = {
              data: file.buffer,
              contentType: file.mimetype,
              fileName: file.originalname,
              size: file.size,
            };
            setNestedValue(parsed, keys, fileData);
          } else {
            // For disk storage, store file path
            setNestedValue(parsed, keys, file.path);
          }
        });
      }

      // Handle single file upload
      if (req.file) {
        const keys = req.file.fieldname.split(/[\[\]]+/).filter(Boolean);

        if (storageType === 'memory') {
          const fileData = {
            data: req.file.buffer,
            contentType: req.file.mimetype,
            fileName: req.file.originalname,
            size: req.file.size,
          };
          setNestedValue(parsed, keys, fileData);
        } else {
          setNestedValue(parsed, keys, req.file.path);
        }
      }

      req.body = parsed;
      console.log('Parsed Request Body:', JSON.stringify(parsed, null, 2));
      next();
    } catch (error) {
      console.error('Error parsing form data:', error);
      return res.status(400).json({
        success: false,
        message: 'Error parsing form data',
        error: error.message,
      });
    }
  };
};

/* -------------------------- ERROR HANDLING -------------------------- */
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 100MB.',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Unknown upload error',
    });
  }
  next();
};

/* -------------------------- UTILITY FUNCTIONS -------------------------- */
// Convert file buffer to base64 (useful for API responses)
export const bufferToBase64 = (buffer) => {
  return buffer.toString('base64');
};

// Convert base64 to buffer (useful for saving to DB)
export const base64ToBuffer = (base64String) => {
  return Buffer.from(base64String, 'base64');
};

// export default { uploadDisk, uploadMemory };

// import multer from 'multer';
// import path from 'path';

// const allowedMimeTypes = [
//   'image/jpeg',
//   'image/jpg',
//   'image/png',
//   'image/gif',
//   'image/svg+xml',
//   'application/pdf',
//   'application/vnd.ms-excel',
//   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//   'text/csv',
//   'video/mp4',
//   'video/quicktime',
//   'video/x-msvideo',
//   'video/x-matroska',
// ];

// const fileFilter = (req, file, cb) => {
//   if (allowedMimeTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error('Invalid file type!'), false);
//   }
// };

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, path.join(process.cwd(), 'uploads'));
//   },
//   filename: (req, file, cb) => {
//     const timestamp = Date.now();
//     const ext = path.extname(file.originalname);
//     const base = path.basename(file.originalname, ext).replace(/\s+/g, '-');
//     cb(null, `${base}-${timestamp}${ext}`);
//   },
// });

// // Multer upload instance
// const upload = multer({
//   storage,
//   limits: { fileSize: 100 * 1024 * 1024 },
// });

// export default upload;
