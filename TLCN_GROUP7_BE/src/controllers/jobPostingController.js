const jobPostingService = require('../services/jobPostingService');
const studentService = require('../services/studentService');
const ApiResponse = require('../utils/apiResponse');

class JobPostingController {

  // ==============================
  // Company endpoints
  // ==============================

  async create(req, res) {
    try {
      const result = await jobPostingService.createJob(req.user.id, req.body);
      return ApiResponse.success(res, 'Tạo job thành công', result, 201);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const result = await jobPostingService.updateJob(req.user.id, req.params.id, req.body);
      return ApiResponse.success(res, 'Cập nhật job thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      await jobPostingService.deleteJob(req.user.id, req.params.id);
      return ApiResponse.success(res, 'Xoá job thành công');
    } catch (error) {
      return ApiResponse.error(res, error.message, 404);
    }
  }

  async updateStatus(req, res) {
    try {
      const { status } = req.body;
      const result = await jobPostingService.updateJobStatus(req.user.id, req.params.id, status);
      return ApiResponse.success(res, `Cập nhật status thành ${status} thành công`, result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async getOwned(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const result = await jobPostingService.getOwnedJobs(req.user.id, page, limit);
      return ApiResponse.success(res, 'Lấy danh sách job của công ty thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 500);
    }
  }

  async getApplications(req, res) {
    try {
      const result = await jobPostingService.getJobApplications(req.user.id, req.params.id);
      return ApiResponse.success(res, 'Lấy danh sách ứng viên thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async updateApplicationStatus(req, res) {
    try {
      const { status } = req.body;
      const result = await jobPostingService.updateApplicationStatus(req.user.id, req.params.applicationId, status);
      return ApiResponse.success(res, `Cập nhật status ứng viên thành ${status} thành công`, result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  // ==============================
  // Student endpoints
  // ==============================

  async apply(req, res) {
    try {
      const student = await studentService.getStudentByUserId(req.user.id);
      if (!student) return ApiResponse.error(res, 'Student không tồn tại', 404);

      const { coverLetter } = req.body;
      const result = await jobPostingService.applyForJob(student.id, req.params.id, coverLetter);
      return ApiResponse.success(res, 'Ứng tuyển thành công', result, 201);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async getApplied(req, res) {
    try {
      const student = await studentService.getStudentByUserId(req.user.id);
      if (!student) return ApiResponse.error(res, 'Student không tồn tại', 404);

      const result = await jobPostingService.getAppliedJobs(student.id);
      return ApiResponse.success(res, 'Lấy danh sách job đã ứng tuyển thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async getSkillGap(req, res) {
    try {
      const student = await studentService.getStudentByUserId(req.user.id);
      if (!student) return ApiResponse.error(res, 'Student không tồn tại', 404);

      const result = await jobPostingService.analyzeSkillGap(student.id, req.params.id);
      return ApiResponse.success(res, 'Phân tích skill gap thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async getLearningPath(req, res) {
    try {
      const result = await jobPostingService.suggestLearningPath(req.params.id);
      return ApiResponse.success(res, 'Gợi ý lộ trình học thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  // ==============================
  // Public endpoints
  // ==============================

  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {
        search: req.query.search,
        location: req.query.location,
        experienceLevel: req.query.experienceLevel,
        employmentType: req.query.employmentType
      };
      const result = await jobPostingService.getJobs(page, limit, filters);
      return ApiResponse.success(res, 'Lấy danh sách job thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 500);
    }
  }

  async getById(req, res) {
    try {
      const result = await jobPostingService.getJobById(req.params.id);
      return ApiResponse.success(res, 'Chi tiết job', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 404);
    }
  }

  async getMarket(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = { search: req.query.search };
      const result = await jobPostingService.getJobsMarket(page, limit, filters);
      return ApiResponse.success(res, 'Lấy danh sách job market thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 500);
    }
  }

  // ==============================
  // Admin endpoints
  // ==============================

  async getAllAdmin(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = { status: req.query.status };
      const result = await jobPostingService.getAllJobsAdmin(page, limit, filters);
      return ApiResponse.success(res, 'Lấy danh sách job (admin) thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 500);
    }
  }

  async updateStatusAdmin(req, res) {
    try {
      const { status } = req.body;
      const result = await jobPostingService.updateJobStatusAdmin(req.params.id, status);
      return ApiResponse.success(res, `Cập nhật status job thành ${status} thành công`, result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async deleteAdmin(req, res) {
    try {
      await jobPostingService.deleteJobAdmin(req.params.id);
      return ApiResponse.success(res, 'Xoá job thành công');
    } catch (error) {
      return ApiResponse.error(res, error.message, 404);
    }
  }
}

module.exports = new JobPostingController();
