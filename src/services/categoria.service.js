const categoriaRepository = require("../repositories/categoria.repository");

exports.getAll = async () => {
  return await categoriaRepository.findAll();
};

exports.create = async (nome) => {
  const nomeNormalizado = nome.trim().toLowerCase();

  if (!nomeNormalizado) {
    throw new Error("Nome da categoria é obrigatório");
  }

  const existente = await categoriaRepository.findByNome(nomeNormalizado);
  if (existente) {
    throw new Error("Essa categoria já existe");
  }

  return await categoriaRepository.create(nomeNormalizado);
};

exports.delete = async (id) => {
  const categoria = await categoriaRepository.findById(id);
  if (!categoria) {
    throw new Error("Categoria não encontrada");
  }

  await categoriaRepository.delete(id);
  return true;
};

/**
 * Usado pelo openai.service (classifyImage) — retorna só os nomes,
 * já no formato que o prompt espera.
 */
exports.getAllNomes = async () => {
  const categorias = await categoriaRepository.findAll();
  return categorias.map((c) => c.nome);
};