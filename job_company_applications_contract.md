# HỢP ĐỒNG GIAO DIỆN - MÀN HÌNH QUẢN LÝ ỨNG VIÊN (COMPANY)

**1. Kiến trúc & Routing:**
- Tên Component: `CompanyJobApplicationsPage.tsx`.
- Layout: `<Row>` và `<Col>`. Cột trái (span 6) chứa Danh sách Job, Cột phải (span 18) chứa Bảng CV.

**2. State Management An Toàn:**
- `ownedJobs`: Mảng lưu Job công ty (API `GET /jobs/owned`).
- `selectedJobId`: String | null.
- `applications`: Mảng lưu CV nộp vào Job được chọn (API `GET /jobs/:id/applications`).
- `isJobsLoading`: Trạng thái load cột trái.
- `isAppsLoading`: Trạng thái load cột phải.

**3. Cột Trái (Danh sách Job):**
- Sử dụng Ant Design `<List>` dọc. Khi click vào 1 item, set `selectedJobId` bằng ID của item đó.
- Component List Item: Hiển thị Tên Job in đậm. CSS highlight (đổi màu nền) cho Job đang được chọn (trùng với `selectedJobId`).

**4. Cột Phải (Bảng Quản Lý CV):**
- **Chặn lỗi Null:** Nếu `selectedJobId` là null, CHỈ render thẻ `<Empty description="Vui lòng chọn công việc ở danh sách bên trái để xem ứng viên" />`. Tuyệt đối không gọi API.
- Nếu có data, sử dụng Ant Design `<Table>`. BẮT BUỘC truyền `rowKey="id"`.
- **Cột Tên Ứng viên:** Hiển thị `student.user.fullName` (in đậm) và `student.user.email` (màu nhạt ở dưới).
- **Cột Cover Letter:** Giới hạn chiều dài, dùng `<Popover>` hoặc `<Tooltip>` để xem toàn văn.
- **Cột % Phù hợp:** Render bằng `<Progress type="circle" size="small" percent={record.matchPercentage} />`. 
  - BẮT BUỘC bật tính năng `sorter: (a, b) => a.matchPercentage - b.matchPercentage`.
- **Cột Trạng thái:** Dùng `<Tag>` (PENDING: Cam, ACCEPTED: Xanh lá, REJECTED: Đỏ). Tích hợp `filters` và `onFilter` của Table để lọc theo 3 trạng thái này.
- **Cột Hành động (Duyệt/Từ chối):**
  - Render 2 nút bấm `<Button>`.
  - Khi click: Gọi API `PUT /jobs/applications/:applicationId/status`.
  - **Bắt buộc:** Thành công (200) thì dùng `setApplications` update trực tiếp phần tử trong mảng (đổi status) để giao diện tự render lại, KHÔNG reload page.