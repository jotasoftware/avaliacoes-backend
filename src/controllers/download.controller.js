const downloadService = require("../services/download.service");
const driveService = require("../services/drive.service");
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

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

exports.exportFolderDocumentToWord = async (req, res, next) => {
  try {
    const { fileId } = req.params;

    const meta = await driveService.getFileMeta(fileId);

    if (meta.mimeType !== DOCX) {
      const err = new Error("invalid_file");
      err.status = 400;
      err.userMessage = "invalid_file";
      throw err;
    }

    const stream = await driveService.downloadFile(fileId);

    const nome = meta.name.toLowerCase().endsWith(".docx")
      ? meta.name
      : `${meta.name}.docx`;

    res.setHeader("Content-Type", DOCX);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(nome)}`
    );

    stream.on("error", next);
    return stream.pipe(res);
  } catch (error) {
    error.status = error.status || 500;
    error.userMessage = error.userMessage || "failed_to_download_document";
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