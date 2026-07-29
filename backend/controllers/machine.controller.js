const machineService = require('../services/machine.service');

exports.getMachines = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { page, limit, search, fetchAll } = req.query;
    
    const result = await machineService.getMachines({
      company_id,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      fetchAll: fetchAll === 'true' || fetchAll === true
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching machines:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch machines' });
  }
};

exports.bulkCreateMachines = async (req, res) => {
  try {
    const { company_id } = req.user;
    const machinesData = req.body.machines;
    
    const result = await machineService.bulkCreateMachines(company_id, machinesData);
    res.status(201).json({ message: `Successfully created ${result.count} machines`, count: result.count });
  } catch (error) {
    console.error('Error bulk creating machines:', error);
    res.status(500).json({ error: error.message || 'Failed to create machines' });
  }
};

exports.updateMachine = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { id } = req.params;
    const data = req.body;
    
    await machineService.updateMachine(id, company_id, data);
    res.status(200).json({ message: 'Machine updated successfully' });
  } catch (error) {
    console.error('Error updating machine:', error);
    res.status(500).json({ error: error.message || 'Failed to update machine' });
  }
};

exports.deleteMachine = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { id } = req.params;
    
    await machineService.deleteMachine(id, company_id);
    res.status(200).json({ message: 'Machine deleted successfully' });
  } catch (error) {
    console.error('Error deleting machine:', error);
    res.status(500).json({ error: error.message || 'Failed to delete machine' });
  }
};

