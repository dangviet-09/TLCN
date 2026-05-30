import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { ArrowLeft, Plus, Trash2, Save, X } from "lucide-react";
import { message } from "antd";

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

export interface SkillRequirement {
  skillName: string;
  level: "REQUIRED" | "NICE_TO_HAVE";
  minProficiency?: number;
}

export interface JobFormData {
  title: string;
  description: string;
  location: string;
  salaryMin: number | string;
  salaryMax: number | string;
  employmentType: "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT" | "";
  experienceLevel: "FRESHER" | "JUNIOR" | "MIDIOR" | "SENIOR" | "";
  deadline: string;
  status: "OPEN" | "CLOSED" | "DRAFT" | "";
  skillRequirements: SkillRequirement[];
}

interface JobDetail extends JobFormData {
  id: string;
  companyId: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  location?: string;
  salaryMin?: string;
  salaryMax?: string;
  employmentType?: string;
  experienceLevel?: string;
  deadline?: string;
  status?: string;
  skillRequirements?: string;
}

// ─── Enum Options ──────────────────────────────────────────────────────────────

const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Toàn thời gian" },
  { value: "PART_TIME", label: "Bán thời gian" },
  { value: "INTERNSHIP", label: "Thực tập" },
  { value: "CONTRACT", label: "Hợp đồng" },
];

const EXPERIENCE_LEVELS = [
  { value: "FRESHER", label: "Fresher" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MIDIOR", label: "Midior" },
  { value: "SENIOR", label: "Senior" },
];

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Bản nháp" },
  { value: "OPEN", label: "Đang tuyển" },
  { value: "CLOSED", label: "Đã đóng" },
];

const SKILL_LEVELS = [
  { value: "REQUIRED", label: "Bắt buộc" },
  { value: "NICE_TO_HAVE", label: "Là điểm cộng" },
];

// ─── Initial Form Data ────────────────────────────────────────────────────────

const initialFormData: JobFormData = {
  title: "",
  description: "",
  location: "",
  salaryMin: "",
  salaryMax: "",
  employmentType: "",
  experienceLevel: "",
  deadline: "",
  status: "DRAFT",
  skillRequirements: [],
};

// ─── Component ─────────────────────────────────────────────────────────────────

const CompanyJobForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [fetchingJob, setFetchingJob] = useState(isEditMode);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch job data for edit mode
  useEffect(() => {
    if (!isEditMode || !id) return;

    const fetchJob = async () => {
      try {
        setFetchingJob(true);
        setFetchError(null);
        const data = await apiClient.get<JobDetail>(`/jobs/${id}`);

        const loaded: JobFormData = {
          title: data.title ?? "",
          description: data.description ?? "",
          location: data.location ?? "",
          salaryMin: data.salaryMin ?? "",
          salaryMax: data.salaryMax ?? "",
          employmentType: data.employmentType ?? "",
          experienceLevel: data.experienceLevel ?? "",
          deadline: data.deadline ? String(data.deadline).split("T")[0] : "",
          status: data.status ?? "DRAFT",
          skillRequirements: Array.isArray(data.skillRequirements)
            ? data.skillRequirements.map((s) => ({
                skillName: s.skillName ?? "",
                level: s.level ?? "REQUIRED",
                minProficiency: s.minProficiency ?? 3,
              }))
            : [],
        };
        setFormData(loaded);
      } catch (err: any) {
        setFetchError(err?.response?.data?.message || err?.message || "Không thể tải thông tin việc làm.");
      } finally {
        setFetchingJob(false);
      }
    };

    fetchJob();
  }, [isEditMode, id]);

  // ─── Field Handlers ─────────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSkillChange = (
    index: number,
    field: keyof SkillRequirement,
    value: string | number
  ) => {
    setFormData((prev) => {
      const updated = [...prev.skillRequirements];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, skillRequirements: updated };
    });
  };

  const handleAddSkill = () => {
    setFormData((prev) => ({
      ...prev,
      skillRequirements: [
        ...prev.skillRequirements,
        { skillName: "", level: "REQUIRED", minProficiency: 3 },
      ],
    }));
  };

  const handleRemoveSkill = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      skillRequirements: prev.skillRequirements.filter((_, i) => i !== index),
    }));
  };

  // ─── Validation ─────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!formData.title.trim()) {
      newErrors.title = "Tiêu đề là bắt buộc.";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Mô tả là bắt buộc.";
    }
    if (!formData.location.trim()) {
      newErrors.location = "Địa điểm là bắt buộc.";
    }
    if (!formData.employmentType) {
      newErrors.employmentType = "Loại hình công việc là bắt buộc.";
    }
    if (!formData.experienceLevel) {
      newErrors.experienceLevel = "Cấp bậc kinh nghiệm là bắt buộc.";
    }
    if (!formData.deadline) {
      newErrors.deadline = "Hạn nộp là bắt buộc.";
    } else {
      const deadlineDate = new Date(formData.deadline);
      deadlineDate.setHours(0, 0, 0, 0);
      if (deadlineDate < today) {
        newErrors.deadline = "Hạn nộp không được nhỏ hơn ngày hiện tại.";
      }
    }
    if (!formData.status) {
      newErrors.status = "Trạng thái là bắt buộc.";
    }

    const salaryMin = formData.salaryMin !== "" ? Number(formData.salaryMin) : null;
    const salaryMax = formData.salaryMax !== "" ? Number(formData.salaryMax) : null;

    if (salaryMin !== null && salaryMin < 0) {
      newErrors.salaryMin = "Lương tối thiểu phải là số dương.";
    }
    if (salaryMax !== null && salaryMax < 0) {
      newErrors.salaryMax = "Lương tối đa phải là số dương.";
    }
    if (salaryMin !== null && salaryMax !== null && salaryMax < salaryMin) {
      newErrors.salaryMax = "Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        salaryMin:
          formData.salaryMin !== "" ? Number(formData.salaryMin) : null,
        salaryMax:
          formData.salaryMax !== "" ? Number(formData.salaryMax) : null,
        employmentType: formData.employmentType,
        experienceLevel: formData.experienceLevel,
        deadline: formData.deadline,
        status: formData.status,
        skillRequirements: formData.skillRequirements
          .filter((s) => s.skillName.trim() !== "")
          .map((s) => ({
            skillName: s.skillName.trim(),
            level: s.level,
            minProficiency: s.minProficiency ?? 3,
          })),
      };

      if (isEditMode && id) {
        await apiClient.put(`/jobs/${id}`, payload);
        message.success("Cập nhật việc làm thành công!");
      } else {
        await apiClient.post("/jobs", payload);
        message.success("Tạo việc làm thành công!");
      }

      navigate("/company/jobs");
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Lưu việc làm thất bại."
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (fetchingJob) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{fetchError}</p>
        <button
          onClick={() => navigate("/company/jobs")}
          className="text-blue-600 hover:underline text-sm"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/company/jobs")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isEditMode ? "Chỉnh sửa việc làm" : "Đăng tin tuyển dụng mới"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEditMode
              ? "Cập nhật thông tin tin tuyển dụng"
              : "Điền đầy đủ thông tin bên dưới để đăng tin tuyển dụng"}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="px-6 py-6 max-w-5xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Two-column layout */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">
              Thông tin cơ bản
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">

              {/* Title */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="VD: Backend Developer (Node.js)"
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-colors ${
                    errors.title
                      ? "border-red-400 focus:border-red-500 bg-red-50"
                      : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  }`}
                />
                {errors.title && (
                  <p className="text-xs text-red-500 mt-1">{errors.title}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Địa điểm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="VD: Hồ Chí Minh"
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-colors ${
                    errors.location
                      ? "border-red-400 focus:border-red-500 bg-red-50"
                      : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  }`}
                />
                {errors.location && (
                  <p className="text-xs text-red-500 mt-1">{errors.location}</p>
                )}
              </div>

              {/* Employment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Loại hình <span className="text-red-500">*</span>
                </label>
                <select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-colors appearance-none bg-white ${
                    errors.employmentType
                      ? "border-red-400 focus:border-red-500 bg-red-50"
                      : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  }`}
                >
                  <option value="">-- Chọn loại hình --</option>
                  {EMPLOYMENT_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.employmentType && (
                  <p className="text-xs text-red-500 mt-1">{errors.employmentType}</p>
                )}
              </div>

              {/* Experience Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cấp bậc <span className="text-red-500">*</span>
                </label>
                <select
                  name="experienceLevel"
                  value={formData.experienceLevel}
                  onChange={handleChange}
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-colors appearance-none bg-white ${
                    errors.experienceLevel
                      ? "border-red-400 focus:border-red-500 bg-red-50"
                      : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  }`}
                >
                  <option value="">-- Chọn cấp bậc --</option>
                  {EXPERIENCE_LEVELS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.experienceLevel && (
                  <p className="text-xs text-red-500 mt-1">{errors.experienceLevel}</p>
                )}
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Hạn nộp <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-colors ${
                    errors.deadline
                      ? "border-red-400 focus:border-red-500 bg-red-50"
                      : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  }`}
                />
                {errors.deadline && (
                  <p className="text-xs text-red-500 mt-1">{errors.deadline}</p>
                )}
              </div>

              {/* Salary Min */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Lương tối thiểu (VND)
                </label>
                <input
                  type="number"
                  name="salaryMin"
                  value={formData.salaryMin}
                  onChange={handleChange}
                  placeholder="VD: 15000000"
                  min="0"
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-colors ${
                    errors.salaryMin
                      ? "border-red-400 focus:border-red-500 bg-red-50"
                      : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  }`}
                />
                {errors.salaryMin && (
                  <p className="text-xs text-red-500 mt-1">{errors.salaryMin}</p>
                )}
              </div>

              {/* Salary Max */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Lương tối đa (VND)
                </label>
                <input
                  type="number"
                  name="salaryMax"
                  value={formData.salaryMax}
                  onChange={handleChange}
                  placeholder="VD: 25000000"
                  min="0"
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-colors ${
                    errors.salaryMax
                      ? "border-red-400 focus:border-red-500 bg-red-50"
                      : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  }`}
                />
                {errors.salaryMax && (
                  <p className="text-xs text-red-500 mt-1">{errors.salaryMax}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Trạng thái <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-colors appearance-none bg-white ${
                    errors.status
                      ? "border-red-400 focus:border-red-500 bg-red-50"
                      : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  }`}
                >
                  <option value="">-- Chọn trạng thái --</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.status && (
                  <p className="text-xs text-red-500 mt-1">{errors.status}</p>
                )}
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mô tả công việc <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Mô tả chi tiết về công việc, yêu cầu, quyền lợi..."
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-colors resize-y ${
                    errors.description
                      ? "border-red-400 focus:border-red-500 bg-red-50"
                      : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  }`}
                />
                {errors.description && (
                  <p className="text-xs text-red-500 mt-1">{errors.description}</p>
                )}
              </div>

            </div>
          </div>

          {/* Skill Requirements */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">
                Yêu cầu kỹ năng
              </h2>
              <button
                type="button"
                onClick={handleAddSkill}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Thêm kỹ năng
              </button>
            </div>

            {formData.skillRequirements.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Chưa có yêu cầu kỹ năng nào. Nhấn "Thêm kỹ năng" để bắt đầu.
              </div>
            ) : (
              <div className="space-y-3">
                {formData.skillRequirements.map((skill, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 items-end"
                  >
                    {/* Skill Name */}
                    <div className="col-span-5">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Tên kỹ năng
                      </label>
                      <input
                        type="text"
                        value={skill.skillName}
                        onChange={(e) =>
                          handleSkillChange(index, "skillName", e.target.value)
                        }
                        placeholder="VD: ReactJS"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    {/* Level */}
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Mức độ
                      </label>
                      <select
                        value={skill.level}
                        onChange={(e) =>
                          handleSkillChange(
                            index,
                            "level",
                            e.target.value as "REQUIRED" | "NICE_TO_HAVE"
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white appearance-none"
                      >
                        {SKILL_LEVELS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Min Proficiency */}
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Mức thành thạo tối thiểu (1–5)
                      </label>
                      <input
                        type="number"
                        value={skill.minProficiency ?? 3}
                        onChange={(e) =>
                          handleSkillChange(
                            index,
                            "minProficiency",
                            Math.min(5, Math.max(1, Number(e.target.value)))
                          )
                        }
                        min={1}
                        max={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    {/* Remove Button */}
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(index)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pb-4">
            <button
              type="button"
              onClick={() => navigate("/company/jobs")}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang lưu…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditMode ? "Cập nhật" : "Đăng tin"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyJobForm;
