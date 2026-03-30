const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Centralized base directory for all DMS data
const ROOT_DIR = process.env.ROOT_DIR || 'C:/dms-data';
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');

// Ensure base directories exist
[ROOT_DIR, UPLOAD_DIR, LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      // Failed to create directory
      console.error(`Failed to create directory ${dir}:`, err);
    }
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Note: documentId and versionNumber will be used to create subdirectories
    // This logic is best handled in the service layer, but for now we provide a default
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // Secure filename generation: file_timestamp_random.ext
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const secureFilename = `file_${timestamp}_${randomHex}${ext}`;
    cb(null, secureFilename);
  },
});

// File filter for validation
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/jpg',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed.`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || 52428800), // Default to 50MB
  },
});

module.exports = {
  upload,
  UPLOAD_DIR,
  ROOT_DIR,
  LOGS_DIR,
};
