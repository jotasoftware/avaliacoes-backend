const uploadService = require("../services/upload.service");

exports.uploadImage = async (req, res, next) => {
  try {
    const result = await uploadService.processImage(req.body);
    return res.status(200).json(result);
  } catch (error) {
    error.status = error.status || 500;
    error.userMessage = error.userMessage || "Internal server error";
    return next(error);
  }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    const result = await uploadService.processDocument(req.body);
    return res.status(200).json(result);
  } catch (error) {
    error.status = error.status || 500;
    error.userMessage = error.userMessage || "Internal server error";
    return next(error);
  }
};

exports.receberTranscricao = async (req, res, next) => {
  try {
    const { File: arquivoUrl } = req.body;

    console.log(arquivoUrl);

    return res.status(201).json(transcricao); // ⚠️ `transcricao` não está definida — provavelmente falta chamar o service, ex: const transcricao = await uploadService.processTranscricao(arquivoUrl);
  } catch (error) {
    error.status = error.status || 400;
    error.userMessage = error.userMessage || error.message;
    return next(error);
  }
};