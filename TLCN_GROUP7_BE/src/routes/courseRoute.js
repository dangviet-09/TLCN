const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const AuthMiddleware = require("../middlewares/AuthMiddleware");
const RoleMiddleware = require("../middlewares/RoleMiddleware");
const uploadMiddleware = require("../middlewares/uploadMiddleware");

// =============================================
// PUBLIC ROUTES (No Auth)
// =============================================

router.get("/", courseController.getAll);

router.get("/:id", courseController.getById);

// =============================================
// AUTHENTICATION REQUIRED
// =============================================

router.use(AuthMiddleware.verifyToken);

// =============================================
// STUDENT ROUTES
// =============================================

router.post("/:id/enroll", courseController.enroll);

router.get("/:id/progress", courseController.getProgress);

router.get("/:courseId/lessons/:lessonId", courseController.getLessonDetail);

router.post("/:courseId/lessons/:lessonId/submit", courseController.submitLessonTask);

router.post("/:courseId/lessons/:lessonId/complete", courseController.completeTheoryLesson);

// =============================================
// COMPANY / ADMIN ROUTES
// =============================================

router.get("/company/owned", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), courseController.getOwned);

router.post(
  "/",
  RoleMiddleware.checkRole(["COMPANY", "ADMIN"]),
  uploadMiddleware.uploadSingle("image"),
  courseController.create
);

router.put("/:id", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), courseController.update);

router.delete("/:id", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), courseController.delete);

router.patch("/:id/publish", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), courseController.publish);

router.post("/:courseId/lessons", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), courseController.createLesson);

router.put("/:courseId/lessons/:lessonId", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), courseController.updateLesson);

router.delete("/:courseId/lessons/:lessonId", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), courseController.deleteLesson);

router.put(
  "/:courseId/lessons/:lessonId/content",
  RoleMiddleware.checkRole(["COMPANY", "ADMIN"]),
  courseController.updateLessonContent
);

// =============================================
// ADMIN ROUTES
// =============================================

router.get("/admin/courses", RoleMiddleware.checkRole(["ADMIN"]), courseController.getAllAdmin);

router.patch("/admin/courses/:id", RoleMiddleware.checkRole(["ADMIN"]), courseController.updateStatusAdmin);

router.delete("/admin/courses/:id", RoleMiddleware.checkRole(["ADMIN"]), courseController.deleteAdmin);

module.exports = router;
