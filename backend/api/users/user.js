const prisma = require('#prisma');
const { hashPassword } = require('#utils/hashpassword');

/**
 * Get Users API - Get all users for the authenticated user's company
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function getUsers(req, res) {
  try {
    const company_id = req.user.company_id; // Get company_id from authenticated user

    // Fetch all users for the company
    const users = await prisma.user.findMany({
      where: {
        company_id: company_id, // Only fetch users for the authenticated user's company
      },
      select: {
        id: true,
        name: true,
        email: true,
        empid: true,
        mobile: true,
        department: true,
        designation: true,
        user_roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Order by creation date, newest first
      },
    });

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Create User API - Create a new user for the authenticated user's company
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function createUser(req, res) {
  try {
    const { name, email, empid, password, mobile, role_ids, department, designation } = req.body;
    const company_id = req.user.company_id; // Get company_id from authenticated user

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    if (!email || email.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    if (!empid || empid.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    if (!password || password.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      });
    }

    // Validate email format (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Check if user with same email already exists
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUserByEmail) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Check if employee ID already exists
    const existingUserByEmpId = await prisma.user.findUnique({
      where: { empid: empid.trim() },
    });

    if (existingUserByEmpId) {
      return res.status(409).json({
        success: false,
        message: 'Employee ID already exists',
      });
    }

    // Check if mobile already exists (if provided)
    if (mobile && mobile.trim() !== '') {
      const existingUserByMobile = await prisma.user.findUnique({
        where: { mobile: mobile.trim() },
      });

      if (existingUserByMobile) {
        return res.status(409).json({
          success: false,
          message: 'Mobile number already exists',
        });
      }
    }

    // Validate role_ids if provided
    let rolesToAssign = [];
    if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
      // Verify all roles exist and belong to the company
      const roles = await prisma.role.findMany({
        where: {
          id: { in: role_ids.map((id) => id.trim()) },
          company_id: company_id,
        },
      });

      if (roles.length !== role_ids.length) {
        return res.status(404).json({
          success: false,
          message: 'One or more roles not found or do not belong to your company',
        });
      }

      rolesToAssign = roles;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Use transaction to create user and assign roles atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          empid: empid.trim(),
          mobile: mobile ? mobile.trim() : null,
          password: hashedPassword,
          company_id: company_id,
          department: department ? department.trim() : null,
          designation: designation ? designation.trim() : null,
        },
      });

      // Assign roles if provided
      const userRoles = [];
      if (rolesToAssign.length > 0) {
        const assignedRoles = await Promise.all(
          rolesToAssign.map((role) =>
            tx.user_roles.create({
              data: {
                user_id: user.id,
                role_id: role.id,
              },
            })
          )
        );
        userRoles.push(...assignedRoles);
      }

      return { user, userRoles };
    });

    // Fetch user with roles for response (excluding password)
    const userWithRoles = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        empid: true,
        mobile: true,
        company_id: true,
        department: true,
        designation: true,
        createdAt: true,
        updatedAt: true,
        user_roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Transform roles
    const responseData = {
      ...userWithRoles,
      roles: userWithRoles.user_roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
      })),
    };

    // Return success response
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: responseData,
    });
  } catch (error) {
    console.error('Create user error:', error);

    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(409).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Get Users API - Get all Roles for the authenticated user's company
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function getRoles(req, res) {
  try {
    const company_id = req.user.company_id; // Get company_id from authenticated user

    // Fetch all roles for the company
    const roles = await prisma.role.findMany({
      where: {
        company_id: company_id, // Only fetch roles for the authenticated user's company
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc', // Order by name alphabetically
      },
    });

    res.status(200).json({
      success: true,
      message: 'Roles fetched successfully',
      data: roles,
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

module.exports = {
  getUsers,
  createUser,
  getRoles
};
