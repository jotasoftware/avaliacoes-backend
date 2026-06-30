const router = require("express").Router();

const downloadController = require("../controllers/download.controller");

router.get("/:folderId", downloadController.exportFolderImagesToWord);
router.get("/document/:folderId", downloadController.exportFolderDocumentToWord);

router.post("/car", downloadController.exportKmlCar);

module.exports = router;