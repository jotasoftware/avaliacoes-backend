const driveService = require("./drive.service");
const cardRepository = require("../repositories/card.repository"); // ajuste o caminho se for outro
const cardService = require("./card.service");
const { identificarGravacao, gerarDocumento } = require("./openai.service");

const INBOX_FOLDER_ID = process.env.PLAUD_INBOX_FOLDER;

// Lê a identificação a partir do TÍTULO da gravação, se o seu pai tiver posto uma:
//   "Mat 87265 - Anápolis - GO" -> { matricula: "87265", cidade: "Anápolis", estado: "GO" }
// É opcional: se o título não ajudar, usa o que foi dito no começo do áudio.
function lerTitulo(titulo = "") {
  const m = titulo.match(
    /(?:mat(?:r[ií]cula)?\.?\s*(?:n[ºo°.]*\s*)?)?(\d[\d.]*)\s*[-–—]\s*(.+?)\s*[-–—]\s*([A-Za-z]{2})\b/i
  );
  if (!m) return null;

  const matricula = m[1].replace(/\./g, "");
  if (!matricula) return null;

  return { matricula, cidade: m[2].trim(), estado: m[3].toUpperCase() };
}

// tira caracteres que dão problema em nomes de arquivo
function limparNome(nome = "") {
  return nome.replace(/[\\/:*?"<>|\n\r]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

// se já existir um arquivo com esse nome na pasta, acrescenta (2), (3)...
function nomeUnico(base, existentes) {
  const usados = new Set(existentes.map((d) => d.name.toLowerCase()));
  let candidato = base;
  let n = 2;
  while (usados.has(candidato.toLowerCase())) {
    candidato = `${base} (${n})`;
    n++;
  }
  return candidato;
}

// Tira o original da fila. Só é chamada DEPOIS de o Doc novo estar criado.
// Primeiro tenta a lixeira (recuperável por 30 dias); se não tiver permissão,
// move para "Processados". Em nenhum caso o original fica na entrada.
async function tirarDaEntrada(fileId) {
  try {
    await driveService.trashFile(fileId);
    return "lixeira";
  } catch (err) {
    console.warn(`Plaud: não foi possível mandar para a lixeira (${err.message}); movendo para Processados`);
    const processadosId = await driveService.getOrCreateSubFolder("Processados", INBOX_FOLDER_ID);
    await driveService.moveFile(fileId, INBOX_FOLDER_ID, processadosId);
    return "processados";
  }
}

// Transcrição crua (ainda sem resumo) é gravada com este final no nome.
// Quando o cartão pendente é preenchido, gerarResumosDoCard troca cada uma por um resumo.
const SUFIXO_CRU = "transcrição";
const REGEX_CRU = /transcri[çc][ãa]o( \(\d+\))?$/i;

function montarConteudo(documento, texto) {
  return `${documento}\n\n----------\nTRANSCRIÇÃO ORIGINAL\n\n${texto}`;
}

let rodando = false; // proteção dentro do processo; entre processos, use o flock no cron

// Para cada transcrição na fila:
//  1. identifica matrícula, cidade e estado (título da gravação ou começo do áudio; chamada barata);
//  2. cartão ATIVO com os três dados  -> gera o resumo agora e grava em "Áudios";
//  3. três dados, mas sem cartão ativo -> acha/cria o cartão PENDENTE (igual ao Telegram) e grava só a
//     transcrição crua em "Áudios", SEM gastar IA. O resumo sai quando o pendente for preenchido
//     (gerarResumosDoCard, chamada pelo card.service);
//  4. sem os três dados -> transcrição crua em "Sem avaliação", sem IA;
//  5. só então tira o original da fila (se falhar, desfaz o cartão pendente recém-criado).
exports.organizarEntradaPlaud = async () => {
  if (!INBOX_FOLDER_ID) {
    throw new Error("PLAUD_INBOX_FOLDER não está definido no .env");
  }

  if (rodando) return;
  rodando = true;

  const resumo = { comResumo: 0, emPendente: 0, semAvaliacao: 0, vazios: 0, erros: 0 };

  try {
    const arquivos = await driveService.listFilesInFolder(INBOX_FOLDER_ID);

    for (const f of arquivos) {
      try {
        const texto = await driveService.exportDocText(f.id);

        if (texto.trim().length < 50) {
          resumo.vazios++; // quase sem texto: não gasta IA, deixa na fila
          continue;
        }

        // 1) identificar (chamada barata, só o começo da gravação)
        const ia = await identificarGravacao(texto);
        const doTitulo = lerTitulo(f.name) || {};

        // o título da gravação (se completo) tem prioridade; senão, o que foi dito no áudio
        const matricula = doTitulo.matricula || ia.matricula;
        const cidade = doTitulo.cidade || ia.cidade;
        const estado = doTitulo.estado || ia.estado;
        const identificado = Boolean(matricula && cidade && estado);

        // 2) cartão ATIVO com os três dados? (não pode devolver cartão pendente)
        let card = null;
        if (identificado) {
          card = await cardRepository.findByMatriculaCidadeEstado(matricula, cidade, estado);
        }
        const ativo = Boolean(card && card.id_drive);

        // 3) decide destino e conteúdo
        let rootFolderId = null;
        let novoPendente = false;
        let destinoId;
        let base;
        let conteudo;
        let destinoNome;

        if (ativo) {
          const documento = await gerarDocumento(texto, card.tipo);
          destinoId = await driveService.getOrCreateSubFolder("Áudios", card.id_drive);
          base = limparNome(`Mat ${matricula} - ${cidade} - ${estado}`);
          conteudo = montarConteudo(documento, texto);
          destinoNome = "cartão ativo (resumo gerado)";
        } else if (identificado) {
          const r = await cardService.getOrCreateCardFolder({ matricula, cidade, estado });
          rootFolderId = r.folderId;
          novoPendente = r.novoPendente;
          destinoId = await driveService.getOrCreateSubFolder("Áudios", rootFolderId);
          base = limparNome(`Mat ${matricula} - ${cidade} - ${estado} - ${SUFIXO_CRU}`);
          conteudo = texto;
          destinoNome = novoPendente ? "cartão PENDENTE novo (sem resumo)" : "cartão pendente existente (sem resumo)";
        } else {
          destinoId = await driveService.getOrCreateSubFolder("Sem avaliação", INBOX_FOLDER_ID);
          base = limparNome(f.name) || "Gravação";
          conteudo = texto;
          destinoNome = "Sem avaliação (sem resumo)";
        }

        try {
          const existentes = await driveService.listFilesInFolder(destinoId);
          const nome = nomeUnico(base, existentes);

          await driveService.uploadTextoComoDoc(destinoId, nome, conteudo);

          // só depois de o Doc novo existir é que o original sai da fila
          const destinoOriginal = await tirarDaEntrada(f.id);

          if (ativo) resumo.comResumo++;
          else if (identificado) resumo.emPendente++;
          else resumo.semAvaliacao++;

          console.log(
            `Plaud: "${f.name}" -> "${nome}" em ${destinoNome} ` +
              `(mat=${matricula}, cidade=${cidade}, estado=${estado}; original: ${destinoOriginal})`
          );
        } catch (err) {
          // se o cartão pendente foi criado agora e algo falhou, desfaz (o original segue na fila)
          if (rootFolderId) {
            await cardService.rollbackCardFolder(rootFolderId, novoPendente);
          }
          throw err;
        }
      } catch (err) {
        // o original continua na fila e é tentado de novo na próxima rodada
        resumo.erros++;
        console.error(`Plaud: falha em "${f.name}":`, err.message);
      }
    }

    if (arquivos.length) {
      console.log(
        `Plaud: ${arquivos.length} na fila | com resumo: ${resumo.comResumo}, ` +
          `em pendente: ${resumo.emPendente}, sem avaliação: ${resumo.semAvaliacao}, ` +
          `vazios: ${resumo.vazios}, erros: ${resumo.erros}`
      );
    }

    return resumo;
  } finally {
    rodando = false;
  }
};

const gerandoCards = new Set(); // evita rodar duas vezes para o mesmo cartão

// Chamada quando um cartão PENDENTE é preenchido: transforma cada transcrição crua de "Áudios"
// em um resumo (e manda a crua para a lixeira). Aceita o cartão já atualizado
// (precisa de id, id_drive, matricula, cidade, estado).
exports.gerarResumosDoCard = async (card) => {
  if (!card?.id_drive) return { gerados: 0 };
  if (gerandoCards.has(card.id)) return { gerados: 0 };
  gerandoCards.add(card.id);

  try {
    // só procura: pendente vindo do Telegram não tem "Áudios", e não vamos criar pasta vazia
    const audiosId = await driveService.findSubFolder("Áudios", card.id_drive);
    if (!audiosId) return { gerados: 0 };

    const arquivos = await driveService.listFilesInFolder(audiosId);
    const crus = arquivos.filter((a) => REGEX_CRU.test(a.name));

    let gerados = 0;
    for (const cru of crus) {
      const texto = await driveService.exportDocText(cru.id);
      if (texto.trim().length < 50) continue;
      const documento = await gerarDocumento(texto, card.tipo);

      const atuais = await driveService.listFilesInFolder(audiosId);
      const nome = nomeUnico(
        limparNome(`Mat ${card.matricula} - ${card.cidade} - ${card.estado}`),
        atuais
      );

      await driveService.uploadTextoComoDoc(audiosId, nome, montarConteudo(documento, texto));
      await driveService.trashFile(cru.id); // só depois de o resumo existir
      gerados++;
      console.log(`Plaud: resumo "${nome}" gerado para o cartão ${card.id}`);
    }

    return { gerados };
  } finally {
    gerandoCards.delete(card.id);
  }
};

exports.lerTitulo = lerTitulo; // exportada para facilitar testes