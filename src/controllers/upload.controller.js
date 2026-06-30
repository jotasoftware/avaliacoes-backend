const uploadService = require("../services/upload.service");

exports.uploadImage = async (req, res) => {
  try {
    const result = await uploadService.processImage(req.body);

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    const result = await uploadService.processDocument(req.body);

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};