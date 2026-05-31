# HỢP ĐỒNG GIAO DIỆN - TÍCH HỢP GỢI Ý LỘ TRÌNH & NỘP ĐƠN ỨNG TUYỂN

**1. Ràng Buộc Trạng Thái (State Management):**
- Thêm `isApplying` (boolean, default: false) để quản lý trạng thái loading của nút Ứng tuyển, chặn người dùng spam click.
- Thêm `learningPath` (object) với cấu trúc khởi tạo mặc định: `{ mustLearn: [], niceToKnow: [] }`.

**2. Tích Hợp API (Chạy đồng thời):**
- Trong `useEffect` hiện tại, sử dụng `Promise.all` để gộp 2 API GET:
  + API 1: `apiClient.get('/jobs/' + jobId + '/skill-gap')`
  + API 2: `apiClient.get('/jobs/' + jobId + '/learning-path')`
- Gán dữ liệu tương ứng vào `setJobData` và `setLearningPath`. 
- Vẫn dùng chung state `isLoading` để bọc `<Spin />` cho toàn màn hình.

**3. API Action - Nộp đơn ứng tuyển:**
- Endpoint: `POST /jobs/:id/apply`
- Payload gửi lên: `{ coverLetter: "CV ứng tuyển từ hệ thống." }`
- Xử lý UX: Bọc trong `try-catch`. 
  + Thành công (Status 201): Bắn `message.success("Ứng tuyển thành công!");`.
  + Thất bại (Lỗi 400 - đã ứng tuyển): Bắn `message.error(error.response?.data?.message)`.

**4. Ràng Buộc UI/UX (Ant Design):**
- Nút Ứng tuyển: BẮT BUỘC có thuộc tính `loading={isApplying}`.
- Cột Phải (Bên dưới Card Skill Gap): Thêm một `<Card title="Lộ trình học đề xuất">`.
- Render Lộ trình học: 
  + Nếu `learningPath.mustLearn.length === 0`: BẮT BUỘC hiển thị `<Empty description="Bạn đã đáp ứng đủ kỹ năng, không cần bổ sung khóa học." />`.
  + Nếu có data: Sử dụng `<List dataSource={learningPath.mustLearn} renderItem={(item) => ... } />`.
  + Trong mỗi `List.Item`, hiển thị `item.courseTitle` (in đậm) và một `<Tag color="blue">{item.category}</Tag>`.