const groqClient = require('../configs/groqClient');
const db = require('../models');

class TestGradingService {
  /**
   * Grade test submission with AI
   */
  async gradeTest(testId, studentId, answers) {
    try {
      // Get test with content
      const test = await db.Test.findByPk(testId, {
        include: [
          {
            model: db.Lesson,
            as: 'lesson',
            attributes: ['title']
          }
        ]
      });

      if (!test) {
        throw new Error('Test not found');
      }

      // Parse test content
      const testContent = this.parseTestContent(test.content);
      
      // Build grading prompt
      const gradingPrompt = this.buildGradingPrompt(testContent, answers);

      // Call AI for grading
      const response = await groqClient.post('/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Bạn là một giáo viên chấm điểm chuyên nghiệp. Nhiệm vụ của bạn là chấm bài kiểm tra một cách khách quan và công bằng.

CHI TIẾT NHIỆM VỤ:
1. Đánh giá từng câu trả lời của học sinh
2. So sánh với đáp án đúng hoặc tiêu chí chấm điểm
3. Tính điểm cho từng câu dựa trên số điểm tối đa
4. Đưa ra nhận xét chi tiết cho từng câu (đúng/sai/một phần đúng)
5. Tổng hợp điểm và đưa ra nhận xét chung

QUAN TRỌNG - CHẾ ĐỘ CHẤM ĐIỂM:
- Multiple choice: Đúng 100%, sai 0%
- True/False: Đúng 100%, sai 0%
- Short answer: Có thể cho điểm từng phần (0-100%) nếu câu trả lời đúng một phần
- Essay: Đánh giá theo tiêu chí (nội dung, logic, trình bày) cho điểm 0-100%
- Coding: Đánh giá đa tiêu chí (xem hướng dẫn bên dưới)

ĐỐI VỚI BÀI CODE (type: 'coding' hoặc bài yêu cầu code):
1. PHÂN TÍCH LOGIC & TÍNH ĐÚNG ĐẮN (50%):
   - Thuật toán có đúng với yêu cầu đề bài không?
   - Xử lý đầu vào/đầu ra có chính xác?
   - Logic rõ ràng, dễ hiểu?
   - Code có thể chạy được không (syntax)?
   - Xử lý edge cases (null, empty, negative, v.v.)

2. KIỂM TRA TEST CASES (30%):
   - MÔ PHỎNG chạy code với từng test case trong đề bài
   - So sánh output thực tế với expected output
   - Kiểm tra xem code có pass hết test cases không
   - QUAN TRỌNG: Nếu code có lỗi cú pháp nghiêm trọng → KHÔNG THỂ pass test cases
   - Nếu code không liên quan đến đề bài → 0 điểm

3. CHẤT LƯỢNG CODE (20%):
   - Code sạch, dễ đọc, có comments hợp lý
   - Tên biến/hàm rõ ràng, có ý nghĩa
   - Tối ưu về hiệu suất (complexity)
   - Xử lý lỗi tốt

HƯỚNG DẪN CHẤM ĐIỂM CODE (QUAN TRỌNG):
- Code KHÔNG LIÊN QUAN đến đề bài (VD: hỏi về Trái Đất mà code tính tổng): 0-5%
- Code SAI HOÀN TOÀN logic hoặc không chạy được: 0-20%
- Code đúng ý tưởng nhưng sai logic nhiều: 30-50%
- Code đúng logic nhưng có lỗi cú pháp nhỏ hoặc thiếu edge cases: 60-75%
- Code pass được NHIỀU test cases nhưng không phải tất cả: 70-85%
- Code pass TẤT CẢ test cases: 80-95%
- Code pass tests + clean + tối ưu + xử lý lỗi tốt: 95-100%

LƯU Ý ĐẶC BIỆT:
- Với câu hỏi yêu cầu code, nếu sinh viên chỉ viết text không phải code → tối đa 10%
- Nếu code bị lỗi cú pháp nghiêm trọng (thiếu dấu ngoặc, keyword sai) → giảm 20-30%
- Nếu code đúng ý tưởng nhưng chưa hoàn thiện → 40-60% tùy mức độ

OUTPUT FORMAT (JSON):
{
  "score": <tổng điểm>,
  "correctCount": <số câu đúng hoàn toàn>,
  "totalQuestions": <tổng số câu>,
  "feedback": "<nhận xét chung>",
  "suggestions": "<gợi ý cải thiện>",
  "details": [
    {
      "questionId": "<id câu hỏi>",
      "isCorrect": <true/false/partial>,
      "points": <điểm đạt được>,
      "explanation": "<giải thích chi tiết>"
    }
  ]
}`
          },
          { role: 'user', content: gradingPrompt }
        ],
        temperature: 0.3, // Lower for consistency in grading
        max_tokens: 3000
      });

      const aiResult = response.data.choices[0].message.content;
      
      // Parse AI response
      let gradingResult;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = aiResult.match(/```json\n([\s\S]*?)\n```/) || aiResult.match(/```\n([\s\S]*?)\n```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : aiResult;
        gradingResult = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('[TestGradingService] Failed to parse AI response:', parseError);
        throw new Error('Lỗi parse kết quả chấm điểm từ AI');
      }

      return gradingResult;
    } catch (error) {
      console.error('[TestGradingService.gradeTest] Error:', error);
      throw error;
    }
  }

  /**
   * Parse test content from JSON or TEXT
   */
  parseTestContent(content) {
    // Nếu content là TEXT (không phải JSON) - format mới
    if (typeof content === 'string') {
      // Thử parse JSON (format cũ)
      try {
        const parsed = JSON.parse(content);
        if (parsed.questions && Array.isArray(parsed.questions)) {
          return parsed;
        }
      } catch (e) {
        // Không phải JSON, là TEXT thuần - tạo structure đơn giản
        return {
          questions: [{
            id: '1',
            type: 'essay',
            question: 'Câu hỏi tổng hợp',
            points: 100,
            rubric: 'Đánh giá toàn bộ bài làm dựa trên đề bài'
          }],
          testContent: content // Lưu đề bài TEXT gốc
        };
      }
    }
    return content;
  }

  /**
   * Build grading prompt for AI
   */
  buildGradingPrompt(testContent, studentAnswers) {
    const questions = testContent.questions || [];
    
    let prompt = `Hãy chấm bài kiểm tra sau:\n\n`;
    
    // Nếu có testContent (format TEXT), thêm đề bài gốc
    if (testContent.testContent) {
      prompt += `**ĐỀ BÀI (Toàn bộ):**\n${testContent.testContent}\n\n`;
      prompt += `---\n\n`;
      prompt += `**CÂU TRẢ LỜI/CODE CỦA HỌC SINH:**\n`;
      const studentAnswer = studentAnswers[0]?.answer || '(Không có câu trả lời)';
      
      // Detect if answer looks like code
      if (studentAnswer.includes('function') || studentAnswer.includes('def ') || 
          studentAnswer.includes('class ') || studentAnswer.includes('{') ||
          studentAnswer.includes('const ') || studentAnswer.includes('var ') ||
          studentAnswer.includes('let ') || studentAnswer.includes('import ')) {
        prompt += `\`\`\`\n${studentAnswer}\n\`\`\`\n\n`;
      } else {
        prompt += `${studentAnswer}\n\n`;
      }
      
      prompt += `---\n\n`;
      prompt += `**YÊU CẦU CHẤM ĐIỂM:**\n`;
      prompt += `1. Đọc kỹ đề bài và hiểu yêu cầu\n`;
      prompt += `2. Phân tích câu trả lời/code của học sinh\n`;
      prompt += `3. Nếu đề yêu cầu CODE:\n`;
      prompt += `   - Kiểm tra code có đúng logic không\n`;
      prompt += `   - Mô phỏng chạy code với test cases (nếu có trong đề)\n`;
      prompt += `   - Đánh giá chất lượng code\n`;
      prompt += `   - QUAN TRỌNG: Code không liên quan hoặc sai hoàn toàn → điểm thấp (0-20%)\n`;
      prompt += `4. Nếu là câu hỏi lý thuyết: đánh giá theo nội dung, logic, độ đầy đủ\n`;
      prompt += `5. Cho điểm công bằng (thang 100) và nhận xét chi tiết\n\n`;
      prompt += `Trả về kết quả theo format JSON đã yêu cầu.\n`;
      return prompt;
    }
    
    prompt += `**TỔNG SỐ CÂU HỎI**: ${questions.length}\n\n`;

    questions.forEach((q, index) => {
      prompt += `---\n**CÂU ${index + 1}** (${q.points || 10} điểm) - Loại: ${q.type}\n`;
      prompt += `Câu hỏi: ${q.question}\n`;

      // Handle different question types
      if (q.type === 'multiple-choice' && q.options) {
        prompt += `Các lựa chọn:\n`;
        q.options.forEach((opt, i) => {
          prompt += `  ${String.fromCharCode(65 + i)}. ${opt}\n`;
        });
        prompt += `Đáp án đúng: ${q.correctAnswer}\n`;
      } else if (q.type === 'true-false') {
        prompt += `Đáp án đúng: ${q.correctAnswer}\n`;
      } else if (q.type === 'short-answer') {
        prompt += `Đáp án mẫu: ${q.correctAnswer}\n`;
        if (q.keywords && q.keywords.length > 0) {
          prompt += `Từ khóa cần có: ${q.keywords.join(', ')}\n`;
        }
      } else if (q.type === 'essay') {
        prompt += `Tiêu chí chấm: ${q.rubric || 'Nội dung, logic, trình bày'}\n`;
        if (q.keywords && q.keywords.length > 0) {
          prompt += `Từ khóa mong đợi: ${q.keywords.join(', ')}\n`;
        }
      } else if (q.type === 'coding') {
        prompt += `Ngôn ngữ: ${q.language || 'Không xác định'}\n`;
        if (q.constraints) {
          prompt += `Ràng buộc/Yêu cầu: ${q.constraints}\n`;
        }
        if (q.testCases && q.testCases.length > 0) {
          prompt += `\n**Test cases (QUAN TRỌNG - Phải kiểm tra code pass các test này):**\n`;
          q.testCases.forEach((tc, i) => {
            prompt += `  Test case ${i + 1}:\n`;
            prompt += `    Input: ${JSON.stringify(tc.input)}\n`;
            prompt += `    Expected Output: ${JSON.stringify(tc.output)}\n`;
            if (tc.explanation) {
              prompt += `    Mô tả: ${tc.explanation}\n`;
            }
            prompt += `    → Hãy MÔ PHỎNG chạy code của học sinh với input này và kiểm tra output\n`;
          });
        }
        if (q.sampleCode) {
          prompt += `\nSample code template:\n\`\`\`${q.language || ''}\n${q.sampleCode}\n\`\`\`\n`;
        }
      }

      // Student's answer
      const studentAnswer = studentAnswers.find(a => a.questionId === q.id);
      if (studentAnswer) {
        if (q.type === 'coding') {
          prompt += `\n**Câu trả lời của học sinh:**\n\`\`\`${q.language || ''}\n${studentAnswer.answer}\n\`\`\`\n\n`;
        } else {
          prompt += `\n**Câu trả lời của học sinh:** ${studentAnswer.answer}\n\n`;
        }
      } else {
        prompt += `\n**Câu trả lời của học sinh:** (Không có)\n\n`;
      }
    });

    prompt += `---\n\nHãy chấm điểm và trả về kết quả theo format JSON đã yêu cầu.`;

    return prompt;
  }

  /**
   * Grade CareerTest submission (MULTIPLE_CHOICE + SHORT_ANSWER)
   */
  async gradeCareerTest(testId, studentId, answers) {
    try {
      const careerTest = await db.CareerTest.findByPk(testId);
      if (!careerTest) throw new Error('Career test không tồn tại');

      const questions = careerTest.questions || [];
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Career test không có câu hỏi nào');
      }

      let totalScore = 0;
      let totalPoints = 0;
      const details = [];

      for (const question of questions) {
        const points = question.points || 10;
        totalPoints += points;

        const studentAnswer = answers.find(a => a.questionIndex === questions.indexOf(question));

        if (!studentAnswer) {
          details.push({
            questionIndex: questions.indexOf(question),
            type: question.type,
            maxPoints: points,
            earnedPoints: 0,
            isCorrect: false,
            explanation: 'Không có câu trả lời'
          });
          continue;
        }

        let earnedPoints = 0;
        let isCorrect = false;
        let explanation = '';

        if (question.type === 'MULTIPLE_CHOICE') {
          const normalizedCorrect = String(question.correctAnswer).toUpperCase().trim();
          const normalizedAnswer = String(studentAnswer.answer).toUpperCase().trim();
          isCorrect = normalizedCorrect === normalizedAnswer;
          earnedPoints = isCorrect ? points : 0;
          explanation = isCorrect
            ? `Đúng. Đáp án: ${question.correctAnswer}`
            : `Sai. Đáp án đúng: ${question.correctAnswer}, của bạn: ${studentAnswer.answer}`;
        } else if (question.type === 'SHORT_ANSWER') {
          const expectedKeywords = question.expectedKeywords || [];
          if (expectedKeywords.length === 0) {
            isCorrect = true;
            earnedPoints = points;
            explanation = 'Câu trả lời được chấp nhận (không có từ khóa yêu cầu)';
          } else {
            const answerLower = String(studentAnswer.answer).toLowerCase();
            const matchedKeywords = expectedKeywords.filter(keyword =>
              answerLower.includes(String(keyword).toLowerCase())
            );
            const matchRatio = matchedKeywords.length / expectedKeywords.length;
            earnedPoints = Math.round(matchRatio * points * 100) / 100;
            isCorrect = matchRatio >= 0.7;
            explanation = matchRatio >= 0.7
              ? `Đạt yêu cầu. Đã chứa ${matchedKeywords.length}/${expectedKeywords.length} từ khóa: ${matchedKeywords.join(', ')}`
              : `Chưa đạt. Cần từ khóa: ${expectedKeywords.join(', ')}. Tìm thấy: ${matchedKeywords.join(', ') || 'không có'}`;
          }
        }

        totalScore += earnedPoints;

        details.push({
          questionIndex: questions.indexOf(question),
          type: question.type,
          maxPoints: points,
          earnedPoints,
          isCorrect,
          explanation
        });
      }

      const finalScore = totalPoints > 0
        ? Math.round((totalScore / totalPoints) * 100 * 100) / 100
        : 0;

      const correctCount = details.filter(d => d.isCorrect).length;

      const feedback = `Kết quả: ${correctCount}/${questions.length} câu đúng. Điểm: ${finalScore}/100.`;

      const failedQuestions = details.filter(d => !d.isCorrect);
      let suggestions = '';
      if (failedQuestions.length > 0) {
        suggestions = `Bạn nên ôn lại ${failedQuestions.length} câu chưa đạt để cải thiện kết quả.`;
      } else {
        suggestions = 'Chúc mừng! Bạn đã hoàn thành xuất sắc bài test này.';
      }

      // TODO: Gợi ý courses cải thiện dựa trên câu hỏi sai qua aiService.searchCourses()
      // Sẽ được thêm ở Bước 2.7 khi hoàn thiện aiService.searchCourses()

      return {
        score: finalScore,
        correctCount,
        totalQuestions: questions.length,
        feedback,
        suggestions,
        details
      };
    } catch (error) {
      console.error('[TestGradingService.gradeCareerTest] Error:', error);
      throw error;
    }
  }

  /**
   * Generate detailed feedback based on grading result
   */
  generateDetailedFeedback(gradingResult) {
    const { score, correctCount, totalQuestions, feedback, suggestions } = gradingResult;

    let detailedFeedback = `### KẾT QUẢ BÀI KIỂM TRA\n\n`;
    detailedFeedback += `**Tổng điểm:** ${score}/${totalQuestions * 10}\n`;
    detailedFeedback += `**Số câu đúng:** ${correctCount}/${totalQuestions}\n\n`;
    detailedFeedback += `**Nhận xét:** ${feedback}\n\n`;

    if (suggestions) {
      detailedFeedback += `**Gợi ý cải thiện:** ${suggestions}\n\n`;
    }

    return detailedFeedback;
  }
}

module.exports = new TestGradingService();
