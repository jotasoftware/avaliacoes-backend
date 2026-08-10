const router = require("express").Router();
const multer = require("multer");

const downloadController = require("../controllers/download.controller");
const { validateFirebaseToken } = require("../middlewares/auth.middleware");
const { iaRateLimit } = require("../middlewares/rateLimit.middleware");

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Apenas arquivos PDF são aceitos"));
    }
    cb(null, true);
  },
});

router.use(validateFirebaseToken);

router.post("/imagens", downloadController.exportImagesToWord);
router.post("/documentos/:folderId", downloadController.exportFolderDocumentToWord);

// Rate limit só nas rotas que chamam IA (extração de polígono via visão),
// não nas de exportação simples de Word (sem custo de IA).
router.post("/car", downloadController.exportKmlCar);
router.post("/front/car", downloadController.exportKmlCar);
router.post("/documento", iaRateLimit, upload.single("documento"), downloadController.exportKmlDocumento);

module.exports = router;