const cardService = require("../services/card.service");

exports.getAll = async (req, res, next) => {
  try {
    const pendentes = await cardService.getAllPendentes();
    return res.status(200).json(pendentes);
  } catch (error) {
    error.status = error.status || 500;
    error.userMessage = error.userMessage || "Internal server error";
    return next(error);
  }
};

exports.completar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const card = await cardService.converterPendenteEmCard(id, req.body);
    return res.status(200).json(card);
  } catch (error) {
    error.status = error.status || 400;
    error.userMessage = error.userMessage || error.message;
    return next(error);
  }
};

exports.descartar = async (req, res, next) => {
  try {
    const { id } = req.params;
    await cardService.descartarPendente(id);
    return res.status(204).send();
  } catch (error) {
    error.status = error.status || 400;
    error.userMessage = error.userMessage || error.message;
    return next(error);
  }
};