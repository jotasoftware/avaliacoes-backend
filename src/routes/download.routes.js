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

router.post("/imagens", validateFirebaseToken, downloadController.exportImagesToWord);
router.post("/documento/:fileId", validateFirebaseToken, downloadController.exportFolderDocumentToWord);

router.post("/front/car", validateFirebaseToken, downloadController.exportKmlCar);
router.post("/car", downloadController.exportKmlCar);
router.post("/documento", iaRateLimit, upload.single("documento"), downloadController.exportKmlDocumento);

module.exports = router;