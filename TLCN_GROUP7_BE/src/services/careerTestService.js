// services/careerTestService.js
const db = require('../models');

class CareerTestService {

  // ==============================
  // CRUD cho CareerTest — Company/Admin
  // ==============================

  async createCareerTest(userId, data) {
    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error('User không tồn tại');

    let companyId = null;

    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      companyId = company.id;
    } else if (user.role !== 'ADMIN') {
      throw new Error('Bạn không có quyền tạo career test');
    }

    const careerTest = await db.CareerTest.create({
      title: data.title,
      description: data.description || null,
      questions: data.questions || [],
      careerPathId: data.careerPathId || null,
      companyId: companyId
    });

    return careerTest;
  }

  async updateCareerTest(userId, testId, data) {
    const careerTest = await db.CareerTest.findByPk(testId);
    if (!careerTest) throw new Error('Career test không tồn tại');

    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error('User không tồn tại');

    // === RBAC: Kiểm tra Ownership ===
    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      if (careerTest.companyId !== company.id) {
        throw new Error('Không có quyền chỉnh sửa career test này');
      }
    } else if (user.role !== 'ADMIN') {
      throw new Error('Bạn không có quyền chỉnh sửa career test');
    }

    await careerTest.update({
      title: data.title ?? careerTest.title,
      description: data.description ?? careerTest.description,
      questions: data.questions ?? careerTest.questions
    });

    return careerTest;
  }

  async deleteCareerTest(userId, testId) {
    const careerTest = await db.CareerTest.findByPk(testId);
    if (!careerTest) throw new Error('Career test không tồn tại');

    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error('User không tồn tại');

    // === RBAC: Kiểm tra Ownership ===
    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      if (careerTest.companyId !== company.id) {
        throw new Error('Không có quyền xoá career test này');
      }
    } else if (user.role !== 'ADMIN') {
      throw new Error('Bạn không có quyền xoá career test');
    }

    await db.CareerTest.destroy({ where: { id: testId } });
    return true;
  }

  async getCareerTests(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    const where = {};
    if (filters.search) {
      where[db.Sequelize.Op.or] = [
        { title: { [db.Sequelize.Op.like]: `%${filters.search}%` } },
        { description: { [db.Sequelize.Op.like]: `%${filters.search}%` } }
      ];
    }

    const { rows, count } = await db.CareerTest.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, page, limit, data: rows };
  }

  async getCareerTestById(testId) {
    const careerTest = await db.CareerTest.findByPk(testId);
    if (!careerTest) throw new Error('Career test không tồn tại');
    return careerTest;
  }

  async getOwnedCareerTests(userId, page = 1, limit = 10) {
    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) throw new Error('User không tồn tại');

    const offset = (page - 1) * limit;
    const where = {};

    if (user.role === 'COMPANY') {
      const company = await db.Company.findOne({ where: { userId } });
      if (!company) throw new Error('Không tìm thấy công ty của bạn');
      where.companyId = company.id;
    } else if (user.role !== 'ADMIN') {
      throw new Error('Bạn không có quyền xem career tests');
    }

    const { rows, count } = await db.CareerTest.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, page, limit, data: rows };
  }

  async getTestResults(testId) {
    const careerTest = await db.CareerTest.findByPk(testId);
    if (!careerTest) throw new Error('Career test không tồn tại');

    const results = await db.StudentTestResult.findAll({
      where: { testId },
      include: [
        {
          model: db.Student,
          as: 'student',
          include: [
            {
              model: db.User,
              as: 'user',
              attributes: ['fullName', 'email']
            }
          ]
        }
      ]
    });

    return { careerTest, results };
  }

  // ==============================
  // Student Functions
  // ==============================

  async enrollCareerTest(studentId, testId) {
    const careerTest = await db.CareerTest.findByPk(testId);
    if (!careerTest) throw new Error('Career test không tồn tại');

    const student = await db.Student.findOne({ where: { id: studentId } });
    if (!student) throw new Error('Student không tồn tại');

    // Nếu test gắn với careerPath → kiểm tra đã enrolled course chưa
    if (careerTest.careerPathId) {
      const progress = await db.StudentProgress.findOne({
        where: { studentId, careerPathId: careerTest.careerPathId }
      });
      if (!progress) {
        throw new Error('Bạn cần đăng ký khóa học trước');
      }
    }

    // Kiểm tra đã làm test chưa
    const existing = await db.StudentTestResult.findOne({
      where: { studentId, testId }
    });
    if (existing) {
      return {
        existing: true,
        message: 'Bạn đã làm bài test này rồi',
        result: existing
      };
    }

    // Tạo bản ghi StudentTestResult (chưa có answers — chờ submit)
    const testResult = await db.StudentTestResult.create({
      studentId,
      testId,
      score: null,
      passed: null,
      answers: [],
      feedback: null,
      aiGrading: null,
      completedAt: null
    });

    return { existing: false, result: testResult };
  }

  async submitCareerTest(studentId, testId, answers) {
    if (!answers || !Array.isArray(answers)) {
      throw new Error('Định dạng đáp án không hợp lệ');
    }

    const careerTest = await db.CareerTest.findByPk(testId);
    if (!careerTest) throw new Error('Career test không tồn tại');

    const student = await db.Student.findOne({ where: { id: studentId } });
    if (!student) throw new Error('Student không tồn tại');

    // Kiểm tra đã enrolled chưa
    const existingResult = await db.StudentTestResult.findOne({
      where: { studentId, testId }
    });
    if (!existingResult) {
      throw new Error('Bạn chưa bắt đầu bài test này. Hãy gọi enroll trước.');
    }

    // Chuyển giao cho testGradingService chấm điểm
    const testGradingService = require('./testGradingService');
    const gradingResult = await testGradingService.gradeCareerTest(
      testId,
      studentId,
      answers
    );

    const score = gradingResult.score || 0;
    const passed = score >= 60;

    await existingResult.update({
      answers,
      score,
      passed,
      feedback: gradingResult.feedback,
      aiGrading: gradingResult,
      completedAt: new Date()
    });

    return {
      score,
      passed,
      feedback: gradingResult.feedback,
      details: gradingResult.details,
      suggestions: gradingResult.suggestions
    };
  }

  // ==============================
  // Legacy methods (giữ nguyên từ file gốc)
  // ==============================

  async getCareerTest() {
    const test = await db.CareerTest.findOne();
    if (!test) {
      throw new Error('Chưa có bài trắc nghiệm nghề nghiệp nào trong hệ thống');
    }
    return test;
  }

  async evaluateCareerTest(userId, answers) {
    if (!answers || !Array.isArray(answers)) {
      throw new Error('Định dạng đáp án không hợp lệ');
    }

    const scores = {
      BACKEND: 0,
      FRONTEND: 0,
      BA: 0,
      PM: 0
    };

    const mapping = {
      A: 'BACKEND', B: 'FRONTEND', C: 'BA', D: 'PM',
      '0': 'BACKEND', '1': 'FRONTEND', '2': 'BA', '3': 'PM'
    };

    for (const ans of answers) {
      const career = mapping[ans.option];
      if (career) scores[career]++;
    }

    const bestCareer = Object.keys(scores).reduce((a, b) =>
      scores[a] > scores[b] ? a : b
    );

    const student = await db.Student.findOne({ where: { userId } });
    if (!student) throw new Error('Không tìm thấy sinh viên');

    student.careerInterest = bestCareer;
    student.major = bestCareer;
    await student.save();

    return {
      bestCareer,
      scores,
      message: this.getCareerDescription(bestCareer)
    };
  }

  getCareerDescription(career) {
    const desc = {
      BACKEND: 'Bạn có tư duy logic, thích lập trình và giải quyết vấn đề kỹ thuật.',
      FRONTEND: 'Bạn có óc sáng tạo và khả năng thẩm mỹ tốt, phù hợp với thiết kế giao diện hoặc UI/UX.',
      BA: 'Bạn giao tiếp tốt, hiểu con người, phù hợp với lĩnh vực kinh doanh, marketing hoặc BA.',
      PM: 'Bạn có kỹ năng quản lý và phân tích, phù hợp với vai trò lãnh đạo hoặc quản trị dự án.'
    };
    return desc[career] || 'Không xác định';
  }

  async updatemajor(studentId, major) {
    const student = await db.Student.findOne({ where: { userId: studentId } });
    if (!student) throw new Error('Student not found');
    student.major = major;
    await student.save();
    return student;
  }
}

module.exports = new CareerTestService();
