const kafkaModule = require('../kafka');
const db = require("../models");
const LessonService = require("./lessonService");
const TestService = require("./testService");

class CourseService {

  // ==============================
  // CRUD cơ bản cho Course (kế thừa từ careerPathService.js)
  // ==============================

  async createCourse(userId, data, files) {
    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error("User không tồn tại");

    let companyIdForPath = null;

    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId: userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      companyIdForPath = company.id;
    } else if (user.role === 'ADMIN') {
      let systemCompany = await db.Company.findOne({ where: { companyName: 'System Admin' } });
      if (!systemCompany) {
        systemCompany = await db.Company.create({
          companyName: 'System Admin',
          description: 'System generated company for admin-created content',
          website: null,
          location: null,
          size: null,
          industry: null,
          logo: null,
          publicId: null,
          userId: userId,
          verified: true
        });
      }
      companyIdForPath = systemCompany.id;
    } else {
      throw new Error('Bạn không có quyền tạo course');
    }

    // Xu ly skills - parse an toan (FormData gui len stringified JSON)
    let parsedSkills = [];
    if (data.skills !== undefined && data.skills !== null) {
      if (Array.isArray(data.skills)) {
        parsedSkills = data.skills;
      } else if (typeof data.skills === 'string') {
        try {
          const parsed = JSON.parse(data.skills);
          parsedSkills = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          parsedSkills = [];
        }
      }
    }

    // Chuan hoa: trim + loai bo trung lap khong phan biet hoa thuong
    if (parsedSkills && parsedSkills.length > 0) {
      const seen = new Set();
      parsedSkills = parsedSkills.filter((skill) => {
        const lower = skill.trim().toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      }).map((skill) => skill.trim());
    }

    if (!parsedSkills || parsedSkills.length === 0) {
      throw new Error("Bắt buộc phải có ít nhất 1 kỹ năng cốt lõi");
    }

    const course = await db.CareerPath.create({
      title: data.title,
      description: data.description || null,
      category: data.category || null,
      level: data.level || null,
      companyId: companyIdForPath,
      image: null,
      publicId: null,
      status: data.status || 'DRAFT',
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      isFeatured: data.isFeatured || false,
      skills: parsedSkills
    });

    if (files?.images?.length) {
      const file = files.images[0];
      await kafkaModule.producers.courseImageProducer.sendUploadEvent({
        courseId: course.id,
        bufferBase64: file.buffer.toString('base64'),
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        type: "CREATE"
      });
    }

    return course;
  }

  async updateCourse(userId, courseId, data) {
    const course = await db.CareerPath.findByPk(courseId);
    if (!course) throw new Error("Course không tồn tại");

    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error("User không tồn tại");

    // === RBAC: Kiểm tra Ownership ===
    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId: userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      if (course.companyId !== company.id) throw new Error("Không có quyền chỉnh sửa course này");
    } else if (user.role === 'ADMIN') {
      // ADMIN bỏ qua ownership check
    } else {
      throw new Error("Bạn không có quyền chỉnh sửa course");
    }

    // Xu ly skills - parse an toan (FormData gui len stringified JSON)
    let parsedSkills = undefined;
    if (data.skills !== undefined && data.skills !== null) {
      if (Array.isArray(data.skills)) {
        parsedSkills = data.skills;
      } else if (typeof data.skills === 'string') {
        try {
          const parsed = JSON.parse(data.skills);
          parsedSkills = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          parsedSkills = [];
        }
      }
    }

    // Chuan hoa: trim + loai bo trung lap khong phan biet hoa thuong
    if (parsedSkills !== undefined && parsedSkills !== null && parsedSkills.length > 0) {
      const seen = new Set();
      parsedSkills = parsedSkills.filter((skill) => {
        const lower = skill.trim().toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      }).map((skill) => skill.trim());
    }

    if (parsedSkills !== undefined && (!Array.isArray(parsedSkills) || parsedSkills.length === 0)) {
      throw new Error("Bắt buộc phải có ít nhất 1 kỹ năng cốt lõi");
    }

    await course.update({
      title: data.title ?? course.title,
      description: data.description ?? course.description,
      category: data.category ?? course.category,
      level: data.level ?? course.level,
      status: data.status ?? course.status,
      ...(parsedSkills !== undefined && { skills: parsedSkills })
    });

    if (data.fileBase64) {
      try {
        await kafkaModule.producers.courseImageProducer.sendUploadEvent({
          courseId: course.id,
          bufferBase64: data.fileBase64,
          originalName: data.originalName,
          mimeType: data.mimeType,
          size: data.size,
          type: "UPDATE",
          oldPublicId: course.publicId
        });
      } catch (error) {
        console.error("Lỗi upload ảnh: ", error);
        throw new Error("Lỗi upload ảnh course");
      }
    }

    return course;
  }

  async deleteCourse(userId, courseId) {
    const course = await db.CareerPath.findByPk(courseId);
    if (!course) throw new Error("Course không tồn tại");

    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error("User không tồn tại");

    // === RBAC: Kiểm tra Ownership ===
    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId: userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      if (course.companyId !== company.id) throw new Error("Không có quyền xoá course này");
    } else if (user.role !== 'ADMIN') {
      throw new Error("Bạn không có quyền xoá course");
    }

    if (course.publicId) {
      try {
        await kafkaModule.producers.courseImageProducer.sendUploadEvent({
          courseId: course.id,
          type: "DELETE",
          oldPublicId: course.publicId
        });
      } catch (error) {
        console.error("Lỗi xóa ảnh: ", error);
        throw new Error("Lỗi xóa ảnh course");
      }
    }

    await db.CareerPath.destroy({ where: { id: course.id } });
    return true;
  }

  async getAllCourses(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    const where = { status: 'PUBLISHED' };

    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.level) {
      where.level = filters.level;
    }
    if (filters.search) {
      where[db.Sequelize.Op.or] = [
        { title: { [db.Sequelize.Op.like]: `%${filters.search}%` } },
        { description: { [db.Sequelize.Op.like]: `%${filters.search}%` } }
      ];
    }

    const { rows, count } = await db.CareerPath.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [{ model: db.Company, as: 'company', attributes: ['id', 'companyName', 'logo'] }]
    });

    return { total: count, page, limit, data: rows };
  }

  async getCourseById(courseId, userId = null) {
    const course = await db.CareerPath.findByPk(courseId, {
      include: [
        { model: db.Company, as: 'company', attributes: ['id', 'userId', 'companyName'] },
        { model: db.Lesson, as: 'lessons' }
      ],
      order: [[{ model: db.Lesson, as: 'lessons' }, 'order', 'ASC']]
    });
    if (!course) throw new Error("Course không tồn tại");

    if (course.status !== 'PUBLISHED') {
      if (!userId) {
        throw new Error("Course chưa được xuất bản");
      }
      const user = await db.User.findOne({ where: { id: userId } });
      if (user?.role === 'ADMIN') {
        // Admin bypass — allowed
      } else if (user?.role === 'COMPANY') {
        // Company owner bypass: compare course.company.userId with userId
        if (course.company?.userId !== userId) {
          throw new Error("Course chưa được xuất bản");
        }
      } else {
        // STUDENT or any other role: deny
        throw new Error("Course chưa được xuất bản");
      }
    }

    // Serialize to plain object before mutating
    const plainCourse = course.toJSON();

    const finalTest = await TestService.getFinalTestByCareerPath(courseId);
    if (finalTest) {
      plainCourse.finalTest = finalTest;
    }

    // Enrich each lesson with miniTests on the plain array
    if (plainCourse.lessons && plainCourse.lessons.length > 0) {
      for (const lesson of plainCourse.lessons) {
        lesson.miniTests = await TestService.getTestsByLesson(lesson.id);
      }
    }

    return plainCourse;
  }

  async getCoursesByCompany(userId, page = 1, limit = 10) {
    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error('User không tồn tại');

    const offset = (page - 1) * limit;
    const queryOptions = {
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [{ model: db.Company, as: 'company', attributes: ['id', 'companyName', 'userId'] }]
    };

    if (user.role === 'ADMIN') {
      const systemCompany = await db.Company.findOne({ where: { companyName: 'System Admin' } });
      queryOptions.where = { companyId: systemCompany ? systemCompany.id : null };
    } else if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId: userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      queryOptions.where = { companyId: company.id };
    } else {
      throw new Error('Bạn không có quyền xem danh sách course');
    }

    const { rows, count } = await db.CareerPath.findAndCountAll(queryOptions);
    return { total: count, page, limit, data: rows };
  }

  async publishCourse(userId, courseId) {
    const course = await db.CareerPath.findByPk(courseId);
    if (!course) throw new Error("Course không tồn tại");

    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error("User không tồn tại");

    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId: userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      if (course.companyId !== company.id) throw new Error("Không có quyền xuất bản course này");
    } else if (user.role !== 'ADMIN') {
      throw new Error("Bạn không có quyền xuất bản course");
    }

    await course.update({
      status: 'PUBLISHED',
      publishedAt: new Date()
    });

    return course;
  }

  // ==============================
  // CRUD cơ bản cho Lesson (kế thừa từ lessonService.js)
  // ==============================

  async createLesson(userId, courseId, data) {
    const course = await db.CareerPath.findByPk(courseId);
    if (!course) throw new Error("Course không tồn tại");

    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error("User không tồn tại");

    // === RBAC: Kiểm tra Ownership ===
    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId: userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      if (course.companyId !== company.id) throw new Error("Không có quyền thêm lesson vào course này");
    } else if (user.role !== 'ADMIN') {
      throw new Error("Bạn không có quyền thêm lesson");
    }

    return await db.Lesson.create({
      title: data.title,
      content: data.content || null,
      type: data.type || 'THEORY',
      theoryContent: data.theoryContent || null,
      taskDescription: data.taskDescription || null,
      submissionFields: data.submissionFields || [],
      rubric: data.rubric || null,
      attachments: data.attachments || null,
      referenceLinks: data.referenceLinks || null,
      order: data.order || 0,
      careerPathId: courseId
    });
  }

  async updateLesson(userId, lessonId, data) {
    const lesson = await db.Lesson.findByPk(lessonId);
    if (!lesson) throw new Error("Lesson không tồn tại");

    const course = await db.CareerPath.findByPk(lesson.careerPathId);
    if (!course) throw new Error("Course không tồn tại");

    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error("User không tồn tại");

    // === RBAC: Kiểm tra Ownership ===
    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId: userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      if (course.companyId !== company.id) throw new Error("Không có quyền chỉnh sửa lesson này");
    } else if (user.role !== 'ADMIN') {
      throw new Error("Bạn không có quyền chỉnh sửa lesson");
    }

    await lesson.update({
      title: data.title ?? lesson.title,
      content: data.content ?? lesson.content,
      order: data.order ?? lesson.order
    });

    return lesson;
  }

  async deleteLesson(userId, lessonId) {
    const lesson = await db.Lesson.findByPk(lessonId);
    if (!lesson) throw new Error("Lesson không tồn tại");

    const course = await db.CareerPath.findByPk(lesson.careerPathId);
    if (!course) throw new Error("Course không tồn tại");

    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error("User không tồn tại");

    // === RBAC: Kiểm tra Ownership ===
    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId: userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      if (course.companyId !== company.id) throw new Error("Không có quyền xoá lesson này");
    } else if (user.role !== 'ADMIN') {
      throw new Error("Bạn không có quyền xoá lesson");
    }

    await db.Lesson.destroy({ where: { id: lessonId } });
    return true;
  }

  // ==============================
  // Hàm mới: Cập nhật nội dung bài học (7 cột mới của Lesson)
  // ==============================

  async updateLessonContent(userId, lessonId, data) {
    const lesson = await db.Lesson.findByPk(lessonId);
    if (!lesson) throw new Error("Lesson không tồn tại");

    const course = await db.CareerPath.findByPk(lesson.careerPathId);
    if (!course) throw new Error("Course không tồn tại");

    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error("User không tồn tại");

    // === RBAC: Kiểm tra Ownership ===
    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId: userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      if (course.companyId !== company.id) throw new Error("Không có quyền cập nhật nội dung lesson này");
    } else if (user.role !== 'ADMIN') {
      throw new Error("Bạn không có quyền cập nhật nội dung lesson");
    }

    // Ghi dữ liệu trực tiếp vào 7 cột mới của Lesson
    await lesson.update({
      type: data.type ?? lesson.type,
      theoryContent: data.theoryContent ?? lesson.theoryContent,
      taskDescription: data.taskDescription ?? lesson.taskDescription,
      submissionFields: data.submissionFields ?? lesson.submissionFields,
      attachments: data.attachments ?? lesson.attachments,
      referenceLinks: data.referenceLinks ?? lesson.referenceLinks,
      rubric: data.rubric ?? lesson.rubric
    });

    return lesson;
  }

  // ==============================
  // Hàm mới: Sinh viên nộp bài thực hành (TASK lesson)
  // ==============================

  async submitLessonTask(studentId, careerPathId, lessonId, submissionData) {
    // BẮT BUỘC query kiểm tra lessonId có tồn tại trong bảng db.Lesson không
    const lesson = await db.Lesson.findByPk(lessonId);
    if (!lesson) throw new Error("Lesson không tồn tại");

    const rubric = lesson.rubric;

    // Gọi AI grading thực
    const aiService = require('./aiService');
    const aiResult = await aiService.gradeLessonTask(submissionData, rubric, lesson.submissionFields);

    // Lưu vào DB với BẮT BUỘC các trường: studentId, lessonId, careerPathId,
    // submissionData (JSON), score, aiGrading, status: 'GRADED', submittedAt, gradedAt
    const submission = await db.CourseSubmission.create({
      studentId,
      lessonId,
      careerPathId,
      submissionData,
      score: aiResult.score,
      aiGrading: aiResult,
      status: 'GRADED',
      submittedAt: new Date(),
      gradedAt: new Date()
    });

    return submission;
  }

  // ==============================
  // Hàm mới: Hoàn thành bài học lý thuyết (THEORY lesson)
  // ==============================

  async completeTheoryLesson(studentId, courseId, lessonId) {
    const lesson = await db.Lesson.findByPk(lessonId);
    if (!lesson) throw new Error("Lesson không tồn tại");
    if (lesson.careerPathId !== courseId) throw new Error("Lesson không thuộc course này");
    if (lesson.type !== 'THEORY') throw new Error("Lesson này không phải loại THEORY");

    const student = await db.Student.findOne({ where: { id: studentId } });
    if (!student) throw new Error("Student không tồn tại");

    const progress = await db.StudentProgress.findOne({
      where: { studentId, careerPathId: courseId }
    });
    if (!progress) throw new Error("Bạn chưa đăng ký khóa học này");

    // Lấy danh sách lesson theo thứ tự để xác định lesson tiếp theo
    const lessons = await db.Lesson.findAll({
      where: { careerPathId: courseId },
      order: [["order", "ASC"]],
      attributes: ['id', 'order']
    });

    const currentIndex = lessons.findIndex(l => l.id === lessonId);
    const nextLesson = lessons[currentIndex + 1] || null;

    await progress.update({
      status: 'IN_PROGRESS',
      lastCompletedLessonId: lessonId,
      currentLessonId: nextLesson ? nextLesson.id : progress.currentLessonId
    });

    // Nếu là lesson cuối cùng → đánh dấu COMPLETED
    if (!nextLesson) {
      await progress.update({ status: 'COMPLETED' });
    }

    return progress;
  }

  // ==============================
  // Tiến độ học tập của sinh viên
  // ==============================

  async enrollCourse(studentId, courseId) {
    const course = await db.CareerPath.findByPk(courseId);
    if (!course) throw new Error("Course không tồn tại");
    if (course.status !== 'PUBLISHED') throw new Error("Course chưa được xuất bản");

    const student = await db.Student.findOne({ where: { id: studentId } });
    if (!student) throw new Error("Student không tồn tại");

    const existing = await db.StudentProgress.findOne({
      where: { studentId, careerPathId: courseId }
    });
    if (existing) throw new Error("Bạn đã đăng ký khóa học này rồi");

    // Lấy bài học đầu tiên để set currentLesson
    const firstLesson = await db.Lesson.findOne({
      where: { careerPathId: courseId },
      order: [["order", "ASC"]]
    });

    return await db.StudentProgress.create({
      studentId,
      careerPathId: courseId,
      status: 'NOT_STARTED',
      currentLessonId: firstLesson ? firstLesson.id : null,
      lastCompletedLessonId: null
    });
  }

  async getCourseProgress(studentId, courseId) {
    const course = await db.CareerPath.findByPk(courseId);
    if (!course) throw new Error("Course không tồn tại");

    const student = await db.Student.findOne({ where: { id: studentId } });
    if (!student) throw new Error("Student không tồn tại");

    const progress = await db.StudentProgress.findOne({
      where: { studentId, careerPathId: courseId }
    });
    if (!progress) throw new Error("Bạn chưa đăng ký khóa học này");

    // Lấy danh sách bài học với trạng thái
    const lessons = await db.Lesson.findAll({
      where: { careerPathId: courseId },
      order: [["order", "ASC"]]
    });

    // Lấy submissions để biết bài nào đã nộp
    const submissions = await db.CourseSubmission.findAll({
      where: { studentId, careerPathId: courseId }
    });

    const submissionMap = {};
    submissions.forEach(s => { submissionMap[s.lessonId] = s; });

    const lessonsWithStatus = lessons.map(lesson => {
      const submission = submissionMap[lesson.id];
      return {
        ...lesson.toJSON(),
        status: submission
          ? submission.status
          : lesson.id === progress.currentLessonId
            ? 'IN_PROGRESS'
            : 'NOT_STARTED'
      };
    });

    return { progress, lessons: lessonsWithStatus };
  }

  async getLessonDetail(studentId, courseId, lessonId) {
    const lesson = await db.Lesson.findByPk(lessonId);
    if (!lesson) throw new Error("Lesson không tồn tại");
    if (lesson.careerPathId !== courseId) throw new Error("Lesson không thuộc course này");

    const student = await db.Student.findOne({ where: { id: studentId } });
    if (!student) throw new Error("Student không tồn tại");

    const progress = await db.StudentProgress.findOne({
      where: { studentId, careerPathId: courseId }
    });
    if (!progress) throw new Error("Bạn chưa đăng ký khóa học này");

    // Lấy submission nếu là TASK lesson
    let submission = null;
    if (lesson.type === 'TASK') {
      submission = await db.CourseSubmission.findOne({
        where: { studentId, lessonId, careerPathId: courseId }
      });
    }

    return { lesson, submission, progress };
  }

  // ==============================
  // Admin endpoints
  // ==============================

  async getAllCoursesAdmin(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    const where = {};
    if (filters.status) where.status = filters.status;

    const { rows, count } = await db.CareerPath.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [{ model: db.Company, as: 'company', attributes: ['id', 'companyName'] }]
    });

    return { total: count, page, limit, data: rows };
  }

  async updateCourseStatusAdmin(courseId, status) {
    const course = await db.CareerPath.findByPk(courseId);
    if (!course) throw new Error("Course không tồn tại");

    await course.update({ status });
    return course;
  }

  async deleteCourseAdmin(courseId) {
    const course = await db.CareerPath.findByPk(courseId);
    if (!course) throw new Error("Course không tồn tại");

    await db.CareerPath.destroy({ where: { id: courseId } });
    return true;
  }
}

module.exports = new CourseService();
