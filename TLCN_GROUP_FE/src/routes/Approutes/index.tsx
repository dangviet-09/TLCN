import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import SignInPage from "../../components/pages/SignInPage";
import SignUpPage from "../../components/pages/SignUpPage";
import ForgotPasswordPage from "../../components/pages/ForgotPasswordPage";
import { OAuthSuccessPage } from "../../components/pages/OAuthSuccessPage";
import { useAuth } from "../../contexts/AuthContext";
import BlogPage from "../../components/pages/BlogPage";
import SourcePage from "../../components/pages/Source/SourcePage";
import { AdminRoute } from "../../components/molecules/AdminRoute";
import { AdminDashboard, StudentManagement, CompanyManagement, BlogManagement, CareerPathManagement } from "../../components/pages/Admin";
import { Unauthorized } from "../../components/pages/Unauthorized/Unauthorized";
import CareerPathsPage from "../../components/pages/CareerPaths/CareerPaths";
import CareerPathDetailsPage from "../../components/pages/CareerPathDetails/CareerPathDetails";
import CoursesPage from "../../components/pages/CoursesPage";
import CourseDetailPage from "../../components/pages/CourseDetailPage";
import CourseLearnPage from "../../components/pages/CourseLearnPage/CourseLearnPage";
import UserWallPage from "../../components/pages/UserWallPage";
import SettingsPage from "../../components/pages/Setting/Settings";
import ConnectionsPage from "../../components/pages/Connections";
import UserProfilePage from "../../components/pages/UserProfile";
import AIChat from "../../components/pages/AIChat";

// Phase 5: Course pages
import CourseListPage from "../../pages/Course/CourseListPage";
import CourseStudyPage from "../../pages/Course/CourseStudyPage";
import MyCoursesPage from "../../pages/Course/MyCoursesPage";
import { ProtectedRoute } from "../../components/ProtectedRoute";
// Phase 5: Company pages
import CompanyCourseManage from "../../pages/Company/CompanyCourseManage";
import CompanyCourseEdit from "../../pages/Company/CompanyCourseEdit";
import CompanyJobManage from "../../pages/Company/CompanyJobManage";
import CompanyJobForm from "../../pages/Company/CompanyJobForm";
import CompanyJobApplications from "../../pages/Company/CompanyJobApplications";
import CompanyCareerTestManage from "../../pages/Company/CompanyCareerTestManage";
// Phase 5: Admin pages
import AdminCoursePage from "../../pages/Admin/AdminCoursePage";
import AdminJobPage from "../../pages/Admin/AdminJobPage";
import AdminCareerTestPage from "../../pages/Admin/AdminCareerTestPage";
// Phase 5: Job pages
import JobMarketPage from "../../pages/Job/JobMarketPage";
import JobDetailPage from "../../pages/Job/JobDetailPage";
import MyApplicationsPage from "../../pages/Job/MyApplicationsPage";

const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/profile" element={user ? <Navigate to={`/users/${user.id}`} replace /> : <Navigate to="/signin" replace />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/career-paths" element={<CareerPathsPage />} />
      <Route path="/career-paths/:id" element={<CareerPathDetailsPage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/courses/:id" element={<CourseDetailPage />} />
      <Route path="/courses/:id/learn" element={<CourseLearnPage />} />
      <Route path="/users/:userId" element={<UserWallPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/oauth-success" element={<OAuthSuccessPage />} />
      <Route path="/" element={<BlogPage />} />
      <Route path="/source" element={<SourcePage />} />

      {/* Admin-only routes */}
      <Route path="/admin" element={<AdminRoute />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="blogs" element={<BlogManagement />} />
        <Route path="students" element={<StudentManagement />} />
        <Route path="companies" element={<CompanyManagement />} />
        <Route path="career-paths" element={<CareerPathManagement />} />
      </Route>

      {/* Unauthorized page */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/connections" element={<ConnectionsPage />} />
      <Route path="/users/:id" element={<UserProfilePage />} />
      <Route path="/ai-chat" element={<AIChat />} />

      {/* Phase 5: Course routes */}
      <Route path="/courses" element={<CourseListPage />} />
      <Route path="/courses/:id" element={<CourseStudyPage />} />
      <Route path="/courses/:courseId/lessons/:lessonId" element={<CourseStudyPage />} />
      <Route path="/my-courses" element={<MyCoursesPage />} />

      {/* Phase 5: Company routes */}
      <Route path="/company/courses" element={<CompanyCourseManage />} />
      <Route path="/company/courses/:id/edit" element={<CompanyCourseEdit />} />
      <Route path="/company/jobs" element={<CompanyJobManage />} />
      <Route path="/company/jobs/create" element={<CompanyJobForm />} />
      <Route path="/company/jobs/:id/edit" element={<CompanyJobForm />} />
      <Route path="/company/jobs/:id/applications" element={<CompanyJobApplications />} />
      <Route
        path="/company/applications"
        element={
          <ProtectedRoute allowedRoles={["COMPANY", "ADMIN"]}>
            <CompanyJobApplications />
          </ProtectedRoute>
        }
      />
      <Route path="/company/career-tests" element={<CompanyCareerTestManage />} />

      {/* Phase 5: Admin routes */}
      <Route path="/admin/courses" element={<AdminCoursePage />} />
      <Route path="/admin/jobs" element={<AdminJobPage />} />
      <Route path="/admin/career-tests" element={<AdminCareerTestPage />} />

      {/* Phase 5: Job routes */}
      <Route path="/jobs/market" element={<JobMarketPage />} />
      <Route path="/jobs/:id" element={<JobDetailPage />} />
      <Route path="/my-applications" element={<MyApplicationsPage />} />

      {/* Catch-all route */}
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Navigate to="/signin" replace />
          )
        }
      />
    </Routes>
  );
};

export default AppRoutes;
