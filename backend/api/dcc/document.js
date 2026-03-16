const prisma = require('#prisma');

/**
 * Get Document Type API - Get all document types for the authenticated user's company
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function getDocumentType(req, res) {
  try {
    const company_id = req.user.company_id; // Get company_id from authenticated user

    // Fetch all document types for the company
    const documentTypes = await prisma.document_type.findMany({
      where: {
        company_id: company_id, // Only fetch document types for the authenticated user's company
      },
      orderBy: {
        createdAt: 'desc', // Order by creation date, newest first
      },
    });

    res.status(200).json({
      success: true,
      message: 'Document types fetched successfully',
      data: documentTypes,
    });
  } catch (error) {
    console.error('Get document type error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Create Document Type API - Create a new document type
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function createDocumentType(req, res) {
  try {
    const { name } = req.body;
    const company_id = req.user.company_id; // Get company_id from authenticated user

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Document type name is required',
      });
    }

    // Check if document type with same name already exists in this company
    const existingDocumentType = await prisma.document_type.findFirst({
      where: {
        company_id: company_id,
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (existingDocumentType) {
      return res.status(409).json({
        success: false,
        message: 'Document type with this name already exists in your company',
      });
    }

    // Create the document type
    const documentType = await prisma.document_type.create({
      data: {
        company_id: company_id,
        name: name.trim(),
      },
      select: {
        id: true,
        company_id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Document type created successfully',
      data: documentType,
    });
  } catch (error) {
    console.error('Create document type error:', error);
    
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
 * Get Document Master API - Get all document masters for the authenticated user's company
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function getDocumentMaster(req, res) {
  try {
    const company_id = req.user.company_id; // Get company_id from authenticated user

    // Fetch all document masters for the company
    const documents = await prisma.document_master.findMany({
      where: {
        company_id: company_id, // Only fetch documents for the authenticated user's company
      },
      include: {
        document_type: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Order by creation date, newest first
      },
    });

    res.status(200).json({
      success: true,
      message: 'Document masters fetched successfully',
      data: documents,
    });
  } catch (error) {
    console.error('Get document master error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Create Document Master API - Create a new document master
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function createDocumentMaster(req, res) {
  try {
    const { document_number, document_name, document_type_id } = req.body;
    const company_id = req.user.company_id; // Get company_id from authenticated user

    // Validate required fields
    if (!document_number || document_number.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Document number is required',
      });
    }

    if (!document_name || document_name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Document name is required',
      });
    }

    if (!document_type_id || document_type_id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Document type ID is required',
      });
    }

    // Verify document type exists and belongs to the company
    const documentType = await prisma.document_type.findFirst({
      where: {
        id: document_type_id.trim(),
        company_id: company_id,
      },
    });

    if (!documentType) {
      return res.status(404).json({
        success: false,
        message: 'Document type not found or does not belong to your company',
      });
    }

    // Check if document with same document_number already exists in this company
    const existingDocument = await prisma.document_master.findFirst({
      where: {
        company_id: company_id,
        document_number: document_number.trim(),
      },
    });

    if (existingDocument) {
      return res.status(409).json({
        success: false,
        message: 'Document with this document number already exists in your company',
      });
    }

    // Create the document master
    const document = await prisma.document_master.create({
      data: {
        company_id: company_id,
        document_number: document_number.trim(),
        document_name: document_name.trim(),
        document_type_id: document_type_id.trim(),
      },
      include: {
        document_type: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Document master created successfully',
      data: document,
    });
  } catch (error) {
    console.error('Create document master error:', error);
    
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
 * Assign Document API - Assign documents to jobs (single or group)
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function assignDocument(req, res) {
  try {
    const { customer_id, customer_location_id, po_id, job_ids, documents } = req.body;
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

    if (!Array.isArray(job_ids) || job_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Job IDs array is required and must contain at least one job ID',
      });
    }

    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Documents array is required and must contain at least one document',
      });
    }

    // Validate each document object
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      if (!doc.document_id || doc.document_id.trim() === '') {
        return res.status(400).json({
          success: false,
          message: `Document ID is required for document at index ${i}`,
        });
      }
      if (!doc.assign_user_id || doc.assign_user_id.trim() === '') {
        return res.status(400).json({
          success: false,
          message: `Assign user ID is required for document at index ${i}`,
        });
      }
    }

    const trimmedCustomerId = customer_id.trim();
    const trimmedCustomerLocationId = customer_location_id.trim();
    const trimmedPoId = po_id.trim();

    // Verify customer exists and belongs to the company
    const customer = await prisma.customer.findFirst({
      where: {
        id: trimmedCustomerId,
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
        id: trimmedCustomerLocationId,
        customer_id: trimmedCustomerId,
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
        id: trimmedPoId,
        customer_id: trimmedCustomerId,
        customer_location_id: trimmedCustomerLocationId,
        company_id: company_id,
      },
    });

    if (!po) {
      return res.status(404).json({
        success: false,
        message: 'PO not found or does not belong to the customer location',
      });
    }

    // Verify all jobs exist and belong to the company
    const jobs = await prisma.job.findMany({
      where: {
        id: { in: job_ids.map((id) => id.trim()) },
        company_id: company_id,
        customer_id: trimmedCustomerId,
        customer_location_id: trimmedCustomerLocationId,
        po_id: trimmedPoId,
      },
    });

    if (jobs.length !== job_ids.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more jobs not found or do not belong to the specified customer/PO',
      });
    }

    // Verify all documents exist and belong to the company
    const documentIds = documents.map((doc) => doc.document_id.trim());
    const documentMasters = await prisma.document_master.findMany({
      where: {
        id: { in: documentIds },
        company_id: company_id,
      },
    });

    if (documentMasters.length !== documentIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more documents not found or do not belong to your company',
      });
    }

    // Verify all users exist and belong to the company
    const userIds = documents.map((doc) => doc.assign_user_id.trim());
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        company_id: company_id,
      },
    });

    if (users.length !== userIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more users not found or do not belong to your company',
      });
    }

    // Use transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      if (job_ids.length === 1) {
        // Create a group for the single job to maintain consistency
        const group = await tx.group.create({
          data: { company_id: company_id },
        });

        await tx.job_group.create({
          data: {
            company_id: company_id,
            group_id: group.id,
            job_id: job_ids[0].trim(),
          },
        });

        const assignments = [];
        for (const doc of documents) {
          const assignment = await tx.group_document.create({
            data: {
              company_id: company_id,
              customer_id: trimmedCustomerId,
              customer_location_id: trimmedCustomerLocationId,
              po_id: trimmedPoId,
              group_id: group.id,
              document_id: doc.document_id.trim(),
              shreno_doc_no: doc.shreno_document_no ? doc.shreno_document_no.trim() : null,
              shreno_reference_no: doc.shreno_reference_no ? doc.shreno_reference_no.trim() : null,
              client_doc_no: doc.client_document_no ? doc.client_document_no.trim() : null,
              client_reference_no: doc.client_reference_no ? doc.client_reference_no.trim() : null,
              upload_due_days: doc.upload_due_days || null,
              response_due_days: doc.response_due_days || null,
              user_id: doc.assign_user_id.trim(),
            },
          });
          assignments.push(assignment);
        }

        return { type: 'group', assignments };
      } else {
        // Multiple jobs - create group, add jobs to group, assign documents to group
        const group = await tx.group.create({
          data: { company_id: company_id },
        });

        await Promise.all(
          job_ids.map((jobId) =>
            tx.job_group.create({
              data: {
                company_id: company_id,
                group_id: group.id,
                job_id: jobId.trim(),
              },
            })
          )
        );

        const assignments = await Promise.all(
          documents.map((doc) =>
            tx.group_document.create({
              data: {
                company_id: company_id,
                customer_id: trimmedCustomerId,
                customer_location_id: trimmedCustomerLocationId,
                po_id: trimmedPoId,
                group_id: group.id,
                document_id: doc.document_id.trim(),
                shreno_doc_no: doc.shreno_document_no ? doc.shreno_document_no.trim() : null,
                shreno_reference_no: doc.shreno_reference_no ? doc.shreno_reference_no.trim() : null,
                client_doc_no: doc.client_document_no ? doc.client_document_no.trim() : null,
                client_reference_no: doc.client_reference_no ? doc.client_reference_no.trim() : null,
                upload_due_days: doc.upload_due_days || null,
                response_due_days: doc.response_due_days || null,
                user_id: doc.assign_user_id.trim(),
              },
            })
          )
        );

        return { type: 'group', assignments };
      }
    });

    res.status(201).json({
      success: true,
      message: `${result.assignments.length} document(s) assigned successfully`,
      data: result.assignments,
    });
  } catch (error) {
    console.error('Assign document error:', error);
    
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
  getDocumentType,
  createDocumentType,
  getDocumentMaster,
  createDocumentMaster,
  assignDocument,
};
