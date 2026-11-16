require("dotenv").config();

// 1) funções do Drive
const drive = require("./src/services/drive.service");
const faltandoDrive = [
  "listFilesInFolder",
  "moveFile",
  "trashFile",
  "exportDocText",
  "uploadTextoComoDoc",
  "getOrCreateSubFolder",
].filter((n) => typeof drive[n] !== "function");

console.log(
  faltandoDrive.length
    ? "FALTAM no drive.service: " + faltandoDrive.join(", ")
    : "drive.service OK"
);

// 2) variáveis do .env
for (const v of ["OPENAI_API_KEY", "PLAUD_INBOX_FOLDER"]) {
  console.log(v, process.env[v] ? "OK" : "FALTA no .env");
}

// 3) função do resumo
try {
  const ai = require("./src/services/openai.service");
  console.log(
    "openai.service.resumirTranscricao",
    typeof ai.resumirTranscricao === "function" ? "OK" : "FALTA"
  );
} catch (e) {
  console.log("openai.service ERRO:", e.message);
}

// 4) busca do cartão
try {
  const repo = require("./src/repositories/card.repository");
  console.log(
    "card.repository.findByMatriculaCidadeEstado",
    typeof repo.findByMatriculaCidadeEstado === "function" ? "OK" : "FALTA"
  );
} catch (e) {
  console.log("card.repository ERRO:", e.message, "(ajuste o caminho)");
}

// 5) o serviço principal carrega?
try {
  require("./src/services/plaud-inbox.service");
  console.log("plaud-inbox.service OK");
} catch (e) {
  console.log("plaud-inbox.service ERRO:", e.message);
}

process.exit(0);