const cardService = require("../services/card.service");

exports.getAll = async (req, res) => {
  try {
    const pendentes = await cardService.getAllPendentes();
    return res.status(200).json(pendentes);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.completar = async (req, res) => {
  try {
    const { id } = req.params;
    const card = await cardService.converterPendenteEmCard(id, req.body);
    return res.status(200).json(card);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

exports.descartar = async (req, res) => {
  try {
    const { id } = req.params;
    await cardService.descartarPendente(id);
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};