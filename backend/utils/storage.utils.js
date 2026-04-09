const path = require('path');
const fs = require('fs');

// Centralized base directory for all DMS data
const ROOT_DIR = process.env.ROOT_DIR || 'C:/dms-data';
const UPLOAD_BASE = path.join(ROOT_DIR, 'uploads');

/**
 * Utility to manage the DMS filesystem structure
 */
class StorageUtils {
    /**
     * Get the directory for a specific document revision
     * Pattern: {company_id}/{job_number}/documents/{document_number}/rev_{version}/
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
     * Pattern: {company_id}/transmissions/{transmission_number}/client_feedback/{document_number}/rev_{version}
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
}

module.exports = new StorageUtils();
