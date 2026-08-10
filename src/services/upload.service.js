const telegramService = require("./telegram.service");
const driveService = require("./drive.service");
const aiService = require("./openai.service");
const pdfService = require("./pdf.service");
const { validateMatNumber } = require("../utils/validateMatNumber");
const cardService = require("./card.service");

exports.processImage = async ({ files, matNumber, cidade, estado, userId }) => {
  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new Error("fileIds is required and must be a non-empty array");
  }

  if (!validateMatNumber(matNumber)) {
    throw new Error("matNumber inválido");
  }

  const { folderId: rootFolderId, novoPendente } = await cardService.getOrCreateCardFolder({
    matricula: matNumber,
    cidade,
    estado,
  });

  try {
    const imagensFolderId = await driveService.getOrCreateSubFolder("Imagens", rootFolderId);

    const results = [];
    for (const file of files) {

      const small = await telegramService.getImageWithBase64(file.small);
      const largeStream = await telegramService.getImageStream(file.large);

      const category = await aiService.classifyImage(small.base64);

      const folderId = await driveService.getOrCreateSubFolder(category, imagensFolderId);

      const uploadedFile = await driveService.uploadImage(largeStream, folderId);

      results.push({
        fileId: uploadedFile.fileId,
        category,
      });
    }

    return {
      success: true,
      imagensFolderId,
      count: results.length,
      files: results,
    };
  } catch (err) {
    // Só desfaz se ESSA execução criou a pasta/pendente agora — se já
    // existia (Card ou Pendente anterior), não toca em nada.
    await cardService.rollbackCardFolder(rootFolderId, novoPendente);
    throw err;
  }
};

exports.processDocument = async ({ files, matNumber, cidade, estado, userId }) => {
  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new Error("fileIds is required and must be a non-empty array");
  }

  if (!validateMatNumber(matNumber)) {
    throw new Error("matNumber inválido");
  }

  const { folderId: rootFolderId, novoPendente } = await cardService.getOrCreateCardFolder({
    matricula: matNumber,
    cidade,
    estado,
  });

  try {
    const results = [];

    for (const file of files) {

      const pdfStream = await telegramService.getDocumentStream(file.fileId);

      const pages = await pdfService.pdfToImages(pdfStream);

      const folderIdDocumentos = await driveService.getOrCreateSubFolder(
        "Documentos",
        rootFolderId
      );

      const documentFolderId = await driveService.getNextNumberSubFolder(folderIdDocumentos);

      for (const page of pages) {

        const uploadedFile = await driveService.uploadImage(
          page.largeStream,
          documentFolderId
        );

        results.push({
          fileId: uploadedFile.fileId,
        });
      }
    }

    return {
      success: true,
      rootFolderId,
      count: results.length,
      files: results,
    };
  } catch (err) {
    await cardService.rollbackCardFolder(rootFolderId, novoPendente);
    throw err;
  }
};