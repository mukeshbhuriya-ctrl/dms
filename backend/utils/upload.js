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
    // Secure filename generation: file_originalName_timestamp_random.ext
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Clean original filename: remove extension, replace non-alphanumeric with underscores
    const baseName = path.basename(file.originalname, ext);
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
    
    const secureFilename = `file_${safeBaseName}_${timestamp}_${randomHex}${ext}`;
    cb(null, secureFilename);
  },
});

// File filter for validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const scriptExtensions = ['.exe', '.bat', '.cmd', '.sh', '.js', '.vbs', '.msi'];
  const mediaExtensions = ['.mp3', '.wav', '.wma', '.m4a', '.aac', '.ogg', '.flac', '.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm', '.mpeg', '.mpg'];
  
  if (scriptExtensions.includes(ext)) {
    const err = new Error(`File extension ${ext} is not allowed for security reasons.`);
    err.status = 400;
    return cb(err, false);
  }

  if (mediaExtensions.includes(ext)) {
    const err = new Error(`Audio and video files (${ext}) are not allowed in this system.`);
    err.status = 400;
    return cb(err, false);
  }
  
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || 1073741824), // Default to 1GB
  },
});

module.exports = {
  upload,
  UPLOAD_DIR,
  ROOT_DIR,
  LOGS_DIR,
};
