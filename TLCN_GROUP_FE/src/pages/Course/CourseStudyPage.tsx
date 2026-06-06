import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Tag, Typography, Alert, notification, Progress } from 'antd';
import { CheckCircleFilled, PlayCircleOutlined, FileTextOutlined, CodeOutlined, LockOutlined } from '@ant-design/icons';
import { apiClient } from '../../services/apiClient';
import 'react-quill-new/dist/quill.snow.css'; // Môi trường render bắt buộc của Quill

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
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [lesson, setLesson] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [aiGrading, setAiGrading] = useState<AiGrading | null>(null);
  const [isNotEnrolled, setIsNotEnrolled] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() => {
      try {
          const saved = localStorage.getItem(`progress_${courseId}`);
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });
  const [submission, setSubmission] = useState<any>(null);
  const [fallbackAnswer, setFallbackAnswer] = useState("");
  const [answerValues, setAnswerValues] = useState<Record<string, string>>({});

  useEffect(() => {
      if (courseId && completedLessonIds.length > 0) {
          localStorage.setItem(`progress_${courseId}`, JSON.stringify(completedLessonIds));
      }
  }, [completedLessonIds, courseId]);

  useEffect(() => {
    const fetchLesson = async () => {
      if (!lessonId || !courseId) { setLoading(false); return; }
      try {
        setLoading(true);
        const [lessonRes, courseRes] = await Promise.all([
          apiClient.get('/courses/' + courseId + '/lessons/' + lessonId),
          apiClient.get('/courses/' + courseId),
        ]);
        const lessonData = (lessonRes as any).data?.data || (lessonRes as any).data || lessonRes;
        const courseData = (courseRes as any).data?.data || (courseRes as any).data || courseRes;
        setLesson(lessonData.lesson || lessonData);
        if (lessonData.progress) setProgress(lessonData.progress);
        if (lessonData.progress?.status === 'COMPLETED') {
          setCompletedLessonIds(prev => Array.from(new Set([...prev, lessonId!])));
        }
        if (lessonData.submission !== undefined) setSubmission(lessonData.submission);
        setCourse(courseData);

        // Redirect về bài học cao nhất nếu cố tình truy cập URL vượt cấp
        if (courseData?.lessons && lessonData.progress?.status !== 'COMPLETED') {
          const maxAllowedIndex = courseData.lessons.findIndex((l: any) => l.id === lessonData.progress.currentLessonId);
          const requestedIndex = courseData.lessons.findIndex((l: any) => l.id === lessonId);
          if (requestedIndex > maxAllowedIndex) {
            notification.warning({ message: "Vui lòng hoàn thành bài học hiện tại trước!" });
            navigate(`/courses/${courseId}/lessons/${lessonData.progress.currentLessonId}`);
            return;
          }
        }
      } catch (error: any) {
        console.error("Failed to load lesson:", error);
        if (error.response?.status === 400 || error.response?.data?.status === 400) {
          setIsNotEnrolled(true);
        } else {
          notification.error({ message: error.response?.data?.message || "Không thể tải bài học" });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [courseId, lessonId]);

  const handleComplete = async () => {
    if (!courseId || !lessonId) return;
    try {
      setIsCompleting(true);
      await apiClient.post(`/courses/${courseId}/lessons/${lessonId}/complete`);
      setProgress((prev: any) => ({ ...prev, status: 'COMPLETED' }));
      setCompletedLessonIds(prev => Array.from(new Set([...prev, lessonId!])));
      notification.success({ message: 'Bạn đã hoàn thành bài học này!' });
    } catch (error: any) {
      notification.error({
        message: 'Cập nhật thất bại',
        description: error?.response?.data?.message || error?.message || 'Đã xảy ra lỗi',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  if (isNotEnrolled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 bg-white rounded-lg shadow-sm border border-gray-100 p-8 m-4">
        <h2 className="text-2xl font-bold text-gray-800 m-0">Bạn chưa đăng ký khóa học này</h2>
        <p className="text-gray-500 text-base">Vui lòng quay lại trang chi tiết để đăng ký và bắt đầu lộ trình học của bạn.</p>
        <Button type="primary" size="large" onClick={() => navigate(`/courses/${courseId}`)}>
          Quay lại trang khóa học
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-lg text-gray-500 font-medium animate-pulse">Đang tải nội dung bài học...</div>
      </div>
    );
  }

  const handleSubmit = async (values: Record<string, string>) => {
    if (!courseId || !lessonId) return;

    try {
      setIsSubmitting(true);
      const payloadData = Object.keys(answerValues).length > 0 ? answerValues : { defaultField: "Lỗi: Không lấy được nội dung" };
      const result = await apiClient.post<SubmissionResult>(
        `/courses/${courseId}/lessons/${lessonId}/submit`,
        { submissionData: payloadData }
      );
      const submissionData = (result as any).data?.data || (result as any).data || result;

      if (submissionData?.aiGrading || (result as any).aiGrading) {
        setAiGrading(submissionData.aiGrading || (result as any).aiGrading);
      }

      setSubmission(submissionData);
    } catch (error: any) {
      notification.error({
        message: 'Nộp bài thất bại',
        description: error?.response?.data?.message || error?.message || 'Đã xảy ra lỗi',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!lesson && !loading && !isNotEnrolled) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] text-red-500 font-medium bg-gray-50 m-4 rounded-lg">
        Không thể tải cấu trúc bài học. Dữ liệu bị lỗi hoặc không tồn tại.
      </div>
    );
  }

  const progressPercent = course?.lessons?.length
    ? Math.round((completedLessonIds.length / course.lessons.length) * 100)
    : 0;

  const currentLessonIndex = course?.lessons?.findIndex((l: any) => l.id === progress?.currentLessonId) ?? 0;

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-gray-50">
      {/* Khu vực trái — Sidebar Mục lục */}
      <div className="w-[350px] flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col h-[calc(100vh-64px)]">
        {/* KHỐI HEADER — Dark Theme */}
        <div className="bg-[#1f2937] text-white p-6">
          <h3 className="font-bold text-lg mb-4 line-clamp-2">{course?.title || 'Đang tải...'}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Tiến độ khóa học</span>
            <Progress percent={progressPercent} showInfo={false} strokeColor="#3b82f6" trailColor="#374151" size="small" className="m-0 flex-1" />
          </div>
        </div>

        {/* KHỐI DANH SÁCH BÀI HỌC — Icon hóa */}
        <div className="flex-1 overflow-y-auto">
          {course?.lessons?.map((item: any, index: number) => {
            const isActive = item.id === lessonId;
            const isTheory = item.type === 'THEORY';
            const isLocked = index > currentLessonIndex && progress?.status !== 'COMPLETED';

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (!isLocked) navigate(`/courses/${courseId}/lessons/${item.id}`);
                }}
                className={`flex items-center justify-between p-4 border-b border-gray-200 transition-all ${
                  isLocked ? 'bg-gray-100 cursor-not-allowed opacity-70' :
                  isActive ? 'bg-white border-l-4 border-l-blue-600 cursor-pointer' :
                  'hover:bg-gray-50 border-l-4 border-l-transparent cursor-pointer'
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className={`mt-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                    {isLocked ? <LockOutlined /> : (isTheory ? <FileTextOutlined /> : <CodeOutlined />)}
                  </div>
                  <div>
                    <p className={`font-medium text-sm m-0 ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>{item.title}</p>
                    <p className="text-xs text-gray-400 m-0 mt-1">Bài {index + 1}</p>
                  </div>
                </div>
                <div className="text-gray-300">
                  {completedLessonIds.includes(item.id)
                    ? <CheckCircleFilled className="text-green-500 text-lg" />
                    : (!isLocked && <div className="w-5 h-5 rounded-full border-2 border-gray-300" />)
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Khu vực phải — Main Content */}
      <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-4xl">
          {/* Header */}
          <Title level={3}>{lesson.title}</Title>

          {/* Theory Content */}
          {lesson.theoryContent && (
            <Card title="Nội dung lý thuyết" className="mb-6">
              <div className="ql-snow">
                {/* Bơm CSS bọc thép ép kích thước Video và xóa bỏ class prose */}
                <style>{`
                  .ql-editor .ql-video {
                    width: 100%;
                    aspect-ratio: 16/9;
                    height: auto;
                    border-radius: 8px;
                    margin: 1.5rem 0;
                  }
                  .ql-editor img {
                    border-radius: 8px;
                  }
                `}</style>
                <div
                  className="ql-editor text-gray-700"
                  dangerouslySetInnerHTML={{ __html: lesson.theoryContent }}
                  style={{ padding: 0 }}
                />
              </div>
            </Card>
          )}

          {/* Task Description */}
          {lesson.taskDescription && (
            <Card title="Yêu cầu bài tập" className="mb-6">
              <div className="ql-snow">
                <style>{`
                  .ql-editor .ql-video {
                    width: 100%;
                    aspect-ratio: 16/9;
                    height: auto;
                    border-radius: 8px;
                    margin: 1.5rem 0;
                  }
                  .ql-editor img {
                    border-radius: 8px;
                  }
                `}</style>
                <div
                  className="ql-editor text-gray-700"
                  dangerouslySetInnerHTML={{ __html: lesson.taskDescription }}
                  style={{ padding: 0 }}
                />
              </div>
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
          {lesson.type === 'TASK' && (
            <Card title="Nộp bài tập" className="mb-6">
              {submission ? (
                <div className="bg-green-50 border border-green-200 p-4 rounded-md mt-4">
                  <h4 className="font-bold text-green-700 mb-2">Kết quả chấm điểm: {submission.score}/10</h4>
                  <div className="bg-white p-4 rounded-md border border-gray-200 mt-3">
                      <div className="text-gray-800 whitespace-pre-wrap break-words">
                          <strong className="text-gray-900 block mb-2">Bài làm của bạn:</strong>
                          {(() => {
                              const raw = submission?.content || submission?.submissionData;
                              if (!raw) return <span className="text-gray-400 italic">Không có nội dung</span>;

                              if (typeof raw === 'string') return raw;

                              const dataObj = raw.submissionData || raw;

                              if (typeof dataObj === 'object' && dataObj !== null) {
                                  const extractedText = Object.values(dataObj)
                                      .filter(val => typeof val === 'string' && val.trim() !== '')
                                      .join('\n\n---\n\n');
                                  return extractedText || JSON.stringify(dataObj, null, 2);
                              }

                              return JSON.stringify(raw);
                          })()}
                      </div>

                      {submission?.feedback && (
                          <div className="mt-4 pt-4 border-t border-dashed border-gray-300 text-gray-700 whitespace-pre-wrap break-words">
                              <strong className="text-blue-700 block mb-2">AI Nhận xét:</strong>
                              {submission.feedback}
                          </div>
                      )}
                  </div>
                </div>
              ) : (
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  disabled={isSubmitting}
                >
                  <div className="mt-4 mb-4">
                    {lesson?.submissionFields && lesson.submissionFields.length > 0 ? (
                      lesson.submissionFields.map((field: any, index: number) => (
                        <div key={index} className="mb-4">
                          <p className="mb-2 font-medium">
                            {field.required && <span className="text-red-500 mr-1">*</span>}
                            {field.label}
                          </p>
                          <Input.TextArea
                            placeholder={`Nhập ${field.label}`}
                            rows={4}
                            value={answerValues[field?.id || String(index)] || ''}
                            onChange={(e) => setAnswerValues(prev => ({...prev, [field?.id || String(index)]: e.target.value}))}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="mb-4">
                        <p className="mb-2 font-medium">
                          <span className="text-red-500 mr-1">*</span>Nội dung bài làm
                        </p>
                        <Input.TextArea
                          className="min-h-[150px] w-full"
                          placeholder="Nhập nội dung bài làm..."
                          value={answerValues['defaultField'] || ''}
                          onChange={(e) => setAnswerValues(prev => ({...prev, defaultField: e.target.value}))}
                        />
                      </div>
                    )}
                  </div>

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
              )}
            </Card>
          )}

          {/* Nút hoàn thành */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <Button
              type="primary"
              size="large"
              loading={isCompleting}
              disabled={progress?.status === 'COMPLETED'}
              onClick={handleComplete}
            >
              {progress?.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseStudyPage;
