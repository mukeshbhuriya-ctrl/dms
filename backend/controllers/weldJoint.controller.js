const weldJointService = require('../services/weldJoint.service.js');

async function getWeldJoints(req, res) {
    try {
        const company_id = req.user.company_id;
        const { page, limit, search, status, sortBy, sortOrder } = req.query;

        const result = await weldJointService.findAll(company_id, {
            page,
            limit,
            search,
            status,
            sortBy,
            sortOrder
        }, {
            userId: req.user.userid || req.user.id,
            roles: req.user.role
        });

        res.status(200).json({
            success: true,
            message: 'Weld Joints fetched successfully',
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        console.error('Get weld joints error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

async function updateStageStatus(req, res) {
    try {
        const result = await weldJointService.updateStatus(req.body);
        res.status(200).json({ success: true, message: 'Stage status updated successfully', data: result });
    } catch (error) {
        console.error('Update stage status error:', error);
        res.status(error.message === 'Missing required fields' || error.message === 'Invalid stage' ? 400 : 500).json({
            success: false,
            message: error.message || 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

async function reviewStageStatus(req, res) {
    try {
        const result = await weldJointService.reviewStatus(req.body);
        res.status(200).json({ success: true, message: 'Stage status reviewed successfully', data: result });
    } catch (error) {
        console.error('Review stage status error:', error);
        res.status(error.message === 'Missing required fields' || error.message === 'Invalid stage' ? 400 : 500).json({
            success: false,
            message: error.message || 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

async function getWeldJointPlans(req, res) {
    try {
        const company_id = req.user.company_id;
        const { page, limit, search, sortBy, sortOrder } = req.query;

        const result = await weldJointService.getWeldJointPlans(company_id, {
            page,
            limit,
            search,
            sortBy,
            sortOrder
        });

        res.status(200).json({
            success: true,
            message: 'Weld Joint Plans fetched successfully',
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        console.error('Get weld joint plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

module.exports = {
    getWeldJoints,
    updateStageStatus,
    reviewStageStatus,
    getWeldJointPlans
};

