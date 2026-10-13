const telegramService = require("../services/telegram.service");

module.exports = (err, req, res, next) => {
  console.error(err);

  telegramService.sendErrorNotification(err, {
    rota: req.originalUrl,
    metodo: req.method,
  });

  return res.status(err.status || 500).json({
    error: err.userMessage || err.message || "Erro interno no servidor",
  });
};