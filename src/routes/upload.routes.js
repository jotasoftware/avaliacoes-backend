const router = require("express").Router();

const uploadController = require("../controllers/upload.controller"); // ajuste conforme seu arquivo real
const { validateApiKey } = require("../middlewares/auth.middleware"); // ajuste o path/nome real
const { iaRateLimit } = require("../middlewares/ratelimit.middleware");

router.use(validateApiKey);
router.use(iaRateLimit);

router.post("/image", uploadController.uploadImage);
router.post("/document", uploadController.uploadDocument);

// Recebe o webhook do Zapier (Plaud -> transcrição). Protegido pela mesma
// x-api-key do bot — configure esse header no passo "Webhooks by Zapier".
router.post("/transcricao", uploadController.receberTranscricao);

module.exports = router;