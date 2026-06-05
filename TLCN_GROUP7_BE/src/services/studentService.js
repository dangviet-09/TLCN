const db = require('../models');
class StudentService {

  async getStudentByUserId(userId) {
    const student = await db.Student.findOne({ where: { userId } });
    return student;
  }

  async joinCareerPath(studentId, careerPathId) {
    // Kiểm tra careerPath
    const careerPath = await db.CareerPath.findByPk(careerPathId);
    if (!careerPath) throw new Error("Career path not found");

    // Kiểm tra đã tham gia chưa
    let progress = await db.StudentProgress.findOne({
      where: { studentId, careerPathId }
    });

    // Nếu đã join rồi thì trả về progress hiện tại
    if (progress) {
      return {
        progress,
        message: "You have already joined this career path",
        alreadyJoined: true
      };
    }

    // Tạo progress mới
    progress = await db.StudentProgress.create({
      studentId,
      careerPathId,
      status: "IN_PROGRESS"
    });

    return {
      progress,
      message: "Successfully joined career path",
      alreadyJoined: false
    };
  }

  async submitTest(studentId, testId, answers) {
    const testGradingService = require('./testGradingService');

    const test = await db.Test.findByPk(testId);
    if (!test) throw new Error("Test not found");

    // 1) Xác định careerPath của test
    let careerPathId = test.careerPathId;

    if (!careerPathId && test.lessonId) {
      const lesson = await db.Lesson.findByPk(test.lessonId);
      careerPathId = lesson?.careerPathId;
    }

    if (!careerPathId) throw new Error("Invalid test: no career path linked");

    // 2) Kiểm tra đã join career path chưa
    let progress = await db.StudentProgress.findOne({
      where: { studentId, careerPathId }
    });

    if (!progress)
      throw new Error("You must join this career path first");

    // 3) Gọi AI chấm điểm
    const gradingResult = await testGradingService.gradeTest(testId, studentId, answers);
    const score = gradingResult.score || 0;
    const passed = score >= 60; // Pass threshold: 60%

    // 4) Lưu kết quả vào DB
    let existing = await db.StudentTestResult.findOne({
      where: { studentId, testId }
    });

    const testResultData = {
      score,
      passed,
      answers: answers, // JSON type, không cần stringify
      feedback: gradingResult.feedback,
      aiGrading: gradingResult, // JSON type, không cần stringify
      completedAt: new Date()
    };

    if (existing) {
      await existing.update(testResultData);
    } else {
      await db.StudentTestResult.create({
        studentId,
        testId,
        ...testResultData
      });
    }

    // 5) Kiểm tra xem học sinh hoàn thành CareerPath chưa
    await this.checkCareerPathCompletion(studentId, careerPathId);

    return {
      message: "Test submitted successfully",
      score,
      passed,
      feedback: gradingResult.feedback,
      suggestions: gradingResult.suggestions,
      details: gradingResult.details
    };
  }

  async checkCareerPathCompletion(studentId, careerPathId) {
    // Lấy toàn bộ test trong careerPath
    const tests = await db.Test.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { careerPathId }, // FINAL test
        ]
      },
      include: [
        {
          model: db.Lesson,
          as: 'lesson',
          required: false,
          where: { careerPathId }
        }
      ]
    });

    if (!tests.length) return; // CareerPath chưa có test → ko đánh completed

    const testIds = tests.map(t => t.id);

    // Lấy toàn bộ bài test mà student đã làm
    const results = await db.StudentTestResult.findAll({
      where: { studentId, testId: testIds }
    });

    if (results.length === tests.length) {
      // cập nhật status = COMPLETED
      const progress = await db.StudentProgress.findOne({
        where: { studentId, careerPathId }
      });

      if (progress && progress.status !== "COMPLETED") {
        await progress.update({ status: "COMPLETED" });
      }
    }
  }

  async getCareerPathProgress(studentId, careerPathId) {
    const progress = await db.StudentProgress.findOne({
      where: { studentId, careerPathId },
      include: [
        {
          model: db.CareerPath,
          as: 'careerPath'
        }
      ]
    });

    if (!progress) {
      throw new Error("Bạn chưa tham gia career path này");
    }

    // Lấy danh sách test results
    const testResults = await db.StudentTestResult.findAll({
      where: { studentId },
      include: [
        {
          model: db.Test,
          as: 'test',
          where: {
            [db.Sequelize.Op.or]: [
              { careerPathId },
              { lessonId: { [db.Sequelize.Op.ne]: null } }
            ]
          },
          required: true
        }
      ]
    });

    testResults.forEach(result => {
      console.log('Test result:', {
        id: result.id,
        testType: result.test?.type,
        testTitle: result.test?.title,
        score: result.score,
        hasCareerPathId: !!result.test?.careerPathId,
        hasLessonId: !!result.test?.lessonId
      });
    });

    return {
      progress,
      testResults
    };
  }

  async getEnrolledCourses(userId) {
    const student = await db.Student.findOne({ where: { userId } });
    if (!student) throw new Error("Student không tồn tại");

    const enrolledCourses = await db.StudentProgress.findAll({
      where: { studentId: student.id },
      include: [
        {
          model: db.CareerPath,
          as: 'careerPath',
          required: true, // Only get progress with existing CareerPath (filters deleted courses)
          include: [
            {
              model: db.Company,
              as: 'company',
              attributes: ['id', 'companyName']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Lấy test results cho từng course
    const result = await Promise.all(enrolledCourses.map(async (progress) => {
      const testResults = await db.StudentTestResult.findAll({
        where: { studentId: student.id },
        include: [
          {
            model: db.Test,
            as: 'test',
            where: {
              [db.Sequelize.Op.or]: [
                { careerPathId: progress.careerPathId },
                { lessonId: { [db.Sequelize.Op.ne]: null } }
              ]
            },
            required: true,
            include: [
              {
                model: db.Lesson,
                as: 'lesson',
                where: { careerPathId: progress.careerPathId },
                required: false
              }
            ]
          }
        ]
      });

      return {
        progressId: progress.id,
        status: progress.status,
        enrolledAt: progress.createdAt,
        course: progress.careerPath,
        testResults: testResults.map(tr => ({
          id: tr.id,
          testId: tr.testId,
          score: tr.score,
          startedAt: tr.createdAt,
          finishedAt: tr.updatedAt,
          test: {
            id: tr.test.id,
            title: tr.test.title,
            type: tr.test.type,
            maxScore: tr.test.maxScore
          }
        }))
      };
    }));

    return result;
  }

  async updateProfile(userId, data) {
    const student = await db.Student.findOne({ where: { userId } });
    if (!student) throw new Error("Student không tồn tại");

    const updateData = {};
    if (data.major !== undefined) updateData.major = data.major;
    if (data.school !== undefined) updateData.school = data.school;

    if (Object.keys(updateData).length > 0) {
      await student.update(updateData);
    }

    return student;
  }

  async upsertStudentSkills(studentId, skillsArray, pointsToAdd = 10) {
    if (!skillsArray || skillsArray.length === 0) return;

    for (const skill of skillsArray) {
      if (typeof skill !== 'string') continue;

      const cleanSkill = skill.trim();
      if (!cleanSkill) continue;

      const [skillRecord, created] = await db.StudentSkill.findOrCreate({
        where: {
          studentId: studentId,
          skillName: cleanSkill
        },
        defaults: {
          score: pointsToAdd
        }
      });

      if (!created) {
        await skillRecord.increment('score', { by: pointsToAdd });
      }
    }
  }
}
module.exports = new StudentService(); 