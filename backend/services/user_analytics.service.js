const prisma = require('#prisma');
const ExcelJS = require('exceljs');
const Audit = require('#utils/audit.js');

class UserAnalyticsService {
  /**
   * Parse timeframe dates with defaults (default: 30 days)
   */
  _parseDateRange(startDate, endDate, defaultDays = 30) {
    const now = new Date();
    let start, end;

    if (startDate) {
      start = new Date(startDate);
    } else {
      start = new Date(now.getTime() - defaultDays * 24 * 60 * 60 * 1000);
    }
    start.setHours(0, 0, 0, 0);

    if (endDate) {
      end = new Date(endDate);
    } else {
      end = new Date(now);
    }
    end.setHours(23, 59, 59, 999);

    // If passed as ISO date string (e.g. YYYY-MM-DD), also ensure UTC end-of-day is covered
    if (typeof endDate === 'string' && endDate.length === 10) {
      const utcEnd = new Date(endDate);
      utcEnd.setUTCHours(23, 59, 59, 999);
      if (utcEnd > end) {
        end = utcEnd;
      }
    }

    return { start, end };
  }

  /**
   * Get 5-Tier Overview Engagement KPIs
   */
  async getOverviewMetrics(company_id, query = {}) {
    const { start, end } = this._parseDateRange(query.startDate, query.endDate, Number(query.days) || 30);
    const department_id = query.department_id || undefined;
    const role = query.role || undefined;

    // Base user filter
    const userWhere = {
      company_id,
      is_deleted: false,
    };
    if (department_id) {
      userWhere.department_id = department_id;
    }
    if (role) {
      userWhere.user_roles = {
        some: {
          role: { name: { equals: role, mode: 'insensitive' } },
        },
      };
    }

    // 1. Total Registered Users
    const [allUsers, totalRegistered, activeAccounts, deactivatedAccounts] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          name: true,
          empid: true,
          department_id: true,
          department: { select: { name: true } },
          is_active: true,
          last_login_at: true,
          last_activity_at: true,
        },
      }),
      prisma.user.count({ where: userWhere }),
      prisma.user.count({ where: { ...userWhere, is_active: true } }),
      prisma.user.count({ where: { ...userWhere, is_active: false } }),
    ]);

    const targetUserIds = allUsers.map((u) => u.id);

    // 2. Logins within timeframe
    const loginWhere = {
      company_id,
      login_at: { gte: start, lte: end },
    };
    if (targetUserIds.length > 0) {
      loginWhere.user_id = { in: targetUserIds };
    } else if (department_id || role) {
      loginWhere.user_id = { in: [] };
    }

    const [loginActivities, distinctLoggedInUsers, failedLogins] = await Promise.all([
      prisma.user_login_activity.findMany({
        where: { ...loginWhere, status: 'SUCCESS' },
        select: { user_id: true, login_at: true },
      }),
      prisma.user_login_activity.findMany({
        where: { ...loginWhere, status: 'SUCCESS', user_id: { not: null } },
        distinct: ['user_id'],
        select: { user_id: true },
      }),
      prisma.user_login_activity.count({
        where: { ...loginWhere, status: 'FAILED' },
      }),
    ]);

    const loggedInUserIds = new Set(distinctLoggedInUsers.map((l) => l.user_id).filter(Boolean));

    // Also include any user whose last_login_at falls in timeframe
    allUsers.forEach((u) => {
      if (u.last_login_at && new Date(u.last_login_at) >= start && new Date(u.last_login_at) <= end) {
        loggedInUserIds.add(u.id);
      }
    });

    // 3. Modifying Actions from audit_log within timeframe
    const auditWhere = {
      company_id,
      createdAt: { gte: start, lte: end },
      user_id: targetUserIds.length > 0 ? { in: targetUserIds } : undefined,
    };
    if (targetUserIds.length === 0 && (department_id || role)) {
      auditWhere.user_id = { in: [] };
    }

    const [totalAuditOperations, distinctAuditUsers] = await Promise.all([
      prisma.audit_log.count({ where: auditWhere }),
      prisma.audit_log.findMany({
        where: { ...auditWhere, user_id: { not: null } },
        distinct: ['user_id'],
        select: { user_id: true },
      }),
    ]);

    const auditUserIds = new Set(distinctAuditUsers.map((a) => a.user_id).filter(Boolean));

    // Anyone who performed an authenticated action in the system was logged in
    auditUserIds.forEach((uid) => {
      loggedInUserIds.add(uid);
    });

    // 4. Calculate 3-Tier Categorization
    // Actually Active: Logged in AND has modifying action in audit_log
    const actuallyActiveUserIds = new Set();
    // Passive (Lurkers): Logged in, but 0 modifying actions in audit_log
    const passiveUserIds = new Set();
    // Dormant: No logins and no audit actions in period
    const dormantUserIds = new Set();

    targetUserIds.forEach((uid) => {
      const hasLogin = loggedInUserIds.has(uid);
      const hasAudit = auditUserIds.has(uid);

      if (hasLogin && hasAudit) {
        actuallyActiveUserIds.add(uid);
      } else if (hasLogin && !hasAudit) {
        passiveUserIds.add(uid);
      } else {
        dormantUserIds.add(uid);
      }
    });

    const totalLoggedUsers = loggedInUserIds.size;
    const totalActuallyActive = actuallyActiveUserIds.size;
    const totalPassive = passiveUserIds.size;
    const totalDormant = dormantUserIds.size;

    const loginRate = totalRegistered > 0 ? Math.round((totalLoggedUsers / totalRegistered) * 100) : 0;
    const activeRate = totalRegistered > 0 ? Math.round((totalActuallyActive / totalRegistered) * 100) : 0;
    const passiveRate = totalLoggedUsers > 0 ? Math.round((totalPassive / totalLoggedUsers) * 100) : 0;
    const dormantRate = totalRegistered > 0 ? Math.round((totalDormant / totalRegistered) * 100) : 0;

    const totalSuccessfulLogins = Math.max(loginActivities.length, totalLoggedUsers);

    const moduleGroups = await prisma.audit_log.groupBy({
      by: ['module'],
      where: auditWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    });
    const moduleDistribution = moduleGroups.map((m) => ({
      module: m.module || 'Other',
      count: m._count.id,
    }));

    return {
      timeframe: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      kpis: {
        totalRegistered,
        activeAccounts,
        deactivatedAccounts,
        loggedInUsers: totalLoggedUsers,
        actuallyActiveUsers: totalActuallyActive,
        passiveUsers: totalPassive,
        dormantUsers: totalDormant,
        totalSuccessfulLogins,
        totalFailedLogins: failedLogins,
        totalAuditOperations,
        loginRate,
        activeRate,
        passiveRate,
        dormantRate,
      },
      moduleDistribution,
    };
  }

  /**
   * Daily Trend Series (Logins vs Audit Operations)
   */
  async getTrendSeries(company_id, query = {}) {
    const { start, end } = this._parseDateRange(query.startDate, query.endDate, Number(query.days) || 30);
    const department_id = query.department_id || undefined;

    let userIds = undefined;
    if (department_id) {
      const users = await prisma.user.findMany({
        where: { company_id, department_id, is_deleted: false },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    }

    const [loginRecords, auditRecords] = await Promise.all([
      prisma.user_login_activity.findMany({
        where: {
          company_id,
          status: 'SUCCESS',
          login_at: { gte: start, lte: end },
          user_id: userIds ? { in: userIds } : undefined,
        },
        select: { login_at: true, user_id: true },
      }),
      prisma.audit_log.findMany({
        where: {
          company_id,
          createdAt: { gte: start, lte: end },
          user_id: userIds ? { in: userIds } : undefined,
        },
        select: { createdAt: true, user_id: true, action: true },
      }),
    ]);

    // Build day map
    const dayMap = new Map();
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const endMidnight = new Date(end);
    endMidnight.setHours(23, 59, 59, 999);

    while (cur <= endMidnight) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${d}`;
      const label = cur.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

      dayMap.set(key, {
        date: key,
        label,
        loggedInUserSet: new Set(),
        activeUserSet: new Set(),
        totalLoginEvents: 0,
        totalAuditOperations: 0,
      });
      cur.setDate(cur.getDate() + 1);
    }

    loginRecords.forEach((r) => {
      const d = new Date(r.login_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dayMap.has(key)) {
        const item = dayMap.get(key);
        item.totalLoginEvents += 1;
        if (r.user_id) {
          item.loggedInUserSet.add(r.user_id);
        }
      }
    });

    auditRecords.forEach((r) => {
      const d = new Date(r.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dayMap.has(key)) {
        const item = dayMap.get(key);
        item.totalAuditOperations += 1;
        if (r.user_id) {
          // A user performing an audit action was logged into the system
          item.loggedInUserSet.add(r.user_id);
          // AND was actively doing things in the system
          item.activeUserSet.add(r.user_id);
        }
      }
    });

    const series = Array.from(dayMap.values()).map((item) => {
      const loggedInUsers = item.loggedInUserSet.size;
      const activeUsers = item.activeUserSet.size;
      const passiveUsers = Math.max(0, loggedInUsers - activeUsers);
      const activityRate = loggedInUsers > 0 ? Math.round((activeUsers / loggedInUsers) * 100) : 0;

      return {
        date: item.date,
        label: item.label,
        loggedInUsers, // Total unique users logged in on this day
        activeUsers,   // Total unique users active (logged in + doing things)
        passiveUsers,  // Total unique users logged in with 0 modifying actions
        activityRate,
        logins: loggedInUsers,
        operations: item.totalAuditOperations,
      };
    });

    return { series };
  }

  /**
   * Department Breakdown (Active vs Passive vs Inactive)
   */
  async getDepartmentBreakdown(company_id, query = {}) {
    const { start, end } = this._parseDateRange(query.startDate, query.endDate, Number(query.days) || 30);

    const departments = await prisma.department.findMany({
      where: { company_id, is_deleted: false },
      include: {
        users: {
          where: { is_deleted: false },
          select: { id: true, is_active: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const [loginActivities, auditLogs] = await Promise.all([
      prisma.user_login_activity.findMany({
        where: {
          company_id,
          status: 'SUCCESS',
          login_at: { gte: start, lte: end },
        },
        select: { user_id: true, department_id: true },
      }),
      prisma.audit_log.findMany({
        where: {
          company_id,
          createdAt: { gte: start, lte: end },
        },
        select: { user_id: true },
      }),
    ]);

    const auditUserSet = new Set(auditLogs.map((a) => a.user_id).filter(Boolean));
    const deptLoginsMap = new Map();

    loginActivities.forEach((act) => {
      if (act.user_id) {
        if (!deptLoginsMap.has(act.user_id)) {
          deptLoginsMap.set(act.user_id, true);
        }
      }
    });

    const breakdown = departments.map((dept) => {
      const totalUsers = dept.users.length;
      let loggedIn = 0;
      let actuallyActive = 0;
      let passive = 0;

      dept.users.forEach((u) => {
        const hasAudit = auditUserSet.has(u.id);
        const hasLogin = deptLoginsMap.has(u.id) || hasAudit;

        if (hasLogin) {
          loggedIn += 1;
          if (hasAudit) {
            actuallyActive += 1;
          } else {
            passive += 1;
          }
        }
      });

      const dormant = Math.max(0, totalUsers - loggedIn);
      const activityRate = totalUsers > 0 ? Math.round((actuallyActive / totalUsers) * 100) : 0;

      return {
        id: dept.id,
        name: dept.name,
        totalUsers,
        loggedInUsers: loggedIn,
        actuallyActiveUsers: actuallyActive,
        passiveUsers: passive,
        dormantUsers: dormant,
        activityRate,
      };
    });

    return { breakdown };
  }

  /**
   * Inactivity Ageing Bucket Analysis
   */
  async getInactivityAgeing(company_id, query = {}) {
    const department_id = query.department_id || undefined;

    const userWhere = {
      company_id,
      is_deleted: false,
    };
    if (department_id) {
      userWhere.department_id = department_id;
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        empid: true,
        email: true,
        designation: true,
        is_active: true,
        last_login_at: true,
        last_activity_at: true,
        createdAt: true,
        department: { select: { id: true, name: true } },
        user_roles: {
          select: { role: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = Date.now();
    const buckets = {
      '0-10': { label: '0–10 Days (Active)', count: 0, users: [] },
      '11-20': { label: '11–20 Days (Mild)', count: 0, users: [] },
      '21-30': { label: '21–30 Days (Moderate)', count: 0, users: [] },
      '31-60': { label: '31–60 Days (Inactive)', count: 0, users: [] },
      '61-90': { label: '61–90 Days (Severely Inactive)', count: 0, users: [] },
      '90+': { label: '>90 Days (Abandoned)', count: 0, users: [] },
      'never': { label: 'Never Active / No History', count: 0, users: [] },
    };

    users.forEach((u) => {
      const loginTime = u.last_login_at ? new Date(u.last_login_at).getTime() : 0;
      const actTime = u.last_activity_at ? new Date(u.last_activity_at).getTime() : 0;
      const latest = Math.max(loginTime, actTime);

      let key = 'never';
      let daysInactive = null;

      if (latest > 0) {
        daysInactive = Math.floor((now - latest) / (1000 * 60 * 60 * 24));
        if (daysInactive <= 10) key = '0-10';
        else if (daysInactive <= 20) key = '11-20';
        else if (daysInactive <= 30) key = '21-30';
        else if (daysInactive <= 60) key = '31-60';
        else if (daysInactive <= 90) key = '61-90';
        else key = '90+';
      }

      const item = {
        id: u.id,
        name: u.name,
        empid: u.empid,
        email: u.email,
        designation: u.designation || '-',
        department: u.department?.name || 'Unassigned',
        roles: u.user_roles.map((r) => r.role?.name).filter(Boolean),
        is_active: u.is_active,
        last_login_at: u.last_login_at,
        last_activity_at: u.last_activity_at,
        effective_last_active: latest > 0 ? new Date(latest).toISOString() : null,
        days_inactive: daysInactive,
        bucket: key,
      };

      buckets[key].count += 1;
      buckets[key].users.push(item);
    });

    return {
      totalUsers: users.length,
      buckets,
    };
  }

  /**
   * Paginated, Filterable Login Activity Records
   */
  async getLoginActivityRecords(company_id, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const {
      search,
      status,
      department_id,
      startDate,
      endDate,
      user_id,
      groupByUser,
      sortBy = 'login_at',
      sortOrder = 'desc',
    } = query;

    const where = { company_id };

    if (user_id) {
      where.user_id = user_id;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (department_id) {
      where.department_id = department_id;
    }

    if (startDate || endDate) {
      const { start, end } = this._parseDateRange(startDate, endDate, 30);
      where.login_at = { gte: start, lte: end };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { user_name: { contains: q, mode: 'insensitive' } },
        { employee_id: { contains: q, mode: 'insensitive' } },
        { department_name: { contains: q, mode: 'insensitive' } },
        { ip_address: { contains: q, mode: 'insensitive' } },
      ];
    }

    // If grouping by unique user (default for executive overview table)
    if (groupByUser === 'true' || groupByUser === true) {
      const allMatchingRecords = await prisma.user_login_activity.findMany({
        where,
        orderBy: { login_at: 'desc' },
      });

      const userMap = new Map();
      allMatchingRecords.forEach((r) => {
        const uid = r.user_id || r.employee_id;
        if (!uid) return;

        if (!userMap.has(uid)) {
          userMap.set(uid, {
            id: r.user_id || r.id,
            user_id: r.user_id,
            user_name: r.user_name,
            employee_id: r.employee_id,
            department_name: r.department_name,
            role_names: r.role_names,
            last_login_at: r.login_at,
            login_at: r.login_at,
            total_logins: 0,
            status: r.status,
            active_session: r.logout_at == null && r.status === 'SUCCESS',
            ip_address: r.ip_address,
            user_agent: r.user_agent,
          });
        }

        const u = userMap.get(uid);
        u.total_logins += 1;
        if (r.logout_at == null && r.status === 'SUCCESS') {
          u.active_session = true;
        }
      });

      const uniqueList = Array.from(userMap.values());

      // Sort
      const isAsc = sortOrder.toLowerCase() === 'asc';
      uniqueList.sort((a, b) => {
        let av = a[sortBy] ?? a.last_login_at;
        let bv = b[sortBy] ?? b.last_login_at;
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return isAsc ? -1 : 1;
        if (av > bv) return isAsc ? 1 : -1;
        return 0;
      });

      const totalUnique = uniqueList.length;
      const paginatedUnique = uniqueList.slice(skip, skip + limit);

      return {
        data: paginatedUnique,
        pagination: {
          page,
          limit,
          total: totalUnique,
          totalPages: Math.ceil(totalUnique / limit) || 1,
        },
      };
    }

    // Default: Session records (used when user_id is passed or full raw session logs requested)
    const [total, records] = await Promise.all([
      prisma.user_login_activity.count({ where }),
      prisma.user_login_activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' },
      }),
    ]);

    return {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * User Productivity & Audit Summary Records
   */
  async getUserProductivityRecords(company_id, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { search, department_id, startDate, endDate, tier, sortBy = 'totalOperations', sortOrder = 'desc' } = query;
    const { start, end } = this._parseDateRange(startDate, endDate, 30);

    const userWhere = {
      company_id,
      is_deleted: false,
    };
    if (department_id) userWhere.department_id = department_id;

    if (search && search.trim()) {
      const q = search.trim();
      userWhere.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { empid: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        empid: true,
        email: true,
        designation: true,
        is_active: true,
        last_login_at: true,
        last_activity_at: true,
        department: { select: { id: true, name: true } },
        user_roles: {
          select: { role: { select: { name: true } } },
        },
      },
    });

    // Fetch audit activity counts and login events for all fetched users in date range
    const userIds = users.map((u) => u.id);
    const [loginActivities, auditLogs] = await Promise.all([
      prisma.user_login_activity.findMany({
        where: {
          company_id,
          user_id: { in: userIds },
          status: 'SUCCESS',
          login_at: { gte: start, lte: end },
        },
        select: { user_id: true },
      }),
      prisma.audit_log.findMany({
        where: {
          company_id,
          user_id: { in: userIds },
          createdAt: { gte: start, lte: end },
        },
        select: {
          user_id: true,
          module: true,
          action: true,
          createdAt: true,
        },
      }),
    ]);

    const loggedInUserSet = new Set(loginActivities.map((l) => l.user_id).filter(Boolean));
    users.forEach((u) => {
      if (u.last_login_at && new Date(u.last_login_at) >= start && new Date(u.last_login_at) <= end) {
        loggedInUserSet.add(u.id);
      }
    });
    auditLogs.forEach((l) => {
      if (l.user_id) loggedInUserSet.add(l.user_id);
    });

    // Group audit logs by user
    const statsMap = new Map();
    auditLogs.forEach((log) => {
      if (!statsMap.has(log.user_id)) {
        statsMap.set(log.user_id, {
          total: 0,
          created: 0,
          updated: 0,
          deleted: 0,
          modules: {},
          latestAction: null,
        });
      }
      const st = statsMap.get(log.user_id);
      st.total += 1;
      if (log.action === 'created') st.created += 1;
      else if (log.action === 'updated') st.updated += 1;
      else if (log.action === 'deleted') st.deleted += 1;

      st.modules[log.module] = (st.modules[log.module] || 0) + 1;
      if (!st.latestAction || new Date(log.createdAt) > new Date(st.latestAction)) {
        st.latestAction = log.createdAt;
      }
    });

    const rows = users.map((u) => {
      const st = statsMap.get(u.id) || {
        total: 0,
        created: 0,
        updated: 0,
        deleted: 0,
        modules: {},
        latestAction: null,
      };

      const topModule = Object.entries(st.modules).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
      const hasLogin = loggedInUserSet.has(u.id);
      const hasAudit = st.total > 0;
      const userTier = (hasLogin && hasAudit) ? 'ACTIVE' : (hasLogin && !hasAudit) ? 'PASSIVE' : 'DORMANT';

      return {
        id: u.id,
        name: u.name,
        empid: u.empid,
        email: u.email,
        designation: u.designation || '-',
        department: u.department?.name || 'Unassigned',
        roles: u.user_roles.map((r) => r.role?.name).filter(Boolean),
        is_active: u.is_active,
        last_login_at: u.last_login_at,
        last_activity_at: u.last_activity_at,
        totalOperations: st.total,
        createdCount: st.created,
        updatedCount: st.updated,
        deletedCount: st.deleted,
        topModule,
        latestActionInPeriod: st.latestAction,
        isActuallyActive: hasAudit,
        tier: userTier,
      };
    });

    // Filter by tier if specified
    let filteredRows = rows;
    if (tier && tier !== 'ALL') {
      filteredRows = rows.filter((r) => r.tier === tier);
    }

    // Sort in memory
    const isAsc = sortOrder.toLowerCase() === 'asc';
    filteredRows.sort((a, b) => {
      let av = a[sortBy] ?? 0;
      let bv = b[sortBy] ?? 0;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return isAsc ? -1 : 1;
      if (av > bv) return isAsc ? 1 : -1;
      return 0;
    });

    const paginatedRows = filteredRows.slice(skip, skip + limit);

    return {
      data: paginatedRows,
      pagination: {
        page,
        limit,
        total: filteredRows.length,
        totalPages: Math.ceil(filteredRows.length / limit) || 1,
      },
    };
  }

  /**
   * Export Login Records to Excel Buffer
   */
  async exportLoginsToExcel(company_id, query = {}, reqUser = {}) {
    const { data } = await this.getLoginActivityRecords(company_id, {
      ...query,
      page: 1,
      limit: 50000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DMS User Analytics';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Login Activity', {
      headerFooter: { firstHeader: 'DMS — User Login Activity Report' },
    });

    const isGrouped = query.groupByUser === 'true' || query.groupByUser === true;

    if (isGrouped) {
      sheet.columns = [
        { header: 'Employee ID', key: 'employee_id', width: 14 },
        { header: 'User Name', key: 'user_name', width: 24 },
        { header: 'Department', key: 'department_name', width: 20 },
        { header: 'Roles', key: 'role_names', width: 20 },
        { header: 'Last Login Time', key: 'last_login_at', width: 22 },
        { header: 'Total Logins in Period', key: 'total_logins', width: 18 },
        { header: 'Session Status', key: 'session_status', width: 16 },
        { header: 'Last IP Address', key: 'ip_address', width: 16 },
        { header: 'Last Device / Browser', key: 'user_agent', width: 40 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 28;

      data.forEach((r) => {
        sheet.addRow({
          employee_id: r.employee_id || '-',
          user_name: r.user_name || '-',
          department_name: r.department_name || '-',
          role_names: Array.isArray(r.role_names) ? r.role_names.join(', ') : '-',
          last_login_at: r.last_login_at ? new Date(r.last_login_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-',
          total_logins: r.total_logins || 1,
          session_status: r.active_session ? 'Active Now' : 'Logged Out',
          ip_address: r.ip_address || '-',
          user_agent: r.user_agent || '-',
        });
      });

      sheet.autoFilter = { from: 'A1', to: `I${data.length + 1}` };
    } else {
      sheet.columns = [
        { header: 'Login Time', key: 'login_at', width: 22 },
        { header: 'Employee ID', key: 'employee_id', width: 14 },
        { header: 'User Name', key: 'user_name', width: 24 },
        { header: 'Department', key: 'department_name', width: 20 },
        { header: 'Roles', key: 'role_names', width: 20 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Failure Reason', key: 'failure_reason', width: 22 },
        { header: 'Logout Time', key: 'logout_at', width: 22 },
        { header: 'Session Duration (sec)', key: 'session_duration', width: 20 },
        { header: 'IP Address', key: 'ip_address', width: 16 },
        { header: 'Device / Browser', key: 'user_agent', width: 40 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 28;

      data.forEach((r) => {
        sheet.addRow({
          login_at: r.login_at ? new Date(r.login_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-',
          employee_id: r.employee_id || '-',
          user_name: r.user_name || '-',
          department_name: r.department_name || '-',
          role_names: Array.isArray(r.role_names) ? r.role_names.join(', ') : '-',
          status: r.status,
          failure_reason: r.failure_reason || '-',
          logout_at: r.logout_at ? new Date(r.logout_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-',
          session_duration: r.session_duration != null ? r.session_duration : '-',
          ip_address: r.ip_address || '-',
          user_agent: r.user_agent || '-',
        });
      });

      sheet.autoFilter = { from: 'A1', to: `K${data.length + 1}` };
    }

    // Audit the export action
    Audit.insert({
      company_id,
      user_id: reqUser.userid || null,
      action: 'exported',
      module: 'USER_ANALYTICS',
      description: `Exported ${data.length} user login activity records to Excel`,
    });

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Export Inactivity Ageing Roster to Excel
   */
  async exportInactivityToExcel(company_id, query = {}, reqUser = {}) {
    const { buckets, totalUsers } = await this.getInactivityAgeing(company_id, query);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DMS User Analytics';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Inactivity Roster', {
      headerFooter: { firstHeader: 'DMS — Inactivity & Ageing Analysis Roster' },
    });

    sheet.columns = [
      { header: 'Emp ID', key: 'empid', width: 14 },
      { header: 'User Name', key: 'name', width: 24 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Account Status', key: 'status', width: 14 },
      { header: 'Inactivity Bucket', key: 'bucket', width: 24 },
      { header: 'Days Inactive', key: 'days_inactive', width: 14 },
      { header: 'Last Login', key: 'last_login_at', width: 22 },
      { header: 'Last System Action', key: 'last_activity_at', width: 22 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    let rowCount = 0;
    Object.values(buckets).forEach((b) => {
      b.users.forEach((u) => {
        rowCount += 1;
        sheet.addRow({
          empid: u.empid,
          name: u.name,
          email: u.email,
          department: u.department,
          designation: u.designation,
          status: u.is_active ? 'Active' : 'Deactivated',
          bucket: b.label,
          days_inactive: u.days_inactive != null ? u.days_inactive : 'N/A',
          last_login_at: u.last_login_at ? new Date(u.last_login_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never',
          last_activity_at: u.last_activity_at ? new Date(u.last_activity_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never',
        });
      });
    });

    sheet.autoFilter = { from: 'A1', to: `J${rowCount + 1}` };

    Audit.insert({
      company_id,
      user_id: reqUser.userid || null,
      action: 'exported',
      module: 'USER_ANALYTICS',
      description: `Exported user inactivity roster (${rowCount} users) to Excel`,
    });

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new UserAnalyticsService();
