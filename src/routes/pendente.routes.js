const router = require("express").Router();
const pendenteController = require("../controllers/pendente.controller");
const { validateFirebaseToken } = require("../middlewares/auth.middleware");
router.use(validateFirebaseToken);

router.get("/", pendenteController.getAll);
router.post("/:id/completar", pendenteController.completar);
router.delete("/:id", pendenteController.descartar);

module.exports = router;