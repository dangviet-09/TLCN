import React, { useState, useEffect, useCallback } from "react";
import {
  Row,
  Col,
  Table,
  Tag,
  Button,
  Typography,
  Progress,
  Tooltip,
  Popover,
  Spin,
  Empty,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { apiClient } from "../../services/apiClient";

const { Title, Text } = Typography;

// ─── Type Definitions ──────────────────────────────────────────────────────────

interface JobApplication {
  id: string;
  studentId: string;
  student: {
    id: string;
    user?: {
      fullName: string;
      email: string;
    };
  };
  coverLetter: string | null;
  status: ApplicationStatus;
  appliedAt: string;
  matchPercentage?: number;
}

type ApplicationStatus =
  | "PENDING"
  | "REVIEWING"
  | "SHORTLISTED"
  | "REJECTED"
  | "ACCEPTED";

interface JobInfo {
  id: string;
  title: string;
  location?: string;
  status?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { color: string; label: string }
> = {
  PENDING:    { color: "gold",      label: "Chờ duyệt" },
  REVIEWING:  { color: "processing", label: "Đang xem" },
  SHORTLISTED: { color: "purple",   label: "Trong danh sách rút gọn" },
  ACCEPTED:   { color: "success",   label: "Đồng ý" },
  REJECTED:   { color: "error",      label: "Từ chối" },
};

const COVER_LETTER_MAX_LENGTH = 80;

// ─── Component ────────────────────────────────────────────────────────────────

const CompanyJobApplicationsPage: React.FC = () => {
  // ── State ────────────────────────────────────────────────────────────────
  const [ownedJobs, setOwnedJobs] = useState<JobInfo[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isJobsLoading, setIsJobsLoading] = useState<boolean>(false);
  const [isAppsLoading, setIsAppsLoading] = useState<boolean>(false);

  // ── fetchOwnedJobs — fires on mount ─────────────────────────────────────
  const fetchOwnedJobs = useCallback(async () => {
    try {
      setIsJobsLoading(true);
      const response = await apiClient.get<{ data: JobInfo[] }>("/jobs/company/owned");
      setOwnedJobs(response.data ?? []);
    } catch {
      setOwnedJobs([]);
    } finally {
      setIsJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOwnedJobs();
  }, [fetchOwnedJobs]);

  // ── fetchApplications — fires when selectedJobId changes ────────────────
  const fetchApplications = useCallback(async () => {
    if (!selectedJobId) return;
    try {
      setIsAppsLoading(true);
      const response = await apiClient.get<{ applications: JobApplication[] }>(
        `/jobs/${selectedJobId}/applications`
      );
      setApplications(response.applications ?? []);
    } catch {
      setApplications([]);
    } finally {
      setIsAppsLoading(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // ── handleUpdateStatus (Fix 3: correct URL) ────────────────────────────
  const handleUpdateStatus = async (
    applicationId: string,
    newStatus: ApplicationStatus
  ) => {
    try {
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
        err?.response?.data?.message || "Cập nhật trạng thái thất bại."
      );
    }
  };

  // ── Table columns ───────────────────────────────────────────────────────
  const columns = [
    {
      title: "Ứng viên",
      key: "candidate",
      render: (_: any, record: JobApplication) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {record.student?.user?.fullName ?? "—"}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.student?.user?.email ?? "—"}
          </Text>
        </div>
      ),
    },
    {
      title: "Thư ứng tuyển",
      key: "coverLetter",
      render: (_: any, record: JobApplication) => {
        if (!record.coverLetter) {
          return <Text type="secondary" italic>Không có</Text>;
        }
        const truncated =
          record.coverLetter.length > COVER_LETTER_MAX_LENGTH
            ? record.coverLetter.slice(0, COVER_LETTER_MAX_LENGTH) + "…"
            : record.coverLetter;

        return (
          <Popover
            content={
              <div style={{ maxWidth: 480, whiteSpace: "pre-wrap" }}>
                {record.coverLetter}
              </div>
            }
            title="Thư ứng tuyển"
            trigger="click"
          >
            <Button type="link" size="small" style={{ padding: 0 }}>
              {truncated}
            </Button>
          </Popover>
        );
      },
    },
    {
      title: "Đã nộp",
      key: "appliedAt",
      dataIndex: "appliedAt",
      render: (date: string) =>
        date
          ? new Date(date).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : "—",
      sorter: (a: JobApplication, b: JobApplication) =>
        new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime(),
    },
    {
      title: "Phù hợp",
      key: "matchPercentage",
      render: (_: any, record: JobApplication) => {
        const pct = record.matchPercentage ?? 0;
        return (
          <Tooltip title={`Độ phù hợp: ${pct}%`}>
            <Progress
              type="circle"
              size="small"
              percent={pct}
              strokeColor={
                pct >= 80 ? "#52c41a" : pct >= 50 ? "#faad14" : "#ff4d4f"
              }
            />
          </Tooltip>
        );
      },
      sorter: (a: JobApplication, b: JobApplication) =>
        (a.matchPercentage ?? 0) - (b.matchPercentage ?? 0),
      sortDirections: ["descend", "ascend"] as ("descend" | "ascend")[],
    },
    {
      title: "Trạng thái",
      key: "status",
      dataIndex: "status",
      render: (status: ApplicationStatus) => {
        const cfg = STATUS_CONFIG[status] ?? { color: "default", label: status };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
      filters: [
        { text: "Chờ duyệt", value: "PENDING" },
        { text: "Đang xem", value: "REVIEWING" },
        { text: "Từ chối", value: "REJECTED" },
      ],
      onFilter: (value: any, record: JobApplication) => record.status === value,
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: any, record: JobApplication) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            size="small"
            icon={<CheckCircleOutlined />}
            type="primary"
            disabled={record.status === "ACCEPTED"}
            onClick={() => handleUpdateStatus(record.id, "ACCEPTED")}
          >
            Duyệt
          </Button>
          <Button
            size="small"
            icon={<CloseCircleOutlined />}
            danger
            disabled={record.status === "REJECTED"}
            onClick={() => handleUpdateStatus(record.id, "REJECTED")}
          >
            Từ chối
          </Button>
        </div>
      ),
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Title level={4} style={{ margin: 0 }}>
          Quản lý ứng viên
        </Title>
      </div>

      <div className="p-6">
        <Row gutter={16}>
          {/* ── LEFT COLUMN: Job list (Fix 1: plain div + ownedJobs.map) ──── */}
          <Col xs={24} lg={6}>
            <div
              className="bg-white rounded-md border border-gray-200"
              style={{ maxHeight: "calc(100vh - 160px)", overflowY: "auto" }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #f0f0f0",
                  fontWeight: 600,
                  color: "#262626",
                }}
              >
                Công việc của tôi
              </div>
              <Spin spinning={isJobsLoading}>
                {ownedJobs.length === 0 ? (
                  <div style={{ padding: "24px 16px" }}>
                    <Text type="secondary">Bạn chưa đăng việc làm nào.</Text>
                  </div>
                ) : (
                  ownedJobs.map((job) => {
                    const isSelected = job.id === selectedJobId;
                    return (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        style={{
                          padding: "12px 16px",
                          cursor: "pointer",
                          backgroundColor: isSelected ? "#e6f7ff" : "transparent",
                          borderLeft: isSelected
                            ? "3px solid #1890ff"
                            : "3px solid transparent",
                          transition: "all 0.2s ease",
                          borderBottom: "1px solid #f5f5f5",
                        }}
                        className="hover:bg-gray-50"
                      >
                        <Text
                          strong
                          style={{
                            display: "block",
                            color: isSelected ? "#1890ff" : "#262626",
                          }}
                        >
                          {job.title}
                        </Text>
                        {job.location && (
                          <Text
                            type="secondary"
                            style={{ fontSize: 12 }}
                          >
                            {job.location}
                          </Text>
                        )}
                      </div>
                    );
                  })
                )}
              </Spin>
            </div>
          </Col>

          {/* ── RIGHT COLUMN: Applications table ──────────────────────────── */}
          <Col xs={24} lg={18}>
            <div className="bg-white rounded-md border border-gray-200 p-4">
              <Spin spinning={isAppsLoading}>
                {selectedJobId === null ? (
                  <Empty
                    description="Vui lòng chọn công việc ở danh sách bên trái để xem ứng viên"
                    style={{ padding: "80px 0" }}
                  />
                ) : applications.length === 0 ? (
                  <Empty
                    description="Chưa có ứng viên nào ứng tuyển"
                    style={{ padding: "80px 0" }}
                  />
                ) : (
                  <Table
                    rowKey="id"
                    dataSource={applications}
                    columns={columns}
                    pagination={{ pageSize: 10 }}
                    size="middle"
                  />
                )}
              </Spin>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default CompanyJobApplicationsPage;
