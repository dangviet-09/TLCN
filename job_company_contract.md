# HỢP ĐỒNG GIAO DIỆN (FRONTEND CONTRACT) - TÍNH NĂNG QUẢN LÝ VIỆC LÀM CHO DOANH NGHIỆP

**MỤC TIÊU CỐT LÕI:**
Xây dựng cụm giao diện Quản lý Việc làm cho vai trò Company. Yêu cầu TUYỆT ĐỐI tuân thủ cấu trúc dữ liệu và API đã được chốt, không tự ý sáng tạo hay thêm bớt trường (fields).

## 1. Cấu Trúc File Cần Tạo
Thư mục đích: `TLCN_GROUP_FE/src/pages/Company/`
1. `CompanyJobManage.tsx`: Màn hình danh sách việc làm đã đăng.
2. `CompanyJobForm.tsx`: Form thêm mới / cập nhật việc làm (có thể dùng Modal hoặc Page riêng biệt).
3. `CompanyJobApplications.tsx`: Màn hình xem danh sách ứng viên (CV) nộp vào một công việc cụ thể.

## 2. Ràng Buộc Kiến Trúc & API (BẮT BUỘC)
- **Công cụ fetch API:** TUYỆT ĐỐI dò xem các trang cũ (như JobMarketPage.tsx) đang import file cấu hình API nào thì copy y hệt đường dẫn import đó. Không dùng `axios` thuần hardcode `localhost:5000`.
- **Cấu trúc Response:** Backend luôn trả về wrapper dạng: `{ status: number, message: string, data: any }`. 
  => Khi gọi axios, dữ liệu thật luôn nằm ở `response.data.data`.
- **An toàn UI:** Luôn dùng Optional Chaining (`?.`) khi render dữ liệu. Kiểm tra mảng rỗng trước khi `.map()`. Bắt buộc có trạng thái `loading` (Spinner/Skeleton) và thông báo `error` nếu API thất bại.

## 3. Cấu Trúc Model (Giao thức Form)
Khi xây dựng `CompanyJobForm.tsx`, các trường Dropdown (Select) PHẢI khớp 100% với ENUM trong Database:
- `employmentType`: `['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT']`
- `experienceLevel`: `['FRESHER', 'JUNIOR', 'MIDIOR', 'SENIOR']` *(Lưu ý: Dùng chính xác chữ MIDIOR, không dùng MIDDLE)*
- `status`: `['OPEN', 'CLOSED', 'DRAFT']`

Trường `skillRequirements` là JSON Array. Giao diện form cần có nút "Thêm kỹ năng", mỗi kỹ năng gồm 3 input: 
- `skillName` (Input Text)
- `level` (Select: `REQUIRED` hoặc `NICE_TO_HAVE`)
- `minProficiency` (Input Number: 1 đến 5).

## 4. Đặc tả API Endpoints

### 4.1. Lấy danh sách việc làm của công ty
- **Endpoint:** `GET /jobs/company/owned`
- **Mock Response.data.data:**

```json
{
  "totalItems": 10,
  "totalPages": 2,
  "currentPage": 1,
  "jobs": [
    {
      "id": "uuid-job-1",
      "title": "Backend Developer (Node.js)",
      "employmentType": "FULL_TIME",
      "status": "OPEN",
      "viewCount": 150,
      "applicationsCount": 12, 
      "createdAt": "2026-05-10T10:00:00Z"
    }
  ]
}
```

**UI Yêu cầu:** Bảng (Table) hiển thị danh sách. Mỗi hàng có các nút chức năng:
- **Sửa**
- **Xóa**
- **Đóng/Mở Job**
- **Xem ứng viên** (Luôn hiển thị nút này, hoặc hiển thị kèm số lượng nếu API có trả về applicationsCount)

---

### 4.2. Thêm mới / Cập nhật việc làm

- **Endpoints:** `POST /jobs` hoặc `PUT /jobs/:id`

- **Body Request:**

```json
{
  "title": "Frontend React",
  "description": "<p>Mô tả chi tiết</p>",
  "location": "Hồ Chí Minh",
  "salaryMin": 15000000,
  "salaryMax": 25000000,
  "employmentType": "FULL_TIME",
  "experienceLevel": "JUNIOR",
  "deadline": "2026-06-30",
  "status": "OPEN",
  "skillRequirements": [
    {
      "skillName": "ReactJS",
      "level": "REQUIRED",
      "minProficiency": 3
    }
  ]
}
```

**UI Yêu cầu:**
- Form chia layout **2 cột** rõ ràng, dễ sử dụng.
- TUYỆT ĐỐI CHỈ SỬ DỤNG thư viện Ant Design (antd) kết hợp với @ant-design/icons cho các UI Component (Table, Form, Select, Modal, Button) và Tailwind CSS để căn chỉnh Layout/Margin/Padding. NGHIÊM CẤM import Material UI (MUI) hay bất kỳ thư viện bên thứ 3 nào khác.
- Hỗ trợ cả chế độ **Create** và **Edit**.
- Validate đầy đủ:
  - `title`, `description`, `location`, `employmentType`, `experienceLevel`, `deadline`, `status` là bắt buộc.
  - `salaryMin` và `salaryMax` phải là số dương.
  - `salaryMax >= salaryMin`.
  - `deadline` không được nhỏ hơn ngày hiện tại.
  - `skillRequirements` phải cho phép thêm/xóa động nhiều kỹ năng.
- Khi Edit, phải load dữ liệu hiện tại và binding đúng giá trị vào form.

---

### 4.3. Quản lý CV / Ứng viên nộp vào

#### Endpoint 1 - Lấy danh sách CV

- **Endpoint:** `GET /jobs/:id/applications`

- **Mock Response.data.data:**

```json
[
  {
    "id": "uuid-application-1",
    "studentId": "uuid-student-1",
    "student": {
      "fullName": "Đặng Hoàng Việt",
      "email": "viet@example.com"
    },
    "coverLetter": "Chào anh/chị, em xin ứng tuyển...",
    "status": "PENDING",
    "appliedAt": "2026-05-12T08:00:00Z"
  }
]
```

#### Endpoint 2 - Cập nhật trạng thái CV

- **Endpoint:** `PATCH /jobs/applications/:applicationId/status`

- **Body Request:**

```json
{
  "status": "ACCEPTED"
}
```

- Giá trị hợp lệ của `status`:
  - `PENDING`
  - `REVIEWING`
  - `SHORTLISTED`
  - `ACCEPTED`
  - `REJECTED`

**UI Yêu cầu:**
- Màn hình `CompanyJobApplications.tsx` hiển thị danh sách ứng viên dạng Bảng (Table).
- Các cột đề xuất:
  - Họ tên ứng viên
  - Email
  - Thư ứng tuyển (Cover Letter)
  - Ngày nộp
  - Trạng thái hiện tại
  - Hành động
- Cột cuối cùng phải có Dropdown/Select để HR thay đổi trạng thái hồ sơ trực tiếp.
- Sau khi cập nhật trạng thái:
  - Hiển thị thông báo thành công/thất bại.
  - Refresh lại dữ liệu hoặc cập nhật state cục bộ.
- Dữ liệu hiển thị phải sử dụng Optional Chaining:
  - `application?.student?.fullName`
  - `application?.student?.email`

---

## 5. Yêu Cầu UX/UI Bắt Buộc

### Danh sách việc làm
- Có phân trang (Pagination) dựa trên:
  - `totalItems`
  - `totalPages`
  - `currentPage`
- Có trạng thái Loading khi gọi API.
- Có Empty State khi chưa có việc làm nào.
- Có Confirm Dialog trước khi xóa Job.
- Hiển thị Badge/Tag màu sắc cho trạng thái:
  - `OPEN` → Xanh lá
  - `CLOSED` → Đỏ
  - `DRAFT` → Vàng

### Form việc làm
- Có nút:
  - Lưu
  - Hủy
- Disable nút Lưu trong lúc submit.
- Hiển thị lỗi validation dưới từng field.

### Danh sách ứng viên
- Có Loading State.
- Có Empty State.
- Cho phép xem đầy đủ Cover Letter bằng Modal hoặc Drawer nếu nội dung dài.

---

## 6. Tiêu Chuẩn Code

- React Functional Components.
- Sử dụng Hooks (`useState`, `useEffect`).
- Tách API call thành các hàm riêng.
- Không hardcode dữ liệu mẫu trong UI.
- Không sử dụng `any` nếu dự án đang dùng TypeScript.
- Định nghĩa Interface/Type đầy đủ cho:
  - Job
  - SkillRequirement
  - JobApplication
  - Student
  - API Response Wrapper

Ví dụ:

```ts
interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}
```

---

## 7. Tiêu Chí Hoàn Thành (Definition of Done)

Hoàn thành khi:

- Tạo đủ 3 file:
  - `CompanyJobManage.tsx`
  - `CompanyJobForm.tsx`
  - `CompanyJobApplications.tsx`
- Kết nối đúng toàn bộ API đã mô tả.
- Không sử dụng endpoint khác ngoài tài liệu này.
- Không thêm hoặc sửa field ngoài contract.
- Có loading, error, empty state.
- Có validate form đầy đủ.
- Có quản lý danh sách kỹ năng động (`skillRequirements`).
- Có cập nhật trạng thái ứng viên trực tiếp từ giao diện.
- Source code build thành công và không có lỗi TypeScript.