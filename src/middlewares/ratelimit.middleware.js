const rateLimit = require("express-rate-limit");

exports.iaRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas requisições em pouco tempo. Tente novamente em alguns minutos.",
  },
});