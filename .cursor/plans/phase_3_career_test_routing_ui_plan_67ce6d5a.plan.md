---
name: Phase 3 Career Test Routing UI Plan
overview: Lên plan nối luồng UI để Sinh viên click nút "Làm bài kiểm tra" từ trang CareerPaths, chuyển hướng sang StudentCareerTestPage tại route /career-tests/:id/take. Không tự động disable nút (vì API hiện tại không trả trường completion).
todos:
  - id: step1-import-navigate
    content: Import useNavigate from react-router-dom in CareerPaths.tsx
    status: completed
  - id: step2-add-button
    content: Add 'Làm bài kiểm tra' button inside each test Card
    status: completed
  - id: step3-wire-navigate
    content: Wire onClick with useNavigate to /career-tests/:id/take, guard for undefined id
    status: completed
  - id: step4-no-disable
    content: Verify no disable logic added (API lacks completion fields)
    status: completed
isProject: false
---

## 1. Phân tích hiện trạng

### Vị trí render danh sách bài test
Trong `CareerPaths.tsx`, danh sách Career Tests được render **trực tiếp** trong method `renderContent()` tại block case `'career-paths'` (lines 179-258). Cụ thể:

```179:258:TLCN_GROUP_FE/src/components/pages/CareerPaths/CareerPaths.tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {tests.map((test) => (
    <div key={test.id} className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ...">
      {/* Image Section - lines 183-203 */}
      {/* Content Section - lines 206-213 */}
      {/* Footer buttons - lines 227-254: "Xem chi tiết" + "Delete" */}
    </div>
  ))}
</div>
```

- **Không có component con** render danh sách - toàn bộ Card nằm inline trong `CareerPaths.tsx`.
- Các nút hiện tại: "Xem chi tiết" (navigate đến `/career-paths/${test.id}`) và "Delete" (chỉ Company thấy).

### Cấu trúc dữ liệu API
- Type `CareerTest` (types.ts, line 120-128): `{ id, title, description?, imageUrl?, companyId, createdAt, updatedAt? }` - **KHÔNG có** trường `passed`, `isCompleted`, hay `score`.
- API `getMyCareerTests()` trả về mảng `CareerTest[]` - không chứa trạng thái hoàn thành.

### Route đích
- Route `/career-tests/:id/take` đã tồn tại tại `Approutes/index.tsx` line 55, trỏ đến `StudentCareerTestPage`.

---

## 2. Các bước thi công

- [ ] **Bước 1: Import `useNavigate`** từ `react-router-dom` tại `CareerPaths.tsx` (file hiện chưa có `useNavigate`, chỉ có `useLocation`).

- [ ] **Bước 2: Thêm nút "Làm bài kiểm tra"** vào Card (trong block `tests.map`, sau nút "Xem chi tiết", trước nút "Delete"). Sử dụng `Button` variant `"primary"` hoặc `"unstyled"` với style nổi bật hơn nút "Xem chi tiết" (ví dụ: màu green-600). Bọc điều kiện `test.id ?` để tránh crash nếu `id` undefined.

- [ ] **Bước 3: Gắn `onClick` với `useNavigate`**, chuyển hướng đến `/career-tests/${test.id}/take`. Code pattern:

  ```tsx
  const navigate = useNavigate();
  // ...
  <Button
    variant="unstyled"
    onClick={() => {
      if (test.id) navigate(`/career-tests/${test.id}/take`);
    }}
    className="... bg-green-600 text-white ..."
  >
    Làm bài kiểm tra
  </Button>
  ```

- [ ] **Bước 4: Không disable nút.** Vì `CareerTest` type không có trường `passed`/`isCompleted`/`score`, nên KHÔNG thêm logic disable hay kiểm tra trạng thái hoàn thành. Nút luôn bấm được.

---

## 3. Tiêu chí nghiệm thu

- [ ] Nút "Làm bài kiểm tra" xuất hiện bên trong mỗi Card bài test, nằm cùng hàng với "Xem chi tiết" và "Delete".
- [ ] Click nút chuyển hướng đúng sang `/career-tests/${test.id}/take` và hiển thị `StudentCareerTestPage`.
- [ ] Nếu `test.id` là `undefined`, giao diện không crash (có guard `if (test.id)`).
- [ ] Giao diện không thay đổi cho các role khác (Company vẫn thấy nút Delete, Student thấy nút "Làm bài kiểm tra").