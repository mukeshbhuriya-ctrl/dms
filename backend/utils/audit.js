const prisma = require('#prisma');

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Audit — Enterprise Audit Log Utility                          │
 * │                                                                │
 * │  Usage (inside any controller / service):                      │
 * │                                                                │
 * │    const Audit = require('#utils/audit.js');                   │
 * │                                                                │
 * │    Audit.insert({                                              │
 * │      company_id,                                               │
 * │      user_id,                                                  │
 * │      action:      'created',                                   │
 * │      module:      'Purchase Orders',                           │
 * │      description: `Created PO #${po_number} for ${customer}`, │
 * │      metadata:    { po_id: result.id, po_number },             │
 * │    });                                                         │
 * │                                                                │
 * │  • Fire-and-forget — never throws or blocks.                   │
 * │  • Pass req object to auto-extract user/IP/UA.                 │
 * └─────────────────────────────────────────────────────────────────┘
 */

class Audit {

  /**
   * Insert an audit log entry.
   *
   * @param {Object}  params
   * @param {string}  params.company_id   - Company ID (required)
   * @param {string}  [params.user_id]    - User ID who performed the action
   * @param {string}  [params.user_name]  - Human name (auto-resolved if user_id provided)
   * @param {string}  [params.user_empid] - EmpID (auto-resolved if user_id provided)
   * @param {string}  params.action       - "created" | "updated" | "deleted" | any custom string
   * @param {string}  params.module       - Module name: "Purchase Orders", "Customers", "DTN", etc.
   * @param {string}  params.description  - Human-readable sentence describing what happened
   * @param {Object}  [params.metadata]   - Any extra context to store (IDs, numbers, etc.)
   * @param {Object}  [params.req]        - Express req object (auto-extracts IP, user-agent, endpoint, method)
   */
  static async insert({
    company_id,
    user_id,
    user_name,
    user_empid,
    action,
    module: moduleName,
    description,
    metadata,
    req,
  }) {
    try {
      // Auto-resolve user name & empid from DB if not provided
      let resolvedName = user_name || 'System';
      let resolvedEmpid = user_empid || '-';

      if (user_id && (!user_name || !user_empid)) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user_id },
            select: { name: true, empid: true },
          });
          if (dbUser) {
            resolvedName = user_name || dbUser.name;
            resolvedEmpid = user_empid || dbUser.empid;
          }
        } catch {
          // Silently continue with defaults
        }
      }

      // Auto-extract from req if provided
      let method = 'SYSTEM';
      let endpoint = '-';
      let ipAddress = null;
      let userAgent = null;

      if (req) {
        method = req.method || 'SYSTEM';
        endpoint = req.originalUrl || req.url || '-';
        ipAddress = req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || null;
        userAgent = req.headers?.['user-agent'] || null;
        if (userAgent) userAgent = userAgent.substring(0, 500);

        // Auto-extract user info from req.user if not explicitly provided
        if (!user_id && req.user) {
          user_id = req.user.userid || req.user.id || null;
        }
        if (!company_id && req.user) {
          company_id = req.user.company_id;
        }
      }

      // Validate required fields
      if (!company_id) {
        console.warn('[Audit] Skipped — company_id is required');
        return;
      }

      await prisma.audit_log.create({
        data: {
          company_id,
          user_id: user_id || null,
          user_name: resolvedName,
          user_empid: resolvedEmpid,
          method,
          action: action || 'unknown',
          module: moduleName || 'System',
          endpoint,
          status_code: 0, // Manual inserts don't have an HTTP status
          description: description || `${resolvedName} performed ${action} in ${moduleName}`,
          request_body: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      });

      // Update user's last_activity_at asynchronously
      if (user_id) {
        prisma.user.update({
          where: { id: user_id },
          data: { last_activity_at: new Date() }
        }).catch(() => {});
      }
    } catch (error) {
      // Fire-and-forget — NEVER block the main workflow
      console.error('[Audit] Failed to persist audit log:', error.message);
    }
  }
}

module.exports = Audit;
