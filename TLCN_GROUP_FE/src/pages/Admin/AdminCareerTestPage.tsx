import React, { useState, useEffect } from "react";
import { Table, Button, Popconfirm, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { apiClient } from "../../services/apiClient";

// ============== Interfaces ==============
interface CareerTestAdminItem {
  id: string;
  title: string;
  description?: string;
  questions?: any[];
  companyId: string | null;
  createdAt: string;
}

interface PaginatedCareerTestResponse {
  data: CareerTestAdminItem[];
  page: number;
  limit: number;
  total: number;
}

// ============== Component ==============
const AdminCareerTestPage: React.FC = () => {
  const [dataSource, setDataSource] = useState<CareerTestAdminItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // ============== Fetch ==============
  const fetchCareerTests = async (page: number = 1) => {
    try {
      setLoading(true);
      const res = (await apiClient.get<PaginatedCareerTestResponse>(
        `/career-tests?page=${page}&limit=${pagination.pageSize}`
      )) as PaginatedCareerTestResponse;

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
    } catch {
      message.error("Không thể tải danh sách bài test.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCareerTests(1);
  }, []);

  // ============== Action Handlers ==============
  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/career-tests/${id}`);
      message.success("Đã xóa bài test.");
      fetchCareerTests(pagination.current);
    } catch {
      message.error("Không thể xóa bài test.");
    }
  };

  // ============== Table Columns ==============
  const columns: ColumnsType<CareerTestAdminItem> = [
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      render: (text: string) => text || "—",
    },
    {
      title: "Company ID",
      key: "companyId",
      render: (_, record) => record.companyId || "Hệ thống",
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => (date ? new Date(date).toLocaleDateString("vi-VN") : "—"),
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_, record) => (
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
      ),
    },
  ];

  // ============== Pagination Handler ==============
  const handleTableChange = (pag: { current?: number; pageSize?: number }) => {
    const newPage = pag.current ?? 1;
    fetchCareerTests(newPage);
  };

  // ============== Render ==============
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
};

export default AdminCareerTestPage;
