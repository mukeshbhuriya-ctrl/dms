const ApprovalCenterService = require('#services/approvalCenter.service.js');

class ApprovalCenterController {
    async getAllRequests(req, res) {
        try {
            const { company_id } = req.user;
            const { page = 1, limit = 10, search = '', status } = req.query;
            
            let requests = await ApprovalCenterService.getAllRequests(company_id);
            
            if (status && status !== 'all') {
                const lowerStatus = status.toLowerCase();
                requests = requests.filter(item => 
                    (item.status || '').toLowerCase() === lowerStatus
                );
            }

            if (search) {
                const lowerSearch = search.toLowerCase();
                requests = requests.filter(item => 
                    (item.module || '').toLowerCase().includes(lowerSearch) ||
                    (item.reference_no || '').toLowerCase().includes(lowerSearch) ||
                    (item.description || '').toLowerCase().includes(lowerSearch) ||
                    (item.status || '').toLowerCase().includes(lowerSearch)
                );
            }

            const total = requests.length;
            let pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            
            let skip = (pageNum - 1) * limitNum;
            if (skip >= total && total > 0) {
                pageNum = 1;
                skip = 0;
            }
            
            const paginatedRequests = requests.slice(skip, skip + limitNum);
            
            res.status(200).json({
                success: true,
                message: 'Approval requests fetched successfully',
                data: paginatedRequests,
                meta: {
                    total: total,
                    page: pageNum,
                    pageSize: limitNum,
                    totalPages: Math.ceil(total / limitNum)
                }
            });
        } catch (error) {
            console.error('ApprovalCenter getAllRequests error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}

module.exports = new ApprovalCenterController();
