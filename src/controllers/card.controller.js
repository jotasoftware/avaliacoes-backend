const cardService = require("../services/card.service");

exports.create = async (req, res, next) => {
  try {
    const result = await cardService.create(req.body);
    return res.status(201).json(result);
  } catch (error) {
    error.status = error.status || 400;
    error.userMessage = error.userMessage || "Erro ao criar avaliação";
    return next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const result = await cardService.getAll();
    return res.status(200).json(result);
  } catch (error) {
    error.status = error.status || 500;
    error.userMessage = error.userMessage || "Erro ao buscar avaliações";
    return next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await cardService.getById(id);
    return res.status(200).json(result);
  } catch (error) {
    error.status = error.status || 404;
    error.userMessage = error.userMessage || "Erro ao buscar avaliação";
    return next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await cardService.update(id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    error.status = error.status || 400;
    error.userMessage = error.userMessage || "Erro ao atualizar avaliação";
    return next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    await cardService.delete(id);
    return res.status(204).send();
  } catch (error) {
    error.status = error.status || 400;
    error.userMessage = error.userMessage || "Erro ao deletar avaliação";
    return next(error);
  }
};

exports.moveCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, ordem } = req.body;
    const result = await cardService.moveCard(id, status, ordem);
    return res.status(200).json(result);
  } catch (error) {
    error.status = error.status || 400;
    error.userMessage = error.userMessage || "Erro ao mover card";
    return next(error);
  }
};