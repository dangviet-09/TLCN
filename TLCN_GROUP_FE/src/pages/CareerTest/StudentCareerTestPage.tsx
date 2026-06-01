import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Spin,
  Card,
  Radio,
  Input,
  Button,
  Progress,
  List,
  Tag,
  message,
  Empty,
  Space,
  Typography, // BƯỚC 1: Bổ sung Typography 
} from "antd";
import {
  careerTestApi,
  CareerTestNew,
  CareerTestAnswer,
  CareerTestSubmitResult,
} from "../../api/careerTestApi";

const { Title, Text } = Typography; // BƯỚC 2: Khai báo chuẩn bóc tách của ES Modules

const StudentCareerTestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // --- State ---
  const [testData, setTestData] = useState<CareerTestNew | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái làm bài
  const [hasEnrolled, setHasEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Trạng thái kết quả
  const [result, setResult] = useState<CareerTestSubmitResult | null>(null);

  // --- useEffect: lấy đề bài ---
  useEffect(() => {
    if (!id) {
      setError("ID bài test không hợp lệ.");
      setLoading(false);
      return;
    }

    const fetchTest = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await careerTestApi.getCareerTestById(id);
        setTestData(data);
      } catch {
        message.error("Không tải được đề bài. Vui lòng thử lại.");
        setError("Không tải được đề bài.");
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [id]);

  // --- Hàm enroll ---
  const handleEnroll = async () => {
    if (!id) return;
    try {
      setEnrolling(true);
      await careerTestApi.enrollCareerTest(id);
      message.success("Đăng ký thành công! Bắt đầu làm bài.");
      setHasEnrolled(true);
    } catch {
      message.error("Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setEnrolling(false);
    }
  };

  // --- Hàm nộp bài ---
  const handleSubmit = async () => {
    if (!id || !testData) return;

    const totalQuestions = testData.questions.length;
    if (Object.keys(answers).length < totalQuestions) {
      message.warning("Vui lòng trả lời tất cả câu hỏi trước khi nộp.");
      return;
    }

    try {
      setSubmitting(true);
      const payload: CareerTestAnswer[] = Object.entries(answers).map(
        ([idx, ans]) => ({
          questionIndex: Number(idx),
          answer: ans,
        })
      );
      const res = await careerTestApi.submitCareerTest(id, payload);
      setResult(res);
    } catch {
      message.error("Nộp bài thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render: Loading ---
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <Spin size="large" tip="Đang tải đề bài..." />
      </div>
    );
  }

  // --- Render: Lỗi ---
  if (error || !testData) {
    return (
      <div style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
        <Card>
          <Empty
            description={error || "Không tìm thấy bài test."}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate(-1)}>
              Quay lại
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  // --- Render: Kết quả ---
  if (result) {
    return (
      <div style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
        <Card
          style={{ marginBottom: 24 }}
          title={
            <span style={{ fontSize: 20 }}>
              Kết quả bài test — {testData.title}
            </span>
          }
        >
          {/* Tổng quan */}
          <div style={{ marginBottom: 16 }}>
            <Tag
              color={result.score >= 70 ? "green" : result.score >= 40 ? "orange" : "red"}
              style={{ fontSize: 16, padding: "4px 12px" }}
            >
              {result.score >= 70 ? "Xuất sắc" : result.score >= 40 ? "Đạt yêu cầu" : "Cần cải thiện"}
            </Tag>
            <div style={{ marginTop: 12 }}>
              <Text strong>Điểm: </Text>
              <Text style={{ fontSize: 18, color: "#1890ff" }}>
                {result.score} / 100
              </Text>
            </div>
            <div>
              <Text strong>Đúng: </Text>
              <Text>
               {result.details?.filter(d => d.isCorrect).length || 0} / {result.details?.length || 0} câu
              </Text>
            </div>
            {result.feedback && (
              <div style={{ marginTop: 12 }}>
                <Text strong>Nhận xét: </Text>
                <Text italic>"{result.feedback}"</Text>
              </div>
            )}
          </div>

          <Button type="primary" onClick={() => navigate("/career-paths")}>
            Quay về lộ trình nghề nghiệp
          </Button>
        </Card>

        {/* Chi tiết từng câu */}
        <Title level={4}>Chi tiết từng câu</Title>
        {result.details.map((detail, idx) => {
          const q = testData.questions[detail.questionIndex];
          return (
            <Card
              key={idx}
              size="small"
              style={{
                marginBottom: 12,
                borderLeft: `4px solid ${detail.isCorrect ? "#52c41a" : "#ff4d4f"}`,
              }}
            >
              <div style={{ marginBottom: 4 }}>
                <Text strong>
                  Câu {idx + 1}:{" "}
                  {q?.type === "MULTIPLE_CHOICE" ? "Trắc nghiệm" : "Tự luận"}
                </Text>
                <Tag
                  color={detail.isCorrect ? "green" : "red"}
                  style={{ marginLeft: 8 }}
                >
                  {detail.isCorrect
                    ? `Đúng (${detail.earnedPoints}/${detail.maxPoints} điểm)`
                    : `Sai (${detail.earnedPoints}/${detail.maxPoints} điểm)`}
                </Tag>
              </div>
              <Text style={{ display: "block", marginBottom: 8 }}>
                {q?.question}
              </Text>
              <Text
                type="secondary"
                italic
                style={{ display: "block", fontSize: 13 }}
              >
                {detail.explanation}
              </Text>
            </Card>
          );
        })}

        {/* Gợi ý khóa học */}
        {result.suggestions && result.suggestions.length > 0 && (
          <Card
            title="Gợi ý khóa học cải thiện"
            style={{ marginTop: 16 }}
          >
            <List
              size="small"
              bordered
              dataSource={result.suggestions}
              renderItem={(item: any) => (
                <List.Item>
                  <a href={`/courses/${item.id}`}>
                    {item.title || item.name || "Khóa học gợi ý"}
                  </a>
                </List.Item>
              )}
            />
          </Card>
        )}
      </div>
    );
  }

  // --- Render: Form làm bài ---
  const totalQuestions = testData.questions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <Title level={4}>{testData.title}</Title>
        <Text type="secondary">{testData.description}</Text>
        <div style={{ marginTop: 12 }}>
          <Text type="secondary">
            {answeredCount} / {totalQuestions} câu đã trả lời
          </Text>
          <Progress percent={progressPercent} size="small" style={{ marginTop: 4 }} />
        </div>
      </Card>

      {/* Nút Bắt đầu (trước khi enroll) */}
      {!hasEnrolled && (
        <Card style={{ textAlign: "center", marginBottom: 16 }}>
          <Title level={5}>Sẵn sàng làm bài?</Title>
          <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
            Bạn cần đăng ký trước khi bắt đầu. Thời gian làm bài không giới hạn.
          </Text>
          <Button
            type="primary"
            size="large"
            onClick={handleEnroll}
            loading={enrolling}
          >
            Bắt đầu làm bài
          </Button>
        </Card>
      )}

      {/* Danh sách câu hỏi */}
      {hasEnrolled && (
        <>
          {testData.questions.map((q, index) => {
            const isMultipleChoice = q.type === "MULTIPLE_CHOICE";
            const options = isMultipleChoice
              ? typeof q.options === "object" && !Array.isArray(q.options)
                ? Object.entries(q.options as Record<string, string>).map(
                    ([key, value]) => ({
                      label: value,
                      value: key,
                    })
                  )
                : Array.isArray(q.options)
                ? q.options.map((opt, i) => ({
                    label: opt,
                    value: String.fromCharCode(65 + i),
                  }))
                : []
              : [];

            return (
              <Card
                key={q.id || index}
                style={{ marginBottom: 16 }}
                title={
                  <span>
                    Câu {index + 1}
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      {isMultipleChoice ? "Trắc nghiệm" : "Tự luận"}
                    </Tag>
                    {q.points && (
                      <Tag color="purple" style={{ marginLeft: 4 }}>
                        {q.points} điểm
                      </Tag>
                    )}
                  </span>
                }
              >
                <Text
                  strong
                  style={{ display: "block", marginBottom: 16, fontSize: 15 }}
                >
                  {q.question}
                </Text>

                {isMultipleChoice ? (
                  <Radio.Group
                    value={answers[index]}
                    onChange={(e) =>
                      setAnswers({ ...answers, [index]: e.target.value })
                    }
                    style={{ width: "100%" }}
                  >
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {options.map((opt: any) => (
                        <Radio
                          key={opt.value}
                          value={opt.value}
                          style={{
                            fontSize: 15,
                            padding: "8px 12px",
                            border: "1px solid #d9d9d9",
                            borderRadius: 6,
                            width: "100%",
                            display: "block",
                            background:
                              answers[index] === opt.value
                                ? "#e6f7ff"
                                : "transparent",
                          }}
                        >
                          <span style={{ marginLeft: 4 }}>{opt.label}</span>
                        </Radio>
                      ))}
                    </Space>
                  </Radio.Group>
                ) : (
                  <Input.TextArea
                    value={answers[index] || ""}
                    onChange={(e) =>
                      setAnswers({ ...answers, [index]: e.target.value })
                    }
                    placeholder="Nhập câu trả lời của bạn..."
                    rows={4}
                    style={{ fontSize: 15 }}
                  />
                )}
              </Card>
            );
          })}

          {/* Loading khi AI đang chấm */}
          {submitting && (
            <Card style={{ textAlign: "center", marginBottom: 16 }}>
              <Spin size="large" tip="AI đang chấm bài, vui lòng chờ..." />
            </Card>
          )}

          {/* Nút nộp bài */}
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <Button
              type="primary"
              size="large"
              onClick={handleSubmit}
              loading={submitting}
              disabled={
                Object.keys(answers).length < totalQuestions || submitting
              }
            >
              Nộp bài
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentCareerTestPage;
