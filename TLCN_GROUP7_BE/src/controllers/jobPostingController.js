const db = require('../models');
const jwt = require('jsonwebtoken');
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

  async createJob(req, res) {
    try {
      const company = await db.Company.findOne({ where: { userId: req.user.id } });
      if (!company) {
        return res.status(403).json({ status: 403, message: 'Không tìm thấy hồ sơ Doanh nghiệp của tài khoản này.' });
      }

      const newJob = await jobPostingService.createJobPosting(company.id, req.body);
      return res.status(201).json({ status: 201, message: 'Đăng việc làm thành công', data: newJob });
    } catch (error) {
      console.error('[JobPostingController.createJob]', error);
      return res.status(400).json({ status: 400, message: error.message || 'Lỗi đăng việc làm', data: null });
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

  async applyJob(req, res) {
    try {
      const student = await db.Student.findOne({ where: { userId: req.user.id } });
      if (!student) {
        return res.status(403).json({ status: 403, message: 'Chỉ sinh viên mới có quyền ứng tuyển.' });
      }

      const jobId = req.params.id;
      const { coverLetter } = req.body;
      const result = await jobPostingService.applyForJob(jobId, student.id, coverLetter);
      return res.status(201).json({ status: 201, message: 'Ứng tuyển thành công', data: result });
    } catch (error) {
      return res.status(400).json({ status: 400, message: error.message || 'Ứng tuyển thất bại', data: null });
    }
  }

  async getApplied(req, res) {
    try {
      const student = await db.Student.findOne({ where: { userId: req.user.id } });
      if (!student) return ApiResponse.error(res, 'Hồ sơ sinh viên không tồn tại', 404);

      const result = await jobPostingService.getAppliedJobs(student.id);
      return ApiResponse.success(res, 'Lấy danh sách job đã ứng tuyển thành công', result);
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async getSkillGap(req, res) {
    try {
      const student = await db.Student.findOne({ where: { userId: req.user.id } });
      if (!student) {
        return res.status(403).json({ status: 403, message: 'Truy cập bị từ chối. Chỉ sinh viên mới có hồ sơ kỹ năng.' });
      }

      const result = await jobPostingService.analyzeSkillGap(student.id, req.params.id);
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      console.error('[JobPostingController.getSkillGap]', error);
      return res.status(400).json({ status: 400, message: error.message || 'Lỗi phân tích skill gap', data: null });
    }
  }

  async getLearningPath(req, res) {
    try {
      const student = await db.Student.findOne({ where: { userId: req.user.id } });
      if (!student) {
        return res.status(403).json({ status: 403, message: 'Chỉ sinh viên mới có quyền truy cập lộ trình học.' });
      }

      const path = await jobPostingService.suggestLearningPath(student.id, req.params.id);
      return res.status(200).json({ status: 200, data: path });
    } catch (error) {
      console.error('[JobPostingController.getLearningPath]', error);
      return res.status(400).json({ status: 400, message: error.message || 'Lỗi gợi ý lộ trình học', data: null });
    }
  }

  // ==============================
  // Public endpoints
  // ==============================

  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const { isRecommended } = req.query;

      // ── Auth guard: recommended mode requires student token ──
      if (isRecommended === 'true') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return ApiResponse.error(
            res,
            'Vui lòng đăng nhập với tài khoản sinh viên để dùng tính năng này',
            401
          );
        }

        let decoded;
        try {
          const token = authHeader.slice(7);
          decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
          return ApiResponse.error(
            res,
            'Vui lòng đăng nhập với tài khoản sinh viên để dùng tính năng này',
            401
          );
        }

        const student = await db.Student.findOne({ where: { userId: decoded.id } });
        if (!student) {
          return ApiResponse.error(
            res,
            'Vui lòng đăng nhập với tài khoản sinh viên để dùng tính năng này',
            401
          );
        }

        const filters = {
          search: req.query.search,
          location: req.query.location,
          experienceLevel: req.query.experienceLevel,
          employmentType: req.query.employmentType,
          sort: req.query.sort,
        };
        const result = await jobPostingService.getJobs(
          page, limit, filters, true, student.id
        );
        return ApiResponse.success(res, 'Lấy danh sách job thành công', result);
      }

      // ── Normal mode (public) ──
      const filters = {
        search: req.query.search,
        location: req.query.location,
        experienceLevel: req.query.experienceLevel,
        employmentType: req.query.employmentType,
        sort: req.query.sort,
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
