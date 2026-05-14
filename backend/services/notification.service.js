const prisma = require('#prisma');
const NotificationSocketService = require('#services/notification.socket.js');

class NotificationService {
  _serialize(record) {
    return {
      id: record.id,
      kind: record.kind,
      severity: record.severity,
      title: record.title,
      message: record.message,
      actionPath: record.action_path,
      actionParams: record.action_params || null,
      read: record.is_read,
      readAt: record.read_at,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  _emitToUser(userId, eventName, payload) {
    NotificationSocketService.emitToUser(userId, eventName, payload);
  }

  async createNotification({
    company_id,
    user_id,
    kind = 'system',
    severity = 'info',
    title,
    message,
    action_path = null,
    action_params = null,
    signature = null,
  }) {
    if (!company_id || !user_id || !title || !message) {
      throw new Error('company_id, user_id, title, and message are required');
    }

    const record = await prisma.notification.create({
      data: {
        company_id,
        user_id,
        kind,
        severity,
        title,
        message,
        action_path,
        action_params,
        signature,
      },
    });

    const serialized = this._serialize(record);
    this._emitToUser(user_id, 'notification.created', serialized);

    return serialized;
  }

  async upsertUnreadBySignature({
    company_id,
    user_id,
    signature,
    kind = 'action',
    severity = 'warning',
    title,
    message,
    action_path = null,
    action_params = null,
  }) {
    if (!signature) {
      return this.createNotification({
        company_id,
        user_id,
        kind,
        severity,
        title,
        message,
        action_path,
        action_params,
        signature,
      });
    }

    const existing = await prisma.notification.findFirst({
      where: { user_id, signature, is_read: false },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const updated = await prisma.notification.update({
        where: { id: existing.id },
        data: {
          title,
          message,
          kind,
          severity,
          action_path,
          action_params,
        },
      });

      const serialized = this._serialize(updated);
      this._emitToUser(user_id, 'notification.updated', serialized);
      return serialized;
    }

    return this.createNotification({
      company_id,
      user_id,
      kind,
      severity,
      title,
      message,
      action_path,
      action_params,
      signature,
    });
  }

  async listNotifications(user_id, params = {}) {
    const {
      filter = 'all',
      limit = 50,
      cursor = null,
    } = params;

    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const where = { user_id };

    if (filter === 'unread') where.is_read = false;
    if (filter === 'action') where.kind = 'action';
    if (filter === 'system') where.kind = 'system';

    const query = {
      where,
      take,
      orderBy: { createdAt: 'desc' },
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    const rows = await prisma.notification.findMany(query);

    return {
      data: rows.map((r) => this._serialize(r)),
      nextCursor: rows.length === take ? rows[rows.length - 1].id : null,
    };
  }

  async getUnreadCount(user_id) {
    return prisma.notification.count({ where: { user_id, is_read: false } });
  }

  async markRead(user_id, id) {
    const readAt = new Date();
    const updated = await prisma.notification.updateMany({
      where: { id, user_id, is_read: false },
      data: { is_read: true, read_at: readAt },
    });

    if (updated.count > 0) {
      this._emitToUser(user_id, 'notification.read', { id, readAt: readAt.toISOString() });
    }

    return { success: true, updated: updated.count };
  }

  async markAllRead(user_id) {
    const readAt = new Date();
    const updated = await prisma.notification.updateMany({
      where: { user_id, is_read: false },
      data: { is_read: true, read_at: readAt },
    });

    this._emitToUser(user_id, 'notification.read_all', { updated: updated.count, readAt: readAt.toISOString() });
    return { success: true, updated: updated.count };
  }

  async syncAlertNotifications({ user_id, company_id, alertsSummary = {} }) {
    const configs = [
      {
        key: 'overdueUploadCount',
        signature: 'alert.overdue_upload',
        title: 'Overdue Uploads',
        actionPath: '/dcc/documents',
        severity: 'warning',
      },
      {
        key: 'overdueResponseCount',
        signature: 'alert.overdue_response',
        title: 'Approval SLA Breach',
        actionPath: '/dcc/document-approver',
        severity: 'warning',
      },
      {
        key: 'stalledNcrCount',
        signature: 'alert.stalled_ncr',
        title: 'NCR Stalled',
        actionPath: '/ncr/create-ncr',
        severity: 'critical',
      },
      {
        key: 'stalledWeldStageCount',
        signature: 'alert.stalled_weld_stage',
        title: 'Weld Stages Stalled',
        actionPath: '/view-weldingjoints',
        severity: 'critical',
      },
      {
        key: 'stalledTransmissionCount',
        signature: 'alert.stalled_transmission',
        title: 'Pending Client Transmission',
        actionPath: '/dcc/client-approval-status',
        severity: 'warning',
      },
    ];

    for (const cfg of configs) {
      const count = Number(alertsSummary[cfg.key] || 0);

      if (count <= 0) {
        await prisma.notification.updateMany({
          where: {
            user_id,
            signature: cfg.signature,
            is_read: false,
          },
          data: {
            is_read: true,
            read_at: new Date(),
          },
        });
        continue;
      }

      await this.upsertUnreadBySignature({
        company_id,
        user_id,
        signature: cfg.signature,
        kind: 'action',
        severity: cfg.severity,
        title: cfg.title,
        message: `${count} item(s) require attention.`,
        action_path: cfg.actionPath,
      });
    }
  }

  /**
   * Broadcast a notification to all members of an Employee Group
   */
  async broadcastToEmployeeGroup({
    company_id,
    group_id,
    kind = 'action',
    severity = 'info',
    title,
    message,
    action_path = null,
    action_params = null,
    signature = null,
  }) {
    // Get all users in the group
    const userGroups = await prisma.user_employee_group.findMany({
      where: { employee_group_id: group_id },
      select: { user_id: true },
    });

    const userIds = userGroups.map((ug) => ug.user_id);
    if (userIds.length === 0) return [];

    const notifications = await Promise.all(
      userIds.map((user_id) =>
        this.createNotification({
          company_id,
          user_id,
          kind,
          severity,
          title,
          message,
          action_path,
          action_params,
          signature,
        })
      )
    );

    return notifications;
  }

  /**
   * Broadcast a notification to all members of a QC Group (Legacy)
   */
  async broadcastToQcGroup({
    company_id,
    group_id,
    kind = 'action',
    severity = 'info',
    title,
    message,
    action_path = null,
    action_params = null,
    signature = null,
  }) {
    // Get all users in the group
    const userGroups = await prisma.user_qc_group.findMany({
      where: { qc_group_id: group_id },
      select: { user_id: true },
    });

    const userIds = userGroups.map((ug) => ug.user_id);
    if (userIds.length === 0) return [];

    const notifications = await Promise.all(
      userIds.map((user_id) =>
        this.createNotification({
          company_id,
          user_id,
          kind,
          severity,
          title,
          message,
          action_path,
          action_params,
          signature,
        })
      )
    );

    return notifications;
  }
}

module.exports = new NotificationService();
