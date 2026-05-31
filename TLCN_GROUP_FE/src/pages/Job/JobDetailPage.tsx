import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Typography,
  Progress,
  Tag,
  Spin,
  Button,
  Divider,
  message,
  Descriptions,
  Space,
  Breadcrumb,
  List,
  Empty,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  LeftOutlined,
} from "@ant-design/icons";
import { apiClient } from "../../services/apiClient";

const { Title, Text, Paragraph } = Typography;

// ─── Type Definitions ──────────────────────────────────────────────────────────

interface SkillItem {
  skillName: string;
  level: "REQUIRED" | "NICE_TO_HAVE";
  minProficiency?: number;
  proficiency?: number;
  matched?: boolean;
}

interface SkillGapResponse {
  jobInfo: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    employmentType: string;
    experienceLevel: string;
    deadline: string | null;
    skillRequirements: SkillItem[];
  };
  matchPercentage: number;
  skillGap: {
    required: SkillItem[];
    niceToHave: SkillItem[];
  };
}

interface LearningCourse {
  courseId: string;
  courseTitle: string;
  category: string;
  level: string;
}

interface LearningPathResponse {
  mustLearn: LearningCourse[];
  niceToKnow: LearningCourse[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getProgressColor = (percent: number): string => {
  if (percent >= 80) return "#52c41a";
  if (percent >= 50) return "#faad14";
  return "#ff4d4f";
};

const employmentLabels: Record<string, string> = {
  FULL_TIME: "Toàn thời gian",
  PART_TIME: "Bán thời gian",
  INTERNSHIP: "Thực tập",
  CONTRACT: "Hợp đồng",
};

const experienceLabels: Record<string, string> = {
  FRESHER: "Fresher",
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
};

// ─── Component ────────────────────────────────────────────────────────────────

const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [jobData, setJobData] = useState<SkillGapResponse | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPathResponse>({
    mustLearn: [],
    niceToKnow: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // ── Fetch skill-gap + learning-path concurrently ────────────────────────
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [skillGapRes, learningPathRes] = await Promise.all([
          apiClient.get<SkillGapResponse>(`/jobs/${id}/skill-gap`),
          apiClient.get<LearningPathResponse>(`/jobs/${id}/learning-path`),
        ]);

        setJobData(skillGapRes);
        setLearningPath(learningPathRes);
      } catch (err: any) {
        const serverMsg = err?.response?.data?.message;
        message.error(serverMsg || "Không thể tải dữ liệu việc làm.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // ── Apply handler ───────────────────────────────────────────────────────
  const handleApply = async () => {
    if (!id) return;
    try {
      setIsApplying(true);
      await apiClient.post(`/jobs/${id}/apply`, {
        coverLetter: "CV ứng tuyển từ hệ thống.",
      });
      message.success("Ứng tuyển thành công!");
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message;
      message.error(serverMsg || "Ứng tuyển thất bại. Vui lòng thử lại.");
    } finally {
      setIsApplying(false);
    }
  };

  // ── Loading State ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  const skillGap = jobData?.skillGap;
  const matchPercentage = jobData?.matchPercentage ?? 0;
  const requiredSkills = skillGap?.required ?? [];
  const niceToHaveSkills = skillGap?.niceToHave ?? [];

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-6 mb-4">
        <Breadcrumb
          items={[
            { title: <a onClick={() => navigate("/jobs/market")}>Việc làm</a> },
            { title: "Chi tiết việc làm" },
          ]}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <Row gutter={24}>
          {/* ─── LEFT COLUMN: Job Info ─────────────────────────────── */}
          <Col xs={24} lg={14}>
            {/* Job Header */}
            <Card className="mb-4">
              <Button
                icon={<LeftOutlined />}
                onClick={() => navigate("/jobs/market")}
                type="text"
                className="mb-3"
              >
                Quay lại
              </Button>

              <Title level={3}>
                {jobData?.jobInfo?.title || "Thông tin công việc đang cập nhật"}
              </Title>

              <Descriptions column={1} size="small" className="mt-4">
                <Descriptions.Item
                  label={<><EnvironmentOutlined /> Địa điểm</>}
                >
                  {jobData?.jobInfo?.location || "—"}
                </Descriptions.Item>
                <Descriptions.Item
                  label={<><DollarOutlined /> Lương</>}
                >
                  {jobData?.jobInfo?.salaryMin && jobData?.jobInfo?.salaryMax
                    ? `${jobData.jobInfo.salaryMin.toLocaleString("vi-VN")} - ${jobData.jobInfo.salaryMax.toLocaleString("vi-VN")} VND`
                    : jobData?.jobInfo?.salaryMin
                    ? `Từ ${jobData.jobInfo.salaryMin.toLocaleString("vi-VN")} VND`
                    : "Thỏa thuận"}
                </Descriptions.Item>
                <Descriptions.Item
                  label={<><ClockCircleOutlined /> Hạn nộp</>}
                >
                  {jobData?.jobInfo?.deadline
                    ? new Date(jobData.jobInfo.deadline).toLocaleDateString("vi-VN")
                    : "—"}
                </Descriptions.Item>
                <Descriptions.Item
                  label={<><TeamOutlined /> Hình thức</>}
                >
                  {employmentLabels[jobData?.jobInfo?.employmentType ?? ""] || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Cấp bậc">
                  {experienceLabels[jobData?.jobInfo?.experienceLevel ?? ""] || "—"}
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              <Title level={5}>Mô tả công việc</Title>
              <Paragraph
                ellipsis={{ rows: 3, expandable: true, symbol: "Đọc thêm" }}
                className="text-gray-600 whitespace-pre-line"
              >
                {jobData?.jobInfo?.description || "—"}
              </Paragraph>
            </Card>

            {/* Skill Requirements */}
            {(jobData?.jobInfo?.skillRequirements?.length ?? 0) > 0 && (
              <Card title="Yêu cầu kỹ năng" className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {(jobData?.jobInfo?.skillRequirements || []).map(
                    (skill: SkillItem, idx: number) => (
                      <Tag
                        key={idx}
                        color={skill.level === "REQUIRED" ? "green" : "default"}
                      >
                        {skill.skillName}
                      </Tag>
                    )
                  )}
                </div>
              </Card>
            )}

            {/* Apply Button — at bottom of left column */}
            <Space orientation="vertical" style={{ marginTop: 24 }} className="w-full">
              <Button
                type="primary"
                size="large"
                block
                loading={isApplying}
                disabled={(matchPercentage) < 50 || isApplying}
                onClick={handleApply}
              >
                Ứng tuyển ngay
              </Button>
              {matchPercentage < 50 && (
                <Typography.Text
                  type="danger"
                  style={{ fontSize: "12px" }}
                >
                  * Yêu cầu độ phù hợp kỹ năng tối thiểu 50% để ứng tuyển.
                </Typography.Text>
              )}
            </Space>
          </Col>

          {/* ─── RIGHT COLUMN: Skill Gap + Learning Path ─────────────── */}
          <Col xs={24} lg={10}>
            {/* Match Percentage Card */}
            <Card
              title="Phân tích kỹ năng"
              className="mb-4"
              extra={
                <Text type="secondary" className="text-xs">
                  Dành cho Sinh viên
                </Text>
              }
            >
              <div className="flex justify-center mb-6">
                <Progress
                  type="dashboard"
                  percent={matchPercentage}
                  strokeColor={getProgressColor(matchPercentage)}
                  size={160}
                  format={(p) => (
                    <span style={{ fontSize: 28, fontWeight: 700 }}>
                      {p}%
                    </span>
                  )}
                />
              </div>

              <div className="text-center mb-4">
                <Text type="secondary">
                  {matchPercentage >= 80
                    ? "Bạn phù hợp rất tốt với vị trí này!"
                    : matchPercentage >= 50
                    ? "Bạn đáp ứng được một phần yêu cầu."
                    : "Bạn cần bổ sung thêm kỹ năng để ứng tuyển."}
                </Text>
              </div>

              <Divider />

              {/* Required Skills */}
              {requiredSkills.length > 0 && (
                <div className="mb-4">
                  <Title level={5} className="mb-3">
                    Bắt buộc
                  </Title>
                  <div className="flex flex-wrap gap-2">
                    {requiredSkills.map((skill, idx) =>
                      skill.matched ? (
                        <Tag
                          key={`req-matched-${idx}`}
                          color="success"
                          icon={<CheckCircleOutlined />}
                        >
                          {skill.skillName}
                        </Tag>
                      ) : (
                        <Tag
                          key={`req-missing-${idx}`}
                          color="error"
                          icon={<CloseCircleOutlined />}
                        >
                          {skill.skillName}
                        </Tag>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Nice to Have */}
              {niceToHaveSkills.length > 0 && (
                <div>
                  <Title level={5} className="mb-3">
                    Ưu tiên / Điểm cộng
                  </Title>
                  <div className="flex flex-wrap gap-2">
                    {niceToHaveSkills.map((skill, idx) =>
                      skill.matched ? (
                        <Tag
                          key={`nth-matched-${idx}`}
                          color="success"
                          icon={<CheckCircleOutlined />}
                        >
                          {skill.skillName}
                        </Tag>
                      ) : (
                        <Tag
                          key={`nth-missing-${idx}`}
                          color="warning"
                          icon={<CloseCircleOutlined />}
                        >
                          {skill.skillName}
                        </Tag>
                      )
                    )}
                  </div>
                </div>
              )}

              {requiredSkills.length === 0 && niceToHaveSkills.length === 0 && (
                <Text type="secondary" className="text-center block">
                  Không có dữ liệu kỹ năng cho việc làm này.
                </Text>
              )}
            </Card>

            {/* Learning Path Card */}
            <Card title="Lộ trình học đề xuất" className="mb-4">
              {learningPath?.mustLearn?.length === 0 ? (
                <Empty
                  description="Bạn đã đáp ứng đủ kỹ năng, không cần bổ sung khóa học."
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <List
                  dataSource={learningPath?.mustLearn ?? []}
                  renderItem={(item: LearningCourse) => (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          size="small"
                          onClick={() => navigate(`/courses/${item.courseId}`)}
                        >
                          Xem khóa học →
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={<strong>{item.courseTitle}</strong>}
                        description={
                          <Space>
                            <Tag color="blue">{item.category ?? "—"}</Tag>
                            <Tag>{item.level ?? "—"}</Tag>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default JobDetailPage;
