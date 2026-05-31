# HỢP ĐỒNG GIAO DIỆN & BACKEND - MÀN HÌNH JOB MARKET V2 (CÓ MATCHING)

**1. Ràng Buộc Kiến Trúc & Component:**
- Tên File: `JobMarketPage.tsx`.
- Endpoint gọi API BẮT BUỘC: `GET /jobs` (Tuyệt đối không gọi `/jobs/market`).
- Link điều hướng chi tiết BẮT BUỘC: `<Link to={`/jobs/${job.id}`}>`.

**2. Cấu trúc State (Trạng thái UI):**
- `jobs`: Mảng chứa dữ liệu việc làm (mặc định `[]`).
- `pagination`: Object `{ current: 1, pageSize: 10, total: 0 }`.
- `filters`: Object `{ search: '', location: '', experienceLevel: '', employmentType: '', sort: '' }`.
- `isRecommended`: Boolean (mặc định `false`). Quản lý công tắc bật/tắt thuật toán Matching.
- `isLoading`: Boolean (mặc định `false`).

**3. Layout Bộ Lọc (Ant Design):**
- Sử dụng `Row` và `Col` với `gutter={[16, 16]}` để dàn hàng ngang thanh công cụ, tự động rớt dòng trên màn hình nhỏ.
- Ô Tìm kiếm (Search by Title): Dùng `Input.Search`. Bắt sự kiện `onSearch`.
- Dropdown Cấp bậc (experienceLevel): `Select`. Options BẮT BUỘC: `FRESHER`, `JUNIOR`, `MIDDLE`, `SENIOR`.
- Dropdown Hình thức (employmentType): `Select`. Options: `FULL_TIME`, `PART_TIME`, `INTERNSHIP`.
- Dropdown Địa điểm (location): `Select`. Options: `Hồ Chí Minh`, `Hà Nội`, `Đà Nẵng`, `Khác`.
- Dropdown Sắp xếp (sort): `Select`. Option: `salary_desc` (Lương giảm dần).
- Công tắc Gợi ý: `<Switch checked={isRecommended} onChange={...} />` kèm Text "Đề xuất cho tôi".
- Nút "Xóa bộ lọc" (Clear Filters): Nút bấm để reset `filters` và `isRecommended`.

**4. Ràng buộc Backend - Tầng Service (Cực kỳ Quan trọng):**
- Cập nhật hàm `getJobs(page, limit, filters, isRecommended, studentId)`.
- **Tầng 1 (Lọc SQL):** BẮT BUỘC có điều kiện `status: 'OPEN'`. Map các biến search (dùng `Op.substring`), location, experienceLevel, employmentType vào `where`.
- **Tầng 1 (Sắp xếp SQL):** Nếu `filters.sort === 'salary_desc'`, order theo `[['salaryMax', 'DESC']]`.
- **Tầng 2 (Lọc Matching):** Nếu `isRecommended === 'true'` (hoặc `true`), lấy mảng `rows` vừa query được, dùng `Promise.all` lặp qua từng Job để gọi hàm `analyzeSkillGap(studentId, job.id)`. 
- Gắn thuộc tính `matchPercentage` vào mỗi phần tử Job. Sắp xếp lại toàn bộ mảng `rows` theo `matchPercentage` giảm dần.

**5. Layout Danh Sách (Ant Design):**
- Dùng `<List grid={{ gutter: 16, column: 2 }} ... />`. Tích hợp `pagination`.
- Render thẻ `<Card>`:
  + Header: Tên công việc (in đậm) + `<Tag color="green">{job.experienceLevel}</Tag>`.
  + Tag Matching: Nếu job có tồn tại thuộc tính `matchPercentage`, BẮT BUỘC render thêm `<Tag color="magenta">Phù hợp: {job.matchPercentage}%</Tag>`.
  + Body: Format VND cho lương (`toLocaleString('vi-VN')`). Bắt trường hợp null hiển thị "Thỏa thuận". Hiển thị địa điểm.
  + Action: Nút `<Button type="primary">Xem chi tiết</Button>` bọc bởi thẻ `<Link>`.