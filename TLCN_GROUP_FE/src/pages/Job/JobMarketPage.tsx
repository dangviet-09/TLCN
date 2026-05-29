import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, DollarSign, Search, Briefcase, Clock } from "lucide-react";
import { apiClient } from "../../services/apiClient";

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

export type SkillRequirement = {
  skillName: string;
  level: "REQUIRED" | "NICE_TO_HAVE";
  minProficiency?: number;
};

export type JobCompany = {
  id: string;
  companyName: string;
  industry?: string;
  logo?: string | null;
};

export type Job = {
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

export type JobListResponse = {
  data: Job[];
  total: number;
  page: number;
  limit: number;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatSalary = (min: number | null, max: number | null): string => {
  if (min === null && max === null) return "Thoả thuận";
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(0)}M` : `${n}`;
  if (min !== null && max !== null) return `${fmt(min)} - ${fmt(max)} VNĐ`;
  if (min !== null) return `Từ ${fmt(min)} VNĐ`;
  return `Đến ${fmt(max!)} VNĐ`;
};

const employmentTypeLabels: Record<Job["employmentType"], string> = {
  FULL_TIME: "Toàn thời gian",
  PART_TIME: "Bán thời gian",
  INTERNSHIP: "Thực tập",
  CONTRACT: "Hợp đồng",
};

const experienceLevelLabels: Record<Job["experienceLevel"], string> = {
  FRESHER: "Fresher",
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
};

// ─── Component ────────────────────────────────────────────────────────────────

const JobMarketPage: React.FC = () => {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get<JobListResponse>("/jobs/market");
        setJobs(response.data ?? []);
      } catch (err) {
        setError("Không thể tải danh sách việc làm. Vui lòng thử lại.");
        console.error("JobMarketPage fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">
            Việc làm IT nổi bật
          </h1>
          <p className="text-blue-100 mb-6">
            Khám phá hàng trăm cơ hội việc làm dành cho lập trình viên
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm việc làm..."
              className="w-full pl-12 pr-4 py-3 rounded-xl shadow-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 shadow-sm animate-pulse"
              >
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="flex gap-2 mb-4">
                  <div className="h-6 bg-gray-200 rounded w-20" />
                  <div className="h-6 bg-gray-200 rounded w-20" />
                </div>
                <div className="h-8 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Briefcase className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">Hiện chưa có việc làm nào.</p>
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <>
            <p className="text-gray-500 text-sm mb-4">
              Hiển thị {jobs.length} việc làm
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  {/* Title */}
                  <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-2">
                    {job.title}
                  </h3>

                  {/* Company */}
                  <p className="text-gray-500 text-sm mb-3">
                    {job.company?.companyName ?? "Công ty không xác định"}
                  </p>

                  {/* Location & Salary */}
                  <div className="space-y-1.5 mb-3">
                    {job.location && (
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <DollarSign className="w-4 h-4 flex-shrink-0" />
                      <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
                    </div>
                    {job.deadline && (
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>Hạn: {new Date(job.deadline).toLocaleDateString("vi-VN")}</span>
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {employmentTypeLabels[job.employmentType]}
                    </span>
                    <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {experienceLevelLabels[job.experienceLevel]}
                    </span>
                  </div>

                  {/* Skill Tags */}
                  {job.skillRequirements.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {job.skillRequirements.slice(0, 4).map((skill, idx) => (
                        <span
                          key={idx}
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            skill.level === "REQUIRED"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {skill.skillName}
                        </span>
                      ))}
                      {job.skillRequirements.length > 4 && (
                        <span className="text-xs text-gray-400 px-1 py-0.5">
                          +{job.skillRequirements.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/jobs/${job.id}`);
                    }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Xem chi tiết
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default JobMarketPage;
