/**
 * Script de backup do banco SQLite pro Google Drive.
 * Roda manualmente (node backupDatabase.js) ou agendado via cron.
 *
 * AJUSTE os dois caminhos abaixo conforme a estrutura real do seu projeto:
 * - DB_PATH: onde está o arquivo .sqlite
 * - o require do drive.service
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const driveService = require("./src/services/drive.service"); // ajuste o path

const DB_PATH = path.join(__dirname, "database.sqlite"); // ajuste
const BACKUPS_FOLDER_NAME = "Backups Avaliacoes";
const MANTER_ULTIMOS = 30; // guarda só os últimos N backups, apaga o resto

async function run() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Arquivo do banco não encontrado em: ${DB_PATH}`);
    process.exit(1);
  }

  const backupsFolderId = await driveService.getOrCreateFolder(BACKUPS_FOLDER_NAME);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `database-backup-${timestamp}.sqlite`;

  const stream = fs.createReadStream(DB_PATH);

  const uploaded = await driveService.uploadFile(
    stream,
    backupsFolderId,
    fileName,
    "application/x-sqlite3"
  );

  console.log(`Backup enviado: ${fileName} (fileId: ${uploaded.fileId})`);

  await limparBackupsAntigos(backupsFolderId);

  console.log("Backup concluído.");
}

async function limparBackupsAntigos(backupsFolderId) {
  const arquivos = await driveService.listAllFilesRecursive(backupsFolderId);

  const backups = arquivos
    .filter((f) => f.name.startsWith("database-backup-"))
    .sort((a, b) => (a.name < b.name ? 1 : -1)); // mais recente primeiro

  const paraApagar = backups.slice(MANTER_ULTIMOS);

  for (const arquivo of paraApagar) {
    try {
      await driveService.deleteFolder(arquivo.id); // reaproveita a função (move pra lixeira)
      console.log(`Backup antigo removido: ${arquivo.name}`);
    } catch (err) {
      console.error(`Falha ao remover backup antigo ${arquivo.name}:`, err.message);
    }
  }
}

run().catch((err) => {
  console.error("Erro no backup:", err);
  process.exit(1);
});