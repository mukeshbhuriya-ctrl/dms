const prisma = require('#prisma');
const path = require('path');
const { hashPassword } = require('#utils/hashpassword');

/**
 * Create Company API - Create a new company with default roles, user, and assign all roles to user
 * @param {Object} req - Express request object (with multer file upload)
 * @param {Object} res - Express response object
 */
async function createCompany(req, res) {
  try {
    const { companyName, name, email, employee_id, password, mobile } = req.body;
    const uploadedFile = req.file; // File uploaded via multer

    // Validate required fields
    if (!companyName || companyName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Company name is required',
      });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'User name is required',
      });
    }

    if (!email || email.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    if (!employee_id || employee_id.trim() === '') {
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

    // Trim and validate company name length
    const trimmedCompanyName = companyName.trim();
    if (trimmedCompanyName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Company name must be at least 2 characters long',
      });
    }

    // Check if company with same name already exists (case-insensitive)
    const existingCompany = await prisma.company.findFirst({
      where: {
        name: {
          equals: trimmedCompanyName,
          mode: 'insensitive',
        },
      },
    });

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: 'Company with this name already exists',
      });
    }

    // Check if user with same email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Check if employee ID already exists
    const existingEmpId = await prisma.user.findUnique({
      where: { empid: employee_id.trim() },
    });

    if (existingEmpId) {
      return res.status(409).json({
        success: false,
        message: 'Employee ID already exists',
      });
    }

    // Check if mobile already exists (if provided)
    if (req.body.mobile && req.body.mobile.trim() !== '') {
      const existingMobile = await prisma.user.findUnique({
        where: { mobile: req.body.mobile.trim() },
      });

      if (existingMobile) {
        return res.status(409).json({
          success: false,
          message: 'Mobile number already exists',
        });
      }
    }

    // Handle logo URL
    let logoUrl = null;
    if (uploadedFile) {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      logoUrl = `${backendUrl}/uploads/${uploadedFile.filename}`;
    } else if (req.body.logo_url) {
      logoUrl = req.body.logo_url.trim();
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Default roles to create for the company (from environment variable or fallback)
    // Format: "OC,Production" or "OC,Production,Manager" (comma-separated)
    const defaultRolesEnv = process.env.DEFAULT_COMPANY_ROLES || 'ADMIN,DCC';
    const defaultRoles = defaultRolesEnv.split(',').map((role) => role.trim()).filter((role) => role.length > 0);

    // Use transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the company
      const company = await tx.company.create({
        data: {
          name: trimmedCompanyName,
          logo_url: logoUrl,
        },
      });

      // 2. Create multiple roles for the company
      const roles = await Promise.all(
        defaultRoles.map((roleName) =>
          tx.role.create({
            data: {
              company_id: company.id,
              name: roleName,
            },
          })
        )
      );

      // 3. Create user with hashed password
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          empid: employee_id.trim(),
          mobile: req.body.mobile ? req.body.mobile.trim() : null,
          password: hashedPassword,
          company_id: company.id,
        },
      });

      // 4. Assign all roles to the user
      const userRoles = await Promise.all(
        roles.map((role) =>
          tx.user_roles.create({
            data: {
              user_id: user.id,
              role_id: role.id,
            },
          })
        )
      );

      return {
        company,
        roles,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          empid: user.empid,
          mobile: user.mobile,
          company_id: user.company_id,
        },
        userRoles,
      };
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Company, roles, and user created successfully',
      data: {
        company: {
          id: result.company.id,
          name: result.company.name,
          logo_url: result.company.logo_url,
          createdAt: result.company.createdAt,
          updatedAt: result.company.updatedAt,
        },
        roles: result.roles.map((role) => ({
          id: role.id,
          name: role.name,
          company_id: role.company_id,
        })),
        user: result.user,
        assignedRoles: result.userRoles.length,
      },
    });
  } catch (error) {
    console.error('Create company error:', error);

    // Handle multer errors
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

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

module.exports = {
  createCompany,
};
