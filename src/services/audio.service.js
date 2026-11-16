const driveService = require("./drive.service");
const cardRepository = require("../repositories/card.repository");

const MARCADOR = "TRANSCRIÇÃO ORIGINAL";

function erro(status, userMessage) {
  const error = new Error(userMessage);
  error.status = status;
  error.userMessage = userMessage;
  return error;
}

async function pastaAudios(cardId) {
  const card = await cardRepository.findById(cardId);
  if (!card || !card.id_drive) throw erro(404, "Avaliação não encontrada");
  return driveService.getOrCreateSubFolder("Áudios", card.id_drive);
}

exports.listar = async (cardId) => {
  const pasta = await pastaAudios(cardId);
  const arquivos = await driveService.listFilesInFolder(pasta);
  return arquivos.map((f) => ({ id: f.id, nome: f.name }));
};

exports.ler = async (cardId, fileId) => {
  const pasta = await pastaAudios(cardId);

  // segurança: só lê arquivo que está na pasta Áudios DESTA avaliação
  const arquivos = await driveService.listFilesInFolder(pasta);
  const arquivo = arquivos.find((f) => f.id === fileId);
  if (!arquivo) throw erro(404, "Resumo não encontrado");

  const texto = await driveService.exportDocText(arquivo.id);
  const i = texto.indexOf(MARCADOR);

  const resumo = (i >= 0 ? texto.slice(0, i) : texto).replace(/-{5,}\s*$/, "").trim();
  const transcricao = i >= 0 ? texto.slice(i + MARCADOR.length).trim() : "";

  return { nome: arquivo.name, resumo, transcricao };
};