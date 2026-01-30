const { EncryptJWT, jwtDecrypt } = require('jose');

/**
 * JWT Encryption Utility using JOSE (JSON Object Signing and Encryption)
 * This encrypts the JWT payload so it cannot be read without the secret key
 * Uses JWE (JSON Web Encryption) to encrypt the payload
 */

/**
 * Generate an encrypted JWT token (JWE - JSON Web Encryption)
 * @param {Object} payload - Data to encrypt in the token
 * @param {string} secret - Secret key for encryption (from environment)
 * @param {string} expiresIn - Token expiration time (e.g., '7d', '1h')
 * @returns {Promise<string>} Encrypted JWT token (JWE)
 */
async function encryptToken(payload, secret, expiresIn = '7d') {
  try {
    if (!secret) {
      throw new Error('JWT_SECRET is required for encryption');
    }

    // Convert secret to Uint8Array (required by jose)
    // For encryption, we need at least 32 bytes (256 bits) for AES-256
    let secretKey = new TextEncoder().encode(secret);
    
    // Ensure secret is at least 32 bytes for AES-256-GCM
    if (secretKey.length < 32) {
      // Pad or hash the secret to 32 bytes
      const crypto = require('crypto');
      secretKey = crypto.createHash('sha256').update(secret).digest();
    }

    // Create encrypted JWT (JWE) - payload is now encrypted
    const jwt = await new EncryptJWT(payload)
      .setProtectedHeader({ 
        alg: 'dir',           // Direct key agreement
        enc: 'A256GCM'        // AES-256-GCM encryption
      })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .setIssuer('dms-backend')
      .setAudience('dms-client')
      .encrypt(secretKey);

    return jwt;
  } catch (error) {
    console.error('Error encrypting token:', error);
    throw error;
  }
}

/**
 * Decrypt and verify an encrypted JWT token (JWE)
 * @param {string} token - Encrypted JWT token (JWE)
 * @param {string} secret - Secret key for decryption (from environment)
 * @returns {Promise<Object>} Decrypted payload
 */
async function decryptToken(token, secret) {
  try {
    if (!secret) {
      throw new Error('JWT_SECRET is required for decryption');
    }

    // Convert secret to Uint8Array (required by jose)
    // Ensure secret is at least 32 bytes for AES-256-GCM
    let secretKey = new TextEncoder().encode(secret);
    
    if (secretKey.length < 32) {
      // Pad or hash the secret to 32 bytes
      const crypto = require('crypto');
      secretKey = crypto.createHash('sha256').update(secret).digest();
    }

    // Decrypt the encrypted token (JWE)
    const { payload } = await jwtDecrypt(token, secretKey, {
      issuer: 'dms-backend',
      audience: 'dms-client',
    });

    return payload;
  } catch (error) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      throw expiredError;
    }
    if (error.code === 'ERR_JWT_INVALID' || error.code === 'ERR_JWE_DECRYPTION_FAILED') {
      const invalidError = new Error('Invalid or corrupted token');
      invalidError.name = 'JsonWebTokenError';
      throw invalidError;
    }
    console.error('Error decrypting token:', error);
    throw error;
  }
}

module.exports = {
  encryptToken,
  decryptToken,
};
