import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { Plus, Edit2, Eye, Star } from "lucide-react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Space,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { Course, CourseListResponse } from "../../types/types";

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

interface CourseFormValues {
  title: string;
  description?: string;
  category?: string;
  level?: string;
  isFeatured?: boolean;
  publishedAt?: dayjs.Dayjs;
  skills?: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "FRONTEND", label: "Frontend" },
  { value: "BACKEND", label: "Backend" },
  { value: "FULLSTACK", label: "Fullstack" },
  { value: "MOBILE", label: "Mobile" },
  { value: "AI", label: "AI / Machine Learning" },
  { value: "DEVOPS", label: "DevOps" },
  { value: "DATABASE", label: "Database" },
  { value: "OTHER", label: "Khác" },
];

const LEVELS = [
  { value: "BEGINNER", label: "Người mới bắt đầu" },
  { value: "INTERMEDIATE", label: "Trung cấp" },
  { value: "ADVANCED", label: "Nâng cao" },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "default",
  PUBLISHED: "success",
  ARCHIVED: "warning",
};

// ─── Component ─────────────────────────────────────────────────────────────────

const CompanyCourseManage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<CourseFormValues>();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  // ─── Fetch course list (Phase 5: /courses/company/owned API) ──────────────────

  const fetchCourses = async (page = 1) => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await apiClient.get<CourseListResponse>(
        `/courses/company/owned?page=${page}&limit=10`
      );
      setCourses(res.data ?? []);
      setPagination((prev) => ({ ...prev, page, total: res.total ?? 0 }));
    } catch (err: any) {
      setListError(err?.response?.data?.message || err?.message || "Không thể tải danh sách khóa học.");
      message.error("Không thể tải danh sách khóa học.");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses(1);
  }, []);

  // ─── Create course ──────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    form.resetFields();
    setCreateModalOpen(true);
  };

  const handleCreateCourse = async (values: CourseFormValues) => {
    setSubmitLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title: values.title.trim(),
        description: values.description?.trim() || null,
        category: values.category || null,
        level: values.level || null,
        isFeatured: values.isFeatured ?? false,
        skills: values.skills ?? [],
      };
      if (values.publishedAt) {
        payload.publishedAt = values.publishedAt.toISOString();
      }

      const created: Course = await apiClient.post<Course>("/courses", payload);
      const courseId = String(created.id);

      message.success("Tạo khóa học thành công!");
      setCreateModalOpen(false);
      navigate(`/company/courses/${courseId}/edit`);
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Tạo khóa học thất bại.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── Table columns ─────────────────────────────────────────────────────────

  const columns: ColumnsType<Course> = [
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      render: (title: string) => (
        <span className="font-medium text-gray-900">{title}</span>
      ),
    },
    {
      title: "Danh mục",
      dataIndex: "category",
      key: "category",
      width: 130,
      render: (cat: string | null) => (
        <Tag color="blue">{cat || "—"}</Tag>
      ),
    },
    {
      title: "Cấp độ",
      dataIndex: "level",
      key: "level",
      width: 140,
      render: (level: string | null) => {
        const colors: Record<string, string> = {
          BEGINNER: "green",
          INTERMEDIATE: "orange",
          ADVANCED: "red",
        };
        return <Tag color={colors[level ?? ""] || "default"}>{level || "—"}</Tag>;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || "default"}>
          {status === "DRAFT" ? "Bản nháp" : status === "PUBLISHED" ? "Đã xuất bản" : "Lưu trữ"}
        </Tag>
      ),
    },
    {
      title: "Nổi bật",
      dataIndex: "isFeatured",
      key: "isFeatured",
      width: 90,
      align: "center",
      render: (v: boolean) => (v ? <Star className="w-4 h-4 text-yellow-500 mx-auto" fill="currentColor" /> : null),
    },
    {
      title: "Kỹ năng",
      dataIndex: "skills",
      key: "skills",
      width: 200,
      render: (skills: string[] | null) =>
        skills && skills.length > 0 ? (
          <>
            {skills.slice(0, 3).map((skill) => (
              <Tag key={skill} color="purple">{skill}</Tag>
            ))}
            {skills.length > 3 && (
              <Tag>+{skills.length - 3}</Tag>
            )}
          </>
        ) : <Tag>—</Tag>,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (d: string) => dayjs(d).format("DD/MM/YYYY"),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 160,
      render: (_: unknown, record: Course) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<Edit2 className="w-4 h-4" />}
            onClick={() => navigate(`/company/courses/${record.id}/edit`)}
          >
            Sửa
          </Button>
          <Button
            type="text"
            size="small"
            icon={<Eye className="w-4 h-4" />}
            onClick={() => navigate(`/courses/${record.id}`)}
          >
            Xem
          </Button>
        </Space>
      ),
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quản lý Khóa học</h1>
          <p className="text-sm text-gray-500 mt-0.5">Danh sách khóa học của công ty bạn</p>
        </div>
        <Button
          type="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreate}
          size="large"
        >
          Tạo khóa học mới
        </Button>
      </div>

      {/* Table */}
      <div className="px-6 py-6">
        {listError ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-3">{listError}</p>
            <Button onClick={() => fetchCourses(1)}>Thử lại</Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <Table
              columns={columns}
              dataSource={courses}
              rowKey="id"
              loading={listLoading}
              pagination={{
                current: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                onChange: (p) => fetchCourses(p),
                showSizeChanger: false,
                showTotal: (total) => `Tổng ${total} khóa học`,
              }}
              locale={{ emptyText: "Chưa có khóa học nào." }}
            />
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal
        title="Tạo khóa học mới"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateCourse}
          className="mt-4"
        >
          <Form.Item
            name="title"
            label="Tiêu đề khóa học"
            rules={[{ required: true, message: "Vui lòng nhập tiêu đề khóa học." }]}
          >
            <Input placeholder="VD: ReactJS Thực chiến từ Zero đến Hero" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn về khóa học..." />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="category" label="Danh mục">
              <Select placeholder="Chọn danh mục" allowClear>
                {CATEGORIES.map((c) => (
                  <Select.Option key={c.value} value={c.value}>{c.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="level" label="Cấp độ">
              <Select placeholder="Chọn cấp độ" allowClear>
                {LEVELS.map((l) => (
                  <Select.Option key={l.value} value={l.value}>{l.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="publishedAt" label="Ngày xuất bản (tùy chọn)">
              <DatePicker className="w-full" placeholder="Chọn ngày" />
            </Form.Item>

            <Form.Item
              name="isFeatured"
              label="Khóa học nổi bật"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>

          <Form.Item
            name="skills"
            label="Kỹ năng cốt lõi"
            rules={[{ required: true, message: "Bắt buộc nhập ít nhất 1 kỹ năng!" }]}
            normalize={(value: any, prevValue: any) => {
              if (!value) return [];
              const arrayValue = Array.isArray(value) ? value : [value];

              const seen = new Set<string>();
              const newValue = arrayValue.filter((item) => {
                if (typeof item !== 'string') return false;
                const cleanItem = item.trim();
                const lower = cleanItem.toLowerCase();
                if (!lower || seen.has(lower)) return false;
                seen.add(lower);
                return true;
              }).map((item) => item.trim());

              // Chong crash Ant Design: Giu nguyen tham chieu bo nho neu mang khong thay doi
              const prev = Array.isArray(prevValue) ? prevValue : [];
              if (prev.length === newValue.length && prev.every((val, i) => val === newValue[i])) {
                return prev;
              }
              return newValue;
            }}
          >
            <Select
              mode="tags"
              style={{ width: "100%" }}
              placeholder="Nhập kỹ năng và ấn Enter (VD: ReactJS, NodeJS)..."
              tokenSeparators={[","]}
              onInputKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const inputElement = e.currentTarget as HTMLInputElement;
                  const inputValue = inputElement.value.trim().toLowerCase();
                  const currentSkills = form.getFieldValue('skills') || [];

                  if (currentSkills.some((skill: string) => skill.trim().toLowerCase() === inputValue)) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Xoa text hien thi tren o input de tranh bi ket chu
                    inputElement.value = '';
                    const event = new Event('input', { bubbles: true });
                    inputElement.dispatchEvent(event);
                  }
                }
              }}
            />
          </Form.Item>

          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitLoading}>
              {submitLoading ? "Đang tạo…" : "Tạo khóa học"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default CompanyCourseManage;
