const db = require('../models');
const AIService = require('./aiService');
const groqClient = require('../configs/groqClient');

class ChatService {

  async getOrCreateSession(userId) {
    // Find student
    const student = await db.Student.findOne({ where: { userId } });
    if (!student) {
      throw new Error('Student not found');
    }

    // Find existing session
    let session = await db.ChatSession.findOne({
      where: { studentId: student.id }
    });

    // If no session exists, create one
    if (!session) {
      const studentContext = await AIService.buildStudentContext(student.id);
      session = await db.ChatSession.create({
        studentId: student.id,
        title: 'Trò chuyện với AI',
        messages: [],
        studentContext,
        isActive: true
      });
    }

    return {
      sessionId: session.id,
      title: session.title,
      messages: session.messages,
      createdAt: session.createdAt
    };
  }

  async sendMessage(userId, message) {
    if (!message || !message.trim()) {
      throw new Error('Thiếu message');
    }

    // Find student
    const student = await db.Student.findOne({ where: { userId } });
    if (!student) {
      throw new Error('Student not found');
    }

    // Find or create session
    let session = await db.ChatSession.findOne({
      where: { studentId: student.id }
    });

    if (!session) {
      const studentContext = await AIService.buildStudentContext(student.id);
      session = await db.ChatSession.create({
        studentId: student.id,
        title: 'Trò chuyện với AI',
        messages: [],
        studentContext,
        isActive: true
      });
    }

    // Add user message
    const userMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    };

    const messages = [...session.messages, userMessage];

    // Get AI response
    const aiResponse = await AIService.chat(
      messages.map(m => ({ role: m.role, content: m.content })),
      session.studentContext
    );

    // Add assistant message
    const assistantMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    };

    messages.push(assistantMessage);

    // Generate title for first message
    if (session.messages.length === 0) {
      const title = await AIService.generateSessionTitle(message);
      await session.update({ title, messages });
    } else {
      await session.update({ messages });
    }

    return {
      sessionId: session.id,
      userMessage,
      aiResponse: assistantMessage
    };
  }

  async clearHistory(userId) {
    const student = await db.Student.findOne({ where: { userId } });
    if (!student) {
      throw new Error('Student not found');
    }

    const session = await db.ChatSession.findOne({
      where: { studentId: student.id }
    });

    if (!session) {
      throw new Error('Chưa có lịch sử chat');
    }

    // Clear messages but keep session
    await session.update({ messages: [] });

    return true;
  }

  async generateAssessment(userId) {
    const student = await db.Student.findOne({ where: { userId } });
    if (!student) {
      throw new Error('Student not found');
    }

    // Build fresh context
    const studentContext = await AIService.buildStudentContext(student.id);

    // Generate assessment
    const assessment = await AIService.generateAssessment(studentContext);

    return {
      assessment,
      studentContext,
      generatedAt: new Date()
    };
  }

  // ==============================
  // Lesson Chat Functions
  // ==============================

  async getLessonChatSession(userId, lessonId, role) {
    const student = await db.Student.findOne({ where: { userId } });
    if (!student) throw new Error('Student not found');

    // Tìm session dựa vào title: Lesson-${lessonId}-${role}
    const sessionTitle = `Lesson-${lessonId}-${role}`;
    let session = await db.ChatSession.findOne({
      where: { studentId: student.id, title: sessionTitle }
    });

    if (!session) {
      // Tạo session mới, lưu metadata vào studentContext
      const lesson = await db.Lesson.findByPk(lessonId);
      if (!lesson) throw new Error('Lesson không tồn tại');

      const course = await db.CareerPath.findByPk(lesson.careerPathId, {
        include: [{ model: db.Company, as: 'company', attributes: ['companyName'] }]
      });

      const studentContext = {
        lessonId,
        role,
        lessonTitle: lesson.title,
        courseTitle: course?.title || null,
        companyName: course?.company?.companyName || null,
        theoryContent: lesson.theoryContent || null,
        taskDescription: lesson.taskDescription || null,
        createdAt: new Date().toISOString()
      };

      session = await db.ChatSession.create({
        studentId: student.id,
        title: sessionTitle,
        messages: [],
        studentContext,
        isActive: true
      });
    }

    return {
      sessionId: session.id,
      title: session.title,
      messages: session.messages,
      studentContext: session.studentContext,
      createdAt: session.createdAt
    };
  }

  async sendLessonChatMessage(userId, lessonId, role, message) {
    if (!message || !message.trim()) {
      throw new Error('Thiếu message');
    }

    const validRoles = ['MANAGER', 'TECH_LEAD', 'HR', 'QA'];
    if (!validRoles.includes(role)) {
      throw new Error('Role không hợp lệ. Chỉ chấp nhận: MANAGER, TECH_LEAD, HR, QA');
    }

    const student = await db.Student.findOne({ where: { userId } });
    if (!student) throw new Error('Student not found');

    const lesson = await db.Lesson.findByPk(lessonId);
    if (!lesson) throw new Error('Lesson không tồn tại');

    // Lấy hoặc tạo session
    const sessionTitle = `Lesson-${lessonId}-${role}`;
    let session = await db.ChatSession.findOne({
      where: { studentId: student.id, title: sessionTitle }
    });

    if (!session) {
      const course = await db.CareerPath.findByPk(lesson.careerPathId, {
        include: [{ model: db.Company, as: 'company', attributes: ['companyName'] }]
      });
      const studentContext = {
        lessonId,
        role,
        lessonTitle: lesson.title,
        courseTitle: course?.title || null,
        companyName: course?.company?.companyName || null,
        theoryContent: lesson.theoryContent || null,
        taskDescription: lesson.taskDescription || null,
        createdAt: new Date().toISOString()
      };
      session = await db.ChatSession.create({
        studentId: student.id,
        title: sessionTitle,
        messages: [],
        studentContext,
        isActive: true
      });
    }

    // Build system prompt cho vai trò cụ thể
    const systemPrompt = AIService.buildLessonChatPrompt(lesson, role);

    // Lắp ráp mảng messages
    const chatMessages = session.messages.map(m => ({ role: m.role, content: m.content }));

    // Gọi groqClient tương tự pattern hiện hành
    const response = await groqClient.post('/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatMessages,
        { role: 'user', content: message.trim() }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    const aiContent = response.data.choices[0].message.content;

    // Lưu lịch sử
    const userMessage = { role: 'user', content: message.trim(), timestamp: new Date() };
    const assistantMessage = { role: 'assistant', content: aiContent, timestamp: new Date() };
    const updatedMessages = [...session.messages, userMessage, assistantMessage];

    await session.update({ messages: updatedMessages });

    return {
      sessionId: session.id,
      role,
      lessonId,
      userMessage,
      aiResponse: assistantMessage
    };
  }
}

module.exports = new ChatService();
