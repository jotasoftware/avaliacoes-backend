const telegramService = require("./telegram.service");
const driveService = require("./drive.service");
const aiService = require("./openai.service");
const pdfService = require("./pdf.service");
const wordService = require("./word.service"); 
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
    await cardService.rollbackCardFolder(rootFolderId, novoPendente);
    throw err;
  }
};

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function gerarNomeDocumento(primeiraPagina, folderId) {
  const base = await aiService.suggestDocumentName(primeiraPagina); // "Documento" se não achou

  const existentes = await driveService.listWords(folderId);
  const usados = new Set(
    existentes.map((d) => d.name.replace(/\.docx$/i, "").toLowerCase())
  );

  let candidato = base;
  let n = 2;
  while (usados.has(candidato.toLowerCase())) {
    candidato = `${base} (${n})`;
    n++;
  }

  return candidato;
}

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
    const folderIdDocumentos = await driveService.getOrCreateSubFolder(
      "Documentos",
      rootFolderId
    );

    const results = [];

    for (let i = 0; i < files.length; i++) {
      const pdfStream = await telegramService.getDocumentStream(files[i].fileId);
      const pages = await pdfService.pdfToImages(pdfStream);

      if (pages.length === 0) {
        throw new Error(`Documento ${i + 1} sem páginas`);
      }

      const buffers = [];
      for (const page of pages) {
        buffers.push(await streamToBuffer(page.largeStream));
      }

      const wordBuffer = await wordService.buildWordDocumentFromBuffers(buffers);

      const nome = await gerarNomeDocumento(
        buffers[0],
        folderIdDocumentos
      );

      const uploaded = await driveService.uploadWord(
        folderIdDocumentos,
        wordBuffer,
        nome
      );

      results.push({ wordFileId: uploaded.id, pages: buffers.length });
    }

    return {
      success: true,
      rootFolderId,
      count: results.length,
      documents: results,
    };
  } catch (err) {
    await cardService.rollbackCardFolder(rootFolderId, novoPendente);
    throw err;
  }
};