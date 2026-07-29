const maintenanceMemoService = require('../services/maintenance_memo.service');

class MaintenanceMemoController {
    listMemos = async (req, res, next) => {
        try {
            const result = await maintenanceMemoService.getMemos(req.user.company_id, req.query);
            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    };

    getMemoById = async (req, res, next) => {
        try {
            const memo = await maintenanceMemoService.getMemoById(req.params.id, req.user.company_id);
            res.json({
                success: true,
                data: memo
            });
        } catch (error) {
            next(error);
        }
    };

    initiateMemo = async (req, res, next) => {
        try {
            const memo = await maintenanceMemoService.initiateMemo(req.user.company_id, req.user.userid, req.body, req.files);
            res.status(201).json({
                success: true,
                message: 'Memo initiated successfully',
                data: memo
            });
        } catch (error) {
            next(error);
        }
    };

    updateMemo = async (req, res, next) => {
        try {
            const memo = await maintenanceMemoService.updateMemo(req.params.id, req.user.company_id, req.body, req.files);
            res.json({
                success: true,
                message: 'Memo updated successfully',
                data: memo
            });
        } catch (error) {
            next(error);
        }
    };

    resolveMemo = async (req, res, next) => {
        try {
            const memo = await maintenanceMemoService.resolveMemo(req.params.id, req.user.company_id, req.body);
            res.json({
                success: true,
                message: 'Memo resolved successfully',
                data: memo
            });
        } catch (error) {
            next(error);
        }
    };

    verifyMemo = async (req, res, next) => {
        try {
            const memo = await maintenanceMemoService.verifyMemo(req.params.id, req.user.company_id, req.body);
            res.json({
                success: true,
                message: 'Memo verified successfully',
                data: memo
            });
        } catch (error) {
            next(error);
        }
    };

    downloadAttachment = async (req, res, next) => {
        try {
            const { filename } = req.params;
            const path = require('path');
            const fs = require('fs');
            const storageUtils = require('../utils/storage.utils');
            
            const safeFilename = path.basename(filename || "");
            const filePath = path.join(storageUtils.getMaintenanceMemoDir(), safeFilename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ success: false, message: 'File not found on server' });
            }

            res.sendFile(path.resolve(filePath));
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new MaintenanceMemoController();
