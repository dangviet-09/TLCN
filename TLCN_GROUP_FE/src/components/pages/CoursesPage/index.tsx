import React, { useEffect, useMemo, useState } from "react";
import MainTemplate from "../../templates/MainTemplate/MainTemplate";
import { CourseSection } from "../../organisms/CourseSection";
import { courseApi } from "../../../api/courseApi";
import { Course } from "../../../types/types";
import { CourseCardProps } from "../../molecules/CourseCard";
import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";

const FALLBACK_THUMBNAILS = [
	"https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
	"https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&w=800&q=80",
	"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
	"https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=800&q=80",
	"https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
	"https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=800&q=80",
];

const resolveImageUrl = (image?: string | null) => {
	if (!image) return null;
	if (image.startsWith("http")) return image;
	const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
	return base ? `${base}/${image.replace(/^\//, "")}` : image;
};

const normalizeCourse = (
	course: Course,
	index: number
): CourseCardProps => {
	const normalizedCategory = (course.category || "").toLowerCase();
	let type: CourseCardProps["type"] = "course";
	if (normalizedCategory.includes("combo")) {
		type = "combo";
	} else if (
		normalizedCategory.includes("full") ||
		normalizedCategory.includes("trọn bộ")
	) {
		type = "fullcourse";
	}

	// Default rating nếu không có từ API
	const rating = Number((4 + (index % 10) * 0.1).toFixed(1));

	return {
		id: course.id,
		title: course.title,
		thumbnail:
			resolveImageUrl(course.image) ||
			FALLBACK_THUMBNAILS[index % FALLBACK_THUMBNAILS.length],
		author: course.company?.companyName || "CodeLearn",
		rating,
		type,
		trending: index < 3,
	};
};

const CoursesPage: React.FC = () => {
	const { user } = useAuth();
	const [courses, setCourses] = useState<CourseCardProps[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchCourses = async () => {
			try {
				setLoading(true);
				setError(null);
				const response = await courseApi.getAll({ limit: 12 });
				const coursesData = Array.isArray(response.data) ? response.data : [];
				const normalized = coursesData.map((course, index) =>
					normalizeCourse(course, index)
				);
				setCourses(normalized);
			} catch (err) {
				console.error("Failed to load courses", err);
				setError("Unable to load course list. Please try again later.");
			} finally {
				setLoading(false);
			}
		};

		fetchCourses();
	}, []);

	const errorMessage = useMemo(() => {
		if (!error) return null;
		return (
			<div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
				{error}
			</div>
		);
	}, [error]);

	return (
		<MainTemplate>
			<div className="w-full">
				{errorMessage && (
					<div className="mx-auto w-full max-w-7xl px-4 pt-6">
						{errorMessage}
					</div>
				)}
				<CourseSection courses={courses} loading={loading} />
			</div>
		</MainTemplate>
	);
};

export default CoursesPage;


