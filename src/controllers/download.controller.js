const downloadService = require("../services/download.service");
const fs = require("fs");

exports.exportImagesToWord = async (req, res) => {
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


    fs.writeFileSync("teste.docx", buffer);

    return res.send(buffer);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "failed_to_generate_docx"
    });
  }
};

exports.exportFolderDocumentToWord = async (req, res) => {
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
  } catch (err) {
    console.error("[exportFolderDocumentToWord] ERRO:", err);
    return res.status(500).json({ error: "failed_to_generate_docx" });
  }
};

exports.exportKmlCar = async (req, res) => {
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

// Substitua no seu download.controller.js

exports.exportKmlDocumento = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum documento enviado" });
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};