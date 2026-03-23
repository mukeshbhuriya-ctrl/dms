const crypto = require('crypto');
const fs = require('fs');

/**
 * Generates SHA256 hash of a file
 * @param {string} filePath - Absolute path to the file
 * @returns {Promise<string>} - The SHA256 hash
 */
async function generateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Verifies if a file's hash matches the expected hash
 * @param {string} filePath - Absolute path to the file
 * @param {string} expectedHash - The expected SHA256 hash
 * @returns {Promise<boolean>}
 */
async function verifyFileHash(filePath, expectedHash) {
  try {
    const fileHash = await generateFileHash(filePath);
    return fileHash === expectedHash;
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
}

module.exports = {
  generateFileHash,
  verifyFileHash,
};
