const categoriaService = require("../services/categoria.service");

exports.getAll = async (req, res) => {
  try {
    const categorias = await categoriaService.getAll();
    return res.status(200).json(categorias);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.create = async (req, res) => {
  try {
    const { nome } = req.body;
    const categoria = await categoriaService.create(nome);
    return res.status(201).json(categoria);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await categoriaService.delete(id);
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};