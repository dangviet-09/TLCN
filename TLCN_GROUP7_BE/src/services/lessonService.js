const db = require("../models");
const TestService = require("./testService");

class LessonService {

  async createLesson(careerPathId, data) {
    if (!data.title) throw new Error("Lesson cần có tiêu đề");

    return await db.Lesson.create({
      title: data.title,
      content: data.content ?? null,
      order: data.order ?? 0,
      careerPathId,
      type: data.type ?? null,
      theoryContent: data.theoryContent ?? null,
      taskDescription: data.taskDescription ?? null,
      submissionFields: data.submissionFields ?? null,
      attachments: data.attachments ?? null,
      referenceLinks: data.referenceLinks ?? null,
      rubric: data.rubric ?? null,
    });
  }

  async updateLesson(lessonId, data) {
    const lesson = await db.Lesson.findByPk(lessonId);
    if (!lesson) throw new Error("Lesson không tồn tại");

    const updateData = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.theoryContent !== undefined) updateData.theoryContent = data.theoryContent;
    if (data.taskDescription !== undefined) updateData.taskDescription = data.taskDescription;
    if (data.submissionFields !== undefined) updateData.submissionFields = data.submissionFields;
    if (data.attachments !== undefined) updateData.attachments = data.attachments;
    if (data.referenceLinks !== undefined) updateData.referenceLinks = data.referenceLinks;
    if (data.rubric !== undefined) updateData.rubric = data.rubric;

    await lesson.update(updateData);

    return lesson;
  }

  async deleteLesson(lessonId) {
    const lesson = await db.Lesson.findByPk(lessonId);
    if (!lesson) throw new Error("Lesson không tồn tại");

    await db.Lesson.destroy({ where: { id: lessonId } });
    return true;
  }

  async getAllLessons(careerPathId) {
    const lessons = await db.Lesson.findAll({
      where: { careerPathId },
      order: [["order", "ASC"]]
    });

    const result = [];
    for (let lesson of lessons) {
      const plain = lesson.toJSON();
      plain.tests = await TestService.getTestsByLesson(lesson.id);
      result.push(plain);
    }

    return result;
  }

  async getLessonById(lessonId) {
    if (!lessonId) {
      throw new Error("Lesson ID không hợp lệ");
    }

    const lesson = await db.Lesson.findByPk(lessonId);

    if (!lesson) {
      throw new Error(`Lesson không tồn tại với ID: ${lessonId}`);
    }

    const plainLesson = lesson.toJSON();
    plainLesson.tests = await TestService.getTestsByLesson(lessonId);

    return plainLesson;
  }
}

module.exports = new LessonService();
