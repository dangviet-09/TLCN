import { apiClient } from "./apiClient";
import { StudentProfile, UpdateStudentProfilePayload, StudentLearningResultsResponse } from "../types/types";

export const getStudentProfile = async (): Promise<StudentProfile> => {
  const response = await apiClient.get<any>('/students/profile');
  if (response.student) {
    return {
      id: response.id,
      studentId: response.student.id,
      fullName: response.fullName,
      username: response.username,
      email: response.email,
      address: response.address,
      major: response.student.major,
      school: response.student.school,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
  }

  return response as StudentProfile;
};

export const updateStudentProfile = async (payload: UpdateStudentProfilePayload): Promise<StudentProfile> => {
  const response = await apiClient.put<any>('/students/profile', payload);

  if (response.student) {
    return {
      id: response.id,
      studentId: response.student.id,
      fullName: response.fullName,
      username: response.username,
      email: response.email,
      address: response.address,
      major: response.student.major,
      school: response.student.school,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
  }

  return response as StudentProfile;
};

export const getStudentLearningResults = async (): Promise<StudentLearningResultsResponse> => {
  const response = await apiClient.get<any>('/students/enrolled-courses');

  const progress = response.progress || response.data || response || [];
  const completedCourses = progress.filter((p: any) => p.status === 'COMPLETED').length;
  const inProgressCourses = progress.filter((p: any) => p.status === 'IN_PROGRESS').length;

  return {
    progress,
    totalCourses: progress.length,
    completedCourses,
    inProgressCourses,
  };
};
