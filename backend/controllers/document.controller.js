const prisma = require('#prisma');
const fs = require('fs');
const path = require('path');
const { verifyFileHash } = require('../utils/hash');
const logService = require('../services/log.service');
const { UPLOAD_DIR, ROOT_DIR } = require('../utils/upload');

class DocumentController {
    /**
     * Download a document version
     */
    async downloadDocument(req, res) {
        try {
            const { documentId } = req.params;
            const { version: versionNo } = req.query;
            const userId = req.user.userid || req.user.id;
            const userRoles = req.user.role || [];
            const isAdminOrDcc = userRoles.includes('ADMIN') || userRoles.includes('DCC');

            // Find the document to check assignment
            const document = await prisma.group_document.findUnique({
                where: { id: documentId }
            });

            if (!document) {
                return res.status(404).json({ success: false, message: 'Document not found' });
            }

            // Check permission: Admin/DCC can access any, others only if assigned
            if (!isAdminOrDcc && document.user_id !== userId) {
                return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this document' });
            }

            let version;
            if (versionNo) {
                // 1. Find specific version globally for this master document
                version = await prisma.document_version.findFirst({
                    where: { 
                        group_document: { document_id: document.document_id },
                        version_no: parseInt(versionNo) 
                    }
                });
            } else {
                // 2. Try to find the latest version for THIS specific task (assignment)
                version = await prisma.document_version.findFirst({
                    where: { group_document_id: documentId },
                    orderBy: { version_no: 'desc' }
                });

                // 3. Fallback: If this task has no uploads (new re-entry), find the global active version
                if (!version) {
                    version = await prisma.document_version.findFirst({
                        where: { 
                            group_document: { document_id: document.document_id },
                            is_active: true 
                        }
                    });
                }
                
                // 4. Final Fallback: Latest global version regardless of active flag
                if (!version) {
                    version = await prisma.document_version.findFirst({
                        where: { group_document: { document_id: document.document_id } },
                        orderBy: { version_no: 'desc' }
                    });
                }
            }

            if (!version) {
                return res.status(404).json({ success: false, message: 'Document version not found' });
            }

            // Reconstruct absolute path from relative file_path
            const absolutePath = path.join(ROOT_DIR, version.file_path);

            if (!fs.existsSync(absolutePath)) {
                return res.status(404).json({ success: false, message: 'File not found on server' });
            }

            // Verify integrity (optional but requested)
            const isValid = await verifyFileHash(absolutePath, version.file_hash);
            if (!isValid) {
                return res.status(500).json({ success: false, message: 'File integrity check failed' });
            }

            // Log access
            await logService.logAction(documentId, 'DOWNLOAD', userId);

            // Send file
            res.download(absolutePath, path.basename(absolutePath));
        } catch (error) {
            console.error('Download error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * List all versions for a document
     */
    async getVersionList(req, res) {
        try {
            const { documentId } = req.params;
            const userId = req.user.userid || req.user.id;
            const userRoles = req.user.role || [];
            const isAdminOrDcc = userRoles.includes('ADMIN') || userRoles.includes('DCC');

            const document = await prisma.group_document.findUnique({
                where: { id: documentId }
            });

            if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

            if (!isAdminOrDcc && document.user_id !== userId) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            const expandedVersions = versions.map(v => {
                if (v.file_url && v.file_url.startsWith('/') && !v.file_url.startsWith('http')) {
                    return { ...v, file_url: `${backendUrl}${v.file_url}` };
                }
                return v;
            });

            res.status(200).json({ success: true, data: expandedVersions });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Get details of a specific version
     */
    async getSpecificVersion(req, res) {
        try {
            const { documentId, versionNumber } = req.params;
            const userId = req.user.userid || req.user.id;
            const userRoles = req.user.role || [];
            const isAdminOrDcc = userRoles.includes('ADMIN') || userRoles.includes('DCC');

            const document = await prisma.group_document.findUnique({
                where: { id: documentId }
            });

            if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

            if (!isAdminOrDcc && document.user_id !== userId) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const version = await prisma.document_version.findFirst({
                where: { group_document_id: documentId, version_no: parseInt(versionNumber) },
                include: { uploader: { select: { name: true } } }
            });
            if (!version) return res.status(404).json({ success: false, message: 'Version not found' });
            
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            if (version.file_url && version.file_url.startsWith('/') && !version.file_url.startsWith('http')) {
                version.file_url = `${backendUrl}${version.file_url}`;
            }

            res.status(200).json({ success: true, data: version });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Rollback to a specific version
     */
    async rollbackVersion(req, res) {
        try {
            const { documentId } = req.params;
            const { versionNumber } = req.body;
            const userId = req.user.userid || req.user.id;

            if (!versionNumber) return res.status(400).json({ success: false, message: 'Version number is required' });

            const targetVersion = await prisma.document_version.findFirst({
                where: { group_document_id: documentId, version_no: parseInt(versionNumber) }
            });

            if (!targetVersion) return res.status(404).json({ success: false, message: 'Target version not found' });

            await prisma.$transaction(async (tx) => {
                // Mark all as inactive
                await tx.document_version.updateMany({
                    where: { group_document_id: documentId, is_active: true },
                    data: { is_active: false }
                });

                // Mark target as active
                await tx.document_version.update({
                    where: { id: targetVersion.id },
                    data: { is_active: true }
                });
            });

            await logService.logAction(documentId, 'ROLLBACK', userId);

            res.status(200).json({ success: true, message: `Rolled back to version ${versionNumber}` });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * General file download within /uploads directory
     */
    async downloadFile(req, res) {
        try {
            const { filename } = req.params;
            const safeFilename = path.basename(filename || "");
            const filePath = path.join(UPLOAD_DIR, safeFilename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ success: false, message: 'File not found on server' });
            }

            res.sendFile(path.resolve(filePath));
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new DocumentController();
