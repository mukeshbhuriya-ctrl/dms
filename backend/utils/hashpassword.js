const bcrypt = require('bcryptjs');

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password to hash
 * @param {number} saltRounds - Number of salt rounds (default: 10)
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password, saltRounds = 10) {
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
}

/**
 * Compare a plain password with a hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password to compare against
 * @returns {Promise<boolean>} - True if passwords match, false otherwise
 */
async function comparePassword(password, hashedPassword) {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    throw error;
  }
}

module.exports = {
  hashPassword,
  comparePassword,
};
