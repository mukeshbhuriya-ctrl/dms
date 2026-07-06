const prisma = require('#prisma');
const ExcelJS = require('exceljs');

/**
 * Enterprise Audit Log Service
 * Handles CRUD, pagination, filtering, and export for system-wide audit entries.
 */
class AuditLogService {

  /**
   * Sensitive keys that must never be persisted in audit log request_body.
   */
  static SENSITIVE_KEYS = new Set([
    'password', 'confirm_password', 'new_password', 'old_password',
    'otp', 'otpExpiry', 'token', 'secret', 'authorization',
  ]);

  /**
   * Sanitize a request body by stripping sensitive fields.
   * @param {Object} body
   * @returns {Object|null}
   */
  static sanitizeBody(body) {
    if (!body || typeof body !== 'object') return null;

    // Skip if body is a FormData / multipart (Buffer or stream)
    if (Buffer.isBuffer(body)) return { _note: 'Binary payload omitted' };

    try {
      const sanitized = {};
      for (const [key, value] of Object.entries(body)) {
        if (AuditLogService.SENSITIVE_KEYS.has(key.toLowerCase())) {
          sanitized[key] = '***REDACTED***';
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    } catch {
      return null;
    }
  }

  /**
   * Create a new audit log entry.
   * @param {Object} data
   */
  async create(data) {
    try {
      if (data && data.description) {
        console.info(`[Activity] ${data.description}`);
      }
      return await prisma.audit_log.create({ data });
    } catch (error) {
      // Fire-and-forget — never block the main request
      console.error('[AuditLogService] Failed to persist audit log:', error.message);
    }
  }

  /**
   * Paginated, filterable list of audit logs.
   * @param {Object} params
   * @returns {{ data: Array, meta: Object }}
   */
  async findAll({ company_id, page = 1, limit = 20, search = '', filters = {} }) {
    const where = { company_id };

    // Module filter (multi-select)
    if (filters.module && filters.module.length) {
      where.module = { in: Array.isArray(filters.module) ? filters.module : [filters.module] };
    }

    // Action filter (multi-select)
    if (filters.action && filters.action.length) {
      where.action = { in: Array.isArray(filters.action) ? filters.action : [filters.action] };
    }

    // User filter
    if (filters.user_id) {
      where.user_id = filters.user_id;
    }

    // Status code filter
    if (filters.status_code) {
      const code = parseInt(filters.status_code, 10);
      if (!isNaN(code)) {
        where.status_code = code;
      }
    }

    // Date range
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        // Include the entire "dateTo" day
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Global search
    if (search.trim()) {
      const term = search.trim();
      where.OR = [
        { description: { contains: term, mode: 'insensitive' } },
        { user_name: { contains: term, mode: 'insensitive' } },
        { user_empid: { contains: term, mode: 'insensitive' } },
        { module: { contains: term, mode: 'insensitive' } },
        { endpoint: { contains: term, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.audit_log.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.audit_log.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get filter options for the audit log viewer UI.
   * @param {string} company_id
   */
  async getFilterOptions(company_id) {
    // Fetch distinct modules and distinct users in parallel
    const [modules, users] = await Promise.all([
      prisma.audit_log.findMany({
        where: { company_id },
        distinct: ['module'],
        select: { module: true },
        orderBy: { module: 'asc' },
      }),
      prisma.audit_log.findMany({
        where: { company_id },
        distinct: ['user_id'],
        select: { user_id: true, user_name: true, user_empid: true },
        orderBy: { user_name: 'asc' },
      }),
    ]);

    return {
      modules: modules.map(m => m.module),
      users: users
        .filter(u => u.user_id)
        .map(u => ({ id: u.user_id, name: u.user_name, empid: u.user_empid })),
      actions: ['created', 'updated', 'deleted'],
    };
  }

  /**
   * Export audit logs to an Excel buffer.
   * @param {Object} params — same shape as findAll but without pagination
   * @returns {Buffer}
   */
  async exportToExcel({ company_id, search = '', filters = {} }) {
    // Re-use findAll with a very large limit to fetch all matching records
    const { data } = await this.findAll({
      company_id,
      page: 1,
      limit: 50000,
      search,
      filters,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DMS Audit System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Audit Logs', {
      headerFooter: { firstHeader: 'DMS — Audit Log Report' },
    });

    // Define columns
    sheet.columns = [
      { header: 'Timestamp', key: 'createdAt', width: 22 },
      { header: 'User', key: 'user_name', width: 24 },
      { header: 'EmpID', key: 'user_empid', width: 14 },
      { header: 'Action', key: 'action', width: 12 },
      { header: 'Module', key: 'module', width: 14 },
      { header: 'Description', key: 'description', width: 60 },
      { header: 'IP Address', key: 'ip_address', width: 16 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    // Add data rows
    data.forEach(log => {
      sheet.addRow({
        createdAt: new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        user_name: log.user_name,
        user_empid: log.user_empid,
        action: log.action.charAt(0).toUpperCase() + log.action.slice(1),
        module: log.module,
        description: log.description,
        ip_address: log.ip_address || '-',
      });
    });

    // Auto-filter
    sheet.autoFilter = { from: 'A1', to: `G${data.length + 1}` };

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new AuditLogService();
