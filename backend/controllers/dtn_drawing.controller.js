const prisma = require('#prisma');
const fileService = require('#services/file.service.js');
const storageUtils = require('#utils/storage.utils.js');
const path = require('path');
const fs = require('fs');

/**
 * Upload a drawing revision tied to the Document Master (DTN exclusively).
 */
exports.uploadDtnDrawingRevision = async (req, res) => {
    const { document_master_id } = req.params;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    try {
        const docMaster = await prisma.document_master.findUnique({
            where: { id: document_master_id },
            select: { document_number: true, company_id: true }
        });

        if (!docMaster) {
            return res.status(404).json({ success: false, message: "Document Master not found." });
        }

        // 1. Resolve logical version context
        const lastVersion = await prisma.drawing_version.findFirst({
            where: { document_master_id },
            orderBy: { version_no: 'desc' }
        });
        
        const { mode } = req.query;
        let targetVersionNo = 0;
        
        if (mode === 'overwrite' && lastVersion) {
            targetVersionNo = lastVersion.version_no;
        } else {
            targetVersionNo = lastVersion ? lastVersion.version_no + 1 : 0;
        }

        // 2. Resolve physical folder via storage.utils.js
        // Expect job_number in query params for path resolution context
        const { job_number } = req.query;
        if (!job_number) {
            return res.status(400).json({ success: false, message: "job_number is required for directory context." });
        }

        const targetDir = storageUtils.getDtnDrawingRevisionDir(
            docMaster.company_id,
            job_number,
            docMaster.document_number,
            targetVersionNo
        );

        // 3. Move file + calculate hashes
        const fileData = await fileService.processStorage(file, targetDir);

        // 4. Update DB: version record + activity log
        const version = await prisma.$transaction(async (tx) => {
            if (mode === 'overwrite') {
                return await fileService.updateLatestDrawingVersion(
                    tx,
                    document_master_id,
                    req.user.userid,
                    fileData
                );
            } else {
                return await fileService.createNewDrawingVersion(
                    tx, 
                    document_master_id, 
                    req.user.userid, 
                    fileData
                );
            }
        });

        return res.status(200).json({ success: true, data: version, message: "Drawing revision uploaded successfully." });
    } catch (error) {
        console.error("Upload DTN Drawing Error:", error);
        return res.status(500).json({ success: false, message: "Failed to upload drawing. " + error.message });
    }
};

/**
 * Returns complete version history keyed to the Document Master.
 */
exports.getDtnDrawingHistory = async (req, res) => {
    const { document_master_id } = req.params;

    try {
        const versions = await prisma.drawing_version.findMany({
            where: { document_master_id },
            orderBy: { version_no: 'desc' },
            include: { uploader: { select: { name: true, id: true } } }
        });

        const ROOT_DIR = process.env.ROOT_DIR || 'C:/dms-data';
        
        // Enrich with physical file existence check
        const enrichedVersions = versions.map(v => {
            let exists = false;
            if (v.file_path) {
                const absPath = path.join(ROOT_DIR, v.file_path);
                exists = fs.existsSync(absPath);
            }
            return { ...v, exists };
        });

        const latestVersionRecord = enrichedVersions.find(v => v.exists) || enrichedVersions[0];
        const latestVersionNo = latestVersionRecord ? latestVersionRecord.version_no : 0;
        const hasPhysicalFile = latestVersionRecord ? latestVersionRecord.exists : false;

        return res.status(200).json({ 
            success: true, 
            data: { 
                versions: enrichedVersions, 
                latestVersionNo,
                hasPhysicalFile 
            }, 
            message: "Drawing history fetched." 
        });
    } catch (error) {
        console.error("History DTN Fetch Error:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve drawing history." });
    }
};

/**
 * Downloads a specific version tied to Document Master.
 */
exports.downloadDtnDrawingRevision = async (req, res) => {
    const { document_master_id } = req.params;
    const versionNoStr = req.query.version;

    try {
        let whereClause = { document_master_id, is_active: true };
        
        if (versionNoStr) {
            whereClause = { 
                document_master_id, 
                version_no: parseInt(versionNoStr) 
            };
        }

        const version = await prisma.drawing_version.findFirst({
            where: whereClause,
            orderBy: { version_no: 'desc' }
        });

        if (!version || !version.file_path) {
            return res.status(404).json({ success: false, message: "Revision file not found." });
        }

        const ROOT_DIR = process.env.ROOT_DIR || 'C:/dms-data';
        const absolutePath = path.join(ROOT_DIR, version.file_path);

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ success: false, message: "Physical file not found on disk." });
        }

        // Support 'preview' mode (inline) vs default 'download' mode (attachment)
        const { mode } = req.query;
        if (mode === 'preview') {
            return res.sendFile(absolutePath);
        }

        res.download(absolutePath);
    } catch (error) {
        console.error("Download Error DTN Drawing:", error);
        return res.status(500).json({ success: false, message: "Failed to download file." });
    }
};
