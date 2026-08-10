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

 
exports.receberTranscricao = async (req, res) => {
  try {
    const { File: arquivoUrl } = req.body;
 
    console.log(arquivoUrl)
 
    return res.status(201).json(transcricao);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};