const router = require("express").Router();

const uploadController = require("../controllers/upload.controller");
const { validateApiKey } = require("../middlewares/auth.middleware");
const { iaRateLimit } = require("../middlewares/rateLimit.middleware");
const { uploadPdfs } = require("../middlewares/upload.middleware");
const { validateFirebaseToken } = require("../middlewares/auth.middleware");

router.use(iaRateLimit);

router.post("/image", validateApiKey, uploadController.uploadImage);
router.post("/document", validateApiKey, uploadController.uploadDocument);
router.post("/front/document", validateFirebaseToken, uploadPdfs, uploadController.uploadDocumentFromFront);

// Recebe o webhook do Zapier (Plaud -> transcrição). Protegido pela mesma
// x-api-key do bot — configure esse header no passo "Webhooks by Zapier".
router.post("/transcricao", uploadController.receberTranscricao);

module.exports = router;