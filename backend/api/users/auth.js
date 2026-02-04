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
 * Login API - Authenticate user with employee ID and password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function login(req, res) {
  try {
    const { employeeId, password } = req.body;



    // Validate input
    if (!employeeId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and password are required',
      });
    }

    // Find user by employee ID
    const user = await prisma.user.findUnique({
      where: { empid: employeeId.trim() },
      include: {
        user_roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid employee ID or password',
      });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid employee ID or password',
      });
    }

    // Extract roles from user_roles
    const roles = user.user_roles.map((userRole) => ({
      id: userRole.role.id,
      name: userRole.role.name,
    }));

    // Generate encrypted JWT token using JOSE
    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'JWT_SECRET is not configured. Please set it in your .env file.',
      });
    }

    // Encrypt the token payload with company_id, userid, and role array
    const token = await encryptToken(
      {
        userid: user.id,
        company_id: user.company_id,
        role: roles.map((r) => r.name), // Array of role names like ["OC", "Production"]
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
      roles: roles,
      user: {
        id: user.id,
        name: user.name,
        empid: user.empid
      }
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Get current authenticated user information
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function me(req, res) {
  try {
    const user = req.user;  // from authenticateUser middleware
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please login first.',
      });
    }
    res.status(200).json({
      role: user.role,
    });
  }
  catch (error) {
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
  me,
};
