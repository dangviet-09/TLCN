import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  DollarSign,
  Briefcase,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  GraduationCap,
  Star,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

type SkillLevel = "REQUIRED" | "NICE_TO_HAVE";

type SkillRequirement = {
  skillName: string;
  level: SkillLevel;
  minProficiency?: number;
  proficiency?: number;
  matched?: boolean;
};

type JobCompany = {
  id: string;
  companyName: string;
  industry?: string;
  logo?: string | null;
};

type Job = {
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
};

// jobRes is the unwrapped Job object (BE: ApiResponse.data = Job)
type JobDetailResponse = Job;

type SkillGapResponse = {
  required: SkillRequirement[];
  niceToHave: SkillRequirement[];
  matchPercentage: number;
};

type LearningLesson = {
  id: string;
  title: string;
  order: number;
};

type LearningCourse = {
  courseId: string;
  courseTitle: string;
  lessons: LearningLesson[];
};

type LearningPathResponse = {
  mustLearn: LearningCourse[];
  niceToKnow: LearningCourse[];
};

// ─── Label Maps ───────────────────────────────────────────────────────────────

const employmentLabels: Record<Job["employmentType"], string> = {
  FULL_TIME: "Toàn thời gian",
  PART_TIME: "Bán thời gian",
  INTERNSHIP: "Thực tập",
  CONTRACT: "Hợp đồng",
};

const experienceLabels: Record<Job["experienceLevel"], string> = {
  FRESHER: "Fresher",
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatSalary = (min: number | null, max: number | null): string => {
  if (min === null && max === null) return "Thoả thuận";
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}M` : `${n}`);
  if (min !== null && max !== null)
    return `${fmt(min)} - ${fmt(max)} VNĐ`;
  if (min !== null) return `Từ ${fmt(min)} VNĐ`;
  return `Đến ${fmt(max!)} VNĐ`;
};

const MatchProgress = ({ percentage }: { percentage: number }) => {
  const clamped = Math.min(100, Math.max(0, percentage));
  const color =
    clamped >= 70
      ? "text-green-600"
      : clamped >= 40
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r="52"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />
          <circle
            cx="64"
            cy="64"
            r="52"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(clamped / 100) * 327} 327`}
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-bold ${color}`}>{clamped}%</span>
        </div>
      </div>
      <p className="text-gray-500 text-sm text-center">
        Mức độ phù hợp kỹ năng
      </p>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [job, setJob] = useState<Job | null>(null);
  const [skillGap, setSkillGap] = useState<SkillGapResponse | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPathResponse | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);

        const [jobRes, skillGapRes, learningPathRes] = await Promise.all([
          apiClient.get<JobDetailResponse>(`/jobs/${id}`),
          apiClient.get<SkillGapResponse>(`/jobs/${id}/skill-gap`),
          apiClient.get<LearningPathResponse>(`/jobs/${id}/learning-path`),
        ]);

        // BE trả trực tiếp: data = Job
        setJob(jobRes ?? null);
        // BE trả trực tiếp: data = { required, niceToHave, matchPercentage }
        setSkillGap(skillGapRes ?? null);
        // BE trả trực tiếp: data = { mustLearn, niceToKnow }
        setLearningPath(learningPathRes ?? null);
      } catch (err: any) {
        const msg =
          err?.response?.status === 404
            ? "Việc làm không tồn tại."
            : err?.response?.status === 401
            ? "Vui lòng đăng nhập để xem chi tiết."
            : "Không thể tải thông tin việc làm.";
        setError(msg);
        console.error("JobDetailPage fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Top bar skeleton */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-px h-4 bg-gray-200" />
            <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ─── LEFT: Job Info Skeleton ─────────────────── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header Card */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex-1">
                    <div className="h-8 bg-gray-200 rounded-lg w-3/4 mb-3 animate-pulse" />
                    <div className="h-5 bg-gray-200 rounded-lg w-1/2 animate-pulse" />
                  </div>
                  <div className="h-7 w-20 bg-gray-200 rounded-full animate-pulse" />
                </div>
                {/* Quick stats skeleton */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-gray-100">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
                {/* Badges skeleton */}
                <div className="flex gap-2 mt-4">
                  <div className="h-6 w-24 bg-gray-100 rounded-full animate-pulse" />
                  <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                  <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
                </div>
                {/* CTA skeleton */}
                <div className="h-12 bg-gray-100 rounded-xl mt-5 pt-5 border-t border-gray-100 animate-pulse" />
              </div>

              {/* Description skeleton */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="h-5 bg-gray-200 rounded-lg w-1/4 mb-4 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded w-4/6 animate-pulse" />
                </div>
              </div>

              {/* Skills skeleton */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="h-5 bg-gray-200 rounded-lg w-1/3 mb-4 animate-pulse" />
                <div className="flex flex-wrap gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-7 w-20 bg-gray-100 rounded-full animate-pulse" />
                  ))}
                </div>
              </div>
            </div>

            {/* ─── RIGHT: Sidebar Skeleton ──────────────────── */}
            <div className="space-y-6">
              {/* Skill Gap Dashboard */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="h-5 bg-gray-200 rounded-lg w-2/3 mb-5 animate-pulse" />
                {/* Circle skeleton */}
                <div className="flex justify-center mb-4">
                  <div className="w-32 h-32 rounded-full bg-gray-100 animate-pulse" />
                </div>
                {/* AI Analyzing text */}
                <div className="flex flex-col items-center gap-2 mb-5">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <p className="text-sm text-blue-600 font-medium text-center">
                    Đang phân tích độ phù hợp kỹ năng bằng AI...
                  </p>
                </div>
                {/* Skill rows skeleton */}
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Learning Path */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 bg-gray-200 rounded-lg w-2/3 animate-pulse" />
                </div>
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-600 font-medium mb-4">
            {error ?? "Đã xảy ra lỗi không xác định."}
          </p>
          <button
            onClick={() => navigate("/jobs/market")}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại danh sách việc làm
          </button>
        </div>
      </div>
    );
  }

  const requiredSkills = skillGap?.required ?? [];
  const niceToHaveSkills = skillGap?.niceToHave ?? [];
  const mustLearn = learningPath?.mustLearn ?? [];
  const niceToKnow = learningPath?.niceToKnow ?? [];
  const matchPercentage = skillGap?.matchPercentage ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/jobs/market")}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500 text-sm">Việc làm</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ─── LEFT: Job Info ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    {job?.title ?? "—"}
                  </h1>
                  <p className="text-blue-600 font-medium text-lg">
                    {job?.company?.companyName ?? "—"}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    job?.status === "OPEN"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {job?.status === "OPEN" ? "Đang tuyển" : "Đã đóng"}
                </span>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
                {job?.location && (
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{job?.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span>{formatSalary(job?.salaryMin ?? null, job?.salaryMax ?? null)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span>{employmentLabels[job?.employmentType ?? "FULL_TIME"]}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>
                    Hạn:{" "}
                    {job?.deadline
                      ? new Date(job?.deadline ?? "").toLocaleDateString("vi-VN")
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                  {employmentLabels[job?.employmentType ?? "FULL_TIME"]}
                </span>
                <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-1 rounded-full">
                  {experienceLabels[job?.experienceLevel ?? "FRESHER"]}
                </span>
                <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {job?.viewCount ?? 0} lượt xem
                </span>
              </div>

              {/* Apply CTA */}
              <div className="mt-5 pt-5 border-t border-gray-100">
                <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm">
                  Ứng tuyển ngay
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Mô tả công việc
              </h2>
              <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
                {job?.description ?? "—"}
              </div>
            </div>

            {/* Skill Requirements */}
            {job?.skillRequirements && job?.skillRequirements?.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Yêu cầu kỹ năng
                </h2>
                <div className="flex flex-wrap gap-2">
                  {job?.skillRequirements?.map((skill, idx) => (
                    <span
                      key={idx}
                      className={`text-sm font-medium px-3 py-1 rounded-full ${
                        skill.level === "REQUIRED"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {skill.skillName}
                      {skill.minProficiency != null
                        ? ` (min ${skill.minProficiency})`
                        : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── RIGHT: Sidebar ──────────────────────────────── */}
          <div className="space-y-6">
            {/* Skill Gap Dashboard */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">
                Phân tích kỹ năng
              </h2>

              {/* Match Progress Circle */}
              <div className="flex justify-center mb-6">
                <MatchProgress percentage={matchPercentage} />
              </div>

              {/* Required Skills */}
              {requiredSkills.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Bắt buộc
                  </h3>
                  <div className="space-y-2">
                    {requiredSkills.map((skill, idx) => {
                      const matched = skill.matched ?? false;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                            matched
                              ? "bg-green-50 border border-green-200"
                              : "bg-red-50 border border-red-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {matched ? (
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            )}
                            <span
                              className={`font-medium truncate ${
                                matched ? "text-green-800" : "text-red-800"
                              }`}
                            >
                              {skill.skillName ?? "—"}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-medium ml-2 flex-shrink-0 ${
                              matched ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            {matched ? (
                              skill.proficiency != null
                                ? `${skill.proficiency} / ${skill.minProficiency ?? "?"}`
                                : "Đạt"
                            ) : (
                              <>
                                {skill.proficiency ?? 0}
                                {skill.minProficiency != null
                                  ? ` / ${skill.minProficiency}`
                                  : ""}
                              </>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nice to Have */}
              {niceToHaveSkills.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Là điểm cộng
                  </h3>
                  <div className="space-y-2">
                    {niceToHaveSkills.map((skill, idx) => {
                      const matched = skill.matched ?? false;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                            matched
                              ? "bg-blue-50 border border-blue-200"
                              : "bg-gray-50 border border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {matched ? (
                              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                            <span
                              className={`font-medium truncate ${
                                matched ? "text-blue-800" : "text-gray-500"
                              }`}
                            >
                              {skill.skillName ?? "—"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {requiredSkills.length === 0 && niceToHaveSkills.length === 0 && (
                <p className="text-gray-400 text-sm text-center">
                  {skillGap === null
                    ? "Đang phân tích kỹ năng..."
                    : "Không có dữ liệu kỹ năng."}
                </p>
              )}
            </div>

            {/* Learning Path */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Lộ trình học tập
                </h2>
              </div>

              {mustLearn.length === 0 && niceToKnow.length === 0 ? (
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-gray-600 text-sm font-medium">
                    Bạn đã có đủ kỹ năng,
                  </p>
                  <p className="text-gray-600 text-sm">
                    không cần học thêm khóa nào!
                  </p>
                </div>
              ) : (
                <>
                  {/* Must Learn */}
                  {mustLearn.length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-orange-500" />
                        <h3 className="text-sm font-semibold text-orange-700">
                          Cần học ngay
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {mustLearn.map((course, ci) => (
                          <div
                            key={ci}
                            className="border border-orange-200 bg-orange-50 rounded-lg p-3"
                          >
                            <p className="font-medium text-gray-900 text-sm mb-1">
                              {course.courseTitle ?? "—"}
                            </p>
                            {course.lessons && course.lessons.length > 0 ? (
                              <ul className="space-y-1">
                                {course.lessons.map((lesson, li) => (
                                  <li
                                    key={li}
                                    className="text-xs text-gray-500 flex items-center gap-1"
                                  >
                                    <span className="w-4 h-4 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                      {li + 1}
                                    </span>
                                    {lesson.title ?? "—"}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            <button
                              onClick={() =>
                                navigate(`/courses/${course.courseId}`)
                              }
                              className="mt-2 text-xs text-orange-600 hover:text-orange-700 font-medium"
                            >
                              Xem khóa học →
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nice to Know */}
                  {niceToKnow.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-semibold text-blue-700">
                          Nên biết
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {niceToKnow.map((course, ci) => (
                          <div
                            key={ci}
                            className="border border-blue-200 bg-blue-50 rounded-lg p-3"
                          >
                            <p className="font-medium text-gray-900 text-sm mb-1">
                              {course.courseTitle ?? "—"}
                            </p>
                            {course.lessons && course.lessons.length > 0 ? (
                              <ul className="space-y-1">
                                {course.lessons.map((lesson, li) => (
                                  <li
                                    key={li}
                                    className="text-xs text-gray-500 flex items-center gap-1"
                                  >
                                    <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                      {li + 1}
                                    </span>
                                    {lesson.title ?? "—"}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            <button
                              onClick={() =>
                                navigate(`/courses/${course.courseId}`)
                              }
                              className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Xem khóa học →
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailPage;
