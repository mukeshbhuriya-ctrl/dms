const NotificationService = require('#services/notification.service.js');

class NotificationController {
  async list(req, res) {
    try {
      const user_id = req.user.userid;
      const { filter = 'all', limit = 50, cursor = null } = req.query;
      const data = await NotificationService.listNotifications(user_id, { filter, limit, cursor });
      res.status(200).json({ success: true, ...data });
    } catch (error) {
      console.error('NotificationController.list error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
  }

  async unreadCount(req, res) {
    try {
      const user_id = req.user.userid;
      const count = await NotificationService.getUnreadCount(user_id);
      res.status(200).json({ success: true, count });
    } catch (error) {
      console.error('NotificationController.unreadCount error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
    }
  }

  async markRead(req, res) {
    try {
      const user_id = req.user.userid;
      const { id } = req.params;
      const result = await NotificationService.markRead(user_id, id);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error('NotificationController.markRead error:', error);
      res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
  }

  async markAllRead(req, res) {
    try {
      const user_id = req.user.userid;
      const result = await NotificationService.markAllRead(user_id);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error('NotificationController.markAllRead error:', error);
      res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
    }
  }

  async create(req, res) {
    try {
      const user_id = req.user.userid;
      const company_id = req.user.company_id;
      const {
        kind = 'system',
        severity = 'info',
        title,
        message,
        actionPath,
        actionParams,
        signature,
      } = req.body || {};

      if (!title || !message) {
        return res.status(400).json({ success: false, message: 'title and message are required' });
      }

      const data = await NotificationService.createNotification({
        user_id,
        company_id,
        kind,
        severity,
        title,
        message,
        action_path: actionPath || null,
        action_params: actionParams || null,
        signature: signature || null,
      });

      res.status(201).json({ success: true, data });
    } catch (error) {
      console.error('NotificationController.create error:', error);
      res.status(500).json({ success: false, message: 'Failed to create notification' });
    }
  }

}

module.exports = new NotificationController();
