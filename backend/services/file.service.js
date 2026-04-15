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
   * Manages document versioning in the database.
   * Handles 3 cases:
   *   1. Pending placeholder (created at assignment) → fill it in
   *   2. Rejected version (internal correction) → overwrite same version slot
   *   3. Normal re-upload → create new incremented revision
   */
  async createNewVersion(tx, documentId, userId, fileData, remarks) {
    // 1. Fetch master document ID
    const groupDoc = await tx.group_document.findUnique({
      where: { id: documentId },
      select: { document_id: true }
    });

    if (!groupDoc) throw new Error('Document assignment not found');
    const masterDocId = groupDoc.document_id;

    // ── Determine which case applies ──────────────────────────────

    // Case 1: Pending placeholder created at assignment time
    const pendingPlaceholder = await tx.document_version.findFirst({
      where: { group_document_id: documentId, status: 'Pending' },
      orderBy: { version_no: 'asc' }
    });

    // Case 2: Last version was internally rejected — overwrite same slot
    const rejectedVersion = !pendingPlaceholder
      ? await tx.document_version.findFirst({
          where: { group_document_id: documentId, status: 'Rejected' },
          orderBy: { version_no: 'desc' }
        })
      : null;

    let version;
    let nextVersionNo;

    if (pendingPlaceholder) {
      // ── Case 1: Fill in the assignment placeholder ─────────────
      nextVersionNo = pendingPlaceholder.version_no;
      const fileUrl = `/api/dcc/document/${documentId}/download?version=${nextVersionNo}`;

      // Mark all previous active versions inactive
      await tx.document_version.updateMany({
        where: { group_document: { document_id: masterDocId }, is_active: true },
        data: { is_active: false }
      });

      version = await tx.document_version.update({
        where: { id: pendingPlaceholder.id },
        data: {
          file_url: fileUrl,
          file_path: fileData.filePath,
          file_hash: fileData.fileHash,
          file_size: fileData.fileSize,
          mime_type: fileData.mimeType,
          is_active: true,
          status: 'Uploaded',
          uploaded_by: userId,
          remarks: remarks || null,
        }
      });

    } else if (rejectedVersion) {
      // ── Case 2: Overwrite rejected version (internal correction) ─
      nextVersionNo = rejectedVersion.version_no;
      const fileUrl = `/api/dcc/document/${documentId}/download?version=${nextVersionNo}`;

      // Mark all previous active versions inactive
      await tx.document_version.updateMany({
        where: { group_document: { document_id: masterDocId }, is_active: true },
        data: { is_active: false }
      });

      version = await tx.document_version.update({
        where: { id: rejectedVersion.id },
        data: {
          file_url: fileUrl,
          file_path: fileData.filePath,
          file_hash: fileData.fileHash,
          file_size: fileData.fileSize,
          mime_type: fileData.mimeType,
          is_active: true,
          status: 'Uploaded',
          uploaded_by: userId,
          remarks: remarks || null,
        }
      });

    } else {
      // ── Case 3: Normal new revision (increment version number)───
      // Mark all previous active versions of this master document inactive
      await tx.document_version.updateMany({
        where: {
          group_document: { document_id: masterDocId },
          is_active: true
        },
        data: { is_active: false }
      });

      // Get the highest version number globally for this master document
      const lastVersion = await tx.document_version.findFirst({
        where: { group_document: { document_id: masterDocId } },
        orderBy: { version_no: 'desc' }
      });
      nextVersionNo = lastVersion ? lastVersion.version_no + 1 : 0;

      const fileUrl = `/api/dcc/document/${documentId}/download?version=${nextVersionNo}`;

      version = await tx.document_version.create({
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
        }
      });
    }

    // Update the document's main status to Pending for Approval
    await tx.group_document.update({
      where: { id: documentId },
      data: { status: 'Pending for Approval' }
    });

    return version;
  }
}

module.exports = new FileService();
