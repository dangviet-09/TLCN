# HỢP ĐỒNG GIAO DIỆN (FRONTEND CONTRACT) - TÍNH NĂNG DOANH NGHIỆP TẠO KHÓA HỌC & BÀI GIẢNG

**MỤC TIÊU CỐT LÕI:**
Xây dựng giao diện cho Role `COMPANY` để tạo Khóa học (Course) và thêm Bài giảng (Lesson). TUYỆT ĐỐI tuân thủ cấu trúc JSON thực tế từ Backend.

## 1. Cấu Trúc File Cần Tạo/Cập Nhật
Thư mục đích: `TLCN_GROUP_FE/src/pages/Company/`
1. `CompanyCourseManage.tsx`: Bảng danh sách khóa học và Nút/Modal tạo Khóa học mới.
2. `CompanyCourseEdit.tsx`: Trang chi tiết để chỉnh sửa Khóa học và Thêm Bài giảng (Lesson) vào khóa học đó.

## 2. Ràng Buộc Kiến Trúc & API (BẮT BUỘC)
- **Xác thực:** Gắn Token vào Header (Dùng cấu hình Axios hiện tại).
- **Thư viện UI:** BẮT BUỘC dùng Ant Design (`Table`, `Modal`, `Form`, `Input`, `Select`, `DatePicker`, `Switch`, `Button`).
- **Xử lý Mảng Động:** Trường `submissionFields` của Lesson là một mảng chuỗi (Array of strings). BẮT BUỘC dùng `Select` với `mode="tags"` của Ant Design để user tự nhập các trường cần nộp (VD: gõ "github_link" rồi nhấn Enter).

## 3. Đặc tả API Endpoints & Mock JSON

### 3.1. API Tạo Khóa Học (Course)
- **Endpoint:** `POST /courses`
- **Body Request:**
```json
{
  "title": "Khóa học ReactJS Thực chiến",
  "description": "Đào tạo ReactJS từ con số 0...",
  "category": "FRONTEND", 
  "level": "BEGINNER",
  "isFeatured": true,
  "publishedAt": "2026-06-01T00:00:00.000Z"
}
```

**Xử lý Logic UI (CompanyCourseManage.tsx):**
- Form tạo khóa học nằm trong Modal.
- Category có các option: `FRONTEND`, `BACKEND`, `FULLSTACK`, `MOBILE`, `AI`...
- Level có các option: `BEGINNER`, `INTERMEDIATE`, `ADVANCED`.
- Thành công: Đóng Modal, báo Toast, và chuyển hướng (Navigate) sang trang `/company/courses/:id/edit` (với `:id` lấy từ `response.data.data.id`).

---

### 3.2. API Tạo Bài Giảng (Lesson)
- **Endpoint:** `POST /courses/:courseId/lessons` (Lấy `courseId` từ URL params của trang Edit).
- **Body Request:**
```json
{
  "title": "Bài 1: Khởi tạo dự án",
  "type": "TASK",
  "theoryContent": "Đọc tài liệu đính kèm về Vite và React.",
  "taskDescription": "Tạo một dự án React bằng Vite và đẩy lên Github.",
  "submissionFields": ["github_link", "live_demo"],
  "rubric": "Chạy thành công: 5đ, Code sạch: 5đ"
}
```

**Xử lý Logic UI (CompanyCourseEdit.tsx):**
- Có một nút "Thêm bài giảng", mở Modal chứa Form.
- **Dynamic Form (Rất quan trọng):**
  - Trường `type` (Select): Chọn `THEORY` (Lý thuyết) hoặc `TASK` (Bài tập).
  - Nếu `type === 'THEORY'`: Chỉ hiển thị input `theoryContent` (Textarea).
  - Nếu `type === 'TASK'`: Hiển thị `taskDescription` (Textarea), `rubric` (Textarea), và `submissionFields` (Select `mode="tags"`).

---

## 4. Tiêu Chuẩn Code & TypeScript

```ts
interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  status: string;
  isFeatured: boolean;
  publishedAt: string;
}

interface Lesson {
  id: string;
  title: string;
  type: "THEORY" | "TASK";
  theoryContent: string | null;
  taskDescription: string | null;
  submissionFields: string[] | null;
  rubric: string | null;
  order: number;
  careerPathId: string; // Tương đương courseId
}
```