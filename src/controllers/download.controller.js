const downloadService = require("../services/download.service");
const fs = require("fs");

exports.exportImagesToWord = async (req, res, next) => {
  try {
    const { idDrive, imagens } = req.body;

    const buffer = await downloadService.buildWordImagesFromFolder({
      idDrive,
      imagens
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=imagens.docx"
    );

    // fs.writeFileSync("teste.docx", buffer); // resto de debug? considerar remover

    return res.send(buffer);
  } catch (error) {
    error.status = error.status || 500;
    error.userMessage = error.userMessage || "failed_to_generate_docx";
    return next(error);
  }
};

exports.exportFolderDocumentToWord = async (req, res, next) => {
  try {
    const { folderId } = req.params;

    const buffer = await downloadService.buildWordDocumentFromFolder(folderId);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=imagens.docx"
    );

    res.setHeader("Content-Length", buffer.length);

    return res.send(buffer);
  } catch (error) {
    error.status = error.status || 500;
    error.userMessage = error.userMessage || "failed_to_generate_docx";
    return next(error);
  }
};

exports.exportKmlCar = async (req, res, next) => {
  try {
    const buffer = await downloadService.exportKmlCar(req.body.car);

    res.setHeader(
      "Content-Type",
      "application/vnd.google-earth.kml+xml"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="CAR.kml"'
    );

    return res.send(buffer);
  } catch (error) {
    error.status = error.status || 500;
    error.userMessage = error.userMessage || error.message;
    return next(error);
  }
};

exports.exportKmlDocumento = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("Nenhum documento enviado");
      error.status = 400;
      return next(error);
    }

    const buffer = await downloadService.exportKmlDocumento(req.file.buffer);

    res.setHeader(
      "Content-Type",
      "application/vnd.google-earth.kml+xml"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="documento.kml"'
    );

    return res.send(buffer);
  } catch (error) {
    error.status = error.status || 500;
    error.userMessage = error.userMessage || error.message;
    return next(error);
  }
};