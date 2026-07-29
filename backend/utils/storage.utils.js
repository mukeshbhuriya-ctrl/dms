const path = require('path');
const fs = require('fs');

// Centralized base directory for all DMS data
const ROOT_DIR = process.env.ROOT_DIR || 'C:/dms-data';
const UPLOAD_BASE = path.join(ROOT_DIR, 'uploads');

/**
 * Utility to manage the DMS filesystem structure
 */
class StorageUtils {
    constructor() {
        this.ROOT_DIR = ROOT_DIR;
    }

    /**
     * Get the directory for a specific document revision
     * Pattern: {company_id}/{job_number}/documents/{document_number}/{version}/
     */
    getDocRevisionDir(company_id, job_number, document_number, version) {
        const dir = path.join(
            UPLOAD_BASE,
            company_id,
            this._sanitize(job_number),
            'documents',
            this._sanitize(document_number),
            version.toString()
        );
        this._ensureDir(dir);
        return dir;
    }

    /**
     * Get the directory for transmission client feedback
     * Pattern: {company_id}/transmissions/{transmission_number}/client_feedback/
     */
    getTransmissionFeedbackDir(company_id, transmission_number) {
        const dir = path.join(
            UPLOAD_BASE,
            company_id,
            'transmissions',
            this._sanitize(transmission_number),
            'client_feedback'
        );
        const feedbackDocsDir = path.join(dir, 'feedback_documents');
        this._ensureDir(feedbackDocsDir);
        return { baseDir: dir, uploadDir: feedbackDocsDir };
    }

    /**
     * Get the directory for a specific document's feedback within a transmission
     * Pattern: {company_id}/transmissions/{transmission_number}/client_feedback/{document_number}/{version}
     */
    getTransmissionDocumentFeedbackDir(company_id, transmission_number, document_number, version) {
        const dir = path.join(
            UPLOAD_BASE,
            company_id,
            'transmissions',
            this._sanitize(transmission_number),
            'client_feedback',
            this._sanitize(document_number),
            version.toString()
        );
        this._ensureDir(dir);
        return dir;
    }

    /**
     * Get the directory for a DTN target drawing revision
     * Pattern: {company_id}/DTN/{job_number}/{document_number}/{version}/
     */
    getDtnDrawingRevisionDir(company_id, job_number, document_number, version) {
        const dir = path.join(
            UPLOAD_BASE,
            company_id,
            'DTN',
            this._sanitize(job_number),
            this._sanitize(document_number),
            version.toString()
        );
        this._ensureDir(dir);
        return dir;
    }

    /**
     * Get the directory for RFQ attachments
     * Pattern: uploads/RFQ/
     */
    getRfqDir() {
        const dir = path.join(
            UPLOAD_BASE,
            'RFQ'
        );
        this._ensureDir(dir);
        return dir;
    }

    /**
     * Get the directory for DCR attachments
     * Pattern: uploads/DCR/
     */
    getDcrDir() {
        const dir = path.join(
            UPLOAD_BASE,
            'DCR'
        );
        this._ensureDir(dir);
        return dir;
    }

    /**
     * Get the directory for Maintenance Memo attachments
     * Pattern: uploads/MAINTENANCE_MEMO/
     */
    getMaintenanceMemoDir() {
        const dir = path.join(
            UPLOAD_BASE,
            'MAINTENANCE_MEMO'
        );
        this._ensureDir(dir);
        return dir;
    }

    /**
     * Get the directory for outgoing transmission packages
     */
    getTransmissionOutgoingDir(company_id, transmission_number) {
        const dir = path.join(
            UPLOAD_BASE,
            company_id,
            'transmissions',
            this._sanitize(transmission_number),
            'outgoing'
        );
        this._ensureDir(dir);
        return dir;
    }

    /**
     * Ensure a directory exists
     * @private
     */
    _ensureDir(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Sanitize folder names to avoid path issues
     * @private
     */
    _sanitize(name) {
        if (!name) return 'unknown';
        return name.toString().replace(/[/\\?%*:|"<>]/g, '-').trim();
    }

    /**
     * Helper to get relative path from UPLOAD_BASE for storing in DB
     */
    getRelativePath(fullPath) {
        return path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
    }

    /**
     * Archive a rejected file into a _rejected/ subfolder within the same version directory.
     * This preserves the rejected file for audit trail while allowing the version slot to be reused.
     * Pattern: {version_dir}/_rejected/{timestamp}_{filename}
     * @param {string} relativeFilePath - relative path stored in DB (from ROOT_DIR)
     * @returns {string|null} relative path to the archived file, or null if source not found
     */
    archiveRejectedFile(relativeFilePath) {
        if (!relativeFilePath) return null;

        const fullPath = path.join(ROOT_DIR, relativeFilePath);
        if (!fs.existsSync(fullPath)) return null;

        const dir = path.dirname(fullPath);
        const filename = path.basename(fullPath);
        const archiveDir = path.join(dir, '_rejected');
        this._ensureDir(archiveDir);

        const timestamp = Date.now();
        const archivedPath = path.join(archiveDir, `${timestamp}_${filename}`);
        fs.renameSync(fullPath, archivedPath);

        return this.getRelativePath(archivedPath);
    }
}

module.exports = new StorageUtils();
