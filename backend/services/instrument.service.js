const prisma = require("#prisma");

exports.getInstruments = async (type, options = {}) => {
  const { page, limit, search } = options;
  const whereClause = { is_active: true };
  if (type && type !== "ALL") {
    whereClause.type = type;
  }

  if (search) {
    whereClause.OR = [
      { equipment_desc: { contains: search } },
      { serial_no: { contains: search } }
    ];
  }

  if (page && limit) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.instruments_master.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.instruments_master.count({ where: whereClause })
    ]);
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  return await prisma.instruments_master.findMany({
    where: whereClause,
    orderBy: {
      created_at: 'desc'
    }
  });
};

exports.bulkUploadInstruments = async (data, type, userId) => {
  let createdCount = 0;
  let skippedCount = 0;

  for (const item of data) {
    if (!item.serial_no) continue;

    // Check if the serial number already exists globally
    const existing = await prisma.instruments_master.findUnique({
      where: {
        serial_no: item.serial_no
      }
    });

    if (existing) {
      skippedCount++;
    } else {
      await prisma.instruments_master.create({
        data: {
          type: type,
          equipment_desc: item.equipment_desc || "",
          make: item.make || null,
          range: item.range || null,
          serial_no: item.serial_no,
          frequency: item.frequency || null,
          required_accuracy: item.required_accuracy || null,
          least_count: item.least_count || null,
          certificate_no: item.certificate_no || null,
          calibration_date: item.calibration_date ? new Date(item.calibration_date) : null,
          due_date: item.due_date ? new Date(item.due_date) : null,
          remarks: item.remarks || null,
          created_by: userId || null,
        }
      });
      createdCount++;
    }
  }

  return {
    success: true,
    created: createdCount,
    skipped: skippedCount
  };
};

exports.checkExpiringInstruments = async () => {
  const EmailService = require('./email.service');
  const NotificationService = require('./notification.service');
  
  // Calculate target date range exactly 10 days from now
  const targetDateStart = new Date();
  targetDateStart.setDate(targetDateStart.getDate() + 10);
  targetDateStart.setHours(0, 0, 0, 0);

  const targetDateEnd = new Date(targetDateStart);
  targetDateEnd.setHours(23, 59, 59, 999);

  try {
    const expiringInstruments = await prisma.instruments_master.findMany({
      where: {
        is_active: true,
        due_date: {
          gte: targetDateStart,
          lte: targetDateEnd
        },
        created_by: { not: null }
      },
      include: {
        creator: true
      }
    });

    for (const instrument of expiringInstruments) {
      if (instrument.creator && instrument.creator.email) {
        // Send Email
        await EmailService.sendInstrumentExpiryNotification(instrument.creator.email, {
          equipment_desc: instrument.equipment_desc,
          serial_no: instrument.serial_no,
          due_date: instrument.due_date
        }).catch(err => console.error("Failed to send instrument expiry email:", err));

        // Send System Notification
        await NotificationService.createNotification({
          company_id: instrument.creator.company_id,
          user_id: instrument.creator.id,
          kind: 'action',
          severity: 'warning',
          title: 'Instrument Expiring Soon',
          message: `The instrument ${instrument.equipment_desc} (${instrument.serial_no}) is due for calibration on ${instrument.due_date.toLocaleDateString()}.`,
          action_path: `/masters/${instrument.type === 'PRESSURE_GAUGE' ? 'pressure-gauges' : 'calibration-instruments'}`
        }).catch(err => console.error("Failed to create instrument expiry notification:", err));
      }
    }
    console.log(`[InstrumentService] Expiry check completed. Notified ${expiringInstruments.length} users.`);
  } catch (error) {
    console.error("[InstrumentService] Error checking expiring instruments:", error);
  }
};
