const Categoria = require("../models/Categoria");

exports.findAll = async () => {
  return await Categoria.findAll({
    order: [["nome", "ASC"]],
  });
};

exports.findById = async (id) => {
  return await Categoria.findByPk(id);
};

exports.findByNome = async (nome) => {
  return await Categoria.findOne({ where: { nome } });
};

exports.create = async (nome) => {
  return await Categoria.create({ nome });
};

exports.delete = async (id) => {
  return await Categoria.destroy({ where: { id } });
};