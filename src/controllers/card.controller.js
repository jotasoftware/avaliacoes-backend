const cardService = require("../services/card.service");

exports.create = async (req, res) => {
  try {
    const result = await cardService.create(req.body);

    return res.status(201).json(result);
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      error: error.message || "Erro ao criar avaliação",
    });
  }
};


exports.getAll = async (req, res) => {
  try {
    const result = await cardService.getAll();

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message || "Erro ao buscar avaliações",
    });
  }
};


exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await cardService.getById(id);

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);

    return res.status(404).json({
      error: error.message || "Erro ao buscar avaliação",
    });
  }
};


exports.update = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await cardService.update(
      id,
      req.body
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      error: error.message || "Erro ao atualizar avaliação",
    });
  }
};


exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    await cardService.delete(id);

    return res.status(204).send();
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      error: error.message || "Erro ao deletar avaliação",
    });
  }
};


exports.moveCard = async (req, res) => {
  try {
    const { id } = req.params;

    const { status, ordem } = req.body;

    const result = await cardService.moveCard(
      id,
      status,
      ordem
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      error: error.message || "Erro ao mover card",
    });
  }
};