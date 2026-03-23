const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const { UPLOAD_DIR, ROOT_DIR } = require('./upload');

const generatedDir = path.join(UPLOAD_DIR, 'generated');

// Ensure generated dir exists
if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
}

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
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => resolve(zipPath));
        archive.on('error', (err) => reject(err));

        archive.pipe(output);

        docs.forEach(doc => {
            const version = doc.versions && doc.versions[0];
            if (version) {
                // Use the physical path stored in the DB if available, 
                // fallback to UPLOAD_DIR + filename if not (for legacy files)
                let filePath = version.file_path;
                
                // Handle relative paths from DB (e.g. \uploads\...)
                // On Windows, \uploads... is considered absolute but lacks the drive letter (C:).
                // We must join it with ROOT_DIR unless it already contains the ROOT_DIR prefix.
                if (filePath && (!path.isAbsolute(filePath) || filePath.startsWith('\\') || filePath.startsWith('/'))) {
                    // Strip any leading slashes to prevent path.join from treating it as a drive-root path
                    const cleanRelativePart = filePath.replace(/^[\\\/]+/, '');
                    
                    // Only join if it doesn't already start with ROOT_DIR (safety check)
                    if (!filePath.toLowerCase().includes(ROOT_DIR.toLowerCase().replace(/^[\\\/]+/, ''))) {
                        filePath = path.join(ROOT_DIR, cleanRelativePart);
                    }
                }
                
                if (!filePath && version.file_url) {
                    const filename = version.file_url.split('/').pop();
                    filePath = path.join(UPLOAD_DIR, filename);
                }
                
                if (filePath && fs.existsSync(filePath)) {
                    const ext = path.extname(filePath);
                    const docName = `${doc.document.document_number}-${doc.document.document_name}${ext}`;

                    // Check for associated jobs
                    const jobs = doc.group?.job_group?.map(jg => jg.job) || [];

                    if (jobs.length > 0) {
                        // Add to each job folder
                        jobs.forEach(job => {
                            const jobFolder = job.job_number ? `JOB-${job.job_number}` : 'Unknown-Job';
                            // Structure: JobNumber/DocumentNumber-DocumentName.ext
                            const docNameInZip = `${jobFolder}/${docName}`;
                            archive.file(filePath, { name: docNameInZip });
                        });
                    } else {
                        // No job associated, place in root
                        archive.file(filePath, { name: docName });
                    }
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
    const zipPath = path.join(generatedDir, zipName);
    return fs.existsSync(zipPath) ? zipPath : null;
};

module.exports = {
    createTransmissionZip,
    getZipPath
};
