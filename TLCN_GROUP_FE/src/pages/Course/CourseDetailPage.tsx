import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainTemplate from "../../components/templates/MainTemplate/MainTemplate";
import { apiClient } from "../../services/apiClient";
import type { Course } from "../../types/types";

const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchCourse = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get<Course>(`/courses/${id}`);
        setCourse(res);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Không thể tải thông tin khóa học."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  if (loading) {
    return (
      <MainTemplate>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </MainTemplate>
    );
  }

  if (error || !course) {
    return (
      <MainTemplate>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-red-500">{error ?? "Không tìm thấy khóa học."}</p>
          <button
            onClick={() => navigate("/courses")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Quay lại danh sách
          </button>
        </div>
      </MainTemplate>
    );
  }

  const lessons = course.lessons ?? [];

  return (
    <MainTemplate>
      <div className="min-h-screen bg-gray-50 pb-12">
        {/* Back Button */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate("/courses")}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Quay lại danh sách khóa học
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Course Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="relative h-64 bg-gray-100">
              {course.image ? (
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="80"
                    height="80"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-50"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
              )}
              <div className="absolute top-4 right-4">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold shadow-lg text-white ${
                    course.status === "PUBLISHED"
                      ? "bg-green-500"
                      : course.status === "ARCHIVED"
                      ? "bg-gray-500"
                      : "bg-yellow-500"
                  }`}
                >
                  {course.status === "PUBLISHED"
                    ? "✓ Đã xuất bản"
                    : course.status === "ARCHIVED"
                    ? "Lưu trữ"
                    : "Bản nháp"}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
                <h1 className="text-4xl font-bold text-white">{course.title}</h1>
                {course.company?.companyName && (
                  <p className="text-gray-200 mt-1">{course.company.companyName}</p>
                )}
              </div>
            </div>

            {/* Course Meta */}
            <div className="p-8 space-y-6">
              {/* Description */}
              {course.description && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-500"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Mô tả
                  </h3>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {course.description}
                  </p>
                </div>
              )}

              {/* Category & Level */}
              <div className="flex flex-wrap gap-3">
                {course.category && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {course.category}
                  </span>
                )}
                {course.level && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {course.level}
                  </span>
                )}
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                  {lessons.length} bài giảng
                </span>
              </div>
            </div>
          </div>

          {/* Lessons List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-500"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              Danh sách bài giảng ({lessons.length})
            </h3>

            {lessons.length > 0 ? (
              <div className="space-y-3">
                {lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-4 p-5 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() =>
                      navigate(`/courses/${course!.id}/lessons/${lesson.id}`)
                    }
                  >
                    {/* Index Badge */}
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {index + 1}
                    </div>

                    {/* Lesson Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {lesson.title}
                      </h4>
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {lesson.theoryContent
                          ? "Lý thuyết"
                          : lesson.taskDescription
                          ? "Bài tập"
                          : "Bài học"}
                      </p>
                    </div>

                    {/* Type Tag */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                        lesson.type === "TASK"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {lesson.type === "TASK" ? "Bài tập" : "Lý thuyết"}
                    </span>

                    {/* Arrow */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-3 text-gray-300"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <p>Chưa có bài giảng nào.</p>
              </div>
            )}
          </div>

          {/* Final Test (Read-only) */}
          {course.finalTest && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-500"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Bài thi cuối khóa
              </h3>
              <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded">
                        FINAL TEST
                      </span>
                      <span className="text-sm text-gray-500">
                        Điểm tối đa: {course.finalTest.maxScore}
                      </span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {course.finalTest.title}
                    </h4>
                    <p className="text-gray-600 text-sm mt-1">
                      {course.finalTest.description || "Không có mô tả"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainTemplate>
  );
};

export default CourseDetailPage;
