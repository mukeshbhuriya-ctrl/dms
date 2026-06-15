const instrumentService = require("../services/instrument.service");

exports.getInstruments = async (req, res, next) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res.status(400).json({ error: "type is required" });
    }
    const instruments = await instrumentService.getInstruments(type);
    res.json(instruments);
  } catch (error) {
    next(error);
  }
};

exports.bulkUploadInstruments = async (req, res, next) => {
  try {
    const { data, type } = req.body;
    if (!type) {
      return res.status(400).json({ error: "type is required" });
    }
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: "data array is required" });
    }
    
    const result = await instrumentService.bulkUploadInstruments(data, type);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
