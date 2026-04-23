const express = require('express');
const router = express.Router();

const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');
const NotificationController = require('#controllers/notification.controller.js');

router.use(authenticateUserOnly);

router.get('/', NotificationController.list);
router.get('/unread-count', NotificationController.unreadCount);
router.patch('/:id/read', NotificationController.markRead);
router.patch('/read-all', NotificationController.markAllRead);
router.post('/', NotificationController.create);

module.exports = router;
