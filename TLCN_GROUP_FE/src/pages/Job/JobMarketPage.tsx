import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Row,
  Col,
  Input,
  Select,
  Button,
  Switch,
  List,
  Card,
  Tag,
  Typography,
  Spin,
  Empty,
  message,
} from "antd";
import {
  SearchOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { apiClient } from "../../services/apiClient";

const { Title, Text } = Typography;

// ─── Type Definitions ──────────────────────────────────────────────────────────

interface SkillRequirement {
  skillName: string;
  level: "REQUIRED" | "NICE_TO_HAVE";
  minProficiency?: number;
}

interface JobCompany {
  id: string;
  companyName: string;
  industry?: string;
  logo?: string | null;
}

interface Job {
  id: string;
  title: string;
  description: string;
  companyId: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  employmentType: "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT";
  experienceLevel: "FRESHER" | "JUNIOR" | "MIDDLE" | "SENIOR";
  deadline: string;
  viewCount: number;
  status: "OPEN" | "CLOSED" | "DRAFT";
  skillRequirements: SkillRequirement[];
  company?: JobCompany;
  createdAt: string;
  matchPercentage?: number;
}

interface JobListResponse {
  data: Job[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  currentPage?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const employmentTypeOptions = [
  { value: "FULL_TIME", label: "Toàn thời gian" },
  { value: "PART_TIME", label: "Bán thời gian" },
  { value: "INTERNSHIP", label: "Thực tập" },
];

const experienceLevelOptions = [
  { value: "FRESHER", label: "Fresher" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MIDDLE", label: "Middle" },
  { value: "SENIOR", label: "Senior" },
];

const locationOptions = [
  { value: "Hồ Chí Minh", label: "Hồ Chí Minh" },
  { value: "Hà Nội", label: "Hà Nội" },
  { value: "Đà Nẵng", label: "Đà Nẵng" },
  { value: "Khác", label: "Khác" },
];

const sortOptions = [
  { value: "salary_desc", label: "Lương giảm dần" },
];

// ─── Component ────────────────────────────────────────────────────────────────

const JobMarketPage: React.FC = () => {
  // ── State ────────────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    location: "",
    experienceLevel: "",
    employmentType: "",
    sort: "",
  });
  const [isRecommended, setIsRecommended] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ── fetchJobs ──────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<JobListResponse>("/jobs", {
        params: {
          page: pagination.current,
          limit: pagination.pageSize,
          search: filters.search || undefined,
          location: filters.location || undefined,
          experienceLevel: filters.experienceLevel || undefined,
          employmentType: filters.employmentType || undefined,
          sort: filters.sort || undefined,
          isRecommended: isRecommended || undefined,
        },
      });
      setJobs(response.data ?? []);
      setPagination((prev) => ({
        ...prev,
        total: response.total ?? 0,
      }));
    } catch (err: any) {
      // ── 401: auth required for recommended mode ──
      if (err?.response?.status === 401) {
        message.warning("Vui lòng đăng nhập với tài khoản sinh viên để dùng tính năng gợi ý.");
        setIsRecommended(false);
        setJobs([]);
        setPagination((prev) => ({ ...prev, total: 0 }));
      } else {
        setJobs([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters, isRecommended]);

  // ── Trigger fetch on pagination / filters / isRecommended change ──────────
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // ── Filter handlers ────────────────────────────────────────────────────
  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleRecommendedChange = (checked: boolean) => {
    setIsRecommended(checked);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({ search: "", location: "", experienceLevel: "", employmentType: "", sort: "" });
    setIsRecommended(false);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  // ── Pagination handler ────────────────────────────────────────────────
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, current: page }));
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <Title level={2} style={{ color: "#fff", marginBottom: 4 }}>
            Việc làm IT nổi bật
          </Title>
          <Text style={{ color: "#bfdbfe" }}>
            Khám phá hàng trăm cơ hội việc làm dành cho lập trình viên
          </Text>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* ── Filter Bar ──────────────────────────────────────────────── */}
        <Card className="mb-6">
          <Row gutter={[16, 16]} align="middle">
            {/* Search by Title */}
            <Col xs={24} sm={24} md={10} lg={8}>
              <Input.Search
                placeholder="Tìm kiếm theo tên công việc..."
                allowClear
                enterButton={<SearchOutlined />}
                onSearch={handleSearch}
              />
            </Col>

            {/* Experience Level */}
            <Col xs={12} sm={8} md={4} lg={3}>
              <Select
                placeholder="Cấp bậc"
                allowClear
                style={{ width: "100%" }}
                value={filters.experienceLevel || undefined}
                onChange={(val) => handleFilterChange("experienceLevel", val ?? "")}
                options={experienceLevelOptions}
              />
            </Col>

            {/* Employment Type */}
            <Col xs={12} sm={8} md={4} lg={3}>
              <Select
                placeholder="Hình thức"
                allowClear
                style={{ width: "100%" }}
                value={filters.employmentType || undefined}
                onChange={(val) => handleFilterChange("employmentType", val ?? "")}
                options={employmentTypeOptions}
              />
            </Col>

            {/* Location */}
            <Col xs={12} sm={8} md={4} lg={3}>
              <Select
                placeholder="Địa điểm"
                allowClear
                style={{ width: "100%" }}
                value={filters.location || undefined}
                onChange={(val) => handleFilterChange("location", val ?? "")}
                options={locationOptions}
              />
            </Col>

            {/* Sort */}
            <Col xs={12} sm={8} md={4} lg={2}>
              <Select
                placeholder="Sắp xếp"
                allowClear
                style={{ width: "100%" }}
                value={filters.sort || undefined}
                onChange={(val) => handleFilterChange("sort", val ?? "")}
                options={sortOptions}
              />
            </Col>

            {/* Clear Filters */}
            <Col xs={24} sm={8} md={4} lg={2}>
              <Button onClick={handleClearFilters} block>
                Xóa bộ lọc
              </Button>
            </Col>

            {/* Recommended Switch — full width on mobile, inline on desktop */}
            <Col xs={24} md={24} lg={4}>
              <div className="flex items-center gap-2">
                <Switch
                  checked={isRecommended}
                  onChange={handleRecommendedChange}
                />
                <Text>Đề xuất cho tôi</Text>
              </div>
            </Col>
          </Row>
        </Card>

        {/* ── Job List ────────────────────────────────────────────────── */}
        <Spin spinning={isLoading}>
          {jobs.length === 0 && !isLoading ? (
            <Empty description="Không tìm thấy việc làm phù hợp" />
          ) : (
            <List
              grid={{ gutter: 16, column: 2 }}
              dataSource={jobs}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onChange: handlePageChange,
                showSizeChanger: false,
                align: "end",
              }}
              renderItem={(job: Job) => (
                <List.Item>
                  <Card
                    hoverable
                    className="h-full"
                    actions={[
                      <Link to={`/jobs/${job.id}`} key="detail">
                        <Button type="primary" block>
                          Xem chi tiết
                        </Button>
                      </Link>,
                    ]}
                  >
                    {/* Header: title + experienceLevel tag + matchPercentage tag */}
                    <div className="mb-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <Text
                          strong
                          ellipsis={{ tooltip: job.title }}
                          style={{ fontSize: 16, display: "block", marginBottom: 0 }}
                        >
                          {job.title}
                        </Text>
                        <Tag color="green">{job.experienceLevel}</Tag>
                      </div>
                      {job.matchPercentage !== undefined && (
                        <Tag color="magenta" className="mt-1">
                          Phù hợp: {job.matchPercentage}%
                        </Tag>
                      )}
                      <Text type="secondary" style={{ fontSize: 13, display: "block", marginTop: 4 }}>
                        {job.company?.companyName ?? "—"}
                      </Text>
                    </div>

                    {/* Body: salary (VND) + location */}
                    <div className="space-y-1 mb-3">
                      {/* Salary */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Text type="secondary">Lương:</Text>
                        <Text>
                          {job.salaryMin != null && job.salaryMax != null
                            ? `${job.salaryMin.toLocaleString("vi-VN")} – ${job.salaryMax.toLocaleString("vi-VN")} VND`
                            : job.salaryMin != null
                            ? `Từ ${job.salaryMin.toLocaleString("vi-VN")} VND`
                            : "Thỏa thuận"}
                        </Text>
                      </div>

                      {/* Location */}
                      {job.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <EnvironmentOutlined />
                          <Text>{job.location}</Text>
                        </div>
                      )}
                    </div>

                    {/* Employment type badge */}
                    <Tag color="blue">{job.employmentType.replace("_", " ")}</Tag>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </Spin>
      </div>
    </div>
  );
};

export default JobMarketPage;
