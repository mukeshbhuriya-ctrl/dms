const { decryptToken } = require('#utils/jwt-encrypt');

/**
 * Middleware factory to authenticate user and check for required roles
 * @param {string|string[]} requiredRoles - Single role name or array of role names to check
 * @param {Object} options - Options for role checking
 * @param {boolean} options.requireAll - If true, user must have ALL roles. If false (default), user needs ANY one role
 * @returns {Function} Express middleware function
 */
function authenticateUser(requiredRoles, options = {}) {
  const { requireAll = false } = options;

  return async function (req, res, next) {
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

      // Extract user roles from token (should be an array)
      // Extract user roles from token (should be an array)
      const userRoles = Array.isArray(decoded.role) ? decoded.role : (decoded.role ? [decoded.role] : []);

      // Normalize required roles to array
      const rolesToCheck = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

      // Check if user has required role(s)
      let hasRequiredRole = false;

      if (requireAll) {
        // User must have ALL required roles
        hasRequiredRole = rolesToCheck.every((role) => userRoles.includes(role));
      } else {
        // User needs ANY one of the required roles
        hasRequiredRole = rolesToCheck.some((role) => userRoles.includes(role));
      }

      if (!hasRequiredRole) {
        const roleText = requireAll
          ? `all of the following roles: ${rolesToCheck.join(', ')}`
          : `one of the following roles: ${rolesToCheck.join(', ')}`;

        return res.status(403).json({
          success: false,
          message: `Access denied. You must have ${roleText}`,
        });
      }

      // Attach user information to request object
      req.user = {
        userid: decoded.userid || decoded.id, // Handle both userid and id for robustness
        company_id: decoded.company_id,
        role: userRoles, // Array of user's roles
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
      console.error('User authentication error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };
}

/**
 * Middleware to authenticate user without role checking (just verify token)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function authenticateUserOnly(req, res, next) {
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

      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid authorization format. Use: Bearer <token>',
        });
      }

      token = authHeader.substring(7);
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token is missing',
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'JWT_SECRET is not configured',
      });
    }

    // Decrypt and verify the token
    const decoded = await decryptToken(token, JWT_SECRET);

    // Attach user information to request object
    req.user = {
      userid: decoded.userid || decoded.id, // Handle both userid and id for robustness
      company_id: decoded.company_id,
      role: Array.isArray(decoded.role) ? decoded.role : (decoded.role ? [decoded.role] : []),
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or corrupted token',
      });
    }

    console.error('User authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

module.exports = {
  authenticateUser,
  authenticateUserOnly,
};
