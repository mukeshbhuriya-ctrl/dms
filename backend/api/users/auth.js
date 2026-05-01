const prisma = require('#prisma');
const { comparePassword, hashPassword } = require('#utils/hashpassword');
const { encryptToken } = require('#utils/jwt-encrypt');
const emailService = require('#services/email.service.js');
const crypto = require('crypto');

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
    const currentUser = req.user;  // from authenticateUser middleware
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please login first.',
      });
    }

    // Fetch full user details from DB
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userid },
      include: {
        company: true,
        user_roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Return more user details
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        empid: user.empid,
        role: user.user_roles.map(ur => ur.role.name), // Array of role names
        company: user.company ? {
          id: user.company.id,
          name: user.company.name,
          logo_url: user.company.logo_url ? (() => {
            const rawUrl = user.company.logo_url;
            if (rawUrl.startsWith('http') || rawUrl.startsWith('/')) return rawUrl;
            const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
            return `${backendUrl}/api/files/${rawUrl}`;
          })() : null
        } : null
      },
      role: user.user_roles.map(ur => ur.role.name), // Keep for backward compatibility
      name: user.name,
      company: user.company ? {
        name: user.company.name,
        logo_url: user.company.logo_url ? (() => {
          const rawUrl = user.company.logo_url;
          if (rawUrl.startsWith('http') || rawUrl.startsWith('/')) return rawUrl;
          const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
          return `${backendUrl}/api/files/${rawUrl}`;
        })() : null
      } : null
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

/**
 * Logout API - Clear authentication cookie
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function logout(req, res) {
  try {
    res.clearCookie('token', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address' });
    }

    if (!user.email) {
      return res.status(400).json({ success: false, message: 'No email address registered for this account. Please contact admin.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: { otp, otpExpiry }
    });

    await emailService.sendOtpEmail(user.email, user.name, otp);

    res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully to your registered email' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user || user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user || user.otp !== otp || new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'Invalid or expired session' });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        otp: null,
        otpExpiry: null
      }
    });

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

module.exports = {
  login,
  me,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword
};
