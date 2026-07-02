const instrumentService = require("../services/instrument.service");

exports.getInstruments = async (req, res, next) => {
  try {
    const { type, page, limit, search } = req.query;
    const options = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search: search ? String(search) : undefined
    };
    const instruments = await instrumentService.getInstruments(type, options);
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

    const userId = req.user.userid || req.user.id;
    const result = await instrumentService.bulkUploadInstruments(data, type, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
