import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { ArrowLeft, Plus, BookOpen, Trash2 } from "lucide-react";
import {
  Button as AntButton,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Tag,
  message,
  Skeleton,
  Empty,
  Radio,
} from "antd";
import { Button } from "../../components/atoms/Button/Button";
import dayjs from "dayjs";

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

export type TLessonFieldType = "EXPLANATION" | "CODE" | "SQL_QUERY";

export interface SubmissionField {
  id: string;
  type: TLessonFieldType;
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

export type EditLessonFormValues = {
  title: string;
  order: number;
  type: "THEORY" | "TASK";
  theoryContent: string;
  taskDescription: string;
  rubric: string;
  submissionFields: SubmissionField[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGES = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#",
  "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
  "HTML", "CSS", "SQL", "Shell", "Dart",
];

// ─── Component ────────────────────────────────────────────────────────────────

const CompanyCourseEdit: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm<EditLessonFormValues>();

  // ── All hooks at the top ──────────────────────────────────────────────────

  const [course, setCourse] = useState<Course | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [showEditLessonModal, setShowEditLessonModal] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | number | null>(null);
  const [lessonForm, setLessonForm] = useState<EditLessonFormValues>({
    title: "",
    order: 1,
    type: "THEORY",
    theoryContent: "",
    taskDescription: "",
    rubric: "",
    submissionFields: [],
  });

  const [submitLessonLoading, setSubmitLessonLoading] = useState(false);
  const [deleteLessonLoading, setDeleteLessonLoading] = useState<string | number | null>(null);

  // ── Watch lesson type for dynamic form sections ───────────────────────────

  const lessonTypeValue = Form.useWatch("type", form) ?? lessonForm.type;

  // ── Fetch course (Phase 5: /courses API) ────────────────────────────────

  useEffect(() => {
    if (!courseId) return;

    const fetchCourse = async () => {
      setFetching(true);
      setFetchError(null);
      try {
        // apiClient.get<T>() unwraps { data: T } → T, so res is the Course object directly
        const res = await apiClient.get<Course>(`/courses/${courseId}`);
        setCourse({
          ...res,
          lessons: res.lessons ?? [],
        });
      } catch (err: any) {
        setFetchError(
          err?.response?.data?.message || err?.message || "Không thể tải thông tin khóa học."
        );
        message.error("Không thể tải thông tin khóa học.");
      } finally {
        setFetching(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  // ── Lesson handlers ───────────────────────────────────────────────────────

  const handleOpenLessonModal = () => {
    form.resetFields();
    setEditingLessonId(null);
    setLessonForm({
      title: "",
      order: 1,
      type: "THEORY",
      theoryContent: "",
      taskDescription: "",
      rubric: "",
      submissionFields: [],
    });
    form.setFieldValue("type", "THEORY");
    setShowEditLessonModal(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setLessonForm({
      title: lesson.title,
      order: lesson.order,
      type: lesson.type,
      theoryContent: lesson.theoryContent ?? "",
      taskDescription: lesson.taskDescription ?? "",
      rubric: lesson.rubric ?? "",
      submissionFields: lesson.submissionFields ?? [],
    });
    form.setFieldsValue({
      title: lesson.title,
      order: lesson.order,
      type: lesson.type,
      theoryContent: lesson.theoryContent ?? "",
      taskDescription: lesson.taskDescription ?? "",
      rubric: lesson.rubric ?? "",
      submissionFields: lesson.submissionFields ?? [],
    });
    setShowEditLessonModal(true);
  };

  // TRỌNG TÂM: handleUpdateLesson nhận values từ Form, dùng filter an toàn
  const handleUpdateLesson = async (values: EditLessonFormValues) => {
    if (!editingLessonId || !courseId) {
      message.warning("Không tìm thấy bài giảng để cập nhật.");
      return;
    }

    setSubmitLessonLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title: values.title.trim(),
        type: values.type,
        order: values.order ?? 1,
      };

      if (values.type === "THEORY") {
        if (values.theoryContent) {
          payload.theoryContent = values.theoryContent.trim();
        }
      } else {
        if (values.taskDescription) {
          payload.taskDescription = values.taskDescription.trim();
        }
        if (values.rubric) {
          payload.rubric = values.rubric.trim();
        }
        // Safe filter: guard against undefined
        const fields = (values.submissionFields || []) as SubmissionField[];
        const migrated: SubmissionField[] = fields.map((f) => {
          if (typeof f === "string") {
            return { id: crypto.randomUUID(), type: "EXPLANATION" as const, label: f, required: true };
          }
          return f as SubmissionField;
        });
        payload.submissionFields = migrated.filter(
          (f) => (f.label?.trim() ?? "") !== ""
        );
      }

      // PUT /courses/:courseId/lessons/:lessonId/content
      await apiClient.put(
        `/courses/${courseId}/lessons/${editingLessonId}/content`,
        payload
      );
      message.success("Cập nhật bài giảng thành công!");

      // Refresh
      const refreshed = await apiClient.get<Course>(`/courses/${courseId}`);
      setCourse({
        ...refreshed,
        lessons: refreshed.lessons ?? [],
      });

      setShowEditLessonModal(false);
      setEditingLessonId(null);
      setLessonForm({
        title: "",
        order: 1,
        type: "THEORY",
        theoryContent: "",
        taskDescription: "",
        rubric: "",
        submissionFields: [],
      });
      form.resetFields();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Cập nhật bài giảng thất bại."
      );
    } finally {
      setSubmitLessonLoading(false);
    }
  };

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

  // ── Render: Loading / Error ────────────────────────────────────────────────

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
        <AntButton onClick={() => navigate("/company/courses")}>Quay lại</AntButton>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

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
          <h1 className="text-xl font-bold text-gray-900">
            {course.title || "Chỉnh sửa khóa học"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {course.category && (
              <Tag color="blue" className="mr-1">
                {course.category}
              </Tag>
            )}
            {course.level && <Tag>{course.level}</Tag>}
            <Tag color={course.status === "PUBLISHED" ? "success" : "default"}>
              {course.status}
            </Tag>
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
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Thông tin khóa học
          </h2>
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
              <Tag color={course.status === "PUBLISHED" ? "success" : "default"}>
                {course.status}
              </Tag>
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
            <AntButton
              type="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenLessonModal}
            >
              Thêm bài giảng
            </AntButton>
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
                          {lesson.taskDescription && (
                            <p className="line-clamp-1">{lesson.taskDescription}</p>
                          )}
                          {lesson.submissionFields && lesson.submissionFields.length > 0 && (
                            <p className="text-xs">
                              <span className="text-gray-400">Trường nộp: </span>
                              {lesson.submissionFields.map((f) => {
                                const label = f.label;
                                const type = f.type;
                                const lang = f.language;
                                const tag =
                                  type === "CODE"
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
                    <AntButton
                      type="text"
                      size="small"
                      onClick={() => handleEditLesson(lesson)}
                    >
                      Sửa
                    </AntButton>
                    <AntButton
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

      {/* ── EditLessonModal overlay (replaces inline Modal) ─────────────────── */}
      {!showEditLessonModal ? null : (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl transform transition-all max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-blue-600"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                {editingLessonId ? "Chỉnh sửa bài giảng" : "Thêm bài giảng mới"}
              </h3>
              <Button
                onClick={() => {
                  setShowEditLessonModal(false);
                  setEditingLessonId(null);
                  setLessonForm({
                    title: "",
                    order: 1,
                    type: "THEORY",
                    theoryContent: "",
                    taskDescription: "",
                    rubric: "",
                    submissionFields: [],
                  });
                  form.resetFields();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </Button>
            </div>

            {/* Form */}
            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdateLesson}
            >
              {/* Title */}
              <Form.Item
                name="title"
                label="Tiêu đề bài giảng"
                rules={[{ required: true, message: "Nhập tiêu đề bài giảng." }]}
              >
                <Input placeholder="VD: Bài 1 - Giới thiệu ReactJS" />
              </Form.Item>

              {/* Order */}
              <Form.Item name="order" label="Thứ tự">
                <Input type="number" min={1} />
              </Form.Item>

              {/* Type — Radio.Group */}
              <Form.Item name="type" label="Loại bài giảng" initialValue="THEORY">
                <Radio.Group>
                  <Radio value="THEORY">Lý thuyết</Radio>
                  <Radio value="TASK">Bài tập</Radio>
                </Radio.Group>
              </Form.Item>

              {/* Theory fields — only when type === THEORY */}
              {lessonTypeValue === "THEORY" && (
                <Form.Item name="theoryContent" label="Nội dung lý thuyết">
                  <Input.TextArea
                    rows={5}
                    placeholder="Nhập nội dung lý thuyết cho bài học..."
                  />
                </Form.Item>
              )}

              {/* Task fields — only when type === TASK */}
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

                  {/* submissionFields — Form.List with shouldUpdate for language field */}
                  <Form.Item label="Trường cần nộp">
                    <Form.List name="submissionFields">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...rest }) => (
                            <Space key={key} align="start" className="mb-2 flex-wrap">
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
                                      form.setFieldValue(
                                        ["submissionFields", name, "language"],
                                        null
                                      );
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
                                <Input
                                  placeholder="VD: github_link"
                                  style={{ width: 160 }}
                                />
                              </Form.Item>

                              {/* language — only if type === CODE, via shouldUpdate (not useWatch in map) */}
                              <Form.Item
                                noStyle
                                shouldUpdate={(
                                  prev: Record<string, unknown>,
                                  curr: Record<string, unknown>
                                ) => {
                                  const prevList = (
                                    prev?.submissionFields as SubmissionField[] | undefined
                                  ) ?? [];
                                  const currList = (
                                    curr?.submissionFields as SubmissionField[] | undefined
                                  ) ?? [];
                                  return prevList[name]?.type !== currList[name]?.type;
                                }}
                              >
                                {() => {
                                  const currentType = form.getFieldValue([
                                    "submissionFields",
                                    name,
                                    "type",
                                  ]);
                                  if (currentType !== "CODE") return null;
                                  return (
                                    <Form.Item name={[name, "language"]}>
                                      <Select
                                        placeholder="Ngôn ngữ"
                                        style={{ width: 120 }}
                                        allowClear
                                      >
                                        {LANGUAGES.map((l) => (
                                          <Select.Option key={l} value={l}>
                                            {l}
                                          </Select.Option>
                                        ))}
                                      </Select>
                                    </Form.Item>
                                  );
                                }}
                              </Form.Item>

                              {/* required toggle */}
                              <Form.Item
                                {...rest}
                                name={[name, "required"]}
                                valuePropName="checked"
                                initialValue={true}
                              >
                                <Switch checkedChildren="Bắt buộc" unCheckedChildren="Tùy chọn" />
                              </Form.Item>

                              <AntButton
                                type="text"
                                danger
                                onClick={() => remove(name)}
                              >
                                Xóa
                              </AntButton>
                            </Space>
                          ))}

                          <AntButton
                            type="dashed"
                            block
                            onClick={() =>
                              add({
                                id: crypto.randomUUID(),
                                type: "EXPLANATION",
                                label: "",
                                required: true,
                              })
                            }
                          >
                            + Thêm trường nộp
                          </AntButton>
                        </>
                      )}
                    </Form.List>
                  </Form.Item>
                </>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowEditLessonModal(false);
                    setEditingLessonId(null);
                    form.resetFields();
                  }}
                >
                  Hủy
                </Button>
                <AntButton
                  htmlType="submit"
                  loading={submitLessonLoading}
                >
                  {submitLessonLoading
                    ? "Đang xử lý…"
                    : editingLessonId
                    ? "Cập nhật"
                    : "Tạo bài giảng"}
                </AntButton>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyCourseEdit;
