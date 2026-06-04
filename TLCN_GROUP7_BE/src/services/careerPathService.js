const kafkaModule = require('../kafka');
const db = require("../models");
const LessonService = require("./lessonService");
const TestService = require("./testService");

class CareerPathService {

  async createCareerPath(userId, data, files) {

    // Lấy thông tin user để kiểm tra role
    const user = await db.User.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error("User không tồn tại");
    }

    let company = null;
    let companyIdForPath = null;
    
    // Nếu user là COMPANY thì phải có company, nếu là ADMIN thì không cần
    if (user.role === 'COMPANY') {
      company = await db.Company.findOne({
        where: { userId: userId }
      });

      if (!company) {
        throw new Error('không tìm thấy công ty của bạn');
      }
      companyIdForPath = company.id;
    } else if (user.role === 'ADMIN') {
      // ADMIN tạo career path system - tìm hoặc tạo system company
      let systemCompany = await db.Company.findOne({
        where: { companyName: 'System Admin' }
      });
      
      if (!systemCompany) {
        // Tạo system company nếu chưa có
        systemCompany = await db.Company.create({
          companyName: 'System Admin',
          description: 'System generated company for admin-created content',
          website: null,
          location: null,
          size: null,
          industry: null,
          logo: null,
          publicId: null,
          userId: userId, // Gán cho admin user tạo đầu tiên
          verified: true
        });
      }
      
      companyIdForPath = systemCompany.id;
    } else {
      throw new Error('Bạn không có quyền tạo career path');
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

    // Tao CareerPath
    const careerPath = await db.CareerPath.create({
      title: data.title,
      description: data.description || null,
      category: data.category || null,
      companyId: companyIdForPath, // Company ID hoac System Company cho ADMIN
      image: null,
      publicId: null,
      status: data.status || 'DRAFT',
      skills: parsedSkills
    });

    // Nếu có upload ảnh
    if (files?.images?.length) {
      const file = files.images[0];

      await kafkaModule.producers.courseImageProducer.sendUploadEvent({
        courseId: careerPath.id,
        bufferBase64: file.buffer.toString('base64'),
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        type: "CREATE"
      });
    }

    return careerPath;
  }

  async updateCourse(userId, courseId, data) {
    const course = await db.CareerPath.findByPk(courseId);
    if (!course) throw new Error("Course không tồn tại");

    // Lấy thông tin user để kiểm tra role
    const user = await db.User.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error("User không tồn tại");
    }

    // Kiểm tra quyền chỉnh sửa
    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({
        where: { userId: userId }
      });

      if (!company) {
        throw new Error('không tìm thấy công ty của bạn');
      }

      if (course.companyId !== company.id) {
        throw new Error("Không có quyền chỉnh sửa");
      }
    } else if (user.role === 'ADMIN') {
      // ADMIN có thể chỉnh sửa tất cả career path
    } else {
      throw new Error("Bạn không có quyền chỉnh sửa");
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

    await course.update({
      title: data.title ?? course.title,
      description: data.description ?? course.description,
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

  async deleteCourse(userId, courseId, role) {
    const course = await db.CareerPath.findByPk(courseId);
    if (!course) throw new Error("Course không tồn tại");

    // Kiểm tra quyền xóa
    if (role === "COMPANY") {
      const company = await db.Company.findOne({ where: { userId: userId } });
      if (!company) {
        throw new Error('không tìm thấy công ty của bạn');
      }

      if (course.companyId !== company.id) {
        throw new Error("Không có quyền xoá");
      }
    } else if (role === "ADMIN") {
      // ADMIN có thể xóa tất cả career path
    } else {
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

  async getAllCourses(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const { rows, count } = await db.CareerPath.findAndCountAll({
      where: { status: 'PUBLISHED' },
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    return {
      total: count,
      page,
      limit,
      data: rows
    };
  }

  // === CHỈNH PHẦN FOLLOW ===
  async getCourseById(courseId, userId = null) {
    const course = await db.CareerPath.findByPk(courseId, {
      include: [{ model: db.Company, as: 'company', attributes: ['id', 'userId'] }]
    });
    if (!course) throw new Error("Course không tồn tại");

    // Lấy thông tin user để kiểm tra role
    let user = null;
    let isAdmin = false;
    if (userId) {
      user = await db.User.findOne({ where: { id: userId } });
      isAdmin = user?.role === 'ADMIN';
    }

    // Check quyền xem: Owner (company), Admin có thể xem tất cả status
    const isOwner = userId && course.company?.userId === userId;
    const canViewAllStatus = isOwner || isAdmin;

    console.log('[CareerPathService.getCourseById] Debug:', {
      courseId,
      courseStatus: course.status,
      requestUserId: userId,
      courseOwnerUserId: course.company?.userId,
      userRole: user?.role,
      isOwner,
      isAdmin,
      canViewAllStatus
    });

    // Nếu không phải owner/admin và course chưa published -> không cho xem
    if (!canViewAllStatus && course.status !== 'PUBLISHED') {
      throw new Error("Course chưa được xuất bản");
    }

    // Lấy lessons thuộc course
    const lessons = await LessonService.getAllLessons(courseId);

    // Gắn miniTests vào từng lesson
    for (let lesson of lessons) {
      lesson.miniTests = await TestService.getTestsByLesson(lesson.id);
    }

    // Lấy final test của course
    const finalTest = await TestService.getFinalTestByCareerPath(courseId);

    // Gắn vào instance course
    course.lessons = lessons;
    course.finalTest = finalTest;

    return course;
  }

  async getCoursesByCompany(userId, page = 1, limit = 10) {
    // Lấy thông tin user để kiểm tra role
    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User không tồn tại');
    }

    const offset = (page - 1) * limit;
    let queryOptions = {
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [{ 
        model: db.Company, 
        as: 'company', 
        attributes: ['id', 'companyName', 'userId'] 
      }]
    };

    if (user.role === 'ADMIN') {
      // Admin xem các career path được tạo thông qua System Admin company
      // Tìm System Admin company
      const systemCompany = await db.Company.findOne({
        where: { companyName: 'System Admin' }
      });
      
      if (systemCompany) {
        queryOptions.where = { companyId: systemCompany.id };
      } else {
        // Nếu chưa có System Admin company thì trả về rỗng
        queryOptions.where = { companyId: null };
      }
    } else if (user.role === 'COMPANY') {
      // Company chỉ xem career path của mình
      const company = await db.Company.findOne({ where: { userId: userId } });
      if (!company) {
        throw new Error('Không tìm thấy công ty của bạn');
      }
      queryOptions.where = { companyId: company.id };
    } else {
      throw new Error('Bạn không có quyền xem career path');
    }

    const { rows, count } = await db.CareerPath.findAndCountAll(queryOptions);

    return {
      total: count,
      page,
      limit,
      data: rows
    };
  }

  async updateCourseStatus(userId, courseId, status) {
    const course = await db.CareerPath.findByPk(courseId);
    if (!course) throw new Error("Course không tồn tại");

    // Lấy thông tin user để kiểm tra role
    const user = await db.User.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error("User không tồn tại");
    }

    // Kiểm tra quyền chỉnh sửa
    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId: userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');

      if (course.companyId !== company.id) throw new Error("Không có quyền chỉnh sửa");
    } else if (user.role === 'ADMIN') {
      // ADMIN có thể chỉnh sửa status của tất cả career path
    } else {
      throw new Error("Bạn không có quyền chỉnh sửa");
    }

    await course.update({ status });
    return course;
  }
}

module.exports = new CareerPathService();
