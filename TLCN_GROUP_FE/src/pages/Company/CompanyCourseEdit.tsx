import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { ArrowLeft, Plus, BookOpen, Trash2, Pencil } from "lucide-react";
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Tag,
  message,
  Skeleton,
  Empty,
} from "antd";
import type { SelectProps } from "antd";
import dayjs from "dayjs";

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

export type SubmissionFieldType = "EXPLANATION" | "CODE" | "SQL_QUERY";

export interface SubmissionField {
  id: string;
  type: SubmissionFieldType;
  label: string;
  language?: string | null;
  required: boolean;
}

export interface Lesson {
  id: number | string;
  title: string;
  type: "THEORY" | "TASK";
  theoryContent: string | null;
  taskDescription: string | null;
  submissionFields: SubmissionField[] | null;
  rubric: string | null;
  order: number;
  careerPathId: number | string;
}

interface Course {
  id: number | string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  status: string;
  isFeatured: boolean;
  publishedAt: string | null;
  lessons: Lesson[];
}

interface LessonFormValues {
  title: string;
  type: "THEORY" | "TASK";
  theoryContent?: string;
  taskDescription?: string;
  submissionFields?: SubmissionField[];
  rubric?: string;
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

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Bản nháp" },
  { value: "PUBLISHED", label: "Đã xuất bản" },
  { value: "ARCHIVED", label: "Lưu trữ" },
];

const LANGUAGES = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#",
  "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
  "HTML", "CSS", "SQL", "Shell", "Dart",
];

// ─── Component ─────────────────────────────────────────────────────────────────

const CompanyCourseEdit: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm<LessonFormValues>();

  const [course, setCourse] = useState<Course | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonType, setLessonType] = useState<"THEORY" | "TASK">("THEORY");
  const [submitLessonLoading, setSubmitLessonLoading] = useState(false);
  const [deleteLessonLoading, setDeleteLessonLoading] = useState<string | number | null>(null);

  // ─── Fetch course ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!courseId) return;

    const fetchCourse = async () => {
      setFetching(true);
      setFetchError(null);
      try {
        const res = await apiClient.get<Course>(`/career-paths/${courseId}`);
        // unwrap ApiResponse wrapper
        const payload = (res as unknown as ApiResponse<Course>).data ?? res;
        const loaded: Course = {
          ...(payload as Course),
          lessons: (payload as Course).lessons ?? [],
        };
        setCourse(loaded);
      } catch (err: any) {
        setFetchError(err?.response?.data?.message || err?.message || "Không thể tải thông tin khóa học.");
      } finally {
        setFetching(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  // ─── Watch lesson type for dynamic form ────────────────────────────────────

  const lessonTypeValue = Form.useWatch("type", form) ?? lessonType;

  // ─── Create lesson ─────────────────────────────────────────────────────────

  const handleOpenLessonModal = () => {
    form.resetFields();
    setEditingLesson(null);
    setLessonType("THEORY");
    form.setFieldValue("type", "THEORY");
    setLessonModalOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonType(lesson.type);
    form.setFieldsValue({
      title: lesson.title,
      type: lesson.type,
      theoryContent: lesson.theoryContent ?? "",
      taskDescription: lesson.taskDescription ?? "",
      rubric: lesson.rubric ?? "",
      submissionFields: lesson.submissionFields ?? [],
    });
    setLessonModalOpen(true);
  };

  const handleLessonTypeChange = (val: "THEORY" | "TASK") => {
    setLessonType(val);
    form.setFieldValue("type", val);
  };

  const handleSubmitLesson = async (values: LessonFormValues) => {
    if (!courseId) return;
    setSubmitLessonLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title: values.title.trim(),
        type: values.type,
      };

      if (values.type === "THEORY") {
        if (values.theoryContent) {
          payload.theoryContent = values.theoryContent.trim();
        }
      } else if (values.type === "TASK") {
        if (values.taskDescription) {
          payload.taskDescription = values.taskDescription.trim();
        }
        if (values.rubric) {
          payload.rubric = values.rubric.trim();
        }
        const raw = values.submissionFields ?? [];
        const migrated = raw.map((f) => {
          if (typeof f === "string") {
            return {
              id: crypto.randomUUID(),
              type: "EXPLANATION" as const,
              label: f,
              required: true,
            };
          }
          return f as SubmissionField;
        });
        payload.submissionFields = migrated.filter((f) => f.label?.trim() !== "");
      }

      if (editingLesson) {
        await apiClient.put(`/courses/${courseId}/lessons/${editingLesson.id}`, payload);
        message.success("Cập nhật bài giảng thành công!");
      } else {
        await apiClient.post(`/courses/${courseId}/lessons`, payload);
        message.success("Tạo bài giảng thành công!");
      }

      // Refresh course data
      const refreshed = await apiClient.get<Course>(`/career-paths/${courseId}`);
      const refreshedPayload = (refreshed as unknown as ApiResponse<Course>).data ?? refreshed;
      setCourse({ ...(refreshedPayload as Course), lessons: (refreshedPayload as Course).lessons ?? [] });

      setLessonModalOpen(false);
      setEditingLesson(null);
      form.resetFields();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || (editingLesson ? "Cập nhật bài giảng thất bại." : "Tạo bài giảng thất bại."));
    } finally {
      setSubmitLessonLoading(false);
    }
  };

  // ─── Delete lesson ──────────────────────────────────────────────────────────

  const handleDeleteLesson = async (lessonId: string | number) => {
    if (!courseId) return;
    setDeleteLessonLoading(lessonId);
    try {
      await apiClient.delete(`/courses/${courseId}/lessons/${lessonId}`);
      message.success("Xóa bài giảng thành công.");
      setCourse((prev) =>
        prev
          ? { ...prev, lessons: prev.lessons.filter((l) => l.id !== lessonId) }
          : prev
      );
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Xóa bài giảng thất bại.");
    } finally {
      setDeleteLessonLoading(null);
    }
  };

  // ─── Render: Loading / Error ────────────────────────────────────────────────

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-8 max-w-4xl mx-auto">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (fetchError || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{fetchError || "Không tìm thấy khóa học."}</p>
        <Button onClick={() => navigate("/company/courses")}>Quay lại</Button>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/company/courses")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{course.title || "Chỉnh sửa khóa học"}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {course.category && <Tag color="blue" className="mr-1">{course.category}</Tag>}
            {course.level && <Tag>{course.level}</Tag>}
            <Tag color={course.status === "PUBLISHED" ? "success" : "default"}>{course.status}</Tag>
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Khóa học nổi bật</span>
          <Switch checked={course.isFeatured} disabled />
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        {/* Course meta info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Thông tin khóa học</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Danh mục: </span>
              <span className="font-medium">{course.category || "—"}</span>
            </div>
            <div>
              <span className="text-gray-500">Cấp độ: </span>
              <span className="font-medium">{course.level || "—"}</span>
            </div>
            <div>
              <span className="text-gray-500">Trạng thái: </span>
              <Tag color={course.status === "PUBLISHED" ? "success" : "default"}>{course.status}</Tag>
            </div>
            <div>
              <span className="text-gray-500">Ngày xuất bản: </span>
              <span className="font-medium">
                {course.publishedAt ? dayjs(course.publishedAt).format("DD/MM/YYYY") : "—"}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Mô tả: </span>
              <span className="font-medium">{course.description || "—"}</span>
            </div>
          </div>
        </div>

        {/* Lessons section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Danh sách bài giảng ({course.lessons?.length ?? 0})
            </h2>
            <Button
              type="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenLessonModal}
            >
              Thêm bài giảng
            </Button>
          </div>

          {!course.lessons || course.lessons.length === 0 ? (
            <Empty description="Chưa có bài giảng nào. Nhấn 'Thêm bài giảng' để bắt đầu." />
          ) : (
            <div className="space-y-3">
              {course.lessons
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                      {lesson.order || idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{lesson.title}</span>
                        <Tag color={lesson.type === "THEORY" ? "blue" : "orange"}>
                          {lesson.type === "THEORY" ? "Lý thuyết" : "Bài tập"}
                        </Tag>
                      </div>
                      {lesson.type === "THEORY" && lesson.theoryContent && (
                        <p className="text-sm text-gray-500 line-clamp-2">{lesson.theoryContent}</p>
                      )}
                      {lesson.type === "TASK" && (
                        <div className="text-sm text-gray-500 space-y-1">
                          {lesson.taskDescription && <p className="line-clamp-1">{lesson.taskDescription}</p>}
                          {lesson.submissionFields && lesson.submissionFields.length > 0 && (
                            <p className="text-xs">
                              <span className="text-gray-400">Trường nộp: </span>
                              {lesson.submissionFields.map((f) => {
                                const label = typeof f === "string" ? f : f.label;
                                const type = typeof f === "string" ? null : f.type;
                                const lang = typeof f === "string" ? null : f.language;
                                const tag = type === "CODE"
                                  ? `${lang ?? "code"}`
                                  : type === "SQL_QUERY"
                                  ? "SQL"
                                  : null;
                                return `${label}${tag ? ` (${tag})` : ""}`;
                              }).join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      type="text"
                      size="small"
                      icon={<Pencil className="w-4 h-4" />}
                      onClick={() => handleEditLesson(lesson)}
                    />
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<Trash2 className="w-4 h-4" />}
                      loading={deleteLessonLoading === lesson.id}
                      onClick={() => handleDeleteLesson(lesson.id)}
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Lesson Modal (Create / Edit) */}
      <Modal
        title={editingLesson ? "Chỉnh sửa bài giảng" : "Thêm bài giảng mới"}
        open={lessonModalOpen}
        onCancel={() => {
          setLessonModalOpen(false);
          setEditingLesson(null);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={640}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitLesson}
          className="mt-4"
          initialValues={{ type: "THEORY", submissionFields: [] }}
        >
          {/* Lesson title */}
          <Form.Item
            name="title"
            label="Tiêu đề bài giảng"
            rules={[{ required: true, message: "Vui lòng nhập tiêu đề bài giảng." }]}
          >
            <Input placeholder="VD: Bài 1 - Giới thiệu ReactJS" />
          </Form.Item>

          {/* Lesson type */}
          <Form.Item
            name="type"
            label="Loại bài giảng"
            rules={[{ required: true, message: "Vui lòng chọn loại bài giảng." }]}
          >
            <Select
              placeholder="Chọn loại"
              onChange={(val) => handleLessonTypeChange(val as "THEORY" | "TASK")}
            >
              <Select.Option value="THEORY">Lý thuyết (THEORY)</Select.Option>
              <Select.Option value="TASK">Bài tập (TASK)</Select.Option>
            </Select>
          </Form.Item>

          {/* Theory fields — shown when type === THEORY */}
          {lessonTypeValue === "THEORY" && (
            <Form.Item name="theoryContent" label="Nội dung lý thuyết">
              <Input.TextArea
                rows={5}
                placeholder="Nhập nội dung lý thuyết cho bài học..."
              />
            </Form.Item>
          )}

          {/* Task fields — shown when type === TASK */}
          {lessonTypeValue === "TASK" && (
            <>
              <Form.Item name="taskDescription" label="Mô tả bài tập">
                <Input.TextArea
                  rows={4}
                  placeholder="Mô tả chi tiết bài tập mà sinh viên cần hoàn thành..."
                />
              </Form.Item>

              <Form.Item name="rubric" label="Rubric (tiêu chí chấm điểm)">
                <Input.TextArea
                  rows={3}
                  placeholder="VD: Hoàn thành đúng: 5đ, Code sạch: 5đ"
                />
              </Form.Item>

              <Form.Item
                name="submissionFields"
                label="Trường cần nộp"
                extra="Thêm từng trường cùng loại (Giải thích / Code / SQL)"
              >
                <Form.List name="submissionFields">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...rest }) => {
                        const fieldType = Form.useWatch({
                          name: [name, "type"],
                          form,
                        });

                        return (
                          <Space key={key} align="start" className="mb-2">
                            {/* type selector */}
                            <Form.Item
                              {...rest}
                              name={[name, "type"]}
                              initialValue="EXPLANATION"
                            >
                              <Select
                                style={{ width: 140 }}
                                onChange={(val) => {
                                  if (val !== "CODE") {
                                    form.setFieldValue(["submissionFields", name, "language"], null);
                                  }
                                }}
                              >
                                <Select.Option value="EXPLANATION">Giải thích</Select.Option>
                                <Select.Option value="CODE">Code</Select.Option>
                                <Select.Option value="SQL_QUERY">SQL</Select.Option>
                              </Select>
                            </Form.Item>

                            {/* label */}
                            <Form.Item
                              {...rest}
                              name={[name, "label"]}
                              rules={[{ required: true, message: "Nhập tên trường" }]}
                            >
                              <Input placeholder="VD: github_link" style={{ width: 160 }} />
                            </Form.Item>

                            {/* language — only if type === CODE */}
                            {fieldType === "CODE" && (
                              <Form.Item {...rest} name={[name, "language"]}>
                                <Select
                                  placeholder="Ngôn ngữ"
                                  style={{ width: 120 }}
                                  allowClear
                                >
                                  {LANGUAGES.map((l) => (
                                    <Select.Option key={l} value={l}>{l}</Select.Option>
                                  ))}
                                </Select>
                              </Form.Item>
                            )}

                            {/* required toggle */}
                            <Form.Item
                              {...rest}
                              name={[name, "required"]}
                              valuePropName="checked"
                              initialValue={true}
                            >
                              <Switch checkedChildren="Bắt buộc" unCheckedChildren="Tùy chọn" />
                            </Form.Item>

                            <Button
                              type="text"
                              danger
                              icon={<Trash2 className="w-4 h-4" />}
                              onClick={() => remove(name)}
                            />
                          </Space>
                        );
                      })}

                      <Button
                        type="dashed"
                        onClick={() =>
                          add({ id: crypto.randomUUID(), type: "EXPLANATION", label: "", required: true })
                        }
                        block
                        icon={<Plus className="w-4 h-4" />}
                        className="mt-2"
                      >
                        Thêm trường nộp
                      </Button>
                    </>
                  )}
                </Form.List>
              </Form.Item>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              onClick={() => {
                setLessonModalOpen(false);
                form.resetFields();
              }}
            >
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={submitLessonLoading}>
              {submitLessonLoading
                ? (editingLesson ? "Đang cập nhật…" : "Đang tạo…")
                : (editingLesson ? "Cập nhật bài giảng" : "Tạo bài giảng")}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default CompanyCourseEdit;
