const prisma = require('#prisma');
const fs = require('fs');
const path = require('path');
const { LOGS_DIR } = require('../utils/upload');

class LogService {
  /**
   * Logs a document access action
   * @param {string} documentId - ID of the document
   * @param {string} action - Action performed (UPLOAD, DOWNLOAD, VIEW)
   * @param {string} userId - ID of the user performing the action
   * @returns {Promise<Object>}
   */
  async logAction(documentId, action, userId = null) {
    try {
      // 1. Log to Database
      const dbLog = await prisma.document_access_log.create({
        data: {
          document_id: documentId,
          action: action.toUpperCase(),
          user_id: userId,
          timestamp: new Date(),
        },
      });

      // 2. Log to File
      this._writeToLogFile(documentId, action, userId);

      return dbLog;
    } catch (error) {
      console.error('Logging error:', error);
      return null;
    }
  }

  /**
   * Appends a log entry to the access.log file
   * @private
   */
  _writeToLogFile(documentId, action, userId) {
    try {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ACTION: ${action.toUpperCase()} | DOC_ID: ${documentId} | USER_ID: ${userId || 'GUEST'}\n`;
      const logFilePath = path.join(LOGS_DIR, 'access.log');
      
      fs.appendFileSync(logFilePath, logMessage);
    } catch (err) {
      console.error('File logging error:', err);
    }
  }

  /**
   * Gets access logs for a specific document
   * @param {string} documentId 
   * @returns {Promise<Array>}
   */
  async getLogs(documentId) {
    return await prisma.document_access_log.findMany({
      where: { document_id: documentId },
      orderBy: { timestamp: 'desc' },
      include: {
        // user: true, // Need to ensure user relation exists if we want to include user details
      }
    });
  }
}

module.exports = new LogService();
