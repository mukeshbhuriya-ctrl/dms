const fs = require('fs');
const path = require('path');
const prisma = require('#prisma');
const { UPLOAD_DIR, ROOT_DIR } = require('../utils/upload');
const { generateFileHash } = require('../utils/hash');
const { v4: uuidv4 } = require('uuid');

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
      original_filename: file.originalname,
    };
  }

  /**
   * Processes an array of uploaded files.
   */
  async processMultipleStorage(files, targetDir) {
    const results = [];
    if (files && Array.isArray(files)) {
      for (const file of files) {
        results.push(await this.processStorage(file, targetDir));
      }
    }
    return results;
  }

  /**
   * Manages document versioning in the database.
   * Handles 3 cases:
   *   1. Pending placeholder (created at assignment) → fill it in
   *   2. Rejected version (internal correction) → overwrite same version slot
   *   3. Normal re-upload → create new incremented revision
   */
  async createNewVersion(tx, documentId, userId, filesData, remarks) {
    // filesData is an array of processed files. Extract the primary (first) file for legacy fallback fields.
    const primaryFile = filesData && filesData.length > 0 ? filesData[0] : null;
    if (!primaryFile) throw new Error('No files provided for document version');

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

    // Helper to generate file items array for Prisma creation
    const generateFileItems = (versionNo) => {
      return filesData.map(f => {
        const fileId = uuidv4();
        return {
          id: fileId,
          original_filename: f.original_filename,
          file_path: f.filePath,
          file_hash: f.fileHash,
          file_size: f.fileSize,
          mime_type: f.mimeType,
          file_url: `/api/dcc/file/${fileId}/download`,
        };
      });
    };

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
          file_path: primaryFile.filePath,
          file_hash: primaryFile.fileHash,
          file_size: primaryFile.fileSize,
          mime_type: primaryFile.mimeType,
          original_filename: primaryFile.original_filename,
          is_active: true,
          status: 'Uploaded',
          uploaded_by: userId,
          remarks: remarks || null,
          files: {
            create: generateFileItems(nextVersionNo)
          }
        },
        include: { files: true }
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

      // Mark old files from this rejected version as inactive in DB (preserving history)
      await tx.document_file.updateMany({
        where: { version_id: rejectedVersion.id },
        data: { is_active: false }
      });

      version = await tx.document_version.update({
        where: { id: rejectedVersion.id },
        data: {
          file_url: fileUrl,
          file_path: primaryFile.filePath,
          file_hash: primaryFile.fileHash,
          file_size: primaryFile.fileSize,
          mime_type: primaryFile.mimeType,
          original_filename: primaryFile.original_filename,
          is_active: true,
          status: 'Uploaded',
          uploaded_by: userId,
          remarks: remarks || null,
          files: {
            create: generateFileItems(nextVersionNo)
          }
        },
        include: { files: true }
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
          file_path: primaryFile.filePath,
          file_hash: primaryFile.fileHash,
          file_size: primaryFile.fileSize,
          mime_type: primaryFile.mimeType,
          original_filename: primaryFile.original_filename,
          is_active: true,
          remarks,
          status: 'Uploaded',
          uploaded_by: userId,
          files: {
            create: generateFileItems(nextVersionNo)
          }
        },
        include: { files: true }
      });
    }

    // Update the document's main status to Pending for Approval
    await tx.group_document.update({
      where: { id: documentId },
      data: { status: 'Pending for Approval' }
    });

    return version;
  }

  /**
   * Manages Drawing Versions natively for DTN (Drawing Transmittals)
   * Starts at version_no = 0 safely and logs the activity.
   */
  async createNewDrawingVersion(tx, documentMasterId, userId, fileData) {
    // 1. Mark all previous active versions of this drawing inactive
    await tx.drawing_version.updateMany({
      where: { document_master_id: documentMasterId, is_active: true },
      data: { is_active: false }
    });

    // 2. Identify the logical Next Version Number
    const lastVersion = await tx.drawing_version.findFirst({
      where: { document_master_id: documentMasterId },
      orderBy: { version_no: 'desc' }
    });
    
    // Starts at 0 per user instruction
    const nextVersionNo = lastVersion ? lastVersion.version_no + 1 : 0;

    // Secure custom download URL endpoint
    const fileUrl = `/api/dtn/drawing/${documentMasterId}/download?version=${nextVersionNo}`;

    // 3. Insert the new Drawing Version (using connect for relations)
    const version = await tx.drawing_version.create({
      data: {
        document:  { connect: { id: documentMasterId } },
        uploader:  { connect: { id: userId } },
        version_no: nextVersionNo,
        file_url: fileUrl,
        file_path: fileData.filePath,
        file_hash: fileData.fileHash,
        file_size: fileData.fileSize,
        mime_type: fileData.mimeType,
        is_active: true,
      }
    });

    // 4. Record to the Audit Trail
    await tx.drawing_activity.create({
      data: {
        document: { connect: { id: documentMasterId } },
        action: `Uploaded Revision ${nextVersionNo}`,
        ...(userId ? { user: { connect: { id: userId } } } : {})
      }
    });

    return version;
  }

  /**
   * Overwrites the latest active drawing version record for a document.
   * Used strictly for corrections during Edit mode.
   */
  async updateLatestDrawingVersion(tx, documentMasterId, userId, fileData) {
    // 1. Find the latest active version
    const activeVersion = await tx.drawing_version.findFirst({
      where: { document_master_id: documentMasterId, is_active: true },
      orderBy: { version_no: 'desc' }
    });

    if (!activeVersion) {
      // Fallback: if no version exists, create one (rev 0)
      return await this.createNewDrawingVersion(tx, documentMasterId, userId, fileData);
    }

    // 2. Cleanup: Physically delete the old file if it exists
    if (activeVersion.file_path) {
      try {
        const oldPath = path.join(ROOT_DIR, activeVersion.file_path);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      } catch (err) {
        console.warn(`Failed to delete old revision file: ${activeVersion.file_path}`, err);
      }
    }

    // 3. Update existing record with new file metadata
    const updated = await tx.drawing_version.update({
      where: { id: activeVersion.id },
      data: {
        file_path: fileData.filePath,
        file_hash: fileData.fileHash,
        file_size: fileData.fileSize,
        mime_type: fileData.mimeType,
        uploader: { connect: { id: userId } }
      }
    });

    // 3. Log the overwrite activity
    await tx.drawing_activity.create({
      data: {
        document: { connect: { id: documentMasterId } },
        action: `Overwrote Revision ${activeVersion.version_no}`,
        ...(userId ? { user: { connect: { id: userId } } } : {})
      }
    });

    return updated;
  }
}

module.exports = new FileService();
