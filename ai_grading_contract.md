# HỢP ĐỒNG GIAO DIỆN (FRONTEND CONTRACT) - TÍNH NĂNG SINH VIÊN NỘP BÀI & AI CHẤM ĐIỂM

**MỤC TIÊU CỐT LÕI:**
Xây dựng giao diện cho Role `STUDENT` thực hiện nộp bài tập (Task) và hiển thị kết quả phân tích, chấm điểm từ AI ngay lập tức.

## 1. Cấu Trúc File Cần Tạo/Cập Nhật
Thư mục đích: `TLCN_GROUP_FE/src/pages/Course/`
1. `CourseStudyPage.tsx`: Màn hình học tập chính, hiển thị nội dung bài học. Bổ sung khu vực Form nộp bài và Card hiển thị kết quả AI.

## 2. Ràng Buộc Kiến Trúc & API (BẮT BUỘC)
- **Xác thực:** Gắn Token Student vào Header.
- **Thư viện UI:** Ant Design (`Form`, `Input`, `Button`, `Card`, `Tag`, `Typography`, `Spin`, `Alert`).
- **Trạng thái (State):** Cần quản lý trạng thái `isSubmitting` (để hiện Spinner chờ AI 2 giây) và `aiResult` (để lưu kết quả trả về).

## 3. Đặc tả API Endpoint & Mock JSON
- **Endpoint:** `POST /courses/:courseId/lessons/:lessonId/submit`
- **Body Request (Gửi từ UI):**

```json
{
  "submissionData": {
    "github_link": "[https://github.com/](https://github.com/)...",
    "live_demo": "https://..."
  }
}
```

**Response.data.data:**

```json
{
  "score": 8.5,
  "aiGrading": {
    "score": 8.5,
    "feedback": "Bài làm tốt, cấu trúc rõ ràng nhưng cần tối ưu hiệu năng.",
    "strengths": ["Hiểu đúng yêu cầu", "Triển khai logic tốt"],
    "improvements": ["Cần refactor code cho ngắn gọn hơn"]
  },
  "status": "GRADED"
}
```

## 4. Xử lý Logic UI (Dynamic Form & AI Result)
- **Form Nộp bài:** Dựa vào mảng `submissionFields` (VD: `["github_link", "live_demo"]`) của Lesson hiện tại để render ra số lượng ô Input tương ứng.
- **Loading State:** Khi nhấn nộp, Nút Submit chuyển sang trạng thái Loading (hiển thị text: "AI đang phân tích mã nguồn..."). Disable toàn bộ form.
- **Hiển thị Kết quả:**
  - Ẩn form nộp bài đi sau khi có kết quả.
  - Hiển thị Điểm số (`score`) nổi bật bằng số to hoặc Progress Ring.
  - Hiển thị `feedback` bằng thẻ Alert (màu xanh lá/xanh dương).
  - Dùng thẻ Tag màu xanh lá để render mảng `strengths` (Điểm mạnh).
  - Dùng thẻ Tag màu cam/đỏ để render mảng `improvements` (Cần cải thiện).