const db = require('../models');
const aiService = require('./aiService');

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

  async getJobs(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    const where = { status: 'OPEN' };

    if (filters.location) {
      where.location = { [db.Sequelize.Op.like]: `%${filters.location}%` };
    }
    if (filters.experienceLevel) {
      where.experienceLevel = filters.experienceLevel;
    }
    if (filters.employmentType) {
      where.employmentType = filters.employmentType;
    }
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
        { model: db.Company, as: 'company', attributes: ['id', 'companyName', 'logo'] }
      ]
    });

    return { total: count, page, limit, data: rows };
  }

  async getJobById(jobId) {
    const job = await db.JobPosting.findByPk(jobId, {
      include: [
        { model: db.Company, as: 'company', attributes: ['id', 'companyName', 'logo', 'website', 'location'] }
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
        { model: db.Company, as: 'company', attributes: ['id', 'companyName'] }
      ],
      attributes: ['id', 'title', 'location', 'employmentType', 'experienceLevel', 'status', 'skillRequirements']
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

  async applyForJob(studentId, jobPostingId, coverLetter) {
    const job = await db.JobPosting.findByPk(jobPostingId);
    if (!job) throw new Error('Job không tồn tại');
    if (job.status !== 'OPEN') throw new Error('Job này không còn nhận ứng tuyển');

    if (job.deadline) {
      const now = new Date();
      const deadline = new Date(job.deadline);
      if (now > deadline) throw new Error('Hạn nộp đã hết');
    }

    const student = await db.Student.findOne({ where: { id: studentId } });
    if (!student) throw new Error('Student không tồn tại');

    // Kiểm tra chưa ứng tuyển
    const existing = await db.JobApplication.findOne({
      where: { studentId, jobPostingId }
    });
    if (existing) throw new Error('Bạn đã ứng tuyển job này rồi');

    const application = await db.JobApplication.create({
      studentId,
      jobPostingId,
      coverLetter: coverLetter || null,
      status: 'PENDING',
      appliedAt: new Date()
    });

    return application;
  }

  async getAppliedJobs(studentId) {
    const student = await db.Student.findOne({ where: { id: studentId } });
    if (!student) throw new Error('Student không tồn tại');

    const applications = await db.JobApplication.findAll({
      where: { studentId },
      include: [
        {
          model: db.JobPosting,
          as: 'jobPosting',
          include: [
            { model: db.Company, as: 'company', attributes: ['id', 'companyName'] }
          ]
        }
      ],
      order: [['appliedAt', 'DESC']]
    });

    return applications;
  }

  // ==============================
  // Skill Gap & Learning Path
  // ==============================

  async analyzeSkillGap(studentId, jobPostingId) {
    // Lấy JobPosting kèm thông tin Company
    const job = await db.JobPosting.findByPk(jobPostingId, {
      include: [{ model: db.Company, as: 'company', attributes: ['id', 'companyName'] }]
    });
    if (!job) throw new Error('Job không tồn tại');

    const student = await db.Student.findOne({ where: { id: studentId } });
    if (!student) throw new Error('Student không tồn tại');

    const skillRequirements = job.skillRequirements || [];

    // =========================================
    // TRUY VẤN 1: StudentProgress + CareerPath
    // =========================================
    const studentProgresses = await db.StudentProgress.findAll({
      where: { studentId },
      include: [{ model: db.CareerPath, as: 'careerPath' }]
    });

    // =========================================
    // TRUY VẤN 2: StudentTestResult + Test
    // =========================================
    const studentTestResults = await db.StudentTestResult.findAll({
      where: { studentId },
      include: [{ model: db.Test, as: 'test' }]
    });

    // =========================================
    // THUẬT TOÁN: Xây Map kỹ năng sinh viên
    // Format: { [skillNameLower]: { proficiency, courseId } }
    // =========================================
    const skillMap = {};

    for (const progress of studentProgresses) {
      const course = progress.careerPath;
      if (!course) continue;

      const courseTitle = course.title || '';
      const courseCategory = course.category || '';

      // Lấy điểm test trung bình của khóa học này
      // Lọc: test.careerPathId === course.id
      const courseTests = (studentTestResults || []).filter(
        tr => tr.test && tr.test.careerPathId === course.id
      );

      let avgScore = null;
      if (courseTests.length > 0) {
        const totalScore = courseTests.reduce((sum, tr) => {
          let raw = tr.score || 0;
          if (raw > 10) raw = raw / 10;
          return sum + raw;
        }, 0);
        avgScore = totalScore / courseTests.length;
      }

      const status = progress.status;

      // Tính proficiency (1–5)
      let proficiency = 1;

      if (status === 'IN_PROGRESS') {
        if (avgScore !== null && avgScore >= 6) {
          proficiency = 3;
        } else {
          proficiency = 1;
        }
      } else if (status === 'COMPLETED') {
        if (avgScore !== null && avgScore >= 8.0) {
          proficiency = 5;
        } else {
          proficiency = 4;
        }
      } else {
        // NOT_STARTED — giữ mặc định 1
        proficiency = 1;
      }

      // Tách từ khóa từ title và category làm skillName
      const titleWords = courseTitle.split(/\s+/).filter(w => w.length > 2);
      const categoryWords = courseCategory.split(/\s+/).filter(w => w.length > 2);

      const allWords = [...titleWords, ...categoryWords];
      for (const word of allWords) {
        const key = word.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!key) continue;
        if (!skillMap[key] || proficiency > skillMap[key].proficiency) {
          skillMap[key] = { proficiency, courseId: course.id, courseTitle };
        }
      }
    }

    // =========================================
    // MATCHING: Duyệt skillRequirements → so sánh
    // =========================================
    const requiredResults = [];
    const niceToHaveResults = [];

    for (const req of skillRequirements) {
      const jobSkillLower = req.skillName.toLowerCase();
      let matched = false;
      let studentProficiency = 0;

      // Tìm khớp: so sánh jobSkillName.includes(skillKey) hoặc skillKey.includes(jobSkillWord)
      const jobWords = jobSkillLower.split(/\s+/).filter(w => w.length > 2);

      for (const key of Object.keys(skillMap)) {
        // Kiểm tra: skillKey chứa trong jobSkillName HOẶC jobSkillWord chứa trong skillKey
        const found = jobWords.some(w => key.includes(w) || w.includes(key));
        if (found) {
          matched = true;
          studentProficiency = skillMap[key].proficiency;
          break;
        }
      }

      const item = {
        skillName: req.skillName,
        matched,
        proficiency: studentProficiency,
        minRequired: req.minProficiency || 1
      };

      if (req.level === 'REQUIRED') {
        requiredResults.push(item);
      } else {
        niceToHaveResults.push(item);
      }
    }

    // Tính matchPercentage (chỉ tính trên REQUIRED)
    const matchedRequired = requiredResults.filter(s => s.matched).length;
    const matchPercentage = requiredResults.length > 0
      ? Math.round((matchedRequired / requiredResults.length) * 100)
      : 0;

    return {
      required: requiredResults,
      niceToHave: niceToHaveResults,
      matchPercentage
    };
  }

  async suggestLearningPath(studentId, jobPostingId) {
    // Bước 1: Lấy kết quả skill gap
    const gap = await this.analyzeSkillGap(studentId, jobPostingId);

    // Bước 2: Lọc ra các kỹ năng bị thiếu (matched === false) từ cả required và niceToHave
    const missingRequired = (gap.required || []).filter(s => !s.matched);
    const missingNiceToHave = (gap.niceToHave || []).filter(s => !s.matched);

    // Bước 3: Bảo vệ — nếu không có kỹ năng thiếu, trả về ngay
    if (missingRequired.length === 0 && missingNiceToHave.length === 0) {
      return { mustLearn: [], niceToKnow: [] };
    }

    // Bước 4: Gộp tên kỹ năng thiếu thành chuỗi query, gọi AI đúng 1 lần
    const allMissing = [...missingRequired, ...missingNiceToHave];
    const missingSkillNames = allMissing.map(s => s.skillName);
    const query = 'Các khóa học về: ' + missingSkillNames.join(', ');

    let aiResults = [];
    try {
      aiResults = await aiService.searchCourses(query);
    } catch (_) {
      aiResults = [];
    }

    // Bước 5: Trích xuất courseIds từ kết quả AI
    const courseIds = aiResults
      .map(r => r.id || r.courseId || null)
      .filter(id => id != null);

    // Bước 6: Nếu AI không tìm được khóa nào, trả về mảng rỗng
    if (courseIds.length === 0) {
      return { mustLearn: [], niceToKnow: [] };
    }

    // Bước 7: Chống N+1 — truy vấn tất cả lessons cho các courseIds đúng 1 lần
    const allLessons = await db.Lesson.findAll({
      where: { careerPathId: { [db.Sequelize.Op.in]: courseIds } },
      order: [['order', 'ASC']]
    });

    // Bước 8: Map lessons theo careerPathId
    const lessonsByCourse = {};
    for (const lesson of allLessons) {
      if (!lessonsByCourse[lesson.careerPathId]) {
        lessonsByCourse[lesson.careerPathId] = [];
      }
      lessonsByCourse[lesson.careerPathId].push({ id: lesson.id, title: lesson.title });
    }

    // Bước 9: Map AI results theo courseId để lấy courseTitle
    const courseInfoMap = {};
    for (const r of aiResults) {
      const cid = r.id || r.courseId;
      if (cid) courseInfoMap[cid] = r;
    }

    // Bước 10: Phân loại mustLearn (REQUIRED) và niceToKnow (NICE_TO_HAVE)
    const mustLearn = [];
    const niceToKnow = [];

    for (const skill of missingRequired) {
      const matchedCourse = aiResults.find(r => {
        const cid = r.id || r.courseId;
        const title = (r.title || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        const skillName = skill.skillName.toLowerCase();
        return cid && (title.includes(skillName) || desc.includes(skillName));
      });
      if (matchedCourse) {
        const cid = matchedCourse.id || matchedCourse.courseId;
        mustLearn.push({
          courseId: cid,
          courseTitle: matchedCourse.title || '',
          skillNeeded: skill.skillName,
          lessons: (lessonsByCourse[cid] || []).slice(0, 3)
        });
      }
    }

    for (const skill of missingNiceToHave) {
      const matchedCourse = aiResults.find(r => {
        const cid = r.id || r.courseId;
        const title = (r.title || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        const skillName = skill.skillName.toLowerCase();
        return cid && (title.includes(skillName) || desc.includes(skillName));
      });
      if (matchedCourse) {
        const cid = matchedCourse.id || matchedCourse.courseId;
        niceToKnow.push({
          courseId: cid,
          courseTitle: matchedCourse.title || '',
          skillNeeded: skill.skillName,
          lessons: (lessonsByCourse[cid] || []).slice(0, 3)
        });
      }
    }

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
}

module.exports = new JobPostingService();
