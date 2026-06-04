---
name: AdminCoursePage implementation
overview: Implement a full-featured Admin Course Management page in `AdminCoursePage.tsx` with an antd Table, CRUD operations, and proper TypeScript typing.
todos:
  - id: admin-course-interface
    content: Add Course interface and imports
    status: completed
  - id: admin-course-state
    content: Initialize state (courses, loading, pagination)
    status: completed
  - id: admin-course-fetch
    content: Implement fetchCourses API call in useEffect
    status: completed
  - id: admin-course-columns
    content: Define columns (title, category, level, status, createdAt, actions)
    status: completed
  - id: admin-course-actions
    content: Implement action handlers (approve, hide, delete) with Popconfirm
    status: completed
  - id: admin-course-render
    content: Render page with Table and pagination
    status: completed
isProject: false
---

## Plan: Implement `AdminCoursePage.tsx` — Admin Course Management

### Target File
`TLCN_GROUP_FE/src/pages/Admin/AdminCoursePage.tsx`

### Step 1: Add interface declaration at top of file

Define the required `Course` interface at the top (above the component):
```typescript
interface Course {
  id: string;
  title: string;
  category?: string;
  level?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
}
```

### Step 2: Add imports

- React: `useState`, `useEffect`, `useCallback` from `"react"`
- antd: `Table`, `Tag`, `Button`, `Space`, `Popconfirm`, `message` from `"antd"`
- `ColumnsType` from `"antd/es/table"` for typed column definitions
- `apiClient` from `"../../services/apiClient"`

### Step 3: Initialize state

```typescript
const [courses, setCourses] = useState<Course[]>([]);
const [loading, setLoading] = useState(false);
const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
```

### Step 4: Implement `fetchCourses` function (called in `useEffect`)

- Call `apiClient.get<Course[]>(...)` with the GET endpoint
- Populate `courses` and `pagination.total` from response
- **Safe data extraction (Anti-Crash):** Use double-fallback to prevent undefined array crash:

  ```typescript
  const courseList = response?.data?.data || response?.data || [];
  setCourses(courseList);
  ```
- Use error guard: `error?.response?.data?.message || "Đã xảy ra lỗi"`

### Step 5: Define `columns: ColumnsType<Course>`

| Column | Key | Render logic |
|---|---|---|
| Tiêu đề | `title` | `text \|\| "—"` |
| Danh mục | `category` | `text \|\| "—"` |
| Cấp độ | `level` | `text \|\| "—"` |
| Trạng thái | `status` | Tag with color map: PUBLISHED→`green`, DRAFT→`default`, ARCHIVED→`warning` |
| Ngày tạo | `createdAt` | **Anti-Crash Date parse:** `text ? new Date(text).toLocaleDateString('vi-VN') : "—"` |
| Hành động | `actions` | Conditional buttons + Popconfirm Delete (see Step 6) |

### Step 6: Implement action handlers

- **`handleApprove(course)`** — calls `PATCH /courses/admin/courses/:id` with `{ status: "PUBLISHED" }`, refreshes list on success, shows `message.success`
- **`handleHide(course)`** — calls `PATCH` with `{ status: "ARCHIVED" }`, refreshes on success
- **`handleDelete(course)`** — calls `DELETE /courses/admin/courses/:id`, refreshes on success

All action buttons wrapped in `<Space>`. The Delete button is inside `<Popconfirm>` with red styling.

### Step 7: Render the page

Return a `div` (or `Card`) containing:
- A page title heading
- The `<Table>` with `dataSource`, `columns`, `rowKey="id"`, `loading`, and pagination config
- **Pagination onChange (Anti-Crash):** Must wire `onChange` in the Table's pagination prop so page/size changes call `fetchCourses(newPagination.current)` to re-fetch the correct page.