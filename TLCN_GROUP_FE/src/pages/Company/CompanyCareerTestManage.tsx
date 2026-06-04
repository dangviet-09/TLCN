import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../services/apiClient";
import {
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
} from "lucide-react";
import {
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  message,
  Skeleton,
  Button,
  Drawer,
  Tag,
  Table,
} from "antd";

// ─── TypeScript Interfaces ──────────────────────────────────────────────────────

type QuestionType = "MULTIPLE_CHOICE" | "SHORT_ANSWER";

// Question payload — dùng cho cả POST lẫn PUT
export interface CareerTestQuestion {
  type: QuestionType;
  question: string;
  // MULTIPLE_CHOICE
  options?: string[];
  correctAnswer?: string;
  // SHORT_ANSWER
  expectedKeywords?: string[];
  // Cả hai loại
  points: number;
}

// GET /career-tests/owned trả về
export interface CareerTestListItem {
  id: string;
  title: string;
  description?: string;
  questions?: CareerTestQuestion[];
  createdAt: string;
  updatedAt?: string;
}

// Raw API response — must include outer { data, total } wrapper so that
// apiClient.get<T>() unwraps to this shape (res = { data, total, page, limit }),
// enabling the 2-layer fallback: res?.data?.data || res?.data || []
interface RawCareerTestListResponse {
  total: number;
  page: number;
  limit: number;
  data: CareerTestListItem[];
}

export interface CareerTestListResponse {
  total: number;
  page: number;
  limit: number;
  data: CareerTestListItem[];
}

// Payload gửi lên POST /career-tests và PUT /career-tests/:id
export interface CareerTestPayload {
  title: string;
  description?: string;
  questions: CareerTestQuestion[];
}

// GET /career-tests/:id/results trả về
export interface TestResultItem {
  id: string;
  score: number;
  passed: boolean;
  completedAt: string;
  student: {
    user?: { fullName: string; email: string };
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// ─── Component ─────────────────────────────────────────────────────────────────

const CompanyCareerTestManage: React.FC = () => {
  // ── Table state ──────────────────────────────────────────────────────────────
  const [tests, setTests] = useState<CareerTestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 10;

  // ── Modal + Form state ───────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null = create, string = edit
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm<CareerTestPayload>();
  // Watch question type per index
  const questionTypes = Form.useWatch("questions", form) ?? [];

  // ── Results Drawer state ────────────────────────────────────────────────────
  const [resultsDrawerOpen, setResultsDrawerOpen] = useState(false);
  const [selectedTestIdForResults, setSelectedTestIdForResults] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResultItem[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // ── Fetch list ────────────────────────────────────────────────────────────────
  const fetchTests = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiClient.get<RawCareerTestListResponse>(
        `/career-tests/owned?page=${page}&limit=${PAGE_SIZE}`
      ) as RawCareerTestListResponse;
      // Anti-crash: 2-layer Optional Chaining fallback
      // Backend may wrap response as { data: { data, total } } or flat { data, total }
      const testList = (res as any)?.data?.data || res?.data || [];
      const totalCount = (res as any)?.data?.total || res?.total || 0;
      setTests(testList);
      setTotalItems(totalCount);
      setTotalPages(Math.ceil(totalCount / PAGE_SIZE));
      setCurrentPage(res?.page ?? page);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể tải danh sách bài test."
      );
    } finally {
      setLoading(false);
    }
  }, [PAGE_SIZE]);

  // ── Create ───────────────────────────────────────────────────────────────────
  const handleCreate = async (values: CareerTestPayload) => {
    setSubmitLoading(true);
    try {
      // Sanitize payload: strip irrelevant fields per question type
      const sanitizedQuestions = (values.questions ?? []).map((q) => {
        const base = {
          type: q.type,
          question: q.question.trim(),
          points: q.points,
        };
        if (q.type === "MULTIPLE_CHOICE") {
          return {
            ...base,
            options: q.options ?? [],
            correctAnswer: q.correctAnswer,
          };
        } else {
          // SHORT_ANSWER — strip options and correctAnswer before sending
          return { ...base, expectedKeywords: q.expectedKeywords ?? [] };
        }
      });

      await apiClient.post("/career-tests", {
        title: values.title.trim(),
        description: values.description?.trim(),
        questions: sanitizedQuestions,
      });
      message.success("Tạo bài test thành công!");
      setModalOpen(false);
      form.resetFields();
      fetchTests(currentPage);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || "Tạo bài test thất bại."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Update ───────────────────────────────────────────────────────────────────
  const handleUpdate = async (id: string, values: CareerTestPayload) => {
    setSubmitLoading(true);
    try {
      // Sanitize payload: strip irrelevant fields per question type
      const sanitizedQuestions = (values.questions ?? []).map((q) => {
        const base = {
          type: q.type,
          question: q.question.trim(),
          points: q.points,
        };
        if (q.type === "MULTIPLE_CHOICE") {
          return {
            ...base,
            options: q.options ?? [],
            correctAnswer: q.correctAnswer,
          };
        } else {
          // SHORT_ANSWER — strip options and correctAnswer before sending
          return { ...base, expectedKeywords: q.expectedKeywords ?? [] };
        }
      });

      await apiClient.put(`/career-tests/${id}`, {
        title: values.title.trim(),
        description: values.description?.trim(),
        questions: sanitizedQuestions,
      });
      message.success("Cập nhật bài test thành công!");
      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
      fetchTests(currentPage);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || "Cập nhật bài test thất bại."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/career-tests/${id}`);
      message.success("Xóa bài test thành công!");
      fetchTests(currentPage);
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Xóa bài test thất bại.");
    }
  };

  // ── Results Drawer ───────────────────────────────────────────────────────────
  const openResultsDrawer = async (testId: string) => {
    setSelectedTestIdForResults(testId);
    setTestResults([]);
    setResultsDrawerOpen(true);
    try {
      setLoadingResults(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiClient.get<{ data: TestResultItem[] }>(
        `/career-tests/${testId}/results`
      ) as any;
      // 1. Lấy ra payload chứa cục data
      const payload = res?.data?.data || res?.data || res || {};
      // 2. Trích xuất chính xác mảng nằm trong thuộc tính 'results'
      const resultsArray = payload.results || payload || [];
      // 3. Ép kiểu an toàn
      const safeArray = Array.isArray(resultsArray) ? resultsArray : [];
      setTestResults(safeArray);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || "Không thể tải kết quả bài test."
      );
    } finally {
      setLoadingResults(false);
    }
  };

  // ── Modal helpers ────────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (test: CareerTestListItem) => {
    setEditingId(test.id);
    form.setFieldsValue({
      title: test.title,
      description: test.description ?? "",
      questions: test.questions ?? [],
    });
    setModalOpen(true);
  };

  const handleFormSubmit = (values: CareerTestPayload) => {
    if (editingId) {
      handleUpdate(editingId, values);
    } else {
      handleCreate(values);
    }
  };

  // ── Mount ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchTests(1);
  }, [fetchTests]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Quản lý Bài test Định hướng
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tạo và quản lý các bài test định hướng nghề nghiệp cho ứng viên
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Tạo bài test mới
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Tổng bài test</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {totalItems}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Trắc nghiệm</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {tests.filter((t) =>
                (t.questions ?? []).some((q) => q.type === "MULTIPLE_CHOICE")
              ).length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Tự luận</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">
              {tests.filter((t) =>
                (t.questions ?? []).some((q) => q.type === "SHORT_ANSWER")
              ).length}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-6">
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-red-500 mb-3">{error}</p>
              <button
                onClick={() => fetchTests(currentPage)}
                className="text-blue-600 hover:underline text-sm"
              >
                Thử lại
              </button>
            </div>
          ) : tests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-4">Chưa có bài test nào.</p>
              <button
                onClick={openCreateModal}
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Tạo bài test đầu tiên của bạn
              </button>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Tiêu đề
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Mô tả
                    </th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Số câu hỏi
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tests.map((test) => (
                    <tr
                      key={test.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {test.title}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-500 truncate max-w-xs block">
                          {test.description || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-sm font-medium text-blue-600">
                          {test.questions?.length ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-500">
                          {formatDate(test.createdAt)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* View Results */}
                          <button
                            onClick={() => openResultsDrawer(test.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Xem kết quả"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(test)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {/* Delete with Popconfirm */}
                          <Popconfirm
                            title="Xóa bài test?"
                            description="Hành động này không thể hoàn tác."
                            onConfirm={() => handleDelete(test.id)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <button
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </Popconfirm>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(currentPage * PAGE_SIZE, totalItems)} trong{" "}
                    {totalItems} bài test
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1
                      )
                      .map((page, idx, arr) => (
                        <React.Fragment key={page}>
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <span className="px-1 text-gray-400">…</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`w-9 h-9 text-sm rounded-lg border transition-colors ${
                              page === currentPage
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-gray-300 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      ))}
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      <Modal
        title={editingId ? "Chỉnh sửa bài test" : "Tạo bài test mới"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingId(null);
          form.resetFields();
        }}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          initialValues={{
            questions: [],
          }}
        >
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[
              { required: true, message: "Nhập tiêu đề bài test." },
            ]}
          >
            <Input placeholder="VD: Bài test Định hướng nghề Frontend" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea
              rows={2}
              placeholder="Mô tả ngắn về bài test..."
            />
          </Form.Item>

          {/* ── Questions Form.List ─────────────────────────────────────────── */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Câu hỏi ({questionTypes.length})
            </label>

            <Form.List name="questions">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...rest }) => {
                    const qType =
                      questionTypes[name]?.type ?? "MULTIPLE_CHOICE";
                    return (
                      <div
                        key={key}
                        className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        {/* Row 1: Type + Points */}
                        <div className="flex gap-3 mb-3">
                          <Form.Item
                            {...rest}
                            name={[name, "type"]}
                            initialValue="MULTIPLE_CHOICE"
                            className="flex-1 mb-0"
                          >
                            <Select>
                              <Select.Option value="MULTIPLE_CHOICE">
                                Trắc nghiệm
                              </Select.Option>
                              <Select.Option value="SHORT_ANSWER">
                                Tự luận
                              </Select.Option>
                            </Select>
                          </Form.Item>
                          <Form.Item
                            {...rest}
                            name={[name, "points"]}
                            initialValue={10}
                            className="w-32 mb-0"
                            rules={[{ required: true, message: "Điểm" }]}
                          >
                            <Input
                              type="number"
                              min={1}
                              placeholder="Điểm"
                            />
                          </Form.Item>
                          <Button
                            type="text"
                            danger
                            onClick={() => remove(name)}
                          >
                            Xóa
                          </Button>
                        </div>

                        {/* Row 2: Question text */}
                        <Form.Item
                          {...rest}
                          name={[name, "question"]}
                          rules={[
                            {
                              required: true,
                              message: "Nhập nội dung câu hỏi.",
                            },
                          ]}
                        >
                          <Input.TextArea
                            rows={2}
                            placeholder="Nội dung câu hỏi..."
                          />
                        </Form.Item>

                        {/* MULTIPLE_CHOICE: options + correctAnswer */}
                        {qType === "MULTIPLE_CHOICE" && (
                          <>
                            <Form.Item
                              {...rest}
                              name={[name, "options"]}
                              label="Các lựa chọn"
                              rules={[
                                {
                                  required: true,
                                  message: "Thêm ít nhất 2 lựa chọn.",
                                },
                              ]}
                            >
                              <Select
                                mode="tags"
                                placeholder="Nhập từng lựa chọn, nhấn Enter sau mỗi lựa chọn"
                                tokenSeparators={[","]}
                                style={{ width: "100%" }}
                              />
                            </Form.Item>

                            <Form.Item
                              {...rest}
                              name={[name, "correctAnswer"]}
                              label="Đáp án đúng"
                              rules={[
                                {
                                  required: true,
                                  message: "Chọn đáp án đúng.",
                                },
                              ]}
                            >
                              <Select
                                placeholder="Chọn đáp án đúng"
                                allowClear
                              >
                                {(
                                  questionTypes[name]?.options ?? []
                                ).map((opt: string) => (
                                  <Select.Option key={opt} value={opt}>
                                    {opt}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </>
                        )}

                        {/* SHORT_ANSWER: expectedKeywords */}
                        {qType === "SHORT_ANSWER" && (
                          <Form.Item
                            {...rest}
                            name={[name, "expectedKeywords"]}
                            label="Từ khóa chấm điểm"
                            rules={[
                              {
                                required: true,
                                message: "Thêm ít nhất 1 từ khóa.",
                              },
                            ]}
                          >
                            <Select
                              mode="tags"
                              placeholder="Nhập từ khóa cần có trong câu trả lời, nhấn Enter"
                              tokenSeparators={[","]}
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                        )}
                      </div>
                    );
                  })}

                  <Button
                    type="dashed"
                    block
                    onClick={() =>
                      add({
                        type: "MULTIPLE_CHOICE",
                        question: "",
                        options: [],
                        points: 10,
                      })
                    }
                  >
                    + Thêm câu hỏi
                  </Button>
                </>
              )}
            </Form.List>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button
              onClick={() => {
                setModalOpen(false);
                setEditingId(null);
                form.resetFields();
              }}
            >
              Hủy
            </Button>
            <Button
              htmlType="submit"
              type="primary"
              loading={submitLoading}
            >
              {editingId ? "Cập nhật" : "Tạo bài test"}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── Results Drawer ──────────────────────────────────────────────────── */}
      <Drawer
        title={
          selectedTestIdForResults
            ? `Kết quả: ${
                tests.find((t) => t.id === selectedTestIdForResults)?.title ||
                "Bài test"
              }`
            : "Kết quả bài test"
        }
        placement="right"
        width={700}
        open={resultsDrawerOpen}
        onClose={() => {
          setResultsDrawerOpen(false);
          setSelectedTestIdForResults(null);
          setTestResults([]);
        }}
      >
        {loadingResults ? (
          <Skeleton active />
        ) : (
          <Table
            dataSource={Array.isArray(testResults) ? testResults : []}
            rowKey="id"
            pagination={false}
            columns={[
              {
                title: "Sinh viên",
                key: "student",
                render: (_: unknown, record: TestResultItem) => (
                  <div>
                    <div className="font-medium text-gray-900">
                      {record.student?.user?.fullName || "—"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {record.student?.user?.email || "—"}
                    </div>
                  </div>
                ),
              },
              {
                title: "Điểm số",
                dataIndex: "score",
                key: "score",
                align: "center",
                render: (score: number) => (
                  <span className="font-medium text-blue-600">{score}</span>
                ),
              },
              {
                title: "Đánh giá",
                key: "passed",
                align: "center",
                render: (_: unknown, record: TestResultItem) => (
                  <Tag color={record.passed ? "green" : "red"}>
                    {record.passed ? "Đạt" : "Không đạt"}
                  </Tag>
                ),
              },
              {
                title: "Ngày nộp",
                dataIndex: "completedAt",
                key: "completedAt",
                render: (completedAt: string) =>
                  completedAt ? formatDate(completedAt) : "—",
              },
            ]}
            locale={{
              emptyText: "Chưa có sinh viên nào nộp bài.",
            }}
          />
        )}
      </Drawer>
    </div>
  );
};

export default CompanyCareerTestManage;
