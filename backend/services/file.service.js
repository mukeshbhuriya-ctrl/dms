const fs = require('fs');
const path = require('path');
const prisma = require('#prisma');
const { UPLOAD_DIR, ROOT_DIR } = require('../utils/upload');
const { generateFileHash } = require('../utils/hash');

class FileService {
  /**
   * Processes an uploaded file and stores it in a specified directory
   * @param {Object} file - The file object from multer
   * @param {string} targetDir - The absolute path to the target directory
   * @returns {Promise<Object>} - Metadata including path, hash, and size
   */
  async processStorage(file, targetDir) {
    // Ensure directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const newPath = path.join(targetDir, file.filename);
    const oldPath = file.path;

    // Move file to structured directory
    fs.renameSync(oldPath, newPath);

    // Calculate metadata
    const stats = fs.statSync(newPath);
    const hash = await generateFileHash(newPath);

    // Store relative path (calculated from ROOT_DIR)
    const relativePath = path.sep + path.relative(ROOT_DIR, newPath);

    return {
      filePath: relativePath,
      fileSize: stats.size,
      fileHash: hash,
      mimeType: file.mimetype,
      filename: file.filename,
    };
  }

  /**
   * Manages document versioning in the database
   */
  async createNewVersion(tx, documentId, userId, fileData, remarks) {
    // 1. Fetch master document ID
    const groupDoc = await tx.group_document.findUnique({
      where: { id: documentId },
      select: { document_id: true }
    });

    if (!groupDoc) throw new Error('Document assignment not found');
    const masterDocId = groupDoc.document_id;

    // 2. Mark ALL previous versions of this Master Document as inactive across all tasks
    await tx.document_version.updateMany({
      where: { 
        group_document: { document_id: masterDocId },
        is_active: true 
      },
      data: { is_active: false },
    });

    // 3. Fetch latest version number to increment globally
    const lastVersion = await tx.document_version.findFirst({
      where: { 
        group_document: { document_id: masterDocId }
      },
      orderBy: { version_no: 'desc' },
    });
    const nextVersionNo = lastVersion ? lastVersion.version_no + 1 : 0;

    // 3. Create new document version
    // Use the relative secure download API path
    const fileUrl = `/api/dcc/document/${documentId}/download?version=${nextVersionNo}`;

    const version = await tx.document_version.create({
      data: {
        group_document_id: documentId,
        version_no: nextVersionNo,
        file_url: fileUrl,
        file_path: fileData.filePath,
        file_hash: fileData.fileHash,
        file_size: fileData.fileSize,
        mime_type: fileData.mimeType,
        is_active: true,
        remarks,
        status: 'Uploaded',
        uploaded_by: userId,
      },
    });

    // 4. Update the document's main status
    await tx.group_document.update({
      where: { id: documentId },
      data: { status: 'Pending for Approval' },
    });

    return version;
  }
}

module.exports = new FileService();
