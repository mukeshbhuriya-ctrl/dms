const prisma = require('#prisma');

class MaintenanceService {
  async getMachines({ company_id, page = 1, limit = 10, search, fetchAll = false }) {
    const skip = (page - 1) * limit;
    
    const where = {
      company_id,
      is_deleted: false,
    };

    if (fetchAll) {
      where.is_active = true;
    }

    if (search) {
      where.OR = [
        { machine_number: { contains: search, mode: 'insensitive' } },
        { machine_name: { contains: search, mode: 'insensitive' } }
      ];
    }

    const queryOptions = {
      where,
      orderBy: { machine_number: 'asc' }
    };

    if (!fetchAll) {
      queryOptions.skip = Number(skip);
      queryOptions.take = Number(limit);
    }

    const [machines, total] = await Promise.all([
      prisma.machine_master.findMany(queryOptions),
      prisma.machine_master.count({ where })
    ]);

    return {
      data: machines,
      meta: {
        total,
        page: fetchAll ? 1 : Number(page),
        totalPages: fetchAll ? 1 : Math.ceil(total / limit)
      }
    };
  }

  async bulkCreateMachines(company_id, machinesData) {
    if (!machinesData || machinesData.length === 0) return { count: 0 };
    
    const payload = machinesData.map(m => ({
      company_id,
      machine_number: m.machineNumber || m.machine_number,
      machine_name: m.machineName || m.machine_name,
      type: m.type,
      model_no: m.modelNo || m.model_no,
      serial_number: m.serialNumber || m.serial_number,
      make: m.make,
      mfg_year: m.mfgYear || m.mfg_year ? String(m.mfgYear || m.mfg_year) : null,
      specifications: m.specifications,
      is_active: true,
      is_deleted: false
    }));

    // Use createMany to insert bulk, skip duplicates
    const result = await prisma.machine_master.createMany({
      data: payload,
      skipDuplicates: true,
    });

    return { count: result.count };
  }

  async updateMachine(id, company_id, data) {
    return await prisma.machine_master.updateMany({
      where: { id, company_id },
      data: {
        machine_name: data.machineName,
        type: data.type,
        model_no: data.modelNo,
        serial_number: data.serialNumber,
        make: data.make,
        mfg_year: data.mfgYear,
        specifications: data.specifications,
        is_active: data.is_active !== undefined ? data.is_active : true,
      }
    });
  }

  async deleteMachine(id, company_id) {
    return await prisma.machine_master.updateMany({
      where: { id, company_id },
      data: { is_deleted: true }
    });
  }

}

module.exports = new MaintenanceService();
