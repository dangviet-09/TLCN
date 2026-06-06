const groqClient = require('../configs/groqClient');
const cohereClient = require('../configs/cohereClient');
const db = require('../models');
const { Op } = require('sequelize');
const vectorService = require('./vectorService');

class AIService {

  async getEmbedding(texts) {
    try {
      const isArray = Array.isArray(texts);
      const textsToEmbed = isArray ? texts : [texts];

      const response = await cohereClient.embed({
        texts: textsToEmbed,
        model: 'embed-multilingual-v3.0', // Best for Vietnamese
        inputType: 'search_query' // or 'search_document', 'classification', 'clustering'
      });

      return isArray ? response.embeddings : response.embeddings[0];
    } catch (error) {
      console.error('[AIService.getEmbedding] Error:', error.message);
      throw new Error('Failed to generate embedding: ' + error.message);
    }
  }


  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }


  async findSimilarTexts(query, candidates, threshold = 0.7) {
    try {
      // Get embeddings for query and all candidates
      const allTexts = [query, ...candidates];
      const embeddings = await this.getEmbedding(allTexts);

      const queryEmbedding = embeddings[0];
      const candidateEmbeddings = embeddings.slice(1);

      // Calculate similarities
      const results = candidates.map((text, idx) => ({
        text,
        similarity: this.cosineSimilarity(queryEmbedding, candidateEmbeddings[idx])
      }));

      // Filter by threshold and sort by similarity
      return results
        .filter(r => r.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      console.error('[AIService.findSimilarTexts] Error:', error.message);
      throw error;
    }
  }

  async buildStudentContext(studentId) {
    try {
      // Lazy load models to avoid circular dependency
      const { Student, User, StudentProgress, CareerPath, Company, StudentTestResult, Test, Lesson } = require('../models');
      
      // Get student info
      const student = await Student.findByPk(studentId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['fullName', 'email']
          }
        ]
      });

      if (!student) {
        throw new Error('Student not found');
      }

      // Get enrolled courses
      const enrolledCourses = await StudentProgress.findAll({
        where: { studentId },
        include: [
          {
            model: CareerPath,
            as: 'careerPath',
            attributes: ['id', 'title', 'description'],
            include: [
              {
                model: Company,
                as: 'company',
                attributes: ['companyName']
              }
            ]
          }
        ]
      });

      // Get test results
      const testResults = await StudentTestResult.findAll({
        where: { studentId },
        include: [
          {
            model: Test,
            as: 'test',
            attributes: ['id', 'title', 'type'],
            include: [
              {
                model: Lesson,
                as: 'lesson',
                attributes: ['title']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      // Format context
      const context = {
        studentName: student.user?.fullName || 'Student',
        email: student.user?.email,
        enrolledCourses: enrolledCourses.map(ec => ({
          courseTitle: ec.careerPath?.title,
          level: ec.careerPath?.level,
          company: ec.careerPath?.company?.companyName,
          progress: ec.progress,
          completedLessons: ec.completedLessons
        })),
        recentTests: testResults.map(tr => ({
          testTitle: tr.test?.title,
          lessonTitle: tr.test?.lesson?.title,
          type: tr.test?.type,
          score: tr.score,
          passed: tr.passed,
          completedAt: tr.completedAt
        })),
        totalCourses: enrolledCourses.length,
        averageScore: testResults.length > 0
          ? (testResults.reduce((sum, tr) => sum + (tr.score || 0), 0) / testResults.length).toFixed(2)
          : 0
      };

      return context;
    } catch (error) {
      console.error('[AIService.buildStudentContext] Error:', error);
      throw error;
    }
  }

  buildSystemPrompt(studentContext) {
    return `Bạn là một trợ lý AI thông minh cho nền tảng học tập trực tuyến, chuyên hỗ trợ sinh viên về các vấn đề học tập, định hướng nghề nghiệp và phát triển kỹ năng.

THÔNG TIN SINH VIÊN:
- Tên: ${studentContext.studentName}
- Số khóa học đang tham gia: ${studentContext.totalCourses}
- Điểm trung bình: ${studentContext.averageScore}
- Các khóa học đã đăng ký: ${studentContext.enrolledCourses.map(c => `${c.courseTitle} (${c.level}) - Tiến độ: ${c.progress}%`).join(', ') || 'Chưa có'}
- Kết quả bài kiểm tra gần đây: ${studentContext.recentTests.slice(0, 3).map(t => `${t.testTitle}: ${t.score} điểm (${t.passed ? 'Đạt' : 'Chưa đạt'})`).join(', ') || 'Chưa có'}

NHIỆM VỤ CỦA BẠN:
1. Trả lời các câu hỏi của sinh viên về nội dung học tập, khóa học, bài kiểm tra
2. Đưa ra lời khuyên học tập dựa trên tiến độ và kết quả hiện tại
3. Động viên và khích lệ sinh viên khi gặp khó khăn
4. Gợi ý các khóa học phù hợp hoặc cách cải thiện kết quả học tập
5. Giải đáp thắc mắc về định hướng nghề nghiệp

LƯU Ý VỀ FUNCTION CALLING:
- CHỈ dùng function search_courses khi sinh viên HỎI RÕ RÀNG: "có khóa học nào về...", "tìm khóa học...", "khóa học ... ở đâu"
- KHÔNG dùng function cho câu hỏi chung như: "làm sao học...", "học gì trước", "bắt đầu học như thế nào"
- Nếu dùng function, KHÔNG viết text trước khi call function
- Nếu KHÔNG dùng function, trả lời trực tiếp bằng text

PHONG CÁCH GIAO TIẾP:
- Thân thiện, nhiệt tình và dễ hiểu
- Sử dụng tiếng Việt
- Ngắn gọn nhưng đầy đủ thông tin
- Đưa ra ví dụ cụ thể khi cần thiết
- Luôn dựa trên dữ liệu thực tế của sinh viên để đưa ra lời khuyên

GIỚI HẠN VÀ RANH GIỚI:
- CHỈ trả lời các câu hỏi liên quan đến: học tập, khóa học, lập trình, coding, định hướng nghề nghiệp IT, phát triển kỹ năng lập trình, career path trong IT
- KHÔNG trả lời các chủ đề ngoài học tập: chính trị, tôn giáo, bạo lực, nội dung 18+, phân biệt chủng tộc, tin tức, thể thao, giải trí (phim, nhạc, game), thời tiết, ẩm thực, du lịch, mua sắm, tình yêu, sức khỏe, pháp lý, tài chính
- KHÔNG cung cấp lời khuyên y tế, pháp lý hoặc tài chính cá nhân
- KHÔNG giúp làm bài tập hoặc gian lận trong thi cử
- TUYỆT ĐỐI KHÔNG tiết lộ bất kỳ thông tin kỹ thuật nào về hệ thống: API keys, tokens, passwords, database credentials, server config, source code, environment variables
- KHÔNG trả lời câu hỏi về cấu trúc database, bảng, trường dữ liệu, query SQL
- KHÔNG cung cấp thông tin về kiến trúc hệ thống, deployment, hosting, backend logic
- Nếu bị hỏi về thông tin kỹ thuật/bảo mật: "Tôi không có quyền truy cập hoặc chia sẻ thông tin kỹ thuật của hệ thống. Vui lòng liên hệ bộ phận IT nếu bạn cần hỗ trợ kỹ thuật."
- Nếu được hỏi câu hỏi không liên quan học tập/nghề nghiệp: "Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi liên quan đến học tập, khóa học, lập trình và phát triển nghề nghiệp. Bạn có câu hỏi gì về quá trình học tập của mình không?"`;
  }


  async searchCourses(query) {
    try {
      //Gọi Local Require để phá vỡ Circular Dependency
      const vectorService = require('./vectorService');

      // Check if vector database is ready
      const isVectorReady = await vectorService.isReady();
      
      if (isVectorReady) {
        // Use vector search with Qdrant for better semantic matching
        const vectorResults = await vectorService.searchSimilarContent(query, 10, 0.6);
        
        // Filter only career path results
        const careerPathResults = vectorResults
          .filter(result => result.collection === 'career_paths')
          .slice(0, 5);

        if (careerPathResults.length > 0) {
          // Return vector search results with enhanced data
          return careerPathResults.map(result => ({
            id: result.payload.id,
            title: result.payload.title,
            description: result.payload.description,
            company: result.payload.companyName,
            score: result.score.toFixed(3),
            url: `/career-paths/${result.payload.id}`
          }));
        }
      }

      // Fallback to traditional SQL search
      const db = require('../models'); // Cắt đứt vòng lặp db
      const courses = await db.CareerPath.findAll({
        where: {
          status: 'PUBLISHED',
          [Op.or]: [
            { title: { [Op.like]: `%${query}%` } },
            { description: { [Op.like]: `%${query}%` } }
          ]
        },
        include: [
          {
            model: db.Company,
            as: 'company',
            attributes: ['companyName', 'id']
          }
        ],
        limit: 5,
        attributes: ['id', 'title', 'description', 'image']
      });

      return courses.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        company: course.company?.companyName,
        image: course.image,
        url: `/career-paths/${course.id}`
      }));
    } catch (error) {
      console.error('[AIService.searchCourses] Error:', error);
      return [];
    }
  }


  async searchLessons(query) {
    try {
      const vectorResults = await vectorService.searchSimilarContent(query, 10, 0.6);
      
      // Filter only lesson results
      const lessonResults = vectorResults
        .filter(result => result.collection === 'lessons')
        .slice(0, 5);

      return lessonResults.map(result => ({
        id: result.payload.id,
        title: result.payload.title,
        careerPathTitle: result.payload.careerPathTitle,
        careerPathId: result.payload.careerPathId,
        score: result.score.toFixed(3),
        url: `/lessons/${result.payload.id}`
      }));
    } catch (error) {
      console.error('[AIService.searchLessons] Error:', error);
      return [];
    }
  }


  async searchTests(query) {
    try {
      const vectorResults = await vectorService.searchSimilarContent(query, 10, 0.6);
      
      // Filter only test results
      const testResults = vectorResults
        .filter(result => result.collection === 'tests')
        .slice(0, 5);

      return testResults.map(result => ({
        id: result.payload.id,
        title: result.payload.title,
        description: result.payload.description,
        type: result.payload.type,
        lessonTitle: result.payload.lessonTitle,
        careerPathTitle: result.payload.careerPathTitle,
        score: result.score.toFixed(3),
        url: `/tests/${result.payload.id}`
      }));
    } catch (error) {
      console.error('[AIService.searchTests] Error:', error);
      return [];
    }
  }


  async searchAllContent(query) {
    try {
      const vectorResults = await vectorService.searchSimilarContent(query, 15, 0.6);
      
      const organizedResults = {
        courses: vectorResults
          .filter(r => r.collection === 'career_paths')
          .slice(0, 5)
          .map(result => ({
            id: result.payload.id,
            title: result.payload.title,
            description: result.payload.description,
            company: result.payload.companyName,
            score: result.score.toFixed(3),
            type: 'course',
            url: `/career-paths/${result.payload.id}`
          })),
        lessons: vectorResults
          .filter(r => r.collection === 'lessons')
          .slice(0, 5)
          .map(result => ({
            id: result.payload.id,
            title: result.payload.title,
            careerPathTitle: result.payload.careerPathTitle,
            score: result.score.toFixed(3),
            type: 'lesson',
            url: `/lessons/${result.payload.id}`
          })),
        tests: vectorResults
          .filter(r => r.collection === 'tests')
          .slice(0, 5)
          .map(result => ({
            id: result.payload.id,
            title: result.payload.title,
            description: result.payload.description,
            lessonTitle: result.payload.lessonTitle,
            score: result.score.toFixed(3),
            type: 'test',
            url: `/tests/${result.payload.id}`
          }))
      };

      return organizedResults;
    } catch (error) {
      console.error('[AIService.searchAllContent] Error:', error);
      return { courses: [], lessons: [], tests: [] };
    }
  }

  isSecuritySensitiveQuery(message) {
    const sensitiveKeywords = [
      // Security & Auth
      'api key', 'api_key', 'apikey', 'token', 'jwt', 'secret', 'password', 'credential',
      'access key', 'private key', 'public key', 'auth', 'authentication',
      // Database
      'database', 'db', 'sql', 'query', 'table', 'schema', 'mongodb', 'mysql', 'postgres',
      'connection string', 'database url',
      // System & Config
      'env', 'environment variable', 'config', 'configuration', '.env', 'dotenv',
      'server', 'host', 'port', 'deployment', 'docker', 'kubernetes',
      // Code & Structure
      'source code', 'code base', 'backend', 'endpoint', 'api endpoint', 'route',
      'middleware', 'controller', 'model', 'repository', 'service',
      // Vietnamese
      'mật khẩu', 'khóa api', 'token', 'cơ sở dữ liệu', 'database', 'mã nguồn', 
      'cấu hình', 'config', 'server', 'bảo mật', 'key'
    ];

    const lowerMessage = message.toLowerCase();
    return sensitiveKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  async isOffTopicQuery(message) {
    try {
      const lowerMessage = message.toLowerCase();
      
      // Fast keyword pre-filter for obvious cases
      const obviousOffTopicKeywords = [
        'trái đất', 'trai dat', 'mặt trời', 'mat troi', 'mặt trăng', 'mat trang',
        'vũ trụ', 'vu tru', 'hành tinh', 'hanh tinh',
        'phim', 'nhạc', 'nhac', 'game', 'bóng đá', 'bong da', 'thể thao', 'the thao',
        'món ăn', 'mon an', 'nhà hàng', 'nha hang', 'du lịch', 'du lich',
        'thời tiết', 'thoi tiet', 'tình yêu', 'tinh yeu', 'người yêu', 'nguoi yeu',
        'hẹn hò', 'hen ho', 'chia tay',
        'youtube', 'tiktok', 'facebook', 'instagram',
        'world cup', 'olympic', 'tin tức', 'tin tuc', 'thời sự', 'thoi su',
        'chiến tranh', 'chien tranh', 'chính trị', 'chinh tri', 'bầu cử', 'bau cu'
      ];
      
      const hasObviousOffTopic = obviousOffTopicKeywords.some(keyword => 
        lowerMessage.includes(keyword)
      );

      // If contains learning keywords, likely on-topic
      const learningKeywords = [
        'học', 'hoc', 'khóa học', 'khoa hoc', 'course', 
        'bài tập', 'bai tap', 'test', 'kiểm tra', 'kiem tra',
        'lập trình', 'lap trinh', 'code', 'coding', 'programming',
        'career', 'nghề', 'nghe', 'kỹ năng', 'ky nang', 'skill',
        'tiến độ', 'tien do', 'progress', 'lesson', 'bài học', 'bai hoc',
        'chương trình', 'chuong trinh', 'công việc', 'cong viec', 'assignment',
        'javascript', 'python', 'java', 'react', 'angular', 'node', 'typescript'
      ];

      // Basic greetings and introductions are always on-topic
      const basicInteractionKeywords = [
        'xin chào', 'xin chao', 'chào', 'chao', 'hello', 'hi',
        'bạn là ai', 'ban la ai', 'ai', 'who are you', 'giới thiệu', 'gioi thieu',
        'tên', 'ten', 'name', 'làm gì', 'lam gi', 'what', 'cảm ơn', 'cam on', 'thank',
        'tạm biệt', 'tam biet', 'bye', 'goodbye'
      ];
      
      const hasLearningKeywords = learningKeywords.some(keyword => 
        lowerMessage.includes(keyword)
      );

      const hasBasicInteraction = basicInteractionKeywords.some(keyword => 
        lowerMessage.includes(keyword)
      );

      // If has learning keywords or basic interaction, it's on-topic
      if (hasLearningKeywords || hasBasicInteraction) {
        return false;
      }

      // If has obvious off-topic keywords and no learning context, it's off-topic
      if (hasObviousOffTopic) {
        return true;
      }

      // For ambiguous cases, use semantic similarity with Cohere embeddings
      // Cohere handles Vietnamese with/without diacritics automatically
      const onTopicExamples = [
        'Làm sao để học lập trình hiệu quả?',
        'Khóa học Java có khó không?',
        'React hay Angular tốt hơn?',
        'Tôi nên học Python hay JavaScript trước?',
        'Cách debug code hiệu quả',
        'Career path cho lập trình viên',
        'Học machine learning cần gì?',
        'Bài tập về thuật toán',
        'Test API như thế nào?',
        'Framework nào phù hợp với dự án?',
        'Xin chào!',
        'Hello',
        'Bạn là ai?',
        'Tên bạn là gì?',
        'Giới thiệu về bản thân',
        'Cảm ơn bạn',
        'Hi'
      ];

      const offTopicExamples = [
        'Trái đất có hình gì?',
        'Phim Marvel nào hay nhất?',
        'Bóng đá hôm nay có gì?',
        'Món ăn ngon ở Hà Nội',
        'Thời tiết hôm nay thế nào?',
        'Người yêu tôi tức giận phải làm sao?',
        'Game nào hay để chơi?',
        'Du lịch Đà Lạt tháng mấy đẹp?',
        'Mua điện thoại gì tốt?',
        'Ca sĩ nào đang hot?'
      ];

      // Get embeddings - Cohere automatically handles text normalization
      const allTexts = [message, ...onTopicExamples, ...offTopicExamples];
      const embeddings = await this.getEmbedding(allTexts);

      const queryEmbedding = embeddings[0];
      const onTopicEmbeddings = embeddings.slice(1, 1 + onTopicExamples.length);
      const offTopicEmbeddings = embeddings.slice(1 + onTopicExamples.length);

      // Calculate average similarity to on-topic and off-topic examples
      const avgOnTopicSimilarity = onTopicEmbeddings.reduce((sum, emb) => 
        sum + this.cosineSimilarity(queryEmbedding, emb), 0
      ) / onTopicEmbeddings.length;

      const avgOffTopicSimilarity = offTopicEmbeddings.reduce((sum, emb) => 
        sum + this.cosineSimilarity(queryEmbedding, emb), 0
      ) / offTopicEmbeddings.length;

      // If more similar to off-topic examples, it's off-topic
      return avgOffTopicSimilarity > avgOnTopicSimilarity;

    } catch (error) {
      console.error('[AIService.isOffTopicQuery] Error:', error.message);
      // Fallback to keyword-based detection on error
      const lowerMessage = message.toLowerCase();
      const offTopicKeywords = [
        'trái đất', 'trai dat', 'phim', 'nhạc', 'nhac', 
        'bóng đá', 'bong da', 'món ăn', 'mon an', 
        'thời tiết', 'thoi tiet', 'tình yêu', 'tinh yeu'
      ];
      return offTopicKeywords.some(keyword => lowerMessage.includes(keyword));
    }
  }

  async chat(messages, studentContext) {
    try {
      const lastMessage = messages[messages.length - 1];
      
      // Check for security-sensitive queries
      if (lastMessage && lastMessage.role === 'user' && this.isSecuritySensitiveQuery(lastMessage.content)) {
        return 'Tôi không có quyền truy cập hoặc chia sẻ thông tin kỹ thuật, bảo mật của hệ thống. Tôi chỉ có thể hỗ trợ bạn về các vấn đề học tập, khóa học và phát triển kỹ năng. Bạn có câu hỏi gì về lộ trình học của mình không?';
      }

      // Check for off-topic queries using AI semantic classification
      if (lastMessage && lastMessage.role === 'user') {
        const isOffTopic = await this.isOffTopicQuery(lastMessage.content);
        if (isOffTopic) {
          return 'Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi liên quan đến học tập, khóa học, lập trình và phát triển nghề nghiệp. Tôi không thể trả lời các câu hỏi về chủ đề khác. Bạn có câu hỏi gì về quá trình học tập hoặc các khóa học trên nền tảng không?';
        }
      }

      const systemPrompt = this.buildSystemPrompt(studentContext);
      
      // Detect if user is asking for specific course search
      const userMessage = lastMessage?.content?.toLowerCase() || '';
      const isCourseSearchQuery = 
        /có khóa học (nào về|về|cho)|tìm khóa học|khóa học .* ở đâu|giới thiệu khóa học|course .* available/i.test(userMessage);
      
      const isLessonSearchQuery = 
        /có bài học (nào về|về)|tìm bài học|lesson .* about|bài học .* ở đâu/i.test(userMessage);
        
      const isTestSearchQuery = 
        /có (bài )?test (nào về|về)|tìm (bài )?test|test .* about|(bài )?kiểm tra .* ở đâu/i.test(userMessage);
        
      const isGeneralContentSearch = 
        /tìm kiếm|search|có gì về|nội dung về|tài liệu về/i.test(userMessage);
      
      // Disable function calling for general "how to learn" questions
      const isGeneralQuestion =
        /làm sao (để )?học|bắt đầu học|học .* như thế nào|học gì trước|nên học/i.test(userMessage);

      // First request - with or without function calling
      const requestConfig = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1024
      };

      // Only enable function calling for explicit search queries
      const shouldEnableFunctionCalling = 
        (isCourseSearchQuery || isLessonSearchQuery || isTestSearchQuery || isGeneralContentSearch) && 
        !isGeneralQuestion;
      
      if (shouldEnableFunctionCalling) {
        requestConfig.tools = [
          {
            type: 'function',
            function: {
              name: 'search_courses',
              description: 'Tìm kiếm các khóa học/career path phù hợp với yêu cầu của sinh viên. CHỈ sử dụng khi sinh viên HỎI RÕ RÀNG về khóa học có sẵn hoặc muốn tìm khóa học cụ thể.',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Từ khóa tìm kiếm cụ thể (ví dụ: "java", "frontend", "data science", "backend", "python").'
                  }
                },
                required: ['query']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'search_lessons',
              description: 'Tìm kiếm bài học cụ thể trong các khóa học. Sử dụng khi sinh viên hỏi về bài học, chương cụ thể.',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Từ khóa tìm kiếm bài học (ví dụ: "OOP", "loop", "function", "array").'
                  }
                },
                required: ['query']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'search_tests',
              description: 'Tìm kiếm bài kiểm tra, bài thi. Sử dụng khi sinh viên hỏi về bài test, quiz cụ thể.',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Từ khóa tìm kiếm test (ví dụ: "java test", "final exam", "quiz").'
                  }
                },
                required: ['query']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'search_all_content',
              description: 'Tìm kiếm tất cả loại nội dung (khóa học, bài học, test). Sử dụng khi sinh viên hỏi chung chung về nội dung học tập.',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Từ khóa tìm kiếm tổng quát.'
                  }
                },
                required: ['query']
              }
            }
          }
        ];
        requestConfig.tool_choice = 'auto';
        requestConfig.parallel_tool_calls = false;
      }

      const response = await groqClient.post('/chat/completions', requestConfig);

      const assistantMessage = response.data.choices[0].message;

      // Check if AI wants to call function
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        try {
          const toolCall = assistantMessage.tool_calls[0];
          const args = JSON.parse(toolCall.function.arguments);
          let searchResults;

          // Handle different function calls
          switch (toolCall.function.name) {
            case 'search_courses':
              searchResults = await this.searchCourses(args.query);
              break;
            case 'search_lessons':
              searchResults = await this.searchLessons(args.query);
              break;
            case 'search_tests':
              searchResults = await this.searchTests(args.query);
              break;
            case 'search_all_content':
              searchResults = await this.searchAllContent(args.query);
              break;
            default:
              searchResults = [];
          }

          // Second request with function result
          const finalResponse = await groqClient.post('/chat/completions', {
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages,
              assistantMessage,
              {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(searchResults)
              }
            ],
            temperature: 0.7,
            max_tokens: 1024
          });

          return finalResponse.data.choices[0].message.content;
        } catch (funcError) {
          console.error('[AIService.chat] Function call error:', funcError.message);
          // If function call fails, return the text content if available
          if (assistantMessage.content) {
            return assistantMessage.content;
          }
          // Otherwise, generate a response without function calling
          const fallbackResponse = await groqClient.post('/chat/completions', {
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages
            ],
            temperature: 0.7,
            max_tokens: 1024
            // No tools - just generate text
          });
          return fallbackResponse.data.choices[0].message.content;
        }
      }

      // Clean up any malformed function syntax in text response
      let cleanContent = assistantMessage.content || '';
      
      // Remove any <function=...> tags that AI might have generated
      cleanContent = cleanContent.replace(/<function=[\s\S]*?<\/function>/gi, '').trim();
      
      // Remove references to function calls in text
      cleanContent = cleanContent.replace(/Tuy nhiên, tôi không thể tìm kiếm.*?$/i, '').trim();
      cleanContent = cleanContent.replace(/Nếu bạn muốn tìm kiếm.*?tìm kiếm khóa học trên nền tảng này\./i, '').trim();

      return cleanContent;
    } catch (error) {
      console.error('[AIService.chat] Error:', error.response?.data || error.message);
      throw new Error('Lỗi khi gọi AI: ' + (error.response?.data?.error?.message || error.message));
    }
  }


  async generateAssessment(studentContext) {
    try {
      const prompt = `Dựa trên dữ liệu học tập của sinh viên ${studentContext.studentName}, hãy tạo một báo cáo đánh giá chi tiết bao gồm:

1. TỔNG QUAN HIỆN TRẠNG: Đánh giá tổng quan về tiến độ học tập hiện tại
2. ĐIỂM MẠNH: Những mặt học sinh đang làm tốt
3. ĐIỂM CẦN CẢI THIỆN: Những kỹ năng hoặc kiến thức cần bổ sung
4. GỢI Ý PHÁT TRIỂN: Đề xuất cụ thể để cải thiện (khóa học, kỹ năng, phương pháp học)
5. KẾ HOẠCH HÀNH ĐỘNG: 3-5 bước cụ thể sinh viên nên thực hiện trong thời gian tới

DỮ LIỆU:
- Số khóa học: ${studentContext.totalCourses}
- Điểm TB: ${studentContext.averageScore}
- Khóa học đang học: ${JSON.stringify(studentContext.enrolledCourses)}
- Kết quả kiểm tra: ${JSON.stringify(studentContext.recentTests)}

Hãy viết báo cáo bằng tiếng Việt, chi tiết, cụ thể và mang tính xây dựng.`;

      const response = await groqClient.post('/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Bạn là một chuyên gia tư vấn giáo dục và định hướng nghề nghiệp.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 2048
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('[AIService.generateAssessment] Error:', error.response?.data || error.message);
      throw new Error('Lỗi khi tạo đánh giá: ' + (error.response?.data?.error?.message || error.message));
    }
  }


  async generateSessionTitle(firstMessage) {
    try {
      const response = await groqClient.post('/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Tạo một tiêu đề ngắn gọn (tối đa 50 ký tự) cho cuộc trò chuyện dựa trên tin nhắn đầu tiên. Chỉ trả về tiêu đề, không giải thích.'
          },
          { role: 'user', content: firstMessage }
        ],
        temperature: 0.7,
        max_tokens: 50
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('[AIService.generateSessionTitle] Error:', error);
      return 'Trò chuyện với AI';
    }
  }

  // ==============================
  // Mock AI Grading (không gọi API bên ngoài)
  // ==============================

  async mockGradeLessonTask(submissionData, rubric) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      score: 8.5,
      feedback: "Bài làm tốt, cấu trúc rõ ràng nhưng cần tối ưu hiệu năng.",
      strengths: ["Hiểu đúng yêu cầu", "Triển khai logic tốt"],
      improvements: ["Cần refactor code cho ngắn gọn hơn"]
    };
  }

  // ==============================
  // Real AI Grading (gọi Groq API)
  // ==============================

  // ==============================
  // Real AI Grading (gọi Groq API - Bọc thép JSON Mode)
  // ==============================

  async gradeLessonTask(submissionData, rubric, submissionFields) {
    try {
      // 1. DYNAMIC PROMPTING: Dịch cấu hình nộp bài thành chỉ thị cho AI
      let dynamicInstructions = "";
      if (submissionFields && Array.isArray(submissionFields) && submissionFields.length > 0) {
        dynamicInstructions = "HƯỚNG DẪN CHẤM TỪNG TRƯỜNG DỮ LIỆU:\n";
        submissionFields.forEach(field => {
          if (field.type === 'CODE') {
            dynamicInstructions += `- Trường [${field.label}] (Ngôn ngữ: ${field.language || 'Code'}): Đánh giá cú pháp, logic thuật toán, độ tối ưu (Time/Space Complexity) và clean code.\n`;
          } else if (field.type === 'SQL_QUERY') {
            dynamicInstructions += `- Trường [${field.label}] (SQL): Đánh giá tính chính xác của truy vấn, cấu trúc JOIN/WHERE, và tối ưu hiệu suất.\n`;
          } else {
            dynamicInstructions += `- Trường [${field.label}] (Văn bản/Giải thích): Đánh giá mức độ hiểu vấn đề, tính logic và đầy đủ của thông tin giải thích.\n`;
          }
        });
      }

      // 2. XÂY DỰNG SYSTEM PROMPT BỌC THÉP
      const systemPrompt = `Bạn là một Giảng viên Senior IT. Nhiệm vụ của bạn là chấm bài thực hành một cách công tâm, khắt khe và chính xác.

QUY TẮC BẮT BUỘC (HARD RULES):
1. ĐỐI CHIẾU TIÊU CHÍ: Chấm điểm dựa trên "Tiêu chí (Rubric)" và "Bài làm của học viên".
2. CHẤM THIẾU YÊU CẦU: Nếu học viên để trống hoặc không làm đúng trọng tâm một yêu cầu, bắt buộc trừ điểm. Điểm tối đa là 10.
3. CHỐNG GIAN LẬN: Nếu bài làm chỉ copy lại đề bài hoặc ghi nội dung vô nghĩa, cho 0 điểm.
4. ĐỊNH DẠNG TRẢ VỀ: Bạn BẮT BUỘC phải trả về một object JSON. KHÔNG ĐƯỢC PHÉP có bất kỳ văn bản, giải thích, hay markdown (như \`\`\`json) nào nằm ngoài block JSON.

${dynamicInstructions}

TIÊU CHÍ CHẤM ĐIỂM (Rubric):
${rubric ? rubric : "Không có Rubric cụ thể. Hãy chấm dựa trên độ chính xác kỹ thuật, logic và best practices."}

BẢN THIẾT KẾ JSON OUTPUT (Tuân thủ nghiêm ngặt):
{
  "score": 8.5,
  "feedback": "Nhận xét tổng quan và chỉ ra lỗi sai cụ thể (ví dụ: Code chạy tốt nhưng vòng lặp chưa tối ưu).",
  "strengths": ["Ưu điểm 1", "Ưu điểm 2"],
  "improvements": ["Điểm cần sửa 1", "Điểm cần sửa 2"]
}`;

      // 3. GỌI API VỚI NATIVE JSON MODE
      const response = await groqClient.post('/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        response_format: { type: "json_object" }, // Kỹ thuật cốt lõi: Ép API trả về JSON thô
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `BÀI LÀM CỦA HỌC VIÊN:\n${JSON.stringify(submissionData, null, 2)}\n\nHãy chấm điểm và xuất JSON.`
          }
        ],
        temperature: 0.2, // Hạ nhiệt để AI bớt sáng tạo, tập trung chấm chính xác
        max_tokens: 1024
      });

      // 4. BÓC TÁCH DỮ LIỆU AN TOÀN
      const rawContent = response.data.choices[0].message.content;
      let gradingResult;

      try {
        gradingResult = JSON.parse(rawContent);
      } catch (parseError) {
        console.error('[AIService.gradeLessonTask] JSON parse error:', parseError, 'Raw:', rawContent);
        throw new Error('Hệ thống AI trả về định dạng lỗi. Vui lòng thử nộp lại.');
      }

      // 5. CHUẨN HÓA DỮ LIỆU ĐẦU RA CHO FRONTEND
      return {
        score: typeof gradingResult.score === 'number' ? gradingResult.score : parseFloat(gradingResult.score) || 0,
        feedback: gradingResult.feedback || 'Không có nhận xét chi tiết.',
        strengths: Array.isArray(gradingResult.strengths) ? gradingResult.strengths : [],
        improvements: Array.isArray(gradingResult.improvements) ? gradingResult.improvements : []
      };

    } catch (error) {
      console.error('[AIService.gradeLessonTask] Fatal Error:', error);
      throw error;
    }
  }

  // ==============================
  // Lesson Chat Prompts
  // ==============================

  buildLessonChatPrompt(lesson, role) {
    const roleConfig = {
      MANAGER: {
        name: 'Quản lý dự án',
        persona: 'Bạn là một Quản lý dự án (Project Manager) có kinh nghiệm 10+ năm, chuyên quản lý các dự án phần mềm theo phương pháp Agile/Scrum. Bạn có kiến thức sâu về quản lý nhóm, lên kế hoạch, theo dõi tiến độ và giải quyết xung đột.',
        focus: 'quản lý dự án, sắp xếp công việc, phân chia task, standup meeting, retrospective, đánh giá tiến độ'
      },
      TECH_LEAD: {
        name: 'Kỹ sư trưởng',
        persona: 'Bạn là một Technical Lead / Senior Software Engineer với 8+ năm kinh nghiệm. Bạn giỏi về kiến trúc hệ thống, code review, thiết kế database, tối ưu hiệu suất và mentoring junior developers.',
        focus: 'kiến trúc phần mềm, clean code, best practices, design patterns, performance optimization, code review'
      },
      HR: {
        name: 'Chuyên viên nhân sự',
        persona: 'Bạn là một HR Business Partner với 5+ năm kinh nghiệm trong ngành IT. Bạn hiểu rõ văn hóa doanh nghiệp IT, quy trình tuyển dụng, đánh giá nhân sự và phát triển con người.',
        focus: 'kỹ năng mềm, phỏng vấn xin việc, cv, thái độ làm việc, teamwork, giao tiếp, văn hóa công ty IT'
      },
      QA: {
        name: 'Kỹ sư QA',
        persona: 'Bạn là một QA Engineer / Tester chuyên nghiệp với 5+ năm kinh nghiệm. Bạn giỏi viết test case, test plan, phân tích yêu cầu để tìm edge cases, sử dụng các công cụ testing và am hiểu CI/CD.',
        focus: 'kiểm thử phần mềm, test case, bug report, test strategy, automation testing, CI/CD'
      }
    };

    const config = roleConfig[role] || roleConfig.MANAGER;

    return `${config.persona}

VAI TRÒ TRONG BUỔI HỌC: ${config.name}
CHỦ ĐỀ BÀI HỌC: ${lesson.title || 'Không có tiêu đề'}
NỘI DUNG LÝ THUYẾT:
${lesson.theoryContent || 'Không có nội dung lý thuyết'}
NỘI DUNG BÀI TẬP:
${lesson.taskDescription || 'Không có nội dung bài tập'}

NHIỆM VỤ CỦA BẠN:
1. Đóng vai ${config.name} — trao đổi với sinh viên về nội dung bài học dưới góc nhìn ${config.name}
2. Giải thích các khái niệm liên quan đến bài học từ góc độ ${config.name}
3. Đưa ra ví dụ thực tế từ kinh nghiệm làm việc
4. Đặt câu hỏi gợi mở để sinh viên suy nghĩ
5. Chia sẻ các lưu ý / best practices thường gặp trong thực tế

LƯU Ý:
- Chỉ trả lời trong phạm vi: ${config.focus}
- Sử dụng tiếng Việt, thân thiện, gần gũi
- Nếu câu hỏi ngoài phạm vi: hãy lịch sự chuyển hướng về chủ đề bài học
- Không tiết lộ thông tin kỹ thuật hệ thống`;
  }
}

module.exports = new AIService();
