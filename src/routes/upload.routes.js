const router = require("express").Router();

const uploadController = require("../controllers/upload.controller");
const downloadController = require("../controllers/download.controller");


const authMiddleware = require("../middlewares/auth.middleware");

router.post("/image", authMiddleware.validateApiKey, uploadController.uploadImage);
router.post("/document", authMiddleware.validateApiKey, uploadController.uploadDocument);

module.exports = router;