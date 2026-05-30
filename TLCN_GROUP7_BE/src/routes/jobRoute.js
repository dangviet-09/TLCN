const express = require("express");
const router = express.Router();
const jobPostingController = require("../controllers/jobPostingController");
const AuthMiddleware = require("../middlewares/AuthMiddleware");
const RoleMiddleware = require("../middlewares/RoleMiddleware");

// =============================================
// PUBLIC ROUTES (No Auth)
// =============================================

router.get("/market", jobPostingController.getMarket);

router.get("/", jobPostingController.getAll);

// =============================================
// AUTHENTICATION REQUIRED
// =============================================

router.use(AuthMiddleware.verifyToken);

// =============================================
// STATIC ROUTES (must come before dynamic /:id)
// =============================================
router.post("/", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), jobPostingController.create);
router.get("/company/owned", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), jobPostingController.getOwned);

router.get("/student/applied", jobPostingController.getApplied);

router.get("/admin/all", RoleMiddleware.checkRole(["ADMIN"]), jobPostingController.getAllAdmin);

// =============================================
// DYNAMIC /:id/* ROUTES — MUST come BEFORE bare /:id
// Otherwise "skill-gap", "learning-path", "apply" would be captured as :id → 404
// =============================================

router.get("/:id/skill-gap", jobPostingController.getSkillGap);

router.get("/:id/learning-path", jobPostingController.getLearningPath);

router.post("/:id/apply", jobPostingController.apply);

router.get("/:id/applications", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), jobPostingController.getApplications);

router.patch("/applications/:applicationId/status", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), jobPostingController.updateApplicationStatus);

// =============================================
// BARE /:id — declared LAST among /:id* routes
// =============================================

router.get("/:id", jobPostingController.getById);

router.put("/:id", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), jobPostingController.update);

router.delete("/:id", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), jobPostingController.delete);

router.patch("/:id/status", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), jobPostingController.updateStatus);

// =============================================
// ADMIN-ONLY /admin/:id ROUTES
// =============================================

router.patch("/admin/:id/status", RoleMiddleware.checkRole(["ADMIN"]), jobPostingController.updateStatusAdmin);

router.delete("/admin/:id", RoleMiddleware.checkRole(["ADMIN"]), jobPostingController.deleteAdmin);

module.exports = router;
