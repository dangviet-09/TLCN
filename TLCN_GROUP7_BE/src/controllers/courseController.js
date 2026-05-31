const courseService = require("../services/courseService");
const studentService = require("../services/studentService");
const ApiResponse = require("../utils/apiResponse");

class CourseController {

  // ==============================
  // Course Handlers — Company/Admin (format: { status, message, data })
  // ==============================

  async createCourse(req, res) {
    try {
      const userId = req.user.id;
      const data = req.body;
      const files = req.files;
      const result = await courseService.createCourse(userId, data, files);
      return res.status(201).json({ status: 201, message: 'Tạo khóa học thành công', data: result });
    } catch (error) {
      console.error('[CourseController.createCourse]', error);
      return res.status(400).json({ status: 400, message: error.message || 'Lỗi tạo khóa học', data: null });
    }
  }

  async createLesson(req, res) {
    try {
      const userId = req.user.id;
      const courseId = req.params.courseId;
      const data = req.body;
      const result = await courseService.createLesson(userId, courseId, data);
      return res.status(201).json({ status: 201, message: 'Tạo bài giảng thành công', data: result });
    } catch (error) {
      console.error('[CourseController.createLesson]', error);
      return res.status(400).json({ status: 400, message: error.message || 'Lỗi tạo bài giảng', data: null });
    }
  }
  async update(req, res) {
    try {
      const userId = req.user.id;
      const courseId = req.params.id;
      const data = req.body;
      const result = await courseService.updateCourse(userId, courseId, data);
      return ApiResponse.success(res, 'Cập nhật course thành công', result);
    } catch (error) {
      console.error('[CourseController.update]', error);
      return ApiResponse.error(res, error.message || 'Lỗi cập nhật course', 400);
    }
  }

  async delete(req, res) {
    try {
      const userId = req.user.id;
      const courseId = req.params.id;
      await courseService.deleteCourse(userId, courseId);
      return ApiResponse.success(res, 'Xoá course thành công');
    } catch (error) {
      console.error('[CourseController.delete]', error);
      return ApiResponse.error(res, error.message || 'Không tìm thấy course', 404);
    }
  }

  async publish(req, res) {
    try {
      const userId = req.user.id;
      const courseId = req.params.id;
      const result = await courseService.publishCourse(userId, courseId);
      return ApiResponse.success(res, 'Xuất bản course thành công', result);
    } catch (error) {
      console.error('[CourseController.publish]', error);
      return ApiResponse.error(res, error.message || 'Lỗi xuất bản course', 400);
    }
  }

  // ==============================
  // Course Handlers — Student/Public
  // ==============================

  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {
        category: req.query.category,
        level: req.query.level,
        search: req.query.search
      };
      const result = await courseService.getAllCourses(page, limit, filters);
      return ApiResponse.success(res, 'Lấy danh sách course thành công', result);
    } catch (error) {
      console.error('[CourseController.getAll]', error);
      return ApiResponse.error(res, error.message || 'Lỗi server', 500);
    }
  }

  async getById(req, res) {
    try {
      const courseId = req.params.id;
      const userId = req.user?.id || null;
      const result = await courseService.getCourseById(courseId, userId);
      return ApiResponse.success(res, 'Chi tiết course', result);
    } catch (error) {
      console.error('[CourseController.getById]', error);
      return ApiResponse.error(res, error.message || 'Course không tồn tại', 404);
    }
  }

  async getOwned(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const result = await courseService.getCoursesByCompany(userId, page, limit);
      return ApiResponse.success(res, 'Lấy danh sách course của công ty thành công', result);
    } catch (error) {
      console.error('[CourseController.getOwned]', error);
      return ApiResponse.error(res, error.message || 'Lỗi server', 500);
    }
  }

  // ==============================
  // Lesson Handlers — Company/Admin
  // ==============================

  async createLesson(req, res) {
    try {
      const userId = req.user.id;
      const courseId = req.params.courseId;
      const data = req.body;
      const result = await courseService.createLesson(userId, courseId, data);
      return ApiResponse.success(res, 'Tạo lesson thành công', result, 201);
    } catch (error) {
      console.error('[CourseController.createLesson]', error);
      return ApiResponse.error(res, error.message || 'Lỗi tạo lesson', 400);
    }
  }

  async updateLesson(req, res) {
    try {
      const userId = req.user.id;
      const { courseId, lessonId } = req.params;
      const data = req.body;
      const result = await courseService.updateLesson(userId, lessonId, data);
      return ApiResponse.success(res, 'Cập nhật lesson thành công', result);
    } catch (error) {
      console.error('[CourseController.updateLesson]', error);
      return ApiResponse.error(res, error.message || 'Lỗi cập nhật lesson', 400);
    }
  }

  async deleteLesson(req, res) {
    try {
      const userId = req.user.id;
      const { courseId, lessonId } = req.params;
      await courseService.deleteLesson(userId, lessonId);
      return ApiResponse.success(res, 'Xoá lesson thành công');
    } catch (error) {
      console.error('[CourseController.deleteLesson]', error);
      return ApiResponse.error(res, error.message || 'Không tìm thấy lesson', 404);
    }
  }

  async updateLessonContent(req, res) {
    try {
      const userId = req.user.id;
      const { courseId, lessonId } = req.params;
      const data = req.body;
      const result = await courseService.updateLessonContent(userId, lessonId, data);
      return ApiResponse.success(res, 'Cập nhật nội dung lesson thành công', result);
    } catch (error) {
      console.error('[CourseController.updateLessonContent]', error);
      return ApiResponse.error(res, error.message || 'Lỗi cập nhật nội dung lesson', 400);
    }
  }

  // ==============================
  // Learning Handlers — Student
  // ==============================

  async enroll(req, res) {
    try {
      const userId = req.user.id;
      const courseId = req.params.id;

      const student = await studentService.getStudentByUserId(userId);
      if (!student) {
        return ApiResponse.error(res, 'Student không tồn tại', 404);
      }

      const result = await courseService.enrollCourse(student.id, courseId);
      return ApiResponse.success(res, 'Đăng ký khóa học thành công', result, 201);
    } catch (error) {
      console.error('[CourseController.enroll]', error);
      return ApiResponse.error(res, error.message || 'Lỗi đăng ký khóa học', 400);
    }
  }

  async getProgress(req, res) {
    try {
      const userId = req.user.id;
      const courseId = req.params.id;

      const student = await studentService.getStudentByUserId(userId);
      if (!student) {
        return ApiResponse.error(res, 'Student không tồn tại', 404);
      }

      const result = await courseService.getCourseProgress(student.id, courseId);
      return ApiResponse.success(res, 'Lấy tiến độ học tập thành công', result);
    } catch (error) {
      console.error('[CourseController.getProgress]', error);
      return ApiResponse.error(res, error.message || 'Lỗi lấy tiến độ', 400);
    }
  }

  async getLessonDetail(req, res) {
    try {
      const userId = req.user.id;
      const { courseId, lessonId } = req.params;

      const student = await studentService.getStudentByUserId(userId);
      if (!student) {
        return ApiResponse.error(res, 'Student không tồn tại', 404);
      }

      const result = await courseService.getLessonDetail(student.id, courseId, lessonId);
      return ApiResponse.success(res, 'Chi tiết bài học', result);
    } catch (error) {
      console.error('[CourseController.getLessonDetail]', error);
      return ApiResponse.error(res, error.message || 'Lỗi lấy chi tiết bài học', 400);
    }
  }

  async submitLessonTask(req, res) {
    try {
      const userId = req.user.id;
      const { courseId, lessonId } = req.params;
      const { submissionData } = req.body;

      if (!submissionData) {
        return ApiResponse.error(res, 'Thiếu submissionData', 400);
      }

      const student = await studentService.getStudentByUserId(userId);
      if (!student) {
        return ApiResponse.error(res, 'Student không tồn tại', 404);
      }

      const result = await courseService.submitLessonTask(student.id, courseId, lessonId, submissionData);
      return ApiResponse.success(res, 'Nộp bài thực hành thành công', result, 201);
    } catch (error) {
      console.error('[CourseController.submitLessonTask]', error);
      return ApiResponse.error(res, error.message || 'Lỗi nộp bài', 400);
    }
  }

  async completeTheoryLesson(req, res) {
    try {
      const userId = req.user.id;
      const { courseId, lessonId } = req.params;

      const student = await studentService.getStudentByUserId(userId);
      if (!student) {
        return ApiResponse.error(res, 'Student không tồn tại', 404);
      }

      const result = await courseService.completeTheoryLesson(student.id, courseId, lessonId);
      return ApiResponse.success(res, 'Hoàn thành bài học lý thuyết', result);
    } catch (error) {
      console.error('[CourseController.completeTheoryLesson]', error);
      return ApiResponse.error(res, error.message || 'Lỗi hoàn thành bài học', 400);
    }
  }

  // ==============================
  // Admin Handlers
  // ==============================

  async getAllAdmin(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = { status: req.query.status };
      const result = await courseService.getAllCoursesAdmin(page, limit, filters);
      return ApiResponse.success(res, 'Lấy danh sách course (admin) thành công', result);
    } catch (error) {
      console.error('[CourseController.getAllAdmin]', error);
      return ApiResponse.error(res, error.message || 'Lỗi server', 500);
    }
  }

  async updateStatusAdmin(req, res) {
    try {
      const courseId = req.params.id;
      const { status } = req.body;

      if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
        return ApiResponse.error(res, 'Status không hợp lệ. Chỉ chấp nhận: DRAFT, PUBLISHED, ARCHIVED', 400);
      }

      const result = await courseService.updateCourseStatusAdmin(courseId, status);
      return ApiResponse.success(res, `Cập nhật status thành ${status} thành công`, result);
    } catch (error) {
      console.error('[CourseController.updateStatusAdmin]', error);
      return ApiResponse.error(res, error.message || 'Lỗi cập nhật status', 400);
    }
  }

  async deleteAdmin(req, res) {
    try {
      const courseId = req.params.id;
      await courseService.deleteCourseAdmin(courseId);
      return ApiResponse.success(res, 'Xoá course thành công');
    } catch (error) {
      console.error('[CourseController.deleteAdmin]', error);
      return ApiResponse.error(res, error.message || 'Không tìm thấy course', 404);
    }
  }
}

module.exports = new CourseController();
