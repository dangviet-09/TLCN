import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { ArrowLeft, Eye, Users, FileText } from "lucide-react";
import { Modal, Select, message } from "antd";

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

interface StudentInfo {
  fullName: string;
  email: string;
}

interface JobApplication {
  id: string;
  studentId: string;
  student: StudentInfo;
  coverLetter: string | null;
  status: ApplicationStatus;
  appliedAt: string;
}

type ApplicationStatus = "PENDING" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "ACCEPTED";

interface JobInfo {
  id: string;
  title: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: "PENDING", label: "Chờ duyệt", color: "bg-gray-100 text-gray-600" },
  { value: "REVIEWING", label: "Đang xem", color: "bg-blue-100 text-blue-700" },
  { value: "SHORTLISTED", label: "Trong danh sách rút gọn", color: "bg-purple-100 text-purple-700" },
  { value: "ACCEPTED", label: "Đồng ý", color: "bg-green-100 text-green-700" },
  { value: "REJECTED", label: "Từ chối", color: "bg-red-100 text-red-700" },
];

const getStatusStyle = (status: ApplicationStatus) => {
  const found = STATUS_OPTIONS.find((s) => s.value === status);
  return found ? found.color : "bg-gray-100 text-gray-600";
};

const getStatusLabel = (status: ApplicationStatus) => {
  const found = STATUS_OPTIONS.find((s) => s.value === status);
  return found ? found.label : status;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Component ─────────────────────────────────────────────────────────────────

const CompanyJobApplications: React.FC = () => {
  const navigate = useNavigate();
  const { id: jobId } = useParams<{ id: string }>();

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [job, setJob] = useState<JobInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [coverLetterModal, setCoverLetterModal] = useState(false);
  const [selectedCoverLetter, setSelectedCoverLetter] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!jobId) return;
    try {
      setLoading(true);
      setError(null);
      const [appsData, jobData] = await Promise.all([
        apiClient.get<JobApplication[]>(`/jobs/${jobId}/applications`),
        apiClient.get<JobInfo>(`/jobs/${jobId}`),
      ]);
      setApplications(appsData ?? []);
      setJob(jobData ?? null);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Không thể tải danh sách ứng viên."
      );
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleStatusChange = async (applicationId: string, newStatus: ApplicationStatus) => {
    try {
      setUpdatingStatusId(applicationId);
      await apiClient.patch(`/jobs/applications/${applicationId}/status`, {
        status: newStatus,
      });
      message.success("Cập nhật trạng thái thành công!");
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: newStatus } : app
        )
      );
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Cập nhật trạng thái thất bại."
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const openCoverLetter = (coverLetter: string | null) => {
    setSelectedCoverLetter(coverLetter);
    setCoverLetterModal(true);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/company/jobs")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            Danh sách ứng viên
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {job?.title
              ? `Ứng viên ứng tuyển: ${job.title}`
              : "Đang tải thông tin việc làm…"}
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {applications.length} ứng viên
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-red-500 mb-3">{error}</p>
              <button
                onClick={fetchApplications}
                className="text-blue-600 hover:underline text-sm"
              >
                Thử lại
              </button>
            </div>
          ) : applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">Chưa có ứng viên nào ứng tuyển.</p>
              <p className="text-sm text-gray-400">
                Danh sách ứng viên sẽ xuất hiện khi có sinh viên nộp đơn.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Họ tên
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Thư ứng tuyển
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Ngày nộp
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Full Name */}
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {app?.student?.fullName ?? "—"}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">
                        {app?.student?.email ?? "—"}
                      </span>
                    </td>

                    {/* Cover Letter */}
                    <td className="px-5 py-4">
                      {app.coverLetter ? (
                        <button
                          onClick={() => openCoverLetter(app.coverLetter)}
                          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          Xem thư
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400 italic">
                          Không có thư ứng tuyển
                        </span>
                      )}
                    </td>

                    {/* Applied At */}
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-500">
                        {app.appliedAt ? formatDate(app.appliedAt) : "—"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(app.status)}`}
                        >
                          {getStatusLabel(app.status)}
                        </span>
                        <Select
                          value={app.status}
                          onChange={(value) => handleStatusChange(app.id, value)}
                          disabled={updatingStatusId === app.id}
                          size="small"
                          style={{ width: 140 }}
                          options={STATUS_OPTIONS.map((opt) => ({
                            value: opt.value,
                            label: opt.label,
                          }))}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Cover Letter Modal */}
      <Modal
        title="Thư ứng tuyển"
        open={coverLetterModal}
        onCancel={() => {
          setCoverLetterModal(false);
          setSelectedCoverLetter(null);
        }}
        footer={null}
        width={640}
      >
        <div className="py-2">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {selectedCoverLetter ?? ""}
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CompanyJobApplications;
