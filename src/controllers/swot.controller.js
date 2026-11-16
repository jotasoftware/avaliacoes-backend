const swotService = require("../services/swot.service");

const QUADRANTES = ["forcas", "oportunidades", "fraquezas", "ameacas"];
const MAX_ITENS = 15;
const MAX_TEXTO = 200;

// aceita só arrays de texto, limpa espaços e limita tamanhos
function limpar(body = {}) {
  const dados = {};
  for (const chave of QUADRANTES) {
    const lista = Array.isArray(body[chave]) ? body[chave] : [];
    dados[chave] = lista
      .filter((t) => typeof t === "string")
      .map((t) => t.trim().slice(0, MAX_TEXTO))
      .filter(Boolean)
      .slice(0, MAX_ITENS);
  }
  return dados;
}

exports.gerarImagem = async (req, res, next) => {
  try {
    const dados = limpar(req.body);
    const png = await swotService.gerarSwotPng(dados);

    res.set("Content-Type", "image/png");
    res.set("Content-Disposition", 'attachment; filename="swot.png"');
    return res.status(200).send(png);
  } catch (error) {
    error.status = error.status || 400;
    error.userMessage = error.userMessage || "Erro ao gerar SWOT";
    return next(error);
  }
};