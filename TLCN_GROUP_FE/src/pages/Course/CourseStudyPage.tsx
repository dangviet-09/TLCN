import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Form, Input, Button, Card, Tag, Typography, Spin, Alert, notification } from 'antd';
import { apiClient } from '../../services/apiClient';

const { Title, Text } = Typography;

interface AiGrading {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface SubmissionResult {
  score: number;
  aiGrading: AiGrading;
  status: string;
}

const CourseStudyPage: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const [form] = Form.useForm();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiGrading, setAiGrading] = useState<AiGrading | null>(null);

  useEffect(() => {
    const fetchLesson = async () => {
      if (!lessonId) { setLoading(false); return; }
      try {
        setLoading(true);
        const res = await apiClient.get(`/courses/${courseId}/lessons/${lessonId}`);
        setLesson(res);
      } catch (error) {
        console.error("Failed to load lesson:", error);
        notification.error({ message: "Không thể tải bài học" });
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [courseId, lessonId]);

  const handleSubmit = async (values: Record<string, string>) => {
    if (!courseId || !lessonId) return;

    try {
      setIsSubmitting(true);
      const result = await apiClient.post<SubmissionResult>(
        `/courses/${courseId}/lessons/${lessonId}/submit`,
        { submissionData: values }
      );
      if (result?.aiGrading) {
        setAiGrading(result.aiGrading);
      }
    } catch (error: any) {
      notification.error({
        message: 'Nộp bài thất bại',
        description: error?.response?.data?.message || error?.message || 'Đã xảy ra lỗi',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Text>Không tìm thấy bài học</Text>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <Title level={3}>{lesson.title}</Title>

      {/* Theory Content */}
      {lesson.theoryContent && (
        <Card title="Nội dung lý thuyết" className="mb-6">
          <div
            dangerouslySetInnerHTML={{ __html: lesson.theoryContent }}
            className="prose max-w-none"
          />
        </Card>
      )}

      {/* Task Description */}
      {lesson.taskDescription && (
        <Card title="Yêu cầu bài tập" className="mb-6">
          <div
            dangerouslySetInnerHTML={{ __html: lesson.taskDescription }}
            className="prose max-w-none"
          />
        </Card>
      )}

      {/* Render AI Grading Result */}
      {aiGrading && (
        <Card
          title="Kết quả chấm điểm AI"
          className="mb-6"
          style={{ borderColor: '#52c41a' }}
        >
          <div className="text-center mb-4">
            <Title level={1} style={{ color: '#52c41a', margin: 0 }}>
              {aiGrading.score}
            </Title>
            <Text type="secondary">/ 10 điểm</Text>
          </div>

          <Alert
            message={aiGrading.feedback}
            type="success"
            showIcon
            className="mb-4"
          />

          {aiGrading.strengths && aiGrading.strengths.length > 0 && (
            <div className="mb-4">
              <Title level={5}>Điểm mạnh</Title>
              <div className="flex flex-wrap gap-2">
                {(aiGrading.strengths || []).map((item, index) => (
                  <Tag key={`strength-${index}`} color="green">
                    {item}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {aiGrading.improvements && aiGrading.improvements.length > 0 && (
            <div>
              <Title level={5}>Cần cải thiện</Title>
              <div className="flex flex-wrap gap-2">
                {(aiGrading.improvements || []).map((item, index) => (
                  <Tag key={`improve-${index}`} color="warning">
                    {item}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Dynamic Submission Form */}
      {!aiGrading && lesson.type === 'TASK' && (
        <Card title="Nộp bài tập" className="mb-6">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            disabled={isSubmitting}
          >
            {(lesson.submissionFields || []).map((field: any) => (
              <Form.Item
                key={field.id || field.label}
                label={field.label}
                name={field.label}
                rules={[{ required: field.required, message: `Vui lòng nhập ${field.label}` }]}
              >
                <Input placeholder={`Nhập ${field.label}`} />
              </Form.Item>
            ))}

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting}
                style={{ minWidth: 200 }}
              >
                {isSubmitting ? 'AI đang phân tích mã nguồn...' : 'Nộp bài'}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}
    </div>
  );
};

export default CourseStudyPage;
