import React, { useState, useEffect, useCallback } from "react";
import { Table, Tag, Button, Space, Popconfirm, message, Drawer, Spin, Empty } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { apiClient } from "../../services/apiClient";
import "react-quill-new/dist/quill.snow.css"; // Bắt buộc để render HTML Bài học

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

  // State cho Drawer Xem trước
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewCourse, setPreviewCourse] = useState<any>(null);

  const handlePreview = async (courseId: string) => {
    setPreviewVisible(true);
    setPreviewLoading(true);
    setPreviewCourse(null);
    try {
      const res = await apiClient.get(`/courses/${courseId}`);
      // Bóc tách dữ liệu an toàn
      const data = (res as any).data?.data || (res as any).data || res;
      setPreviewCourse(data);
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Lỗi tải chi tiết khóa học");
      setPreviewVisible(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const fetchCourses = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const response = await apiClient.get("/courses/admin/courses", {
        params: { page, limit },
      });
      const courseList = (response as any)?.data?.data || (response as any)?.data || [];
      setCourses(courseList);
      setPagination((prev) => ({
        ...prev,
        page,
        limit,
        total: (response as any)?.data?.total || (response as any)?.total || 0,
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
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record.id)}
          >
            Xem
          </Button>
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

      {/* Drawer Xem trước Khóa học (Read-only) */}
      <Drawer
        title={<span className="font-bold text-lg">Xem trước: {previewCourse?.title}</span>}
        width={850}
        onClose={() => setPreviewVisible(false)}
        open={previewVisible}
        destroyOnClose
      >
        {previewLoading ? (
          <div className="flex justify-center items-center h-40"><Spin size="large" /></div>
        ) : previewCourse ? (
          <div className="space-y-6">
            {/* Thông tin chung */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p><strong>Danh mục:</strong> {previewCourse.category || "—"}</p>
              <p><strong>Cấp độ:</strong> {previewCourse.level || "—"}</p>
              <p><strong>Mô tả:</strong> {previewCourse.description || "—"}</p>
            </div>

            {/* Danh sách Bài học */}
            <h3 className="text-xl font-bold border-b pb-2 mt-6">Nội dung Bài học</h3>
            {previewCourse.lessons && previewCourse.lessons.length > 0 ? (
              previewCourse.lessons.map((lesson: any, index: number) => (
                <div key={lesson.id} className="border border-gray-300 rounded-lg p-5 mb-5 shadow-sm">
                  <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
                    Bài {index + 1}: {lesson.title}
                    <Tag color={lesson.type === 'THEORY' ? 'blue' : 'orange'}>
                      {lesson.type === 'THEORY' ? 'Lý thuyết' : 'Bài tập'}
                    </Tag>
                  </h4>

                  {/* Môi trường render bọc thép của ReactQuill */}
                  <div className="ql-snow bg-gray-50 p-4 rounded-md">
                    <div
                      className="ql-editor p-0 text-gray-800"
                      dangerouslySetInnerHTML={{
                        __html: lesson.theoryContent || lesson.taskDescription || '<p class="text-gray-400 italic">Không có nội dung</p>'
                      }}
                    />
                  </div>

                  {/* Hiển thị thêm Rubric nếu là bài tập */}
                  {lesson.type === 'TASK' && lesson.rubric && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <strong className="text-blue-800">Tiêu chí chấm điểm (Rubric):</strong>
                      <p className="whitespace-pre-wrap mt-1 text-sm">{lesson.rubric}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <Empty description="Khóa học này chưa có bài học nào" />
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

export default AdminCoursePage;
