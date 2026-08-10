const Card = require("../models/Card");
const { Op } = require("sequelize");

function normalizar(str) {
  return (str ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

exports.create = async (dados) => {
  return await Card.create(dados);
};


exports.findAll = async () => {
    return await Card.findAll({
      order: [
        ["updatedAt", "DESC"]
      ],
    });
};


exports.findById = async (id) => {
  return await Card.findByPk(id);
};

exports.findByMatricula = async (matricula) => {
    return await Card.findOne({
    where: {
        matricula,
    },
    });
};

// Busca candidatos por matricula+status no banco, compara cidade e estado
// normalizados (sem acento, minúsculo, sem espaço extra) em JS.
// excludeId: se informado, ignora esse id na busca (usado em update, pra
// não achar "a si mesmo" e bloquear a própria edição).
exports.findByMatriculaCidadeEstado = async (matricula, cidade, estado, excludeId = null) => {
  const candidatos = await Card.findAll({
    where: {
      matricula,
      status: { [Op.ne]: "done" },
    },
  });

  const cidadeAlvo = normalizar(cidade);
  const estadoAlvo = normalizar(estado);

  return (
    candidatos.find(
      (c) =>
        c.id !== excludeId &&
        normalizar(c.cidade) === cidadeAlvo &&
        normalizar(c.estado) === estadoAlvo
    ) || null
  );
};


exports.update = async (id, dados) => {
  await Card.update(
    dados,
    {
      where: {
        id,
      },
    }
  );

  return await Card.findByPk(id);
};


exports.delete = async (id) => {
  return await Card.destroy({
    where: {
      id,
    },
  });
};