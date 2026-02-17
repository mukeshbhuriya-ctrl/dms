const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const uploadsDir = path.join(__dirname, '../uploads');

// Ensure uploads dir exists
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

/**
 * Create a ZIP file for a transmission from a list of documents.
 * @param {string} zipName - Name of the output ZIP file (e.g., TR-123.zip)
 * @param {Array} docs - List of documents with version info
 * @returns {Promise<string>} - Resolves with the absolute path to the created ZIP file
 */
const createTransmissionZip = (zipName, docs) => {
    return new Promise((resolve, reject) => {
        const zipPath = path.join(uploadsDir, zipName);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => resolve(zipPath));
        archive.on('error', (err) => reject(err));

        archive.pipe(output);

        docs.forEach(doc => {
            const version = doc.versions[0];
            if (version && version.file_url) {
                // version.file_url is like http://localhost:3000/uploads/filename.ext
                // We need the physical path: ../uploads/filename.ext
                const filename = version.file_url.split('/').pop();
                const filePath = path.join(uploadsDir, filename);

                if (fs.existsSync(filePath)) {
                    // Structure inside ZIP: DocumentNumber-DocumentName.ext
                    const ext = path.extname(filename);
                    const docNameInZip = `${doc.document.document_number}-${doc.document.document_name}${ext}`;
                    archive.file(filePath, { name: docNameInZip });
                }
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
    const zipPath = path.join(uploadsDir, zipName);
    return fs.existsSync(zipPath) ? zipPath : null;
};

module.exports = {
    createTransmissionZip,
    getZipPath
};
