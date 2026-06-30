const downloadService = require("../services/download.service");

exports.exportFolderImagesToWord = async (req, res) => {
  try {
    const { folderId } = req.params;

    const buffer = await downloadService.buildWordImagesFromFolder(folderId);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=imagens.docx"
    );

    return res.send(buffer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "failed_to_generate_docx" });
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

    return res.send(buffer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "failed_to_generate_docx" });
  }
};

exports.exportKmlCar = async (req, res) => {
  try {
    console.log(req.body)
    const buffer = await downloadService.exportKmlCar(req.body.car);
    // const buffer = await downloadService.exportKmlCar("TO-1707306-7FB4.C6B5.A238.4E4A.98B4.007F.0E98.92A4");

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