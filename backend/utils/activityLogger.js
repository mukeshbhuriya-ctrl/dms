const fs = require('fs');
const path = require('path');
const prisma = require('#prisma');
const ROOT_DIR = process.env.ROOT_DIR || 'C:/dms-data';
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const logFilePath = path.join(LOGS_DIR, 'activity.log');

/**
 * Middleware to log state-changing activities (POST, PUT, PATCH, DELETE).
 */
const activityLogMiddleware = (req, res, next) => {
  // Only log modifying requests
  const modifyingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (modifyingMethods.includes(req.method)) {
    // We hook into the 'finish' event to get the final status code
    res.on('finish', async () => {
      const now = new Date();

      // Format timestamp: YYYY-MM-DD HH:mm:ss
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      // Extract User Details (if available via authentication middleware)
      let name = 'System/Anonymous';
      let empid = 'Unknown';

      if (req.user) {
        const userId = req.user.userid || req.user.id || 'UnknownID';

        try {
          // Fetch human readable name and empid from database
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, empid: true }
          });
          if (dbUser) {
            name = dbUser.name;
            empid = dbUser.empid;
          }
        } catch (err) {
          console.error('Failed to fetch user details for activity log:', err);
        }
      }

      // Action and Status
      const method = req.method;
      const url = req.originalUrl || req.url;
      const status = res.statusCode;

      // Map HTTP Methods to human readable actions
      let actionWord = 'interacted with';
      if (method === 'POST') actionWord = 'created';
      else if (method === 'PUT' || method === 'PATCH') actionWord = 'updated';
      else if (method === 'DELETE') actionWord = 'deleted';

      // Extract the module name from the URL (e.g., /api/module/...)
      const pathSegments = url.split('?')[0].split('/').filter(Boolean);
      const apiIndex = pathSegments.indexOf('api');
      let moduleName = 'System';

      if (apiIndex !== -1 && pathSegments.length > apiIndex + 1) {
        moduleName = pathSegments[apiIndex + 1].toUpperCase();
      }

      // Construct the professional human-readable log sentence
      // Example: [2023-10-27 10:00:00] [Module: DCC] User John Doe (EMP-001) created a record in the DCC module [Path: /api/dcc/...] with status code 201
      const logEntry = `[${timestamp}] [Module: ${moduleName}] User ${name} (${empid}) ${actionWord} a record in the ${moduleName} module [Path: ${url}] with status code ${status}\n`;

      // Asynchronously append to the log file
      fs.appendFile(logFilePath, logEntry, (err) => {
        if (err) {
          console.error('Failed to write activity log:', err);
        }
      });
    });
  }

  next();
};

module.exports = { activityLogMiddleware };
