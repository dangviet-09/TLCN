# Plan: Xây dựng giao diện Quản lý Bài test Định hướng cho Admin

## Mục tiêu

Thay thế component rỗng `AdminCareerTestPage.tsx` bằng giao diện quản lý toàn bộ bài test định hướng trên hệ thống, sử dụng Ant Design Table, với khả năng phân trang, duyệt/ẩn trạng thái, và xóa bài test.

---

## 1. Khai báo Interface

**File:** `TLCN_GROUP_FE/src/pages/Admin/AdminCareerTestPage.tsx`

Định nghĩa interface `CareerTestAdminItem` chứa cấu trúc dữ liệu bài test từ phía backend trả về cho admin:

```typescript
interface CompanyRef {
  id: string;
  companyName: string;
}

interface CareerTestAdminItem {
  id: string;
  title: string;
  company: CompanyRef;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  createdAt: string;
}
```

Khai báo interface cho response phân trang:

```typescript
interface PaginatedCareerTestResponse {
  data: CareerTestAdminItem[];
  page: number;
  limit: number;
  total: number;
}
```

---

## 2. Cấu hình State

**File:** `TLCN_GROUP_FE/src/pages/Admin/AdminCareerTestPage.tsx`

Khai báo các state cần thiết cho Table:

```typescript
const [dataSource, setDataSource] = useState<CareerTestAdminItem[]>([]);
const [loading, setLoading] = useState(false);
const [pagination, setPagination] = useState({
  current: 1,
  pageSize: 10,
  total: 0,
});
```

---

## 3. Anti-Crash Fetching — Hàm `fetchCareerTests`

**File:** `TLCN_GROUP_FE/src/pages/Admin/AdminCareerTestPage.tsx`

Sử dụng `apiClient` từ `../../services/apiClient` để tự động bọc Token xác thực. Cơ chế bảo vệ kép bắt buộc:

```typescript
const fetchCareerTests = async (page: number = 1) => {
  try {
    setLoading(true);
    const res = await apiClient.get<PaginatedCareerTestResponse>(
      `/career-tests?page=${page}&limit=${pagination.pageSize}`
    );

    // Lớp bảo vệ 1: Trích xuất data từ nhiều dạng response backend
    const rawData = (res as any)?.data?.data
      || (res as any)?.data
      || res
      || [];

    // Lớp bảo vệ 2: Ép kiểu mảng trước khi set state
    const safeArray = Array.isArray(rawData) ? rawData : [];

    setDataSource(safeArray);
    setPagination(prev => ({
      ...prev,
      current: (res as any)?.page ?? page,
      total: (res as any)?.data?.total || (res as any)?.total || 0,
    }));
  } catch (error) {
    message.error("Không thể tải danh sách bài test.");
  } finally {
    setLoading(false);
  }
};
```

Gọi `useEffect` để fetch lần đầu khi component mount:

```typescript
useEffect(() => {
  fetchCareerTests(1);
}, []);
```

---

## 4. Các hàm xử lý Hành động

**File:** `TLCN_GROUP_FE/src/pages/Admin/AdminCareerTestPage.tsx`

### 4.1 Hàm xử lý duyệt bài test (PATCH -> PUBLISHED)

```typescript
const handleApprove = async (id: string) => {
  try {
    await apiClient.patch(`/career-tests/${id}/status`, { status: "PUBLISHED" });
    message.success("Đã duyệt bài test.");
    fetchCareerTests(pagination.current);
  } catch {
    message.error("Không thể duyệt bài test.");
  }
};
```

### 4.2 Hàm xử lý ẩn bài test (PATCH -> ARCHIVED)

```typescript
const handleHide = async (id: string) => {
  try {
    await apiClient.patch(`/career-tests/${id}/status`, { status: "ARCHIVED" });
    message.success("Đã ẩn bài test.");
    fetchCareerTests(pagination.current);
  } catch {
    message.error("Không thể ẩn bài test.");
  }
};
```

### 4.3 Hàm xử lý xóa bài test (DELETE)

```typescript
const handleDelete = async (id: string) => {
  try {
    await apiClient.delete(`/career-tests/${id}`);
    message.success("Đã xóa bài test.");
    fetchCareerTests(pagination.current);
  } catch {
    message.error("Không thể xóa bài test.");
  }
};
```

---

## 5. Map màu Tag cho Trạng thái

**File:** `TLCN_GROUP_FE/src/pages/Admin/AdminCareerTestPage.tsx`

Tuân thủ convention đã có trong `AdminCoursePage.tsx`:

```typescript
const STATUS_COLOR_MAP: Record<string, string> = {
  PUBLISHED: "green",
  DRAFT: "default",
  ARCHIVED: "warning",
};

const STATUS_LABEL_MAP: Record<string, string> = {
  PUBLISHED: "Đã duyệt",
  DRAFT: "Nháp",
  ARCHIVED: "Đã ẩn",
};
```

---

## 6. Định nghĩa Columns cho Ant Design Table

**File:** `TLCN_GROUP_FE/src/pages/Admin/AdminCareerTestPage.tsx`

```typescript
import { Table, Tag, Button, Space, Popconfirm, message } from "antd";
import type { ColumnsType } from "antd/es/table";

const columns: ColumnsType<CareerTestAdminItem> = [
  {
    title: "Tiêu đề",
    dataIndex: "title",
    key: "title",
    render: (text: string) => text || "—",
  },
  {
    title: "Tên Công ty",
    key: "company",
    render: (_, record) => record.company?.companyName || "—",
  },
  {
    title: "Trạng thái",
    dataIndex: "status",
    key: "status",
    render: (status: CareerTestAdminItem["status"]) => (
      <Tag color={STATUS_COLOR_MAP[status] || "default"}>
        {STATUS_LABEL_MAP[status] || status}
      </Tag>
    ),
  },
  {
    title: "Ngày tạo",
    dataIndex: "createdAt",
    key: "createdAt",
    render: (date: string) => date ? new Date(date).toLocaleDateString("vi-VN") : "—",
  },
  {
    title: "Hành động",
    key: "actions",
    render: (_, record) => (
      <Space size="small">
        <Button
          type="link"
          size="small"
          onClick={() => handleApprove(record.id)}
          disabled={record.status === "PUBLISHED"}
        >
          Duyệt
        </Button>
        <Button
          type="link"
          size="small"
          onClick={() => handleHide(record.id)}
          disabled={record.status === "ARCHIVED"}
        >
          Ẩn
        </Button>
        <Popconfirm
          title="Xác nhận xóa"
          description="Bạn có chắc muốn xóa bài test này?"
          onConfirm={() => handleDelete(record.id)}
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button type="link" danger size="small">
            Xóa
          </Button>
        </Popconfirm>
      </Space>
    ),
  },
];
```

---

## 7. Render Ant Design Table với Pagination

**File:** `TLCN_GROUP_FE/src/pages/Admin/AdminCareerTestPage.tsx`

```typescript
const handleTableChange = (pag: { current?: number; pageSize?: number }) => {
  const newPage = pag.current ?? 1;
  fetchCareerTests(newPage);
};

return (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-6">Quản lý Bài test Định hướng</h2>
    <Table
      columns={columns}
      dataSource={Array.isArray(dataSource) ? dataSource : []}
      rowKey="id"
      loading={loading}
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} trong ${total} bài test`,
      }}
      onChange={handleTableChange}
    />
  </div>
);
```

---

## 8. Import đầy đủ cuối cùng

**File:** `TLCN_GROUP_FE/src/pages/Admin/AdminCareerTestPage.tsx`

```typescript
import React, { useState, useEffect } from "react";
import { Table, Tag, Button, Space, Popconfirm, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { apiClient } from "../../services/apiClient";
```

---

## Tóm tắt thứ tự thực thi

1. Thêm import (`react`, `antd`, `apiClient`)
2. Định nghĩa `interface CareerTestAdminItem` và `PaginatedCareerTestResponse`
3. Thêm `STATUS_COLOR_MAP` và `STATUS_LABEL_MAP`
4. Khai báo state: `dataSource`, `loading`, `pagination`
5. Viết `fetchCareerTests` với 2 lớp bảo vệ anti-crash
6. Viết `useEffect` gọi fetch lần đầu
7. Viết `handleApprove`, `handleHide`, `handleDelete`
8. Viết `handleTableChange` cho pagination
9. Định nghĩa `columns` cho Table
10. Render `<Table>` với `dataSource`, `pagination`, `onChange`
