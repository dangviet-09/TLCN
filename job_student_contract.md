# HỢP ĐỒNG GIAO DIỆN (FRONTEND CONTRACT) - TÍNH NĂNG SINH VIÊN ỨNG TUYỂN

**MỤC TIÊU CỐT LÕI:**
Xây dựng luồng ứng tuyển Việc làm cho vai trò Student. TUYỆT ĐỐI tuân thủ cấu trúc dữ liệu JSON thực tế, không tự suy diễn trường dữ liệu.

## 1. Cấu Trúc File Cần Tạo/Cập Nhật
Thư mục đích: `TLCN_GROUP_FE/src/pages/Job/` (hoặc thư mục Student tương ứng)
1. `JobDetailPage.tsx`: Cập nhật thêm Modal ứng tuyển (Nhập Cover Letter).
2. `MyApplicationsPage.tsx`: Màn hình hiển thị danh sách các công việc sinh viên đã nộp đơn.

## 2. Ràng Buộc Kiến Trúc & API (BẮT BUỘC)
- **Công cụ fetch API:** Dùng cấu hình axios hiện tại của dự án. Gắn Authorization Header bằng Token (chú ý `req.user.id` là Auth context).
- **An toàn UI:** Luôn dùng Optional Chaining (`?.`). Bắt buộc ép kiểu dữ liệu `Number()` cho các trường lương (salaryMin, salaryMax) vì API đang trả về chuỗi (VD: `"100000.00"`).
- **Thư viện UI:** CHỈ SỬ DỤNG Ant Design (`Table`, `Modal`, `Form`, `Tag`, `Button`) và Tailwind CSS.

## 3. Đặc tả API Endpoints & Mock JSON

### 3.1. API Nộp Đơn Ứng Tuyển
- **Endpoint:** `POST /jobs/:id/apply`
- **Body Request:**

```json
{
  "coverLetter": "Nội dung thư ứng tuyển..."
}
```

**Xử lý Logic UI:**
- Nút "Ứng tuyển" tại trang `JobDetailPage` sẽ mở Modal chứa form nhập `coverLetter`.
- Disable nút Submit khi đang gọi API (Loading state).
- Bắt lỗi HTTP 400 (Trùng lặp đơn): Hiển thị Toast/Notification báo "Bạn đã ứng tuyển công việc này rồi" và đổi trạng thái nút thành "Đã ứng tuyển" (Disabled).
- Thành công: Báo Toast thành công, đóng Modal.

---

### 3.2. API Lấy Danh Sách Đã Nộp
- **Endpoint:** `GET /jobs/student/applied`
- **Mock Response.data.data (Thực tế):**

```json
[
  {
    "id": "38ae2ab9-92eb-494f-8f7d-4d552c996fc8",
    "studentId": "85213e3e-6e4c-4dca-b723-4591969a8ac8",
    "jobPostingId": "e0f8baa1-e68b-472b-b9ee-14aaa8e08f2c",
    "coverLetter": "Em muốn ứng tuyển...",
    "status": "PENDING",
    "appliedAt": "2026-05-31T05:28:45.000Z",
    "jobPosting": {
      "id": "e0f8baa1-e68b-472b-b9ee-14aaa8e08f2c",
      "title": "Frontend Developer Intern",
      "location": "Hồ Chí Minh",
      "salaryMin": "100000.00",
      "salaryMax": "1000000.00",
      "employmentType": "INTERNSHIP",
      "experienceLevel": "FRESHER",
      "deadline": "2026-06-17T00:00:00.000Z",
      "status": "OPEN",
      "company": {
        "id": "c903624b-461b-4e00-86ad-72a7d816c732",
        "companyName": "Alpha Tech",
        "logo": null
      }
    }
  }
]
```

**UI Yêu cầu cho MyApplicationsPage.tsx:**
- Hiển thị danh sách dạng Bảng (Table) hoặc Danh sách thẻ (Card List) tùy UI chung của dự án.
- Các cột/trường cần hiển thị:
  - Tên công việc: `application.jobPosting?.title`
  - Tên công ty: `application.jobPosting?.company?.companyName`
  - Ngày nộp: Format ngày giờ từ `application.appliedAt`
  - Thư ứng tuyển: Nút "Xem chi tiết" để mở Modal đọc `coverLetter` nếu nội dung dài.
  - Trạng thái: Dùng Ant Design Tag phân màu dựa trên `application.status` (PENDING: Vàng/Xanh dương, ACCEPTED: Xanh lá, REJECTED: Đỏ).
- Tái sử dụng hàm `formatSalary` (ép kiểu Number trước khi gọi) để hiển thị mức lương nếu cần.

---

## 4. Tiêu Chuẩn Code & TypeScript

Bắt buộc định nghĩa Interface trước khi render:

```ts
interface CompanyInfo {
  id: string;
  companyName: string;
  logo: string | null;
}

interface JobPostingInfo {
  id: string;
  title: string;
  location: string;
  salaryMin: string; // Lưu ý kiểu string từ API
  salaryMax: string;
  employmentType: string;
  experienceLevel: string;
  deadline: string;
  status: string;
  company: CompanyInfo;
}

interface JobApplication {
  id: string;
  studentId: string;
  jobPostingId: string;
  coverLetter: string;
  status: string;
  appliedAt: string;
  jobPosting: JobPostingInfo;
}
```

**Chống lỗi:**
- Hiển thị Skeleton/Spinner trong lúc fetch danh sách.
- Hiển thị Ant Design Empty nếu mảng data trả về rỗng (Chưa ứng tuyển job nào).