const prisma = require('#prisma');
const { comparePassword } = require('#utils/hashpassword');
const { encryptToken } = require('#utils/jwt-encrypt');

/**
 * Parse expiration time string (e.g., '7d', '1h', '30m') to milliseconds
 * @param {string} expiresIn - Expiration time string
 * @returns {number} Milliseconds
 */
function parseExpirationTime(expiresIn) {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000; // days
    case 'h':
      return value * 60 * 60 * 1000; // hours
    case 'm':
      return value * 60 * 1000; // minutes
    case 's':
      return value * 1000; // seconds
    default:
      // Default to 7 days if format is unknown
      return 7 * 24 * 60 * 60 * 1000;
  }
}

/**
 * Login API - Authenticate site admin with email and password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find admin by email
    const admin = await prisma.siteadmin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Check if admin exists
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate encrypted JWT token using JOSE
    // The payload is now encrypted and cannot be read without the secret key
    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
    
    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'JWT_SECRET is not configured. Please set it in your .env file.',
      });
    }

    // Encrypt the token payload
    const token = await encryptToken(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'siteadmin',
      },
      JWT_SECRET,
      JWT_EXPIRES_IN,
    );

    // Calculate cookie expiration (convert JWT_EXPIRES_IN to milliseconds)
    const expiresInMs = parseExpirationTime(JWT_EXPIRES_IN);
    const cookieExpires = new Date(Date.now() + expiresInMs);

    // Set token in HTTP-only cookie for security
    res.cookie('token', token, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      expires: cookieExpires,
      path: '/', // Available for all routes
    });

    // Return success response (token is in cookie, but also return it in response for flexibility)
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token, // Still return token in response for clients that prefer it
    });

    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Get current authenticated admin information
 * @param {Object} req - Express request object (must have req.admin from middleware)
 * @param {Object} res - Express response object
 */
async function me(req, res) {
  try {
    // Get admin information from middleware (set by authenticateSiteAdmin)
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please login first.',
      });
    }

    // Return admin information
    res.status(200).json({
      role: req.admin.role
    });

  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

module.exports = {
  login,
  me
};
