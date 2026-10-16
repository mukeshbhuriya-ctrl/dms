const prisma = require('#prisma');
const ExcelJS = require('exceljs');
const Audit = require('#utils/audit.js');

class DcrAnalyticsService {
  /**
   * Helper to parse and calculate month date ranges
   */
  _getDateRangeForMonth(year, monthIndex) {
    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
    return { start, end };
  }

  /**
   * Resolve default timeframe (Financial Year or Calendar Year)
   */
  _resolveYearMonths(yearType = 'FY', targetYear) {
    const now = new Date();
    const currentYear = targetYear ? parseInt(targetYear, 10) : now.getFullYear();
    const months = [];

    if (yearType === 'FY') {
      const startYear = currentYear;
      for (let m = 3; m < 12; m++) {
        months.push({ year: startYear, monthIndex: m });
      }
      for (let m = 0; m < 3; m++) {
        months.push({ year: startYear + 1, monthIndex: m });
      }
    } else {
      for (let m = 0; m < 12; m++) {
        months.push({ year: currentYear, monthIndex: m });
      }
    }

    return months;
  }

  /**
   * Resolve months between start and end dates
   */
  _resolveMonthsForRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = [];

    const cur = new Date(Date.UTC(start.getFullYear(), start.getMonth(), 1));
    const endMonth = new Date(Date.UTC(end.getFullYear(), end.getMonth(), 1));

    while (cur <= endMonth) {
      months.push({
        year: cur.getUTCFullYear(),
        monthIndex: cur.getUTCMonth(),
      });
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }

    if (months.length === 0) {
      months.push({
        year: start.getFullYear(),
        monthIndex: start.getMonth(),
      });
    }
    return months;
  }

  /**
   * Extract effective status from DCR item
   */
  _getEffectiveStatus(dcr) {
    const statusRecord = Array.isArray(dcr.dcr_status) && dcr.dcr_status.length > 0
      ? dcr.dcr_status[0]
      : null;

    const rawStatus = String(statusRecord?.status || 'pending').toLowerCase();
    const designStatus = String(statusRecord?.design_engineer_status || 'pending').toLowerCase();
    const qualityStatus = String(statusRecord?.quality_engineer_status || 'pending').toLowerCase();

    const isApproved = rawStatus === 'approved' || (designStatus === 'approved' && qualityStatus === 'approved');
    const isRejected = rawStatus === 'rejected' || rawStatus === 'design_rejected' || designStatus === 'rejected' || qualityStatus === 'rejected';

    return {
      status: isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : 'PENDING',
      rawStatus,
      designStatus: designStatus.toUpperCase(),
      qualityStatus: qualityStatus.toUpperCase(),
      isApproved,
      isRejected,
      isPending: !isApproved && !isRejected,
      statusUpdatedAt: statusRecord?.updatedAt || statusRecord?.createdAt || dcr.updatedAt,
    };
  }

  /**
   * Month-Wise DCR Analytics Overview & Metrics
   */
  async getMonthWiseOverview(company_id, query = {}) {
    const {
      yearType = 'FY',
      year,
      startDate,
      endDate,
      job_id,
      client,
    } = query;

    const andConditions = [
      { company_id },
      { is_deleted: false },
    ];

    if (job_id) andConditions.push({ job_id });
    if (client) {
      andConditions.push({
        job: {
          customer: {
            customer_name: { contains: client, mode: 'insensitive' },
          },
        },
      });
    }

    // Determine months list & window range
    let windowStart;
    let windowEnd;
    let monthConfigs;

    if (startDate && endDate) {
      windowStart = new Date(startDate);
      windowStart.setHours(0, 0, 0, 0);
      windowEnd = new Date(endDate);
      windowEnd.setHours(23, 59, 59, 999);
      monthConfigs = this._resolveMonthsForRange(windowStart, windowEnd);
    } else {
      monthConfigs = this._resolveYearMonths(yearType, year);
      windowStart = this._getDateRangeForMonth(monthConfigs[0].year, monthConfigs[0].monthIndex).start;
      windowEnd = this._getDateRangeForMonth(monthConfigs[monthConfigs.length - 1].year, monthConfigs[monthConfigs.length - 1].monthIndex).end;
    }

    andConditions.push({
      createdAt: { gte: windowStart, lte: windowEnd },
    });

    const periodWhere = { AND: andConditions };

    const allDcrsInPeriod = await prisma.dcr.findMany({
      where: periodWhere,
      include: {
        job: {
          select: {
            id: true,
            job_number: true,
            equipement_name: true,
            customer: { select: { customer_name: true } },
          },
        },
        design_engineer: { select: { id: true, name: true, empid: true } },
        quality_engineer: { select: { id: true, name: true, empid: true } },
        dcr_status: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        dcr_change_request: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Month-by-month aggregation map
    const monthMap = new Map();
    monthConfigs.forEach(({ year: y, monthIndex: mi }) => {
      const monthDate = new Date(Date.UTC(y, mi, 1));
      const key = `${y}-${String(mi + 1).padStart(2, '0')}`;
      const monthLabel = monthDate.toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      const shortLabel = monthDate.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' });

      monthMap.set(key, {
        key,
        year: y,
        monthIndex: mi,
        label: monthLabel,
        shortLabel,
        totalRaised: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        approvalRate: 0,
        avgResolutionDays: 0,
        resolutionDaysSum: 0,
        resolutionCount: 0,
        dcrs: [],
      });
    });

    let overallTotal = 0;
    let overallPending = 0;
    let overallApproved = 0;
    let overallRejected = 0;
    let totalTurnaroundSum = 0;
    let totalResolvedCount = 0;

    for (const d of allDcrsInPeriod) {
      const dDate = new Date(d.createdAt);
      const y = dDate.getUTCFullYear();
      const m = dDate.getUTCMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;

      const statusMeta = this._getEffectiveStatus(d);
      const isApproved = statusMeta.isApproved;
      const isRejected = statusMeta.isRejected;
      const isPending = statusMeta.isPending;

      let turnaroundDays = null;
      if (isApproved || isRejected) {
        const closeDate = new Date(statusMeta.statusUpdatedAt);
        const diffMs = closeDate.getTime() - dDate.getTime();
        turnaroundDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        totalTurnaroundSum += turnaroundDays;
        totalResolvedCount += 1;
      }

      overallTotal += 1;
      if (isApproved) overallApproved += 1;
      else if (isRejected) overallRejected += 1;
      else overallPending += 1;

      if (monthMap.has(key)) {
        const entry = monthMap.get(key);
        entry.totalRaised += 1;
        if (isApproved) entry.approvedCount += 1;
        else if (isRejected) entry.rejectedCount += 1;
        else entry.pendingCount += 1;

        if (turnaroundDays !== null) {
          entry.resolutionDaysSum += turnaroundDays;
          entry.resolutionCount += 1;
        }

        entry.dcrs.push({
          id: d.id,
          dcr_no: d.dcr_no,
          createdAt: d.createdAt,
          status: statusMeta.status,
          turnaroundDays,
        });
      }
    }

    const monthlySeries = [];
    monthMap.forEach((entry) => {
      entry.approvalRate = entry.totalRaised > 0
        ? Math.round((entry.approvedCount / entry.totalRaised) * 100)
        : 0;
      entry.avgResolutionDays = entry.resolutionCount > 0
        ? Math.round(entry.resolutionDaysSum / entry.resolutionCount)
        : 0;
      monthlySeries.push(entry);
    });

    const overallApprovalRate = overallTotal > 0
      ? Math.round((overallApproved / overallTotal) * 100)
      : 0;
    const overallAvgTurnaroundDays = totalResolvedCount > 0
      ? Math.round(totalTurnaroundSum / totalResolvedCount)
      : 0;

    return {
      window: {
        startDate: windowStart.toISOString().slice(0, 10),
        endDate: windowEnd.toISOString().slice(0, 10),
        yearType,
      },
      kpis: {
        totalRaised: overallTotal,
        pendingApproval: overallPending,
        approvedClosed: overallApproved,
        rejected: overallRejected,
        approvalRate: overallApprovalRate,
        avgTurnaroundDays: overallAvgTurnaroundDays,
      },
      monthlySeries,
    };
  }

  /**
   * Paginated, Filterable Month-Wise DCR Records Ledger
   */
  async getDcrRecords(company_id, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const {
      search,
      month, // e.g. "2026-07"
      status, // 'ALL', 'PENDING', 'APPROVED', 'REJECTED'
      job_id,
      client,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const andConditions = [
      { company_id },
      { is_deleted: false },
    ];

    if (job_id) andConditions.push({ job_id });
    if (client) {
      andConditions.push({
        job: {
          customer: {
            customer_name: { contains: client, mode: 'insensitive' },
          },
        },
      });
    }

    // Month filter: "YYYY-MM"
    if (month && month !== 'ALL') {
      const [yStr, mStr] = month.split('-');
      const y = parseInt(yStr, 10);
      const mIdx = parseInt(mStr, 10) - 1;
      if (!isNaN(y) && !isNaN(mIdx)) {
        const { start, end } = this._getDateRangeForMonth(y, mIdx);
        andConditions.push({
          createdAt: { gte: start, lte: end },
        });
      }
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      andConditions.push({
        createdAt: { gte: start, lte: end },
      });
    }

    // Status filter
    if (status && status !== 'ALL') {
      const s = status.toUpperCase();
      if (s === 'APPROVED') {
        andConditions.push({
          dcr_status: {
            some: {
              OR: [
                { status: 'approved' },
                {
                  AND: [
                    { design_engineer_status: 'approved' },
                    { quality_engineer_status: 'approved' },
                  ],
                },
              ],
            },
          },
        });
      } else if (s === 'REJECTED') {
        andConditions.push({
          dcr_status: {
            some: {
              OR: [
                { status: { in: ['rejected', 'design_rejected'] } },
                { design_engineer_status: 'rejected' },
                { quality_engineer_status: 'rejected' },
              ],
            },
          },
        });
      } else if (s === 'PENDING') {
        andConditions.push({
          dcr_status: {
            none: {
              OR: [
                { status: { in: ['approved', 'rejected', 'design_rejected'] } },
                {
                  AND: [
                    { design_engineer_status: 'approved' },
                    { quality_engineer_status: 'approved' },
                  ],
                },
              ],
            },
          },
        });
      }
    }

    // Search query
    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { dcr_no: { contains: q, mode: 'insensitive' } },
          { drg_no: { contains: q, mode: 'insensitive' } },
          { equ_no: { contains: q, mode: 'insensitive' } },
          { inspect_by: { contains: q, mode: 'insensitive' } },
          {
            job: {
              OR: [
                { job_number: { contains: q, mode: 'insensitive' } },
                { customer: { customer_name: { contains: q, mode: 'insensitive' } } },
                { po: { po_number: { contains: q, mode: 'insensitive' } } },
              ],
            },
          },
        ],
      });
    }

    const where = { AND: andConditions };

    const [total, records] = await Promise.all([
      prisma.dcr.count({ where }),
      prisma.dcr.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' },
        include: {
          job: {
            select: {
              id: true,
              job_number: true,
              equipement_name: true,
              customer: { select: { customer_name: true } },
              po: { select: { po_number: true } },
            },
          },
          design_engineer: { select: { id: true, name: true, empid: true } },
          quality_engineer: { select: { id: true, name: true, empid: true } },
          dcr_status: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          dcr_change_request: {
            select: {
              id: true,
              item_part_no: true,
              chnage_from: true,
              chnage_to: true,
              reason: true,
            },
          },
        },
      }),
    ]);

    const mapped = records.map((r) => {
      const effectiveDate = r.createdAt;
      const statusMeta = this._getEffectiveStatus(r);

      let turnaroundDays = null;
      if (statusMeta.isApproved || statusMeta.isRejected) {
        const closeDate = new Date(statusMeta.statusUpdatedAt);
        const diffMs = closeDate.getTime() - new Date(effectiveDate).getTime();
        turnaroundDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      } else {
        const diffMs = Date.now() - new Date(effectiveDate).getTime();
        turnaroundDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      }

      const dObj = new Date(effectiveDate);
      const monthTag = dObj.toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });

      const changeRequestsCount = Array.isArray(r.dcr_change_request) ? r.dcr_change_request.length : 0;
      const primaryChange = changeRequestsCount > 0 ? r.dcr_change_request[0] : null;

      return {
        id: r.id,
        dcr_no: r.dcr_no,
        date: r.createdAt,
        createdAt: r.createdAt,
        monthTag,
        client: r.job?.customer?.customer_name || '—',
        po_no: r.job?.po?.po_number || '—',
        job_number: r.job?.job_number || '—',
        drawing_no: r.drg_no || '—',
        equipment_no: r.equ_no || r.job?.equipement_name || '—',
        inspect_by: r.inspect_by || '—',
        design_engineer: r.design_engineer?.name || '—',
        quality_engineer: r.quality_engineer?.name || '—',
        design_status: statusMeta.designStatus,
        quality_status: statusMeta.qualityStatus,
        status: statusMeta.status,
        is_approved: statusMeta.isApproved,
        is_rejected: statusMeta.isRejected,
        is_pending: statusMeta.isPending,
        changeRequestsCount,
        changeSummary: primaryChange
          ? `Part: ${primaryChange.item_part_no} (${primaryChange.chnage_from} → ${primaryChange.chnage_to})`
          : '—',
        changeReason: primaryChange?.reason || '—',
        turnaroundDays,
      };
    });

    return {
      data: mapped,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Export Month-Wise DCR Ledger to Excel
   */
  async exportDcrToExcel(company_id, query = {}, reqUser = {}) {
    const { data } = await this.getDcrRecords(company_id, {
      ...query,
      page: 1,
      limit: 10000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DMS DCR Analytics';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('DCR Monthly Register', {
      headerFooter: { firstHeader: 'DMS — Month-Wise Document Change Request Register' },
    });

    sheet.columns = [
      { header: 'DCR Number', key: 'dcr_no', width: 22 },
      { header: 'Month', key: 'monthTag', width: 14 },
      { header: 'Request Date', key: 'date', width: 16 },
      { header: 'Client / Customer', key: 'client', width: 26 },
      { header: 'Job Number', key: 'job_number', width: 16 },
      { header: 'PO Number', key: 'po_no', width: 16 },
      { header: 'Drawing Number', key: 'drawing_no', width: 20 },
      { header: 'Equipment / Tag', key: 'equipment_no', width: 20 },
      { header: 'Inspected By', key: 'inspect_by', width: 20 },
      { header: 'Part Changes', key: 'changeRequestsCount', width: 14 },
      { header: 'Change Summary', key: 'changeSummary', width: 35 },
      { header: 'Reason for Change', key: 'changeReason', width: 30 },
      { header: 'Design Engineer', key: 'design_engineer', width: 20 },
      { header: 'Design Review', key: 'design_status', width: 16 },
      { header: 'Quality Engineer', key: 'quality_engineer', width: 20 },
      { header: 'Quality Review', key: 'quality_status', width: 16 },
      { header: 'Overall Status', key: 'status', width: 14 },
      { header: 'Time Taken (Days)', key: 'turnaroundDays', width: 18 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    data.forEach((r) => {
      sheet.addRow({
        dcr_no: r.dcr_no,
        monthTag: r.monthTag,
        date: r.date ? new Date(r.date).toLocaleDateString('en-IN') : '-',
        client: r.client,
        job_number: r.job_number,
        po_no: r.po_no,
        drawing_no: r.drawing_no,
        equipment_no: r.equipment_no,
        inspect_by: r.inspect_by,
        changeRequestsCount: r.changeRequestsCount,
        changeSummary: r.changeSummary,
        changeReason: r.changeReason,
        design_engineer: r.design_engineer,
        design_status: r.design_status,
        quality_engineer: r.quality_engineer,
        quality_status: r.quality_status,
        status: r.status,
        turnaroundDays: r.turnaroundDays != null ? r.turnaroundDays : '-',
      });
    });

    sheet.autoFilter = { from: 'A1', to: `R${data.length + 1}` };

    Audit.insert({
      company_id,
      user_id: reqUser.userid || null,
      action: 'exported',
      module: 'DCR_ANALYTICS',
      description: `Exported month-wise DCR register (${data.length} records) to Excel`,
    });

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new DcrAnalyticsService();
