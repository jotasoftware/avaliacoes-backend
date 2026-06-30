const telegramService = require("./telegram.service");
const driveService = require("./drive.service");
const aiService = require("./openai.service");
const pdfService = require("./pdf.service");
const { validateMatNumber } = require("../utils/validateMatNumber");

exports.processImage = async ({ files, matNumber, userId }) => {
  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new Error("fileIds is required and must be a non-empty array");
  }

  if (!validateMatNumber(matNumber)) {
    throw new Error("matNumber inválido");
  }

  // 📁 pasta raiz (controle humano)
  const rootFolderName = `Mat ${matNumber}`;
  const rootFolderId = await driveService.getOrCreateFolder(rootFolderName);

  const results = [];
  for (const file of files) {

    const small = await telegramService.getImageWithBase64(file.small);
    const largeStream = await telegramService.getImageStream(file.large);
  
    const category = await aiService.classifyImage(small.base64);
  
    const folderId = await driveService.getOrCreateSubFolder(category, rootFolderId);
  
    const uploadedFile = await driveService.uploadImage(largeStream, folderId);

    results.push({
      fileId: uploadedFile.fileId,
      category,
    });
  }

  return {
    success: true,
    rootFolderId,
    count: results.length,
    files: results,
  };
};

exports.processDocument = async ({ files, matNumber, userId }) => {
  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new Error("fileIds is required and must be a non-empty array");
  }

  if (!validateMatNumber(matNumber)) {
    throw new Error("matNumber inválido");
  }

  const rootFolderName = `Mat ${matNumber}`;
  const rootFolderId = await driveService.getOrCreateFolder(rootFolderName);

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
};