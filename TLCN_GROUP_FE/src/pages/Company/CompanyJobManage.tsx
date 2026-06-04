import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { Eye, Pencil, Trash2, Users, Plus, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Modal, message } from "antd";

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

interface SkillRequirement {
  skillName: string;
  level: "REQUIRED" | "NICE_TO_HAVE";
  minProficiency?: number;
}

interface JobListItem {
  id: string;
  title: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT";
  status: "OPEN" | "CLOSED" | "DRAFT";
  viewCount: number;
  applicationsCount: number;
  createdAt: string;
}

interface JobListResponse {
  total: number;
  page: number;
  limit: number;
  data: JobListItem[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getStatusColor = (status: JobListItem["status"]) => {
  switch (status) {
    case "OPEN":
      return "bg-green-100 text-green-700";
    case "CLOSED":
      return "bg-red-100 text-red-700";
    case "DRAFT":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusLabel = (status: JobListItem["status"]) => {
  switch (status) {
    case "OPEN":
      return "Đang tuyển";
    case "CLOSED":
      return "Đã đóng";
    case "DRAFT":
      return "Bản nháp";
    default:
      return status;
  }
};

const getEmploymentTypeLabel = (type: JobListItem["employmentType"]) => {
  switch (type) {
    case "FULL_TIME":
      return "Toàn thời gian";
    case "PART_TIME":
      return "Bán thời gian";
    case "INTERNSHIP":
      return "Thực tập";
    case "CONTRACT":
      return "Hợp đồng";
    default:
      return type;
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// ─── Component ─────────────────────────────────────────────────────────────────

const CompanyJobManage: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(10);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<JobListItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [applicantCounts, setApplicantCounts] = useState<Record<string, number>>({});
  const [totalApplications, setTotalApplications] = useState<number>(0);

  const loadApplicantCounts = async (jobList: any[]) => {
  const counts: Record<string, number> = {};
  let totalAll = 0;

  await Promise.all(
    jobList.map(async (job) => {
      try {
        const res = (await apiClient.get(`/jobs/${job.id}/applications`)) as any;

        // Kỹ thuật bóc tách đa tầng (Multi-layer unwrapping)
        const body = res?.data || res;
        const dataLayer = body?.data || body;
        const apps = dataLayer?.applications;

        let count = 0;
        if (Array.isArray(apps)) {
          count = apps.length;
        } else if (Array.isArray(dataLayer)) {
          count = dataLayer.length;
        }

        counts[job.id] = count;
        totalAll += count;
      } catch {
        counts[job.id] = 0;
      }
    })
  );

  setApplicantCounts(counts);
  setTotalApplications(totalAll);
};

  const fetchJobs = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<JobListResponse>(
        `/jobs/company/owned?page=${page}&limit=${pageSize}`
      );
      const jobList = data.data ?? [];
      setJobs(jobList);
      setTotalItems(data.total ?? 0);
      setTotalPages(Math.ceil((data.total ?? 0) / pageSize));
      setCurrentPage(data.page ?? page);
      loadApplicantCounts(jobList);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Không thể tải danh sách việc làm.");
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchJobs(currentPage);
  }, [fetchJobs, currentPage]);

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;
    try {
      setDeletingId(jobToDelete.id);
      await apiClient.delete(`/jobs/${jobToDelete.id}`);
      message.success("Xóa việc làm thành công!");
      setDeleteModalOpen(false);
      setJobToDelete(null);
      fetchJobs(currentPage);
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Xóa việc làm thất bại.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (job: JobListItem) => {
    const newStatus: JobListItem["status"] = job.status === "OPEN" ? "CLOSED" : "OPEN";
    try {
      setTogglingId(job.id);
      await apiClient.patch(`/jobs/${job.id}/status`, { status: newStatus });
      message.success(`Đã ${newStatus === "OPEN" ? "mở" : "đóng"} tuyển dụng!`);
      fetchJobs(currentPage);
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Cập nhật trạng thái thất bại.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý việc làm</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý danh sách tin tuyển dụng của công ty
          </p>
        </div>
        <button
          onClick={() => navigate("/company/jobs/create")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Đăng tin mới
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Tổng tin tuyển dụng</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{totalItems}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Đang tuyển</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {jobs.filter((j) => j.status === "OPEN").length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Tổng ứng viên</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{totalApplications}</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-red-500 mb-3">{error}</p>
              <button
                onClick={() => fetchJobs(currentPage)}
                className="text-blue-600 hover:underline text-sm"
              >
                Thử lại
              </button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-4">Chưa có tin tuyển dụng nào.</p>
              <button
                onClick={() => navigate("/company/jobs/create")}
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Đăng tin đầu tiên của bạn
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
                      Loại hình
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Lượt xem
                    </th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Ứng viên
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Ngày đăng
                    </th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-gray-900">{job.title}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-600">
                          {getEmploymentTypeLabel(job.employmentType)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}
                        >
                          {getStatusLabel(job.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-sm text-gray-600 flex items-center justify-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {job.viewCount ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="font-semibold text-blue-600">
                          {applicantCounts[job.id] || 0}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-500">{formatDate(job.createdAt)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* View Applications */}
                          <button
                            onClick={() => navigate(`/company/jobs/${job.id}/applications`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Xem ứng viên"
                          >
                            <Users className="w-4 h-4" />
                          </button>

                          {/* Toggle Status */}
                          <button
                            onClick={() => handleToggleStatus(job)}
                            disabled={togglingId === job.id}
                            className={`p-2 rounded-lg transition-colors ${
                              job.status === "OPEN"
                                ? "text-red-500 hover:bg-red-50"
                                : "text-green-600 hover:bg-green-50"
                            } ${togglingId === job.id ? "opacity-50 cursor-not-allowed" : ""}`}
                            title={job.status === "OPEN" ? "Đóng tuyển dụng" : "Mở tuyển dụng"}
                          >
                            {job.status === "OPEN" ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => navigate(`/company/jobs/${job.id}/edit`)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if ((applicantCounts[job.id] || 0) > 0) {
                                message.warning("Không thể xóa công việc đã có ứng viên. Vui lòng sử dụng tính năng Đóng tuyển dụng!");
                                return;
                              }
                              setJobToDelete(job);
                              setDeleteModalOpen(true);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                    Hiển thị {(currentPage - 1) * pageSize + 1}–
                    {Math.min(currentPage * pageSize, totalItems)} trong {totalItems} tin
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {/* Delete Confirmation Modal */}
      <Modal
        title="Xác nhận xóa"
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setJobToDelete(null);
        }}
        onOk={handleDeleteConfirm}
        okText="Xóa"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: deletingId === jobToDelete?.id }}
      >
        <p>
          Bạn có chắc chắn muốn xóa tin tuyển dụng{" "}
          <strong>"{jobToDelete?.title}"</strong>? Hành động này không thể hoàn tác.
        </p>
      </Modal>
    </div>
  );
};

export default CompanyJobManage;
