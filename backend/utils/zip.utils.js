const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const { UPLOAD_DIR, ROOT_DIR } = require('./upload');

const generatedDir = path.join(UPLOAD_DIR, 'generated');

// Ensure generated dir exists
if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
}

const sanitizeDirName = (name) => {
    return name ? name.replace(/[\\/:*?"<>|]/g, '_').trim() : '';
};

/**
 * Create a ZIP file for a transmission from a list of documents.
 * @param {string} zipName - Name of the output ZIP file (e.g., TR-123.zip)
 * @param {Array} docs - List of documents with version info
 * @returns {Promise<string>} - Resolves with the absolute path to the created ZIP file
 */
const createTransmissionZip = (zipName, docs) => {
    return new Promise((resolve, reject) => {
        const zipPath = path.join(generatedDir, zipName);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 1 } });
        
        const transmissionFolder = sanitizeDirName(zipName.replace('.zip', ''));
        const addedFiles = new Set();

        output.on('close', () => resolve(zipPath));
        archive.on('error', (err) => reject(err));

        archive.pipe(output);

        docs.forEach(doc => {
            const version = doc.versions && doc.versions[0];
            if (version) {
                // Handle both the new multi-file model and the legacy single-file fallback
                const filesToZip = (version.files && version.files.length > 0)
                    ? version.files
                    : [{ 
                        file_path: version.file_path, 
                        file_url: version.file_url,
                        original_filename: version.original_filename
                      }];

                filesToZip.forEach(fileObj => {
                    let filePath = fileObj.file_path;
                    
                    // Handle relative paths from DB (e.g. \uploads\...)
                    if (filePath && (!path.isAbsolute(filePath) || filePath.startsWith('\\') || filePath.startsWith('/'))) {
                        const cleanRelativePart = filePath.replace(/^[\\\/]+/, '');
                        if (!filePath.toLowerCase().includes(ROOT_DIR.toLowerCase().replace(/^[\\\/]+/, ''))) {
                            filePath = path.join(ROOT_DIR, cleanRelativePart);
                        }
                    }
                    
                    if (!filePath && fileObj.file_url) {
                        const filename = fileObj.file_url.split('/').pop();
                        filePath = path.join(UPLOAD_DIR, filename);
                    }
                    
                    if (filePath && fs.existsSync(filePath)) {
                        const ext = path.extname(filePath);
                        // Original Filename Zip Feature: Try to use original_filename, else fallback to system doc ID
                        let docName;
                        if (fileObj.original_filename) {
                            docName = fileObj.original_filename;
                        } else {
                            docName = `${doc.document.document_number}-${doc.document.document_name}${ext}`;
                        }

                        // Build a flat structure: [Transmission No] / [File]
                        let docPathInZip = `${transmissionFolder}/${docName}`;
                        
                        // Prevent duplicate filenames in the flat structure
                        let counter = 1;
                        while (addedFiles.has(docPathInZip)) {
                            const nameWithoutExt = path.basename(docName, ext);
                            docPathInZip = `${transmissionFolder}/${nameWithoutExt}_${counter}${ext}`;
                            counter++;
                        }
                        
                        addedFiles.add(docPathInZip);
                        archive.file(filePath, { name: docPathInZip });
                    }
                });
            }
        });

        archive.finalize();
    });
};

/**
 * Verify ZIP existence
 * @param {string} zipName - Name of the ZIP file
 * @returns {string|null} - Absolute path if exists, null otherwise
 */
const getZipPath = (zipName) => {
    const zipPath = path.join(generatedDir, zipName);
    return fs.existsSync(zipPath) ? zipPath : null;
};

module.exports = {
    createTransmissionZip,
    getZipPath
};
