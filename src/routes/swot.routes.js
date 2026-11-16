const express = require("express");
const router = express.Router();

const swotController = require("../controllers/swot.controller");
const { validateFirebaseToken } = require("../middlewares/auth.middleware"); // ajuste o caminho

router.post("/", validateFirebaseToken, swotController.gerarImagem);

module.exports = router;