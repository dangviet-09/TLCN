// controllers/careerTestController.js
const CareerTestService = require('../services/careerTestService');
const studentService = require('../services/studentService');
const ApiResponse = require('../utils/apiResponse');

class CareerTestController {

  // ==============================
  // Legacy methods (giữ nguyên)
  // ==============================

  async getTest(req, res) {
    try {
      const test = await CareerTestService.getCareerTest();
      return ApiResponse.success(res, 'Lấy bài trắc nghiệm thành công', test);
    } catch (error) {
      return ApiResponse.error(res, error.message, 404);
    }
  }

  async submitTest(req, res) {
    try {
      const userId = req.user.id;
      const answers = req.body.answers;
      const result = await CareerTestService.evaluateCareerTest(userId, answers);
      return ApiResponse.success(res, 'Nộp bài trắc nghiệm thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async updatemajor(req, res) {
    try {
      const studentId = req.user.id;
      const { major } = req.body;
      const result = await CareerTestService.updatemajor(studentId, major);
      return ApiResponse.success(res, 'update major success', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  // ==============================
  // Company / Admin endpoints
  // ==============================

  async create(req, res) {
    try {
      const result = await CareerTestService.createCareerTest(req.user.id, req.body);
      return ApiResponse.success(res, 'Tạo career test thành công', result, 201);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const result = await CareerTestService.updateCareerTest(req.user.id, req.params.id, req.body);
      return ApiResponse.success(res, 'Cập nhật career test thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async remove(req, res) {
    try {
      await CareerTestService.deleteCareerTest(req.user.id, req.params.id);
      return ApiResponse.success(res, 'Xoá career test thành công');
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = { search: req.query.search };
      const result = await CareerTestService.getCareerTests(page, limit, filters);
      return ApiResponse.success(res, 'Lấy danh sách career test thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 500);
    }
  }

  async getById(req, res) {
    try {
      const result = await CareerTestService.getCareerTestById(req.params.id);
      return ApiResponse.success(res, 'Chi tiết career test', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 404);
    }
  }

  async getOwned(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const result = await CareerTestService.getOwnedCareerTests(req.user.id, page, limit);
      return ApiResponse.success(res, 'Lấy danh sách career test của công ty thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async getResults(req, res) {
    try {
      const result = await CareerTestService.getTestResults(req.params.id);
      return ApiResponse.success(res, 'Lấy kết quả test thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  // ==============================
  // Student endpoints
  // ==============================

  async enroll(req, res) {
    try {
      const student = await studentService.getStudentByUserId(req.user.id);
      if (!student) return ApiResponse.error(res, 'Student không tồn tại', 404);

      const result = await CareerTestService.enrollCareerTest(student.id, req.params.id);
      return ApiResponse.success(res, result.message || 'Đăng ký test thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async submitNew(req, res) {
    try {
      const { answers } = req.body;
      const student = await studentService.getStudentByUserId(req.user.id);
      if (!student) return ApiResponse.error(res, 'Student không tồn tại', 404);

      const result = await CareerTestService.submitCareerTest(student.id, req.params.id, answers);
      return ApiResponse.success(res, 'Nộp bài test thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }
}

module.exports = new CareerTestController();
