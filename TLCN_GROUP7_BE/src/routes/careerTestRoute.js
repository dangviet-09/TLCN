const express = require("express");
const router = express.Router();
const careerTestController = require("../controllers/careerTestController");
const AuthMiddleware = require("../middlewares/AuthMiddleware");
const RoleMiddleware = require("../middlewares/RoleMiddleware");

router.use(AuthMiddleware.verifyToken);

// =============================================
// STATIC ROUTES (declare before dynamic /:id)
// =============================================

router.get("/", careerTestController.getAll);

router.get("/owned", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), careerTestController.getOwned);

router.get("/legacy/test", careerTestController.getTest);

router.post("/", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), careerTestController.create);

router.post("/legacy/submit", careerTestController.submitTest);

router.put("/legacy/major", careerTestController.updatemajor);

// =============================================
// DYNAMIC ROUTES (/:id — must come after static)
// =============================================

router.get("/:id", careerTestController.getById);

router.get("/:id/results", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), careerTestController.getResults);

router.post("/:id/enroll", careerTestController.enroll);

router.post("/:id/submit", careerTestController.submitNew);

router.put("/:id", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), careerTestController.update);

router.delete("/:id", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), careerTestController.remove);

module.exports = router;
