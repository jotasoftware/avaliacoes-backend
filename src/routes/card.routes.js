const router = require("express").Router();
const cardController = require("../controllers/card.controller");
const { validateFirebaseToken } = require("../middlewares/auth.middleware");
router.use(validateFirebaseToken);

router.post("/", cardController.create);
router.get("/", cardController.getAll);
router.get("/:id", cardController.getById);
router.put("/:id", cardController.update);
router.delete("/:id", cardController.delete);
router.patch("/:id/status", cardController.moveCard);

module.exports = router;