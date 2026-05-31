import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { formatSalary } from "../../utils/formatUtils";
import { ArrowLeft, FileText, Briefcase } from "lucide-react";
import { Table, Tag, Modal, message } from "antd";
import type { ColumnsType } from "antd/es/table";

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

interface CompanyInfo {
  id: string;
  companyName: string;
  logo: string | null;
}

interface JobPostingInfo {
  id: string;
  title: string;
  location: string;
  salaryMin: string;
  salaryMax: string;
  employmentType: string;
  experienceLevel: string;
  deadline: string;
  status: string;
  company?: CompanyInfo;
}

interface JobApplication {
  id: string;
  studentId: string;
  jobPostingId: string;
  coverLetter: string | null;
  status: ApplicationStatus;
  appliedAt: string;
  jobPosting?: JobPostingInfo;
}

type ApplicationStatus = "PENDING" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "ACCEPTED";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  PENDING:     { label: "Chờ duyệt",         color: "gold" },
  REVIEWING:  { label: "Đang xem",           color: "blue" },
  SHORTLISTED:{ label: "Trong danh sách rút gọn", color: "purple" },
  ACCEPTED:   { label: "Đồng ý",             color: "green" },
  REJECTED:   { label: "Từ chối",            color: "red" },
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Component ─────────────────────────────────────────────────────────────────

const MyApplicationsPage: React.FC = () => {
  const navigate = useNavigate();

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cover letter modal
  const [coverLetterModalOpen, setCoverLetterModalOpen] = useState(false);
  const [selectedCoverLetter, setSelectedCoverLetter] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<JobApplication[]>("/jobs/student/applied");
      setApplications(data ?? []);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Không thể tải danh sách đơn ứng tuyển.";
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const openCoverLetter = (coverLetter: string | null) => {
    setSelectedCoverLetter(coverLetter);
    setCoverLetterModalOpen(true);
  };

  // ── Table columns ──────────────────────────────────────────────

  const columns: ColumnsType<JobApplication> = [
    {
      title: "Tên công việc",
      key: "title",
      render: (_, record) => (
        <span className="font-medium text-gray-900">
          {record?.jobPosting?.title ?? "—"}
        </span>
      ),
    },
    {
      title: "Công ty",
      key: "company",
      render: (_, record) => (
        <span className="text-gray-700">
          {record?.jobPosting?.company?.companyName ?? "—"}
        </span>
      ),
    },
    {
      title: "Mức lương",
      key: "salary",
      render: (_, record) => (
        <span className="text-gray-600">
          {formatSalary(
            record?.jobPosting?.salaryMin,
            record?.jobPosting?.salaryMax
          )}
        </span>
      ),
    },
    {
      title: "Ngày nộp",
      key: "appliedAt",
      render: (_, record) => (
        <span className="text-gray-500 text-sm">
          {formatDate(record?.appliedAt ?? "")}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_, record) => {
        const cfg = STATUS_CONFIG[record?.status as ApplicationStatus];
        return cfg ? (
          <Tag color={cfg.color}>{cfg.label}</Tag>
        ) : (
          <Tag>{record?.status ?? "—"}</Tag>
        );
      },
    },
    {
      title: "Hành động",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <button
          onClick={() => openCoverLetter(record?.coverLetter ?? null)}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors mx-auto"
        >
          <FileText className="w-4 h-4" />
          Xem thư
        </button>
      ),
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            Đơn ứng tuyển của tôi
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Theo dõi trạng thái các đơn ứng tuyển đã nộp
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Loading state */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500 text-sm">Đang tải danh sách đơn ứng tuyển…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Briefcase className="w-7 h-7 text-red-400" />
              </div>
              <p className="text-red-500 mb-3 text-center px-4">{error}</p>
              <button
                onClick={fetchApplications}
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={applications}
              rowKey="id"
              pagination={{ pageSize: 10, size: "middle" }}
              locale={{
                emptyText: (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Briefcase className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium mb-1">
                      Chưa có đơn ứng tuyển nào
                    </p>
                    <p className="text-gray-400 text-sm text-center max-w-xs">
                      Hãy tìm kiếm công việc phù hợp và bắt đầu ứng tuyển ngay!
                    </p>
                    <button
                      onClick={() => navigate("/jobs/market")}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Tìm việc ngay
                    </button>
                  </div>
                ),
              }}
              onRow={(record) => ({
                style: { cursor: "pointer" },
                onClick: () => {
                  if (record?.jobPosting?.id) {
                    navigate(`/jobs/${record.jobPosting.id}`);
                  }
                },
              })}
            />
          )}
        </div>
      </div>

      {/* Cover Letter Modal */}
      <Modal
        title="Thư ứng tuyển"
        open={coverLetterModalOpen}
        onCancel={() => {
          setCoverLetterModalOpen(false);
          setSelectedCoverLetter(null);
        }}
        footer={null}
        width={600}
      >
        <div className="py-2">
          {selectedCoverLetter ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {selectedCoverLetter}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">
              Không có thư ứng tuyển
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MyApplicationsPage;
