const prisma = require('#prisma');

/**
 * Get Users API - Get all users for the authenticated user's company
 * @param {Object} req - Express request object (must have req.user from middleware)
 * @param {Object} res - Express response object
 */
async function getjobInfo(req, res) {
    try {
        const company_id = req.user.company_id; // Get company_id from authenticated user

        // Fetch all jobs for the company
        const jobInfo = await prisma.job.findMany({
            where: {
                company_id: company_id,
            },
            select: {
                id: true,
                job_number: true,
                tag_number: true,
                project_id: true,
                equipement_name: true,
                code: true, // Assuming this maps to Weld Plan No or similar
                customer: {
                    select: {
                        customer_name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.status(200).json({
            success: true,
            message: 'Job Information fetched successfully',
            data: jobInfo,
        });
    } catch (error) {
        console.error('Get job information error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

module.exports = { getjobInfo }