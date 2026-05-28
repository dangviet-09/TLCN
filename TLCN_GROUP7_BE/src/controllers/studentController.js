const ApiResponse = require('../utils/apiResponse');
const studentService = require('../services/studentService');
const UserService = require('../services/userService'); 
class StudentController {


    async joinCareerPath(req, res) {
    try {
      const userId = req.user.id;   // lấy từ token
      const { careerPathId } = req.body;

      if (!careerPathId) {
        return ApiResponse.error(res, "Thiếu careerPathId", 400);
      }

      // Lấy Student record từ userId
      const student = await studentService.getStudentByUserId(userId);
      if (!student) {
        return ApiResponse.error(res, "Student không tồn tại", 404);
      }

      const result = await studentService.joinCareerPath(student.id, careerPathId);
      return ApiResponse.success(res, "Tham gia CareerPath thành công", result, 201);
    } catch (error) {
      console.error("[StudentController.joinCareerPath]", error);
      return ApiResponse.error(res, error.message || "Lỗi tham gia CareerPath", 400);
    }
  }

  
  // Học sinh submit bài test
   
  async submitTest(req, res) {
    try {
      const userId = req.user.id;
      const { testId, answers } = req.body;

      if (!testId || !answers || !Array.isArray(answers)) {
        return ApiResponse.error(res, "Thiếu testId hoặc answers", 400);
      }

      // Lấy Student record từ userId
      const student = await studentService.getStudentByUserId(userId);
      if (!student) {
        return ApiResponse.error(res, "Student không tồn tại", 404);
      }

      const result = await studentService.submitTest(student.id, testId, answers);

      return ApiResponse.success(res, "Nộp bài test thành công", result, 201);
    } catch (error) {
      console.error("[StudentController.submitTest]", error);
      return ApiResponse.error(res, error.message || "Lỗi nộp bài test", 400);
    }
  }


   // Lấy tiến độ học của học sinh trong CareerPath

  async getCareerPathProgress(req, res) {
    try {
      const userId = req.user.id;
      const { careerPathId } = req.params;

      // Lấy Student record từ userId
      const student = await studentService.getStudentByUserId(userId);
      if (!student) {
        return ApiResponse.error(res, "Student không tồn tại", 404);
      }

      const result = await studentService.getCareerPathProgress(student.id, careerPathId);

      return ApiResponse.success(res, "Lấy tiến độ thành công", result);
    } catch (error) {
      console.error("[StudentController.getCareerPathProgress]", error);
      return ApiResponse.error(res, error.message || "Không lấy được tiến độ", 400);
    }
  }

  async getEnrolledCourses(req, res) {
    try {
      const studentId = req.user.id;
      const result = await studentService.getEnrolledCourses(studentId);
      return ApiResponse.success(res, "Lấy danh sách khóa học đang tham gia thành công", result);
    } catch (error) {
      console.error("[StudentController.getEnrolledCourses]", error);
      return ApiResponse.error(res, error.message || "Không lấy được danh sách khóa học", 400);
    }
  }
  
    async getProfile(req, res) {
      try {
        const userId = req.user.id;
        const user = await UserService.getUserById(userId);
        return ApiResponse.success(res, "Lấy hồ sơ sinh viên thành công", user);
      } catch (error) {
        console.error("[StudentController.getProfile]", error);
        return ApiResponse.error(res, error.message || "Không lấy được hồ sơ", 400);
      }
    }
    async updateProfile(req, res) {
      try {
        const userId = req.user.id;

        const userPayload = {};
        for (const key of ['email', 'username', 'fullName', 'isActive', 'address']) {
          if (req.body[key] !== undefined) userPayload[key] = req.body[key];
        }
        if (Object.keys(userPayload).length > 0) {
          await UserService.updateUser(userId, userPayload);
        }

        const { major, school } = req.body;
        await studentService.updateProfile(userId, { major, school });

        const updated = await UserService.getUserById(userId);
        return ApiResponse.success(res, "Cập nhật hồ sơ sinh viên thành công", updated);
      } catch (error) {
        console.error("[StudentController.updateProfile]", error);
        return ApiResponse.error(res, error.message || "Không cập nhật được hồ sơ", 400);
      }
    }

    async getTestResultDetail(req, res) {
      try {
        const userId = req.user.id;
        const { testResultId } = req.params;

        // Lấy Student record từ userId
        const student = await studentService.getStudentByUserId(userId);
        if (!student) {
          return ApiResponse.error(res, "Student không tồn tại", 404);
        }

        const testResult = await studentService.getTestResultDetail(student.id, testResultId);
        return ApiResponse.success(res, "Lấy chi tiết test result thành công", testResult);
      } catch (error) {
        console.error("[StudentController.getTestResultDetail]", error);
        return ApiResponse.error(res, error.message || "Không lấy được chi tiết test result", 400);
      }
    }
}

module.exports = new StudentController();
