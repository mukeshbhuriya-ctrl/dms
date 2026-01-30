const { decryptToken } = require('#utils/jwt-encrypt');

/**
 * Middleware to authenticate and authorize site admin
 * Verifies JWT token and checks if user type is 'siteadmin'
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function authenticateSiteAdmin(req, res, next) {
  try {
    let token = null;

    // First, try to get token from cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // If not in cookie, try Authorization header
    else {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'Authorization token is missing. Please login first.',
        });
      }

      // Check if token starts with 'Bearer '
      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid authorization format. Use: Bearer <token>',
        });
      }

      // Extract token from 'Bearer <token>'
      token = authHeader.substring(7);
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token is missing',
      });
    }

    // Get JWT secret from environment
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'JWT_SECRET is not configured',
      });
    }

    // Decrypt and verify the token
    const decoded = await decryptToken(token, JWT_SECRET);

    // Check if user role is 'siteadmin' (support both 'type' and 'role' for backward compatibility)
    const userRole = decoded.role || decoded.type;
    if (userRole !== 'siteadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Site admin privileges required',
      });
    }

    // Attach admin information to request object
    req.admin = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || decoded.type, // Use role if available, fallback to type
    };

    // Proceed to next middleware/route handler
    next();
  } catch (error) {
    // Handle token expiration
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
      });
    }

    // Handle invalid token
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or corrupted token',
      });
    }

    // Handle other errors
    console.error('Site admin authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

module.exports = {
  authenticateSiteAdmin,
};
