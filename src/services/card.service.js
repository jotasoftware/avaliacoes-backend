const cardRepository = require("../repositories/card.repository");
const pendenteRepository = require("../repositories/pendente.repository");
const driveService = require("./drive.service");

exports.create = async (data) => {
    const { matricula, cidade, estado } = data;

    // Bloqueia se já existir um Card ativo (não "done") com essa mesma
    // combinação matricula+cidade+estado.
    const cardExistenteAtivo = await cardRepository.findByMatriculaCidadeEstado(
      matricula,
      cidade,
      estado
    );

    if (cardExistenteAtivo) {
      throw new Error(
        "Já existe uma avaliação ativa com essa matrícula, cidade e estado."
      );
    }

    // Existia um Pendente DE ANTES (ex: o bot já mandou algo antes de
    // alguém completar os dados aqui no front)?
    const pendenteVinculado = await pendenteRepository.findByMatriculaCidadeEstado(
      matricula,
      cidade,
      estado
    );

    let folderId;

    if (pendenteVinculado) {
      folderId = pendenteVinculado.id_drive;
    } else {
      // Não existia nada -> cria a pasta nova DIRETO. Importante: NÃO
      // usamos getOrCreateCardFolder aqui, porque ela cria um Pendente
      // como efeito colateral (pensado pro fluxo do bot).
      const nomeUnico = `Mat ${matricula} - ${cidade} - ${estado}`;
      folderId = await driveService.createFolder(nomeUnico);
    }

    const statusFinal = pendenteVinculado ? "doing" : (data.status || "todo");

    const card = await cardRepository.create({
        ...data,
        status: statusFinal,
        id_drive: folderId,
      });

    if (pendenteVinculado) {
      await pendenteRepository.delete(pendenteVinculado.id);
    }

    return {
      ...card.get({ plain: true }),
      pendenteRemovido: !!pendenteVinculado,
    };
};


exports.getAll = async () => {
  const cards = await cardRepository.findAll();

  return cards;
};


exports.getById = async (id) => {
  const card = await cardRepository.findById(id);

  if (!card) {
    throw new Error("Card não encontrado");
  }

  const subpastas = await driveService.getAvaliacaoFiles(
    card.id_drive
  );

  return {
    ...card,
    subpastas,
  };
};


exports.update = async (id, dados) => {
  const card = await cardRepository.findById(id);

  if (!card) {
    throw new Error("Card não encontrado");
  }

  // Se matricula/cidade/estado fazem parte da edição, checa duplicidade
  // ANTES de salvar — usando os valores finais (o que vier em "dados",
  // ou o que já estava salvo se não foi alterado).
  const matriculaFinal = dados.matricula ?? card.matricula;
  const cidadeFinal = dados.cidade ?? card.cidade;
  const estadoFinal = dados.estado ?? card.estado;

  const mudouIdentificacao =
    dados.matricula !== undefined ||
    dados.cidade !== undefined ||
    dados.estado !== undefined;

  if (mudouIdentificacao) {
    const duplicado = await cardRepository.findByMatriculaCidadeEstado(
      matriculaFinal,
      cidadeFinal,
      estadoFinal,
      id // exclui o próprio card da busca
    );

    if (duplicado) {
      throw new Error(
        "Já existe outra avaliação ativa com essa matrícula, cidade e estado."
      );
    }
  }

  const atualizado = await cardRepository.update(
    id,
    dados
  );

  if (mudouIdentificacao && atualizado.id_drive) {
    const nomeNovo = `Mat ${atualizado.matricula} - ${atualizado.cidade} - ${atualizado.estado}`;

    try {
      await driveService.renameFolder(atualizado.id_drive, nomeNovo);
    } catch (err) {
      // Não falha a edição só porque a pasta não pôde ser renomeada
      // (ex: pasta já não existe mais no Drive por algum motivo).
      console.error(
        `Falha ao renomear pasta do Drive (id_drive=${atualizado.id_drive}):`,
        err.message
      );
    }
  }

  return atualizado;
};


exports.delete = async (id) => {
  const card = await cardRepository.findById(id);

  if (!card) {
    throw new Error("Card não encontrado");
  }

  await cardRepository.delete(id);

  if (card.id_drive) {
    try {
      await driveService.deleteFolder(card.id_drive);
    } catch (err) {
      console.error(
        `Falha ao apagar pasta do Drive (id_drive=${card.id_drive}) do card ${id}:`,
        err.message
      );
    }
  }

  return true;
};


exports.moveCard = async (id, status, ordem) => {
  const card = await cardRepository.findById(id);

  if (!card) {
    throw new Error("Card não encontrado");
  }

  return await cardRepository.update(id, {
    status,
    ordem,
  });
};

exports.getOrCreateCardFolder = async ({ matricula, cidade, estado }) => {
  if (!matricula || !cidade || !estado) {
    throw new Error(
      `Dados incompletos para localizar/criar a pasta: matricula="${matricula}", cidade="${cidade}", estado="${estado}"`
    );
  }

  const cardExistente = await cardRepository.findByMatriculaCidadeEstado(
    matricula,
    cidade,
    estado
  );

  if (cardExistente) {
    if (cardExistente.status !== "doing") {
      await cardRepository.update(cardExistente.id, { status: "doing" });
    }

    return { folderId: cardExistente.id_drive, novoPendente: null };
  }

  const pendenteExistente = await pendenteRepository.findByMatriculaCidadeEstado(
    matricula,
    cidade,
    estado
  );

  if (pendenteExistente) {
    return { folderId: pendenteExistente.id_drive, novoPendente: null };
  }

  const nomeUnico = `Mat ${matricula} - ${cidade} - ${estado}`;
  const folderId = await driveService.createFolder(nomeUnico);

  const novoPendente = await pendenteRepository.create({
    matricula,
    cidade,
    estado,
    id_drive: folderId,
  });

  return { folderId, novoPendente };
};


exports.rollbackCardFolder = async (folderId, novoPendente) => {
  if (!novoPendente) return;

  try {
    await driveService.deleteFolder(folderId);
  } catch (err) {
    console.error("Falha ao apagar pasta no Drive durante rollback:", err.message);
  }

  try {
    await pendenteRepository.delete(novoPendente.id);
  } catch (err) {
    console.error("Falha ao apagar Pendente durante rollback:", err.message);
  }
};


exports.getAllPendentes = async () => {
  return await pendenteRepository.findAll();
};

exports.descartarPendente = async (pendenteId) => {
  const pendente = await pendenteRepository.findById(pendenteId);
 
  if (!pendente) {
    throw new Error("Pendente não encontrado");
  }
 
  await pendenteRepository.delete(pendenteId);
 
  if (pendente.id_drive) {
    try {
      await driveService.deleteFolder(pendente.id_drive);
    } catch (err) {
      console.error(
        `Falha ao apagar pasta do Drive (id_drive=${pendente.id_drive}) do pendente ${pendenteId}:`,
        err.message
      );
    }
  }
 
  return true;
};


exports.converterPendenteEmCard = async (pendenteId, dadosRestantes) => {
  const pendente = await pendenteRepository.findById(pendenteId);

  if (!pendente) {
    throw new Error("Pendente não encontrado");
  }

  const matriculaFinal = dadosRestantes.matricula ?? pendente.matricula;
  const cidadeFinal = dadosRestantes.cidade ?? pendente.cidade;
  const estadoFinal = dadosRestantes.estado ?? pendente.estado;

  const card = await cardRepository.create({
    matricula: matriculaFinal,
    cidade: cidadeFinal,
    estado: estadoFinal,
    id_drive: pendente.id_drive,
    status: "doing",
    ordem: 0,
    ...dadosRestantes,
  });

  const mudouIdentificacao =
    matriculaFinal !== pendente.matricula ||
    cidadeFinal !== pendente.cidade ||
    estadoFinal !== pendente.estado;

  if (mudouIdentificacao && pendente.id_drive) {
    const nomeNovo = `Mat ${matriculaFinal} - ${cidadeFinal} - ${estadoFinal}`;

    try {
      await driveService.renameFolder(pendente.id_drive, nomeNovo);
    } catch (err) {
      console.error(
        `Falha ao renomear pasta do Drive (id_drive=${pendente.id_drive}):`,
        err.message
      );
    }
  }

  await pendenteRepository.delete(pendenteId);

  return card;
};