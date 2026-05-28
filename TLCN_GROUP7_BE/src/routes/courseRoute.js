const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const AuthMiddleware = require("../middlewares/AuthMiddleware");
const RoleMiddleware = require("../middlewares/RoleMiddleware");
const { uploadFields, validateMagicBytes } = require("../middlewares/uploadMiddleware");

// =============================================
// PUBLIC ROUTES
// =============================================

router.get("/", courseController.getAll);

router.get("/:id", AuthMiddleware.optionalToken, courseController.getById);

// =============================================
// STUDENT ROUTES
// =============================================

router.use(AuthMiddleware.verifyToken);
router.use(RoleMiddleware.checkRole(["STUDENT"]));

router.post("/:id/enroll", courseController.enroll);

router.get("/:id/progress", courseController.getProgress);

router.get("/:courseId/lessons/:lessonId", courseController.getLessonDetail);

router.post("/:courseId/lessons/:lessonId/submit", courseController.submitLessonTask);

router.post("/:courseId/lessons/:lessonId/complete", courseController.completeTheoryLesson);

// =============================================
// COMPANY / ADMIN ROUTES
// =============================================

// Lấy danh sách course của công ty
router.get("/owned", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), courseController.getOwned);

// Tạo course mới (upload ảnh)
router.post(
  "/",
  RoleMiddleware.checkRole(["COMPANY", "ADMIN"]),
  uploadFields,
  validateMagicBytes,
  courseController.create
);

// Cập nhật course
router.put("/:id", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), courseController.update);

// Xoá course
router.delete("/:id", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), courseController.delete);

// Xuất bản course
router.patch("/:id/publish", RoleMiddleware.checkRole(["COMPANY", "ADMIN"]), courseController.publish);

// --- Lesson CRUD dưới course ---

// Tạo lesson
router.post(
  "/:courseId/lessons",
  RoleMiddleware.checkRole(["COMPANY", "ADMIN"]),
  courseController.createLesson
);

// Cập nhật lesson (thông tin cơ bản: title, order)
router.put(
  "/:courseId/lessons/:lessonId",
  RoleMiddleware.checkRole(["COMPANY", "ADMIN"]),
  courseController.updateLesson
);

// Xoá lesson
router.delete(
  "/:courseId/lessons/:lessonId",
  RoleMiddleware.checkRole(["COMPANY", "ADMIN"]),
  courseController.deleteLesson
);

// Cập nhật nội dung lesson (7 cột mới)
router.put(
  "/:courseId/lessons/:lessonId/content",
  RoleMiddleware.checkRole(["COMPANY", "ADMIN"]),
  courseController.updateLessonContent
);

module.exports = router;
