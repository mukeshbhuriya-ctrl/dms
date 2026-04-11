const prisma = require('#prisma');

/**
 * Create Customer API - Create a new customer for the authenticated user's company
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function createCustomer(req, res) {
  try {
    const { customer_name, customer_short_name, email, mobile } = req.body;
    const company_id = req.user.company_id; // Get company_id from authenticated user

    // Validate required fields
    if (!customer_name || customer_name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required',
      });
    }

    if (!customer_short_name || customer_short_name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Customer short name is required',
      });
    }

    if (!email || email.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
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

    // Check if customer with same email already exists in this company
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        company_id: company_id,
        email: email.toLowerCase().trim(),
      },
    });

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: 'Customer with this email already exists in your company',
      });
    }

    // Create the customer
    const customer = await prisma.customer.create({
      data: {
        company_id: company_id,
        customer_name: customer_name.trim(),
        customer_short_name: customer_short_name.trim(),
        email: email.toLowerCase().trim(),
        mobile: mobile ? mobile.trim() : null,
      },
      select: {
        id: true,
        company_id: true,
        customer_name: true,
        customer_short_name: true,
        email: true,
        mobile: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    console.error('Create customer error:', error);

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
 * Create Customer Location API - Create multiple customer locations
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function createCustomerLocation(req, res) {
  try {
    const { customer_id, locations } = req.body;
    const company_id = req.user.company_id; // Get company_id from authenticated user

    // Validate customer_id
    if (!customer_id || (typeof customer_id === 'string' && customer_id.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID is required',
      });
    }

    // Validate locations array
    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Locations array is required and must contain at least one location',
      });
    }

    // Validate each location object
    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];

      if (!location.location_name || location.location_name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: `Location name is required for location at index ${i}`,
        });
      }

      if (!location.customer_number_as_per_sap || location.customer_number_as_per_sap.trim() === '') {
        return res.status(400).json({
          success: false,
          message: `Customer number as per SAP is required for location at index ${i}`,
        });
      }

      if (!location.gst_number || location.gst_number.trim() === '') {
        return res.status(400).json({
          success: false,
          message: `GST number is required for location at index ${i}`,
        });
      }
    }

    // Verify customer exists and belongs to the company
    const customer = await prisma.customer.findFirst({
      where: {
        id: typeof customer_id === 'string' ? customer_id.trim() : String(customer_id),
        company_id: company_id,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found or does not belong to your company',
      });
    }

    const trimmedCustomerId = typeof customer_id === 'string' ? customer_id.trim() : String(customer_id);

    // Use transaction to create all locations atomically
    const createdLocations = await prisma.$transaction(
      locations.map((location) =>
        prisma.customer_location.create({
          data: {
            company_id: company_id,
            customer_id: trimmedCustomerId,
            location_name: location.location_name.trim(),
            customer_number_as_per_sap: location.customer_number_as_per_sap.trim(),
            gst_number: location.gst_number.trim(),
          },
          select: {
            id: true,
            company_id: true,
            customer_id: true,
            location_name: true,
            customer_number_as_per_sap: true,
            gst_number: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      )
    );

    // Return success response
    res.status(201).json({
      success: true,
      message: `${createdLocations.length} customer location(s) created successfully`,
      data: createdLocations,
    });
  } catch (error) {
    console.error('Create customer location error:', error);

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
 * Create PO (Purchase Order) API - Create a new PO
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function createPo(req, res) {
  try {
    const { customer_id, customer_location_id, po_number, po_date, po_doc_url, communication_matrix } = req.body;
    const uploadedFile = req.file; // File uploaded via multer
    const company_id = req.user.company_id; // Get company_id from authenticated user

    // Validate required fields
    if (!customer_id || customer_id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Customer ID is required',
      });
    }

    if (!customer_location_id || customer_location_id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Customer location ID is required',
      });
    }

    if (!po_number || po_number.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'PO number is required',
      });
    }

    if (!po_date) {
      return res.status(400).json({
        success: false,
        message: 'PO date is required',
      });
    }

    // Handle PO document URL - either from uploaded file or from body
    let finalPoDocUrl = null;
    if (uploadedFile) {
      // Store ONLY the bare filename
      finalPoDocUrl = uploadedFile.filename;
    } else if (po_doc_url && po_doc_url.trim() !== '') {
      // Use URL from request body if no file uploaded
      finalPoDocUrl = po_doc_url.trim();
    } else {
      return res.status(400).json({
        success: false,
        message: 'PO document is required. Either upload a file or provide a document URL',
      });
    }

    // Parse communication_matrix if it's a string (from FormData)
    let parsedCommunicationMatrix = null;
    if (communication_matrix) {
      if (typeof communication_matrix === 'string') {
        try {
          parsedCommunicationMatrix = JSON.parse(communication_matrix);
        } catch (parseError) {
          return res.status(400).json({
            success: false,
            message: 'Invalid communication_matrix format. Must be valid JSON',
          });
        }
      } else if (typeof communication_matrix === 'object' && !Array.isArray(communication_matrix)) {
        parsedCommunicationMatrix = communication_matrix;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Communication matrix must be an object',
        });
      }
    }

    // Validate communication_matrix if provided
    if (parsedCommunicationMatrix) {

      // Validate shreno array if present
      if (parsedCommunicationMatrix.shreno) {
        if (!Array.isArray(parsedCommunicationMatrix.shreno)) {
          return res.status(400).json({
            success: false,
            message: 'Shreno communication matrix must be an array',
          });
        }
        for (let i = 0; i < parsedCommunicationMatrix.shreno.length; i++) {
          const person = parsedCommunicationMatrix.shreno[i];
          if (!person.name || !person.email) {
            return res.status(400).json({
              success: false,
              message: `Shreno person at index ${i} must have name and email`,
            });
          }
        }
      }

      // Validate client array if present
      if (parsedCommunicationMatrix.client) {
        if (!Array.isArray(parsedCommunicationMatrix.client)) {
          return res.status(400).json({
            success: false,
            message: 'Client communication matrix must be an array',
          });
        }
        for (let i = 0; i < parsedCommunicationMatrix.client.length; i++) {
          const person = parsedCommunicationMatrix.client[i];
          if (!person.name || !person.email) {
            return res.status(400).json({
              success: false,
              message: `Client person at index ${i} must have name and email`,
            });
          }
        }
      }
    }

    // Verify customer exists and belongs to the company
    const customer = await prisma.customer.findFirst({
      where: {
        id: customer_id.trim(),
        company_id: company_id,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found or does not belong to your company',
      });
    }

    // Verify customer location exists and belongs to the customer and company
    const customerLocation = await prisma.customer_location.findFirst({
      where: {
        id: customer_location_id.trim(),
        customer_id: customer_id.trim(),
        company_id: company_id,
      },
    });

    if (!customerLocation) {
      return res.status(404).json({
        success: false,
        message: 'Customer location not found or does not belong to the customer',
      });
    }

    // Parse PO date
    const poDate = new Date(po_date);

    // Use transaction to create PO and communication matrix entries atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create the PO
      const po = await tx.po.create({
        data: {
          company_id: company_id,
          customer_id: customer_id.trim(),
          customer_location_id: customer_location_id.trim(),
          po_number: po_number.trim(),
          po_date: poDate,
          po_doc_url: finalPoDocUrl,
        },
      });

      // Create communication matrix entries if provided
      const communicationMatrixEntries = [];

      if (parsedCommunicationMatrix) {
        // Create entries for shreno contacts
        if (parsedCommunicationMatrix.shreno && Array.isArray(parsedCommunicationMatrix.shreno)) {
          for (const person of parsedCommunicationMatrix.shreno) {
            const entry = await tx.po_communication_matrix.create({
              data: {
                company_id: company_id,
                po_id: po.id,
                name: person.name.trim(),
                email: person.email.toLowerCase().trim(),
                type: 'shreno',
              },
            });
            communicationMatrixEntries.push(entry);
          }
        }

        // Create entries for client contacts
        if (parsedCommunicationMatrix.client && Array.isArray(parsedCommunicationMatrix.client)) {
          for (const person of parsedCommunicationMatrix.client) {
            const entry = await tx.po_communication_matrix.create({
              data: {
                company_id: company_id,
                po_id: po.id,
                name: person.name.trim(),
                email: person.email.toLowerCase().trim(),
                type: 'client',
              },
            });
            communicationMatrixEntries.push(entry);
          }
        }
      }

      return { po, communicationMatrixEntries };
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'PO created successfully',
      data: {
        id: result.po.id,
        company_id: result.po.company_id,
        customer_id: result.po.customer_id,
        customer_location_id: result.po.customer_location_id,
        po_number: result.po.po_number,
        po_date: result.po.po_date,
        po_doc_url: result.po.po_doc_url ? (() => {
          const rawUrl = result.po.po_doc_url;
          if (rawUrl.startsWith('http') || rawUrl.startsWith('/')) return rawUrl;
          const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
          return `${backendUrl}/api/files/${rawUrl}`;
        })() : null,
        createdAt: result.po.createdAt,
        updatedAt: result.po.updatedAt,
        communication_matrix: result.communicationMatrixEntries,
      },
    });
  } catch (error) {
    console.error('Create PO error:', error);

    // Handle multer file upload errors
    if (error.message && error.message.includes('File type')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the maximum limit of 10MB',
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

/**
 * Create Job API - Create multiple jobs
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function createJob(req, res) {
  try {
    const { customer_id, customer_location_id, po_id, jobs } = req.body;
    const company_id = req.user.company_id; // Get company_id from authenticated user

    // Validate required fields
    if (!customer_id || customer_id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Customer ID is required',
      });
    }

    if (!customer_location_id || customer_location_id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Customer location ID is required',
      });
    }

    if (!po_id || po_id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'PO ID is required',
      });
    }

    // Validate jobs array
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Jobs array is required and must contain at least one job',
      });
    }

    // Validate each job object
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];

      if (!job.job_number || job.job_number.trim() === '') {
        return res.status(400).json({
          success: false,
          message: `Job number is required for job at index ${i}`,
        });
      }
    }

    // Verify customer exists and belongs to the company
    const customer = await prisma.customer.findFirst({
      where: {
        id: customer_id.trim(),
        company_id: company_id,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found or does not belong to your company',
      });
    }

    // Verify customer location exists and belongs to the customer and company
    const customerLocation = await prisma.customer_location.findFirst({
      where: {
        id: customer_location_id.trim(),
        customer_id: customer_id.trim(),
        company_id: company_id,
      },
    });

    if (!customerLocation) {
      return res.status(404).json({
        success: false,
        message: 'Customer location not found or does not belong to the customer',
      });
    }

    // Verify PO exists and belongs to the customer location and company
    const po = await prisma.po.findFirst({
      where: {
        id: po_id.trim(),
        customer_id: customer_id.trim(),
        customer_location_id: customer_location_id.trim(),
        company_id: company_id,
      },
    });

    if (!po) {
      return res.status(404).json({
        success: false,
        message: 'PO not found or does not belong to the customer location',
      });
    }

    const trimmedCustomerId = customer_id.trim();
    const trimmedCustomerLocationId = customer_location_id.trim();
    const trimmedPoId = po_id.trim();

    // Use transaction to create all jobs atomically
    const createdJobs = await prisma.$transaction(
      jobs.map((job) =>
        prisma.job.create({
          data: {
            company_id: company_id,
            customer_id: trimmedCustomerId,
            customer_location_id: trimmedCustomerLocationId,
            po_id: trimmedPoId,

            job_number: job.job_number.trim(),
            project_id: job.project_id?.trim() || null,
            equipement_name: job.equipement_name?.trim() || null,
            tag_number: job.tag_number?.trim() || null,
            code: job.code?.trim() || null,
          },
          select: {
            id: true,
            company_id: true,
            customer_id: true,
            customer_location_id: true,
            po_id: true,
            job_number: true,
            project_id: true,
            equipement_name: true,
            tag_number: true,
            code: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      )
    );

    // Return success response
    res.status(201).json({
      success: true,
      message: `${createdJobs.length} job(s) created successfully`,
      data: createdJobs,
    });
  } catch (error) {
    console.error('Create job error:', error);

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
 * Get Customers API - Get all customers with their locations, POs, and jobs
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function getCustomers(req, res) {
  try {
    const company_id = req.user.company_id; // Get company_id from authenticated user

    // Fetch all customers with their related data
    const customers = await prisma.customer.findMany({
      where: {
        company_id: company_id, // Only fetch customers for the authenticated user's company
      },
      include: {
        customer_locations: {
          include: {
            pos: {
              include: {
                jobs: true,
                po_communication_matrix: true,
              },
            },
            jobs: true,
          },
        },
        pos: {
          include: {
            jobs: true,
            po_communication_matrix: true,
          },
        },
        jobs: true,
      },
      orderBy: {
        createdAt: 'desc', // Order by creation date, newest first
      },
    });

    res.status(200).json({
      success: true,
      message: 'Customers fetched successfully',
      data: customers,
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}


/**
 * Get Customer Locations API - Get all customer locations
 */
async function getCustomerLocations(req, res) {
  try {
    const company_id = req.user.company_id;
    const locations = await prisma.customer_location.findMany({
      where: { company_id },
      include: {
        customer: { select: { customer_name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: locations });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * Get POs API - Get all purchase orders
 */
async function getPos(req, res) {
  try {
    const company_id = req.user.company_id;
    const pos = await prisma.po.findMany({
      where: { company_id },
      include: {
        customer: { select: { id: true, customer_name: true } },
        customer_location: { select: { id: true, location_name: true, gst_number: true } },
        po_communication_matrix: true
      },
      orderBy: { createdAt: 'desc' }
    });
    const formattedPos = pos.map(po => ({
      ...po,
      po_doc_url: po.po_doc_url ? (() => {
        const rawUrl = po.po_doc_url;
        if (rawUrl.startsWith('http') || rawUrl.startsWith('/')) return rawUrl;
        const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        return `${backendUrl}/api/files/${rawUrl}`;
      })() : null
    }));

    res.status(200).json({ success: true, data: formattedPos });
  } catch (error) {
    console.error('Get POs error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * Get Jobs API - Get all jobs
 */
async function getJobs(req, res) {
  try {
    const company_id = req.user.company_id;
    const { po_id, customer_id, customer_location_id } = req.query;

    const where = { company_id };

    if (po_id) where.po_id = typeof po_id === 'string' ? po_id.trim() : String(po_id);
    if (customer_id) where.customer_id = typeof customer_id === 'string' ? customer_id.trim() : String(customer_id);
    if (customer_location_id) where.customer_location_id = typeof customer_location_id === 'string' ? customer_location_id.trim() : String(customer_location_id);

    const jobs = await prisma.job.findMany({
      where,
      include: {
        customer: { select: { customer_name: true } },
        customer_location: { select: { location_name: true } },
        po: { select: { po_number: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    console.error('Get Jobs error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}


/**
 * Update Customer API
 */
async function updateCustomer(req, res) {
  try {
    const { id } = req.params;
    const { customer_name, customer_short_name, email, mobile } = req.body;
    const company_id = req.user.company_id;

    if (!id) return res.status(400).json({ success: false, message: 'Customer ID is required' });

    const existing = await prisma.customer.findFirst({ where: { id: id.trim(), company_id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Customer not found' });

    if (email && email.toLowerCase().trim() !== existing.email) {
      const emailCheck = await prisma.customer.findFirst({ where: { company_id, email: email.toLowerCase().trim() } });
      if (emailCheck) return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    const updated = await prisma.customer.update({
      where: { id: id.trim() },
      data: {
        customer_name: customer_name ? customer_name.trim() : undefined,
        customer_short_name: customer_short_name ? customer_short_name.trim() : undefined,
        email: email ? email.toLowerCase().trim() : undefined,
        mobile: mobile ? mobile.trim() : null,
      }
    });

    res.status(200).json({ success: true, message: 'Customer updated successfully', data: updated });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
}

/**
 * Update Customer Location API
 */
async function updateCustomerLocation(req, res) {
  try {
    const { id } = req.params;
    const { location_name, customer_number_as_per_sap, gst_number } = req.body;
    const company_id = req.user.company_id;

    if (!id) return res.status(400).json({ success: false, message: 'Location ID is required' });

    const existing = await prisma.customer_location.findFirst({ where: { id: id.trim(), company_id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Location not found' });

    const updated = await prisma.customer_location.update({
      where: { id: id.trim() },
      data: {
        location_name: location_name ? location_name.trim() : undefined,
        customer_number_as_per_sap: customer_number_as_per_sap ? customer_number_as_per_sap.trim() : undefined,
        gst_number: gst_number ? gst_number.trim() : undefined,
      }
    });

    res.status(200).json({ success: true, message: 'Location updated successfully', data: updated });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
}

/**
 * Update PO
 */
async function updatePo(req, res) {
  try {
    const { id } = req.params;
    const { po_number, po_date, po_doc_url, communication_matrix } = req.body;
    const uploadedFile = req.file;
    const company_id = req.user.company_id;

    const existingPo = await prisma.po.findFirst({ where: { id: id.trim(), company_id } });
    if (!existingPo) return res.status(404).json({ success: false, message: 'PO not found' });

    let finalPoDocUrl = existingPo.po_doc_url;
    if (uploadedFile) {
      // Store ONLY the bare filename
      finalPoDocUrl = uploadedFile.filename;
    } else if (po_doc_url && po_doc_url.trim() !== '') {
      finalPoDocUrl = po_doc_url.trim();
    }

    let parsedCommunicationMatrix = null;
    if (communication_matrix) {
      if (typeof communication_matrix === 'string') {
        try { parsedCommunicationMatrix = JSON.parse(communication_matrix); } catch (e) { }
      } else {
        parsedCommunicationMatrix = communication_matrix;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updateData = {};
      if (po_number) updateData.po_number = po_number.trim();
      if (po_date) updateData.po_date = new Date(po_date);
      if (finalPoDocUrl !== existingPo.po_doc_url) updateData.po_doc_url = finalPoDocUrl;

      const updatedPo = await tx.po.update({
        where: { id: id.trim() },
        data: updateData
      });

      let newMatrix = [];
      if (parsedCommunicationMatrix) {
        await tx.po_communication_matrix.deleteMany({ where: { po_id: id.trim(), company_id } });

        if (parsedCommunicationMatrix.shreno && Array.isArray(parsedCommunicationMatrix.shreno)) {
          for (const person of parsedCommunicationMatrix.shreno) {
            newMatrix.push(await tx.po_communication_matrix.create({
              data: { company_id, po_id: id.trim(), name: person.name.trim(), email: person.email.toLowerCase().trim(), type: 'shreno' }
            }));
          }
        }
        if (parsedCommunicationMatrix.client && Array.isArray(parsedCommunicationMatrix.client)) {
          for (const person of parsedCommunicationMatrix.client) {
            newMatrix.push(await tx.po_communication_matrix.create({
              data: { company_id, po_id: id.trim(), name: person.name.trim(), email: person.email.toLowerCase().trim(), type: 'client' }
            }));
          }
        }
      } else {
        newMatrix = await tx.po_communication_matrix.findMany({ where: { po_id: id.trim() } });
      }

      return { po: updatedPo, communicationMatrixEntries: newMatrix };
    });

    // Expand the PO document URL for the response
    const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    if (result.po.po_doc_url && !result.po.po_doc_url.startsWith('http')) {
      const rawUrl = result.po.po_doc_url;
      const pathUrl = rawUrl.startsWith('/') ? rawUrl : `/api/files/${rawUrl}`;
      result.po.po_doc_url = `${backendUrl}${pathUrl}`;
    }

    res.status(200).json({ success: true, message: 'PO updated successfully', data: result });
  } catch (error) {
    console.error('Update PO error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
}

/**
 * Update Job
 */
async function updateJob(req, res) {
  try {
    const { id } = req.params;
    const { job_number, project_id, equipement_name, tag_number, code } = req.body;
    const company_id = req.user.company_id;

    if (!id) return res.status(400).json({ success: false, message: 'Job ID is required' });

    const existing = await prisma.job.findFirst({ where: { id: id.trim(), company_id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Job not found' });

    const updated = await prisma.job.update({
      where: { id: id.trim() },
      data: {
        job_number: job_number ? job_number.trim() : undefined,
        project_id: project_id !== undefined ? (project_id ? project_id.trim() : null) : undefined,
        equipement_name: equipement_name !== undefined ? (equipement_name ? equipement_name.trim() : null) : undefined,
        tag_number: tag_number !== undefined ? (tag_number ? tag_number.trim() : null) : undefined,
        code: code !== undefined ? (code ? code.trim() : null) : undefined,
      }
    });

    res.status(200).json({ success: true, message: 'Job updated successfully', data: updated });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
}

/**
 * Update PO Communication Matrix
 */
async function updatePoCommunicationMatrix(req, res) {
  try {
    const { id } = req.params;
    const { communication_matrix } = req.body;
    const company_id = req.user.company_id;

    if (!id) return res.status(400).json({ success: false, message: 'PO ID is required' });

    const existingPo = await prisma.po.findFirst({ where: { id: id.trim(), company_id } });
    if (!existingPo) return res.status(404).json({ success: false, message: 'PO not found' });

    let parsedCommunicationMatrix = null;
    if (communication_matrix) {
      if (typeof communication_matrix === 'string') {
        try { parsedCommunicationMatrix = JSON.parse(communication_matrix); } catch (e) {
          return res.status(400).json({ success: false, message: 'Invalid communication_matrix format' });
        }
      } else {
        parsedCommunicationMatrix = communication_matrix;
      }
    } else {
      return res.status(400).json({ success: false, message: 'Communication matrix payload is required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let newMatrix = [];
      await tx.po_communication_matrix.deleteMany({ where: { po_id: id.trim(), company_id } });

      if (parsedCommunicationMatrix.shreno && Array.isArray(parsedCommunicationMatrix.shreno)) {
        for (const person of parsedCommunicationMatrix.shreno) {
          if (person.name && person.email) {
            newMatrix.push(await tx.po_communication_matrix.create({
              data: { company_id, po_id: id.trim(), name: person.name.trim(), email: person.email.toLowerCase().trim(), type: 'shreno' }
            }));
          }
        }
      }
      if (parsedCommunicationMatrix.client && Array.isArray(parsedCommunicationMatrix.client)) {
        for (const person of parsedCommunicationMatrix.client) {
          if (person.name && person.email) {
             newMatrix.push(await tx.po_communication_matrix.create({
               data: { company_id, po_id: id.trim(), name: person.name.trim(), email: person.email.toLowerCase().trim(), type: 'client' }
             }));
          }
        }
      }
      return newMatrix;
    });

    res.status(200).json({ success: true, message: 'Communication matrix updated successfully', data: result });
  } catch (error) {
    console.error('Update PO communication matrix error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
}

module.exports = {
  createCustomer,
  createCustomerLocation,
  createPo,
  createJob,
  getCustomers,
  getCustomerLocations,
  getPos,
  getJobs,
  updateCustomer,
  updateCustomerLocation,
  updatePo,
  updateJob,
  updatePoCommunicationMatrix
};
