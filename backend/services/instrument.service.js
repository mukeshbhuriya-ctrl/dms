const prisma = require("#prisma");

exports.getInstruments = async (type) => {
  return await prisma.instruments_master.findMany({
    where: {
      type: type,
      is_active: true
    },
    orderBy: {
      created_at: 'desc'
    }
  });
};

exports.bulkUploadInstruments = async (data, type) => {
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
