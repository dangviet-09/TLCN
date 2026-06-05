# Skill Scoring Plan

## Phase 1: Database & Models (Tạo kiến trúc lưu trữ)

- [x] Tạo file: `src/models/studentSkillModel.js` — định nghĩa Model `StudentSkill` với các trường: `id` (UUID), `studentId` (UUID, FK -> students), `skillName` (String), `score` (Integer, default 0)
- [x] Cập nhật `src/models/index.js` — thêm dòng `db.StudentSkill = require("./studentSkillModel")(sequelize, Sequelize.DataTypes);`
- [x] Cập nhật `src/models/studentModel.js` — thêm quan hệ `Student.hasMany(models.StudentSkill, { foreignKey: 'studentId', as: 'skills' });`
- [x] Xuất câu lệnh SQL `CREATE TABLE student_skills ...` thuần (để tự chạy trên MySQL)

---

## Phase 2: Core Service (Viết thuật toán UPSERT)

- [x] Sửa `src/services/studentService.js` — viết hàm mới `async upsertStudentSkills(studentId, skillsArray, pointsToAdd)`
  - Bọc an toàn: kiểm tra `!skillsArray || skillsArray.length === 0`, return nếu đúng
  - Lặp qua từng skill, chuẩn hóa text (`trim()`)
  - Query không phân biệt hoa thường: `db.StudentSkill.findOrCreate` tìm theo `studentId` + `skillName`
  - Nếu có: `score = score + pointsToAdd`, update
  - Nếu chưa: `create` bản ghi mới với `score = pointsToAdd`

---

## Phase 3: Trigger Integration (Kích hoạt cộng điểm)

- [x] Sửa `src/services/courseService.js`
  - Tìm hàm `completeTheoryLesson`
  - Tại đoạn logic `if (!nextLesson)` (hoàn thành toàn bộ khóa học):
    - Đọc mảng `skills` từ `course` hoặc `db.CareerPath`
    - Gọi `studentService.upsertStudentSkills(studentId, course.skills, 10)` (mặc định cộng 10 điểm)

- [x] Bổ sung trigger `submitLessonTask` (TASK Lesson)
  - Khi `aiResult.score >= 3`: cập nhật tiến độ, chuyển sang lesson tiếp theo
  - Nếu là lesson cuối: tính `pointsToAdd = Math.round(aiResult.score)` (trọng số = điểm AI thực), gọi `upsertStudentSkills`
