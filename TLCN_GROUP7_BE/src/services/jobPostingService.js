const db = require('../models');
const { Op } = require('sequelize');
const aiService = require('./aiService');

const getRequiredScoreByLevel = (level) => {
  const levels = {
    'FRESHER': 10,
    'JUNIOR': 25,
    'MIDIOR': 50,
    'SENIOR': 80
  };
  return levels[(level || '').toUpperCase()] || 10;
};

class JobPostingService {

  // ==============================
  // CRUD JobPosting
  // ==============================

  async createJob(userId, data) {
    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error('User không tồn tại');

    if (user.role !== 'COMPANY') {
      throw new Error('Chỉ Company mới có quyền đăng tin tuyển dụng');
    }

    const company = await db.Company.findOne({ where: { userId } });
    if (!company) throw new Error('Không tìm thấy công ty của bạn');

    const job = await db.JobPosting.create({
      companyId: company.id,
      title: data.title,
      description: data.description || null,
      skillRequirements: data.skillRequirements || [],
      location: data.location || null,
      salaryMin: data.salaryMin || null,
      salaryMax: data.salaryMax || null,
      employmentType: data.employmentType || null,
      experienceLevel: data.experienceLevel || null,
      deadline: data.deadline || null,
      requiredDocuments: data.requiredDocuments || [],
      status: data.status || 'DRAFT',
      viewCount: 0
    });

    return job;
  }

  async createJobPosting(companyId, payload) {
    const skillRequirements = Array.isArray(payload.skillRequirements)
      ? payload.skillRequirements
      : [];
    const requiredDocuments = Array.isArray(payload.requiredDocuments)
      ? payload.requiredDocuments
      : [];

    const job = await db.JobPosting.create({
      companyId,
      title: payload.title,
      description: payload.description || null,
      skillRequirements,
      location: payload.location || null,
      salaryMin: payload.salaryMin || null,
      salaryMax: payload.salaryMax || null,
      employmentType: payload.employmentType || null,
      experienceLevel: payload.experienceLevel || null,
      deadline: payload.deadline || null,
      requiredDocuments,
      status: 'OPEN',
      viewCount: 0
    });

    return job;
  }

  async updateJob(userId, jobId, data) {
    const job = await db.JobPosting.findByPk(jobId);
    if (!job) throw new Error('Job không tồn tại');

    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error('User không tồn tại');

    // === RBAC: Kiểm tra Ownership ===
    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      if (job.companyId !== company.id) {
        throw new Error('Không có quyền chỉnh sửa job này');
      }
    } else if (user.role !== 'ADMIN') {
      throw new Error('Bạn không có quyền chỉnh sửa job');
    }

    await job.update({
      title: data.title ?? job.title,
      description: data.description ?? job.description,
      skillRequirements: data.skillRequirements ?? job.skillRequirements,
      location: data.location ?? job.location,
      salaryMin: data.salaryMin ?? job.salaryMin,
      salaryMax: data.salaryMax ?? job.salaryMax,
      employmentType: data.employmentType ?? job.employmentType,
      experienceLevel: data.experienceLevel ?? job.experienceLevel,
      deadline: data.deadline ?? job.deadline,
      requiredDocuments: data.requiredDocuments ?? job.requiredDocuments,
      status: data.status ?? job.status
    });

    return job;
  }

  async deleteJob(userId, jobId) {
    const job = await db.JobPosting.findByPk(jobId);
    if (!job) throw new Error('Job không tồn tại');

    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error('User không tồn tại');

    // === RBAC: Kiểm tra Ownership ===
    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      if (job.companyId !== company.id) {
        throw new Error('Không có quyền xoá job này');
      }
    } else if (user.role !== 'ADMIN') {
      throw new Error('Bạn không có quyền xoá job');
    }

    await db.JobPosting.destroy({ where: { id: jobId } });
    return true;
  }

  async updateJobStatus(userId, jobId, status) {
    const job = await db.JobPosting.findByPk(jobId);
    if (!job) throw new Error('Job không tồn tại');

    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error('User không tồn tại');

    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      if (job.companyId !== company.id) {
        throw new Error('Không có quyền cập nhật status job này');
      }
    } else if (user.role !== 'ADMIN') {
      throw new Error('Bạn không có quyền cập nhật status job');
    }

    await job.update({ status });
    return job;
  }

  // ==============================
  // Public / Student endpoints
  // ==============================

  async getJobs(page = 1, limit = 10, filters = {}, isRecommended = false, studentId = null) {
    const offset = (page - 1) * limit;
    const where = { status: 'OPEN' };

    if (filters.location) where.location = { [db.Sequelize.Op.substring]: filters.location };
    if (filters.experienceLevel) where.experienceLevel = filters.experienceLevel;
    if (filters.employmentType) where.employmentType = filters.employmentType;
    if (filters.search) where.title = { [db.Sequelize.Op.substring]: filters.search };

    const order = [];
    if (filters.sort === 'salary_desc') order.push(['salaryMax', 'DESC']);
    else order.push(['createdAt', 'DESC']);

    if (isRecommended && studentId) {
      const studentSkills = await db.StudentSkill.findAll({
        where: { studentId },
        attributes: ['skillName', 'score']
      });

      const studentSkillMap = new Map(
        studentSkills
          .filter(s => s.score > 0)
          .map(s => [s.skillName.toLowerCase().trim(), s.score])
      );

      const allJobs = await db.JobPosting.findAll({
        where, order,
        include: [{ model: db.Company, as: 'company', attributes: ['id', 'companyName', 'logo'] }]
      });

      const enriched = allJobs.map((job) => {
        let skillRequirements = job.skillRequirements;
        if (typeof skillRequirements === 'string') {
          try { skillRequirements = JSON.parse(skillRequirements); } catch { skillRequirements = []; }
        }
        if (!Array.isArray(skillRequirements)) skillRequirements = [];

        let matchPercentage = 0;
        let totalMatchScore = 0;
        const targetScorePerSkill = getRequiredScoreByLevel(job.experienceLevel);

        if (skillRequirements.length > 0) {
          let totalSkillPercent = 0;
          for (const req of skillRequirements) {
            const requiredSkill = (req.skillName || '').toLowerCase().trim();
            const studentScore = studentSkillMap.get(requiredSkill) || 0;

            // Lựa chọn A: Khóa trần ở 100%, không bù trừ chéo
            const skillPercent = Math.min(100, (studentScore / targetScorePerSkill) * 100);
            totalSkillPercent += skillPercent;
            totalMatchScore += studentScore;
          }
          matchPercentage = Math.round(totalSkillPercent / skillRequirements.length);
        } else {
          matchPercentage = 100;
        }
        return { ...job.toJSON(), matchPercentage, totalMatchScore };
      });

      enriched.sort((a, b) => {
        if (b.matchPercentage !== a.matchPercentage) return b.matchPercentage - a.matchPercentage;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      const total = enriched.length;
      const totalPages = Math.ceil(total / limit);
      const rows = enriched.slice(offset, offset + limit);

      return { data: rows, total, totalPages, currentPage: page };
    }

    const { rows, count } = await db.JobPosting.findAndCountAll({
      where, limit, offset, order,
      include: [{ model: db.Company, as: 'company', attributes: ['id', 'companyName', 'logo'] }]
    });

    return { total: count, page, limit, data: rows };
  }

  async getJobById(jobId) {
    const job = await db.JobPosting.findByPk(jobId, {
      include: [
        { model: db.Company, as: 'company', attributes: ['id', 'companyName', 'logo'], required: false }
      ]
    });
    if (!job) throw new Error('Job không tồn tại');

    // Tăng view count
    await job.increment('viewCount');

    return job;
  }

  async getJobsMarket(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    const where = { status: 'OPEN' };

    if (filters.search) {
      where[db.Sequelize.Op.or] = [
        { title: { [db.Sequelize.Op.like]: `%${filters.search}%` } },
        { description: { [db.Sequelize.Op.like]: `%${filters.search}%` } }
      ];
    }

    const { rows, count } = await db.JobPosting.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        { model: db.Company, as: 'company', attributes: ['id', 'companyName'], required: false }
      ],
      attributes: ['id', 'title', 'location', 'salaryMin', 'salaryMax', 'employmentType', 'experienceLevel', 'status', 'skillRequirements', 'deadline', 'viewCount']
    });

    return { total: count, page, limit, data: rows };
  }

  // ==============================
  // Company endpoints
  // ==============================

  async getOwnedJobs(userId, page = 1, limit = 10) {
    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error('User không tồn tại');

    if (user.role !== 'COMPANY' && user.role !== 'ADMIN') {
      throw new Error('Bạn không có quyền xem danh sách job');
    }

    const offset = (page - 1) * limit;
    const where = {};

    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      where.companyId = company.id;
    }

    const { rows, count } = await db.JobPosting.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        { model: db.Company, as: 'company', attributes: ['id', 'companyName'] }
      ]
    });

    return { total: count, page, limit, data: rows };
  }

  async getJobApplications(userId, jobId) {
    const job = await db.JobPosting.findByPk(jobId);
    if (!job) throw new Error('Job không tồn tại');

    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error('User không tồn tại');

    // === RBAC: Chỉ công ty sở hữu hoặc Admin mới được xem ===
    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      if (job.companyId !== company.id) {
        throw new Error('Không có quyền xem ứng viên của job này');
      }
    } else if (user.role !== 'ADMIN') {
      throw new Error('Bạn không có quyền xem danh sách ứng viên');
    }

    const applications = await db.JobApplication.findAll({
      where: { jobPostingId: jobId },
      include: [
        {
          model: db.Student,
          as: 'student',
          include: [
            { model: db.User, as: 'user', attributes: ['fullName', 'email'] }
          ]
        }
      ],
      order: [['appliedAt', 'DESC']]
    });

    // ── Attach matchPercentage to each application ──
    await Promise.all(
      applications.map(async (app) => {
        if (!app.student || !app.student.id) {
          app.setDataValue('matchPercentage', 0);
          return;
        }
        try {
          const result = await this.analyzeSkillGap(app.student.id, jobId);
          app.setDataValue('matchPercentage', result.matchPercentage || 0);
        } catch {
          app.setDataValue('matchPercentage', 0);
        }
      })
    );

    return { job, applications };
  }

  async updateApplicationStatus(userId, applicationId, status) {
    const application = await db.JobApplication.findByPk(applicationId, {
      include: [{ model: db.JobPosting, as: 'jobPosting' }]
    });
    if (!application) throw new Error('Đơn ứng tuyển không tồn tại');

    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error('User không tồn tại');

    // === RBAC: Chỉ công ty sở hữu job hoặc Admin mới được cập nhật ===
    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      if (application.jobPosting?.companyId !== company.id) {
        throw new Error('Không có quyền cập nhật đơn ứng tuyển này');
      }
    } else if (user.role !== 'ADMIN') {
      throw new Error('Bạn không có quyền cập nhật đơn ứng tuyển');
    }

    const validStatuses = ['PENDING', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'ACCEPTED'];
    if (!validStatuses.includes(status)) {
      throw new Error('Status không hợp lệ');
    }

    await application.update({ status });
    return application;
  }

  // ==============================
  // Student: Apply for job
  // ==============================

  async applyForJob(jobId, studentId, coverLetter) {
    const job = await db.JobPosting.findByPk(jobId);
    if (!job || job.status !== 'OPEN') {
      throw new Error('Công việc không tồn tại hoặc đã đóng.');
    }

    const existing = await db.JobApplication.findOne({
      where: { studentId, jobPostingId: jobId }
    });
    if (existing) throw new Error('Bạn đã ứng tuyển vị trí này rồi.');

    const application = await db.JobApplication.create({
      studentId,
      jobPostingId: jobId,
      coverLetter: coverLetter || null,
      status: 'PENDING',
      appliedAt: new Date()
    });

    return application;
  }

  async getAppliedJobs(studentId) {
    const applications = await db.JobApplication.findAll({
      where: { studentId },
      attributes: ['id', 'studentId', 'jobPostingId', 'coverLetter', 'status', 'appliedAt'],
      include: [
        {
          model: db.JobPosting,
          as: 'jobPosting',
          attributes: ['id', 'title', 'location', 'salaryMin', 'salaryMax', 'employmentType', 'experienceLevel', 'deadline', 'status'],
          include: [
            { model: db.Company, as: 'company', attributes: ['id', 'companyName', 'logo'] }
          ]
        }
      ],
      order: [['appliedAt', 'DESC']]
    });

    return applications;
  }

  // ==============================
  // Skill Gap Analysis (Keyword Matching)
  // ==============================

  async analyzeSkillGap(studentId, jobId) {
    const job = await db.JobPosting.findByPk(jobId);
    if (!job) throw new Error('Job không tồn tại');

    let skillRequirements = job.skillRequirements;
    if (typeof skillRequirements === 'string') {
      try { skillRequirements = JSON.parse(skillRequirements); } catch { skillRequirements = []; }
    }
    if (!Array.isArray(skillRequirements)) skillRequirements = [];

    // Lấy dữ liệu từ bảng student_skills thay vì dò tên khóa học
    const studentSkills = await db.StudentSkill.findAll({
      where: { studentId },
      attributes: ['skillName', 'score']
    });

    const studentSkillMap = new Map(
      studentSkills
        .filter(s => s.score > 0)
        .map(s => [s.skillName.toLowerCase().trim(), s.score])
    );

    const targetScorePerSkill = getRequiredScoreByLevel(job.experienceLevel);
    let totalMatchScore = 0;
    let totalRequiredSkillPercent = 0;

    const skillResults = skillRequirements.map(req => {
      const requiredSkill = (req.skillName || '').toLowerCase().trim();
      const studentScore = studentSkillMap.get(requiredSkill) || 0;

      const skillPercent = Math.min(100, (studentScore / targetScorePerSkill) * 100);
      const isMatched = studentScore >= targetScorePerSkill;
      const isPartiallyMatched = studentScore > 0 && studentScore < targetScorePerSkill;

      if (req.level === 'REQUIRED') {
        totalMatchScore += studentScore;
        totalRequiredSkillPercent += skillPercent;
      }

      return {
        ...req,
        matched: isMatched,
        isPartiallyMatched: isPartiallyMatched,
        scoreObtained: studentScore,
        targetScore: targetScorePerSkill,
        skillMatchPercentage: Math.round(skillPercent)
      };
    });

    const required = skillResults.filter(s => s.level === 'REQUIRED');
    const niceToHave = skillResults.filter(s => s.level !== 'REQUIRED');

    const matchPercentage = required.length > 0
      ? Math.round(totalRequiredSkillPercent / required.length)
      : 100;

    return { jobInfo: job, matchPercentage, totalMatchScore, skillGap: { required, niceToHave } };
  }

  // ==============================
  // Skill Gap & Learning Path
  // ==============================

  async suggestLearningPath(studentId, jobPostingId) {
    // Bước 1: Kế thừa — lấy kết quả skill gap
    const { skillGap } = await this.analyzeSkillGap(studentId, jobPostingId);

    // Bước 2: Lọc kỹ năng thiếu (matched === false) từ cả required và niceToHave
    const missingRequired = (skillGap.required || []).filter(s => !s.matched);
    const missingNiceToHave = (skillGap.niceToHave || []).filter(s => !s.matched);

    if (missingRequired.length === 0 && missingNiceToHave.length === 0) {
      return { mustLearn: [], niceToKnow: [] };
    }

    // Helper: tìm khóa học trong db.CareerPath theo tên kỹ năng
    const findCoursesBySkill = async (skillName) => {
      return await db.CareerPath.findAll({
        where: {
          [Op.or]: [
            { title: { [Op.substring]: skillName } },
            { category: { [Op.substring]: skillName } }
          ]
        },
        attributes: ['id', 'title', 'category', 'level']
      });
    };

    // Bước 3: Lặp qua required → mustLearnRaw
    const mustLearnRaw = [];
    for (const skill of missingRequired) {
      const courses = await findCoursesBySkill(skill.skillName);
      for (const course of courses) {
        mustLearnRaw.push({
          courseId: course.id,
          courseTitle: course.title,
          category: course.category,
          level: course.level
        });
      }
    }

    // Bước 3: Lặp qua niceToHave → niceToKnowRaw
    const niceToKnowRaw = [];
    for (const skill of missingNiceToHave) {
      const courses = await findCoursesBySkill(skill.skillName);
      for (const course of courses) {
        niceToKnowRaw.push({
          courseId: course.id,
          courseTitle: course.title,
          category: course.category,
          level: course.level
        });
      }
    }

    // Bước 4: Khử trùng lặp bằng Map (giữ key là courseId)
    const dedup = (arr) => {
      const map = new Map();
      for (const item of arr) {
        if (!map.has(item.courseId)) {
          map.set(item.courseId, item);
        }
      }
      return Array.from(map.values());
    };

    const mustLearn = dedup(mustLearnRaw);
    const niceToKnow = dedup(niceToKnowRaw);

    return { mustLearn, niceToKnow };
  }

  // ==============================
  // Admin endpoints
  // ==============================

  async getAllJobsAdmin(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    const where = {};
    if (filters.status) where.status = filters.status;

    const { rows, count } = await db.JobPosting.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        { model: db.Company, as: 'company', attributes: ['id', 'companyName'] }
      ]
    });

    return { total: count, page, limit, data: rows };
  }

  async updateJobStatusAdmin(jobId, status) {
    const job = await db.JobPosting.findByPk(jobId);
    if (!job) throw new Error('Job không tồn tại');

    await job.update({ status });
    return job;
  }

  async deleteJobAdmin(jobId) {
    const job = await db.JobPosting.findByPk(jobId);
    if (!job) throw new Error('Job không tồn tại');

    await db.JobPosting.destroy({ where: { id: jobId } });
    return true;
  }

  async incrementViewCount(jobId) {
    if (!jobId) return;
    await db.JobPosting.increment('viewCount', { by: 1, where: { id: jobId } });
  }
}

module.exports = new JobPostingService();
