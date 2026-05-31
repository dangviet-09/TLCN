# HỢP ĐỒNG GIAO DIỆN (FRONTEND CONTRACT) - TÍNH NĂNG CHI TIẾT VIỆC LÀM & SKILL GAP

**MỤC TIÊU CỐT LÕI:**
Xây dựng trang Chi tiết Việc làm dành cho Sinh viên (`STUDENT`). Hiển thị thông tin công việc và trực quan hóa kết quả phân tích độ khớp kỹ năng (Skill Gap).

## 1. Cấu Trúc File Cần Tạo/Cập Nhật
Thư mục đích: `TLCN_GROUP_FE/src/pages/Job/`
1. `JobDetailPage.tsx`: Màn hình hiển thị chi tiết Job, thanh Progress đo lường độ phù hợp, và danh sách kỹ năng thiếu/đủ.

## 2. Ràng Buộc Kiến Trúc & API (BẮT BUỘC)
- **Thư viện UI:** BẮT BUỘC dùng Ant Design (`Card`, `Typography`, `Progress`, `Tag`, `Row`, `Col`, `Button`, `Divider`, `Spin`).
- **Gọi API song song:** Gọi 2 API cùng lúc (Lấy chi tiết Job và Lấy Skill Gap) hoặc dùng chung 1 API nếu Backend đã gộp. Theo cấu trúc hiện tại, gọi `GET /jobs/:id/skill-gap`.
- **Bảo mật:** Gắn Token Student vào Header.

## 3. Đặc tả API Endpoint & Mock JSON
- **Endpoint:** `GET /jobs/:id/skill-gap`
- **Response.data:**

```json
{
  "matchPercentage": 0,
  "skillGap": {
    "required": [
      { "level": "REQUIRED", "skillName": "ReactJS", "matched": false }
    ],
    "niceToHave": [
      { "level": "NICE_TO_HAVE", "skillName": "Node.js", "matched": false }
    ]
  }
}
```

## 4. Đặc tả UI/UX (Render Logic)
- **Khu vực 1: Thông tin tổng quan.** Tên công việc, Mức lương, Địa điểm, Hình thức.
- **Khu vực 2: Chỉ số phù hợp (Match Index).** Dùng `<Progress type="dashboard" percent={matchPercentage} />`. Nếu > 80% hiển thị màu xanh lá, 50-80% màu cam, < 50% màu đỏ.
- **Khu vực 3: Phân tích kỹ năng.** Chia 2 cột: Bắt buộc (Required) và Ưu tiên (Nice to Have).
  - Trạng thái `matched: true`: Dùng `<Tag color="success"> Tên kỹ năng (Đã có) </Tag>`.
  - Trạng thái `matched: false`: Dùng `<Tag color="error"> Tên kỹ năng (Còn thiếu) </Tag>`.
- **Khu vực 4: Nút "Ứng tuyển ngay".** (Disable nếu `matchPercentage` quá thấp - tùy chọn logic mở rộng sau này).