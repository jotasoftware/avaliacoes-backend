const categoriaService = require("../services/categoria.service");

exports.getAll = async (req, res, next) => {
  try {
    const categorias = await categoriaService.getAll();
    return res.status(200).json(categorias);
  } catch (error) {
    error.status = error.status || 500;
    error.userMessage = error.userMessage || "Internal server error";
    return next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { nome } = req.body;
    const categoria = await categoriaService.create(nome);
    return res.status(201).json(categoria);
  } catch (error) {
    error.status = error.status || 400;
    error.userMessage = error.userMessage || error.message;
    return next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    await categoriaService.delete(id);
    return res.status(204).send();
  } catch (error) {
    error.status = error.status || 400;
    error.userMessage = error.userMessage || error.message;
    return next(error);
  }
};