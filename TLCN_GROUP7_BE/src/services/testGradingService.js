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
   * Build prompt cho LLM chấm Career Test
   */
  buildCareerTestPrompt(questions, studentAnswers) {
    let prompt = `Hãy chấm bài test định hướng nghề nghiệp sau:\n\n`;
    prompt += `Tổng số câu hỏi: ${questions.length}\n\n`;

    questions.forEach((q, index) => {
      prompt += `---\n`;
      prompt += `**CÂU ${index + 1}** (${q.points || 10} điểm) - Loại: ${q.type}\n`;
      prompt += `Câu hỏi: ${q.question}\n`;

      if (q.type === 'MULTIPLE_CHOICE') {
        if (q.options && q.options.length > 0) {
          prompt += `Các lựa chọn:\n`;
          q.options.forEach((opt, i) => {
            prompt += `  ${String.fromCharCode(65 + i)}. ${opt}\n`;
          });
        }
        prompt += `Đáp án đúng: ${q.correctAnswer}\n`;
      } else if (q.type === 'SHORT_ANSWER') {
        if (q.expectedAnswer) {
          prompt += `Đáp án mẫu: ${q.expectedAnswer}\n`;
        }
        if (q.expectedKeywords && q.expectedKeywords.length > 0) {
          prompt += `Từ khóa cần có: ${q.expectedKeywords.join(', ')}\n`;
        }
      }

      const studentAnswer = studentAnswers.find(a => a.questionIndex === index);
      prompt += `\n**Câu trả lời của học sinh:** ${studentAnswer?.answer || '(Không có)'}\n`;
    });

    prompt += `\n---\n\nHãy chấm điểm và trả về kết quả theo format JSON yêu cầu.`;
    return prompt;
  }

  /**
   * Grade CareerTest submission — Dùng LLM (Groq) + Vector Search cho suggestions
   */
  async gradeCareerTest(testId, studentId, answers) {
    try {
      const careerTest = await db.CareerTest.findByPk(testId);
      if (!careerTest) throw new Error('Career test không tồn tại');

      const questions = careerTest.questions || [];
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Career test không có câu hỏi nào');
      }

      // === BƯỚC 3: GỌI LLM (GROQ) ===
      const gradingPrompt = this.buildCareerTestPrompt(questions, answers);

      const systemPrompt = `Bạn là giáo viên chấm bài trắc nghiệm nghề nghiệp chuyên nghiệp.
Nhiệm vụ: chấm điểm bài test định hướng nghề nghiệp gồm 2 loại câu hỏi.

LOẠI CÂU HỎI VÀ CÁCH CHẤM:
1. MULTIPLE_CHOICE:
   - So sánh đáp án học sinh với đáp án đúng (so sánh không phân biệt hoa thường, bỏ khoảng trắng thừa)
   - Đúng: full điểm. Sai: 0 điểm.

2. SHORT_ANSWER:
   - So sánh nội dung câu trả lời với expectedKeywords hoặc expectedAnswer
   - Nếu có expectedKeywords: kiểm tra % từ khóa khớp (không phân biệt hoa thường), cho điểm theo tỉ lệ
   - Nếu không có expectedKeywords: đánh giá nội dung theo mức độ liên quan, logic, đầy đủ
   - FULL match: full điểm. PARTIAL: điểm theo tỉ lệ. IRRELEVANT: 0 điểm.

ĐẦU VÀO:
- questions: mảng câu hỏi [{id, type, question, correctAnswer?, expectedKeywords?, points}]
- studentAnswers: mảng câu trả lời [{questionIndex, answer}]

QUY TẮC TÍNH ĐIỂM:
- Điểm tối đa mỗi câu = question.points (mặc định 10)
- Điểm final = tổng điểm / tổng điểm tối đa * 100 (thang 100)

OUTPUT FORMAT — BẮT BUỘC JSON (không có text khác):
{
  "score": <number 0-100>,
  "correctCount": <number>,
  "totalQuestions": <number>,
  "feedback": "<nhận xét chung ngắn 1-3 câu>",
  "details": [
    {
      "questionIndex": <number>,
      "type": "<MULTIPLE_CHOICE|SHORT_ANSWER>",
      "maxPoints": <number>,
      "earnedPoints": <number>,
      "isCorrect": <boolean>,
      "explanation": "<giải thích ngắn 1-2 câu>"
    }
  ]
}

KHÔNG thêm field "suggestions" trong kết quả chấm điểm này.
"failedQuestions" sẽ được xử lý riêng ở bước Vector Search.`;

      const response = await groqClient.post('/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: gradingPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000
      });

      const rawContent = response.data.choices[0].message.content;

      // Parse JSON từ response của LLM
      let gradingResult;
      try {
        const jsonMatch = rawContent.match(/```json\n?([\s\S]*?)\n?```/) ||
                          rawContent.match(/```\n?([\s\S]*?)\n?```/) ||
                          rawContent.match(/(\{[\s\S]*\})/);
        const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;
        gradingResult = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('[TestGradingService.gradeCareerTest] Parse error:', parseError, 'Raw:', rawContent);
        throw new Error('Lỗi parse kết quả chấm điểm từ LLM');
      }

      // Validate required fields
      gradingResult.score = typeof gradingResult.score === 'number' ? gradingResult.score : 0;
      gradingResult.details = Array.isArray(gradingResult.details) ? gradingResult.details : [];
      gradingResult.feedback = gradingResult.feedback || 'Không có nhận xét';
      gradingResult.correctCount = typeof gradingResult.correctCount === 'number' ? gradingResult.correctCount : 0;
      gradingResult.totalQuestions = typeof gradingResult.totalQuestions === 'number' ? gradingResult.totalQuestions : questions.length;

      // === BƯỚC 4: VECTOR SEARCH CHO SUGGESTIONS ===
      const failedQuestions = gradingResult.details.filter(d => !d.isCorrect);
      let suggestions = [];

      if (failedQuestions.length > 0) {
        try {
          const aiService = require('./aiService');
          // Ghép nội dung câu hỏi sai thành query cho vector search
          const failedTopics = failedQuestions
            .map(fq => {
              const q = questions[fq.questionIndex];
              return q?.question || '';
            })
            .filter(Boolean)
            .join(' ');

          if (failedTopics) {
            const courseResults = await aiService.searchCourses(failedTopics);
            suggestions = Array.isArray(courseResults) ? courseResults.slice(0, 5) : [];
          }
        } catch (vectorError) {
          // Fallback: nếu vector search lỗi, vẫn tiếp tục với suggestions = []
          console.warn('[TestGradingService.gradeCareerTest] Vector search error:', vectorError.message);
        }
      }

      // Gắn suggestions vào kết quả
      gradingResult.suggestions = suggestions;

      return gradingResult;
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
