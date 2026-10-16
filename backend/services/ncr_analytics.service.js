const prisma = require('#prisma');
const ExcelJS = require('exceljs');
const Audit = require('#utils/audit.js');

class NcrAnalyticsService {
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
      // Indian Financial Year: April of currentYear to March of currentYear + 1
      // e.g. FY 2026-27: Apr 2026 -> Mar 2027
      const startYear = currentYear;
      for (let m = 3; m < 12; m++) {
        months.push({ year: startYear, monthIndex: m });
      }
      for (let m = 0; m < 3; m++) {
        months.push({ year: startYear + 1, monthIndex: m });
      }
    } else {
      // Calendar Year: Jan to Dec of currentYear
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
   * Month-Wise NCR Analytics Overview & Metrics
   */
  async getMonthWiseOverview(company_id, query = {}) {
    const {
      yearType = 'FY', // 'FY' or 'CY'
      year,
      startDate,
      endDate,
      job_id,
      client,
    } = query;

    const baseWhere = {
      company_id,
      is_deleted: false,
    };

    if (job_id) baseWhere.job_id = job_id;
    if (client) baseWhere.client = { contains: client, mode: 'insensitive' };

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

    const periodWhere = {
      ...baseWhere,
      OR: [
        { date: { gte: windowStart, lte: windowEnd } },
        { createdAt: { gte: windowStart, lte: windowEnd } },
      ],
    };

    const allNcrsInPeriod = await prisma.ncr.findMany({
      where: periodWhere,
      include: {
        job: { select: { id: true, job_number: true, tag_number: true, equipement_name: true } },
      },
      orderBy: { date: 'asc' },
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
        openCount: 0,
        closedCount: 0,
        inReviewCount: 0,
        rejectedCount: 0,
        closureRate: 0,
        avgResolutionDays: 0,
        resolutionDaysSum: 0,
        resolutionCount: 0,
        ncrs: [],
      });
    });

    let totalRaised = 0;
    let totalClosed = 0;
    let totalOpen = 0;
    let totalRejected = 0;
    let totalResolutionDays = 0;
    let resolvedCount = 0;

    const stageDistribution = {
      stage1: 0, // Initiated / Raised
      stage2: 0, // Root Cause Analysis
      stage3: 0, // Department Reviews
      stage4: 0, // Corrective Action Verification
      stage5: 0, // Closed / Disposition
    };

    const reviewStatusBreakdown = {
      design: { pending: 0, approved: 0, rejected: 0 },
      welding: { pending: 0, approved: 0, rejected: 0 },
      quality: { pending: 0, approved: 0, rejected: 0 },
    };

    const clientCountMap = new Map();
    const jobCountMap = new Map();

    allNcrsInPeriod.forEach((ncr) => {
      const ncrDate = ncr.date ? new Date(ncr.date) : new Date(ncr.createdAt);
      const y = ncrDate.getUTCFullYear();
      const m = ncrDate.getUTCMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;

      totalRaised += 1;
      const isClosed = (ncr.status === 'CLOSED' || ncr.current_stage === 5 || ncr.ncr_status === 'closed');
      const isRejected = (ncr.status === 'REJECTED' || ncr.ncr_status === 'rejected');
      const isOpen = !isClosed && !isRejected;

      if (isClosed) totalClosed += 1;
      else if (isRejected) totalRejected += 1;
      else totalOpen += 1;

      // Track stage
      const stage = Number(ncr.current_stage) || 1;
      if (stage === 1) stageDistribution.stage1 += 1;
      else if (stage === 2) stageDistribution.stage2 += 1;
      else if (stage === 3) stageDistribution.stage3 += 1;
      else if (stage === 4) stageDistribution.stage4 += 1;
      else if (stage >= 5) stageDistribution.stage5 += 1;

      // Department Reviews
      const dStatus = (ncr.design_review_status || 'PENDING').toLowerCase();
      const wStatus = (ncr.welding_review_status || 'PENDING').toLowerCase();
      const qStatus = (ncr.quality_review_status || 'PENDING').toLowerCase();

      if (reviewStatusBreakdown.design[dStatus] !== undefined) reviewStatusBreakdown.design[dStatus] += 1;
      if (reviewStatusBreakdown.welding[wStatus] !== undefined) reviewStatusBreakdown.welding[wStatus] += 1;
      if (reviewStatusBreakdown.quality[qStatus] !== undefined) reviewStatusBreakdown.quality[qStatus] += 1;

      // Turnaround time
      let resolutionDays = null;
      if (isClosed) {
        const closeDate = ncr.disposition_date ? new Date(ncr.disposition_date) : new Date(ncr.updatedAt);
        const diffMs = closeDate.getTime() - ncrDate.getTime();
        resolutionDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        totalResolutionDays += resolutionDays;
        resolvedCount += 1;
      }

      // Client & Job counts
      if (ncr.client) {
        clientCountMap.set(ncr.client, (clientCountMap.get(ncr.client) || 0) + 1);
      }
      const jobIdentifier = ncr.job?.job_number || ncr.msn || 'Unknown Job';
      jobCountMap.set(jobIdentifier, (jobCountMap.get(jobIdentifier) || 0) + 1);

      // Add to month bucket if exists
      if (monthMap.has(key)) {
        const mObj = monthMap.get(key);
        mObj.totalRaised += 1;
        if (isClosed) {
          mObj.closedCount += 1;
          if (resolutionDays != null) {
            mObj.resolutionDaysSum += resolutionDays;
            mObj.resolutionCount += 1;
          }
        } else if (isRejected) {
          mObj.rejectedCount += 1;
        } else {
          mObj.openCount += 1;
          if (stage >= 2 && stage <= 4) mObj.inReviewCount += 1;
        }
      }
    });

    // Calculate rates for each month
    const monthlySeries = Array.from(monthMap.values()).map((m) => {
      const closureRate = m.totalRaised > 0 ? Math.round((m.closedCount / m.totalRaised) * 100) : 0;
      const avgResolutionDays = m.resolutionCount > 0 ? Math.round(m.resolutionDaysSum / m.resolutionCount) : 0;
      return {
        key: m.key,
        label: m.label,
        shortLabel: m.shortLabel,
        year: m.year,
        monthIndex: m.monthIndex,
        totalRaised: m.totalRaised,
        openCount: m.openCount,
        closedCount: m.closedCount,
        inReviewCount: m.inReviewCount,
        rejectedCount: m.rejectedCount,
        closureRate,
        avgResolutionDays,
      };
    });

    const overallClosureRate = totalRaised > 0 ? Math.round((totalClosed / totalRaised) * 100) : 0;
    const overallAvgTurnaroundDays = resolvedCount > 0 ? Math.round(totalResolutionDays / resolvedCount) : 0;

    // Top 5 Clients & Jobs
    const topClients = Array.from(clientCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topJobs = Array.from(jobCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      timeframe: {
        yearType,
        year: year || new Date().getFullYear(),
        startDate: windowStart,
        endDate: windowEnd,
      },
      kpis: {
        totalRaised,
        totalOpen,
        totalClosed,
        totalRejected,
        closureRate: overallClosureRate,
        avgTurnaroundDays: overallAvgTurnaroundDays,
      },
      monthlySeries,
      stageDistribution,
      reviewStatusBreakdown,
      topClients,
      topJobs,
    };
  }

  /**
   * Paginated, Filterable Month-Wise NCR Ledger
   */
  async getNcrRecords(company_id, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const {
      search,
      month, // e.g. "2026-07"
      status, // 'ALL', 'OPEN', 'CLOSED', 'REJECTED'
      stage, // 1 to 5
      job_id,
      client,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'desc',
    } = query;

    const andConditions = [
      { company_id },
      { is_deleted: false },
    ];

    if (job_id) andConditions.push({ job_id });
    if (client) andConditions.push({ client: { contains: client, mode: 'insensitive' } });

    // Month filter: "YYYY-MM"
    if (month && month !== 'ALL') {
      const [yStr, mStr] = month.split('-');
      const y = parseInt(yStr, 10);
      const mIdx = parseInt(mStr, 10) - 1;
      if (!isNaN(y) && !isNaN(mIdx)) {
        const { start, end } = this._getDateRangeForMonth(y, mIdx);
        andConditions.push({
          OR: [
            { date: { gte: start, lte: end } },
            { createdAt: { gte: start, lte: end } },
          ],
        });
      }
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      andConditions.push({
        OR: [
          { date: { gte: start, lte: end } },
          { createdAt: { gte: start, lte: end } },
        ],
      });
    }

    // Status filter
    if (status && status !== 'ALL') {
      if (status === 'CLOSED') {
        andConditions.push({
          OR: [
            { status: 'CLOSED' },
            { ncr_status: 'closed' },
            { current_stage: 5 },
          ],
        });
      } else if (status === 'REJECTED') {
        andConditions.push({
          OR: [
            { status: 'REJECTED' },
            { ncr_status: 'rejected' },
          ],
        });
      } else if (status === 'OPEN') {
        andConditions.push({
          status: { notIn: ['CLOSED', 'REJECTED'] },
          ncr_status: { notIn: ['closed', 'rejected'] },
        });
      }
    }

    // Stage filter
    if (stage && stage !== 'ALL') {
      andConditions.push({ current_stage: parseInt(stage, 10) });
    }

    // Search query
    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { ncr_no: { contains: q, mode: 'insensitive' } },
          { client: { contains: q, mode: 'insensitive' } },
          { msn: { contains: q, mode: 'insensitive' } },
          { po_no: { contains: q, mode: 'insensitive' } },
          { tag_no: { contains: q, mode: 'insensitive' } },
          { description_non_conformance: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    const where = { AND: andConditions };

    const [total, records] = await Promise.all([
      prisma.ncr.count({ where }),
      prisma.ncr.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' },
        include: {
          initiator: { select: { id: true, name: true, empid: true } },
          raised_at_user: { select: { id: true, name: true, empid: true } },
          target_head_design: { select: { id: true, name: true } },
          target_head_welding: { select: { id: true, name: true } },
          target_head_quality: { select: { id: true, name: true } },
          job: {
            select: {
              id: true,
              job_number: true,
              tag_number: true,
              equipement_name: true,
              customer: { select: { customer_name: true } },
              po: { select: { po_number: true } },
            },
          },
        },
      }),
    ]);

    const mapped = records.map((r) => {
      const effectiveDate = r.date || r.createdAt;
      const isClosed = (r.status === 'CLOSED' || r.current_stage === 5 || r.ncr_status === 'closed');
      const isRejected = (r.status === 'REJECTED' || r.ncr_status === 'rejected');

      let turnaroundDays = null;
      if (isClosed) {
        const closeDate = r.disposition_date ? new Date(r.disposition_date) : new Date(r.updatedAt);
        const diffMs = closeDate.getTime() - new Date(effectiveDate).getTime();
        turnaroundDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      } else {
        const diffMs = Date.now() - new Date(effectiveDate).getTime();
        turnaroundDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      }

      // Format month tag (e.g. "Jul 2026")
      const dObj = new Date(effectiveDate);
      const monthTag = dObj.toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });

      return {
        id: r.id,
        ncr_no: r.ncr_no,
        date: r.date,
        createdAt: r.createdAt,
        monthTag,
        client: r.client || r.job?.customer?.customer_name || '—',
        po_no: r.po_no || r.job?.po?.po_number || '—',
        job_number: r.job?.job_number || r.msn || '—',
        tag_no: r.tag_no || r.job?.tag_number || '—',
        equipment_name: r.job?.equipement_name || '—',
        description: r.description_non_conformance || '—',
        raised_by: r.initiator?.name || r.ncr_raised_by || '—',
        raised_at: r.raised_at_user?.name || r.ncr_raised_at || '—',
        current_stage: r.current_stage || 1,
        status: isClosed ? 'CLOSED' : isRejected ? 'REJECTED' : 'OPEN',
        ncr_status: r.ncr_status || 'draft',
        design_status: r.design_review_status || 'PENDING',
        welding_status: r.welding_review_status || 'PENDING',
        quality_status: r.quality_review_status || 'PENDING',
        is_closed: isClosed,
        is_rejected: isRejected,
        turnaroundDays,
        hasAttachments: Array.isArray(r.attachments) && r.attachments.length > 0,
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
   * Export Month-Wise NCR Ledger to Excel
   */
  async exportNcrToExcel(company_id, query = {}, reqUser = {}) {
    const { data } = await this.getNcrRecords(company_id, {
      ...query,
      page: 1,
      limit: 10000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DMS NCR Analytics';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('NCR Monthly Register', {
      headerFooter: { firstHeader: 'DMS — Month-Wise Non-Conformance Report Register' },
    });

    sheet.columns = [
      { header: 'NCR Number', key: 'ncr_no', width: 22 },
      { header: 'Month', key: 'monthTag', width: 14 },
      { header: 'NCR Date', key: 'date', width: 16 },
      { header: 'Client / Customer', key: 'client', width: 26 },
      { header: 'Job Number', key: 'job_number', width: 16 },
      { header: 'PO Number', key: 'po_no', width: 16 },
      { header: 'Tag / Equipment', key: 'tag_no', width: 20 },
      { header: 'Description of Non-Conformance', key: 'description', width: 35 },
      { header: 'Raised By', key: 'raised_by', width: 20 },
      { header: 'Current Stage', key: 'current_stage', width: 14 },
      { header: 'Overall Status', key: 'status', width: 14 },
      { header: 'Design Review', key: 'design_status', width: 16 },
      { header: 'Welding Review', key: 'welding_status', width: 16 },
      { header: 'Quality Review', key: 'quality_status', width: 16 },
      { header: 'Time Taken (Days)', key: 'turnaroundDays', width: 18 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    data.forEach((r) => {
      sheet.addRow({
        ncr_no: r.ncr_no,
        monthTag: r.monthTag,
        date: r.date ? new Date(r.date).toLocaleDateString('en-IN') : '-',
        client: r.client,
        job_number: r.job_number,
        po_no: r.po_no,
        tag_no: r.tag_no,
        description: r.description,
        raised_by: r.raised_by,
        current_stage: `Stage ${r.current_stage}`,
        status: r.status,
        design_status: r.design_status,
        welding_status: r.welding_status,
        quality_status: r.quality_status,
        turnaroundDays: r.turnaroundDays != null ? r.turnaroundDays : '-',
      });
    });

    sheet.autoFilter = { from: 'A1', to: `O${data.length + 1}` };

    Audit.insert({
      company_id,
      user_id: reqUser.userid || null,
      action: 'exported',
      module: 'NCR_ANALYTICS',
      description: `Exported month-wise NCR register (${data.length} records) to Excel`,
    });

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new NcrAnalyticsService();
