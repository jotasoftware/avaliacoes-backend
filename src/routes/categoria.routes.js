const router = require("express").Router();
const categoriaController = require("../controllers/categoria.controller");
const { validateFirebaseToken } = require("../middlewares/auth.middleware");
router.use(validateFirebaseToken);

router.get("/", categoriaController.getAll);
router.post("/", categoriaController.create);
router.delete("/:id", categoriaController.delete);

module.exports = router;