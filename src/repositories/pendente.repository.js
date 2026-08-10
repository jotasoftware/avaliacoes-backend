const Pendente = require("../models/Pendente");
const { Op, fn, col, where } = require("sequelize");

exports.create = async (dados) => {
  console.log(dados)
  return await Pendente.create(dados);
};

exports.findAll = async () => {
  return await Pendente.findAll();
};

exports.findById = async (id) => {
  return await Pendente.findByPk(id);
};

exports.findByMatriculaCidadeEstado = async (matricula, cidade, estado) => {
    return await Pendente.findOne({
      where: {
        matricula,
        estado,
        [Op.and]: [
          where(fn("LOWER", col("cidade")), cidade.toLowerCase()),
        ],
      },
    });
  };

exports.delete = async (id) => {
  return await Pendente.destroy({
    where: {
      id,
    },
  });
};