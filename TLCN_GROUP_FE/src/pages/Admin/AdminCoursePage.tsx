import React, { useState, useEffect, useCallback } from "react";
import { Table, Tag, Button, Space, Popconfirm, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { apiClient } from "../../services/apiClient";

interface Course {
  id: string;
  title: string;
  category?: string;
  level?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
}

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

const AdminCoursePage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  const fetchCourses = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const response = await apiClient.get<Course[]>("/courses/admin/courses", {
        params: { page, limit },
      });
      const courseList = response?.data?.data || response?.data || [];
      setCourses(courseList);
      setPagination((prev) => ({
        ...prev,
        page,
        limit,
        total: response?.data?.total || response?.total || 0,
      }));
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses(pagination.page, pagination.limit);
  }, [fetchCourses, pagination.page, pagination.limit]);

  const handleApprove = async (course: Course) => {
    try {
      await apiClient.patch(`/courses/admin/courses/${course.id}`, {
        status: "PUBLISHED",
      });
      message.success("Duyệt khóa học thành công");
      fetchCourses(pagination.page, pagination.limit);
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Đã xảy ra lỗi");
    }
  };

  const handleHide = async (course: Course) => {
    try {
      await apiClient.patch(`/courses/admin/courses/${course.id}`, {
        status: "ARCHIVED",
      });
      message.success("Ẩn khóa học thành công");
      fetchCourses(pagination.page, pagination.limit);
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Đã xảy ra lỗi");
    }
  };

  const handleDelete = async (course: Course) => {
    try {
      await apiClient.delete(`/courses/admin/courses/${course.id}`);
      message.success("Xóa khóa học thành công");
      fetchCourses(pagination.page, pagination.limit);
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Đã xảy ra lỗi");
    }
  };

  const handleTableChange = (newPagination: { current?: number; pageSize?: number }) => {
    const newPage = newPagination.current ?? pagination.page;
    const newLimit = newPagination.pageSize ?? pagination.limit;
    fetchCourses(newPage, newLimit);
  };

  const columns: ColumnsType<Course> = [
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      render: (text) => text || "—",
    },
    {
      title: "Danh mục",
      dataIndex: "category",
      key: "category",
      render: (text) => text || "—",
    },
    {
      title: "Cấp độ",
      dataIndex: "level",
      key: "level",
      render: (text) => text || "—",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: Course["status"]) => (
        <Tag color={STATUS_COLOR_MAP[status] || "default"}>
          {STATUS_LABEL_MAP[status] || status || "—"}
        </Tag>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (text) =>
        text ? new Date(text).toLocaleDateString("vi-VN") : "—",
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_, record) => (
        <Space>
          {(record.status === "DRAFT" || record.status === "ARCHIVED") && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleApprove(record)}
            >
              Duyệt
            </Button>
          )}
          {record.status === "PUBLISHED" && (
            <Button size="small" onClick={() => handleHide(record)}>
              Ẩn
            </Button>
          )}
          <Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc muốn xóa khóa học này?"
            onConfirm={() => handleDelete(record)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button danger size="small">
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 24 }}>Quản lý Khóa học</h2>
      <Table
        columns={columns}
        dataSource={courses}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} trong ${total} khóa học`,
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default AdminCoursePage;
