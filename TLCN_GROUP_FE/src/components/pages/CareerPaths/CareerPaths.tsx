import React, { useState, useEffect } from 'react';
import MainTemplate from '../../templates/MainTemplate/MainTemplate';
import { AddTestModal } from '../../molecules/AddTestModal';
import { Button } from '../../atoms/Button/Button';
import { ProtectedRoute } from '../../ProtectedRoute';

import { useAuth } from '../../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { getMyCareerTests, getAllCareerTests, createCareerTest, deleteCareerTest } from '../../../api/careerPathApi';
import { CareerTest } from '../../../types/types';
import { Toast } from '../../molecules/ToastNotification';

type ViewType = 'career-paths' | 'profile';

const CareerPathsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);

  const getDefaultView = (): ViewType => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');

    if (tabParam === 'profile') return 'profile';
    if (location.pathname === '/profile') return 'profile';
    if (location.pathname === '/career-paths') {
      return 'career-paths';
    }
    return user?.role === 'COMPANY' ? 'career-paths' : 'profile';
  };

  const [activeView, setActiveView] = useState<ViewType>(getDefaultView());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tests, setTests] = useState<CareerTest[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');

    if (tabParam === 'profile') {
      setActiveView('profile');
    } else if (location.pathname === '/profile') {
      setActiveView('profile');
    } else if (location.pathname === '/career-paths') {
      setActiveView('career-paths');
    }
  }, [location.pathname, location.search, user?.role]);

  useEffect(() => {
    const loadTests = async () => {
      if (activeView === 'career-paths') {
        try {
          setLoadingTests(true);
          const data = user?.role === 'COMPANY'
            ? await getMyCareerTests()
            : await getAllCareerTests();
          setTests(data);
        } catch (error) {
          console.error('Failed to load career tests:', error);
          setToast({ message: 'Unable to load test list. Please try again!', type: 'error' });
        } finally {
          setLoadingTests(false);
        }
      }
    };

    loadTests();
  }, [activeView, user?.role]);

  const handleAddTest = async (data: { title: string; description: string; image: File | null }) => {
    if (user?.role !== 'COMPANY' && user?.role !== 'ADMIN') {
      setToast({ message: 'Only companies or admins can create career paths. Please log in with a company account.', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const newTest = await createCareerTest({
        title: data.title,
        description: data.description,
        images: data.image,
      });
      setTests([newTest, ...tests]);
      setToast({ message: 'Test created successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Failed to create career test:', error);

      if (error.response?.status === 403) {
        setToast({ message: 'You do not have permission to create a career path. Only companies or admins can create career paths.', type: 'error' });
      } else if (error.response?.status === 401) {
        setToast({ message: 'Your session has expired. Please log in again.', type: 'error' });
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to create career test. Please try again!';
        setToast({ message: errorMessage, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    // Thêm hộp thoại xác nhận gốc của trình duyệt để an toàn
    if (!window.confirm("Are you sure you want to delete this career test?")) return;
  
    try {
      await deleteCareerTest(testId);
      setTests(tests.filter(test => test.id !== testId));
      setToast({ message: 'Test deleted successfully!', type: 'success' });
    } catch (error) {
      console.error('Failed to delete career test:', error);
      setToast({ message: 'Failed to delete career test. Please try again!', type: 'error' });
    }
  };

  const renderContent = () => {
    switch (activeView) {

      case 'career-paths':
      default:
        return (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Career Paths</h1>
                <p className="text-gray-600">Manage and create career assessment tests</p>
              </div>
              {user?.role === 'COMPANY' && (
                <Button
                  variant="primary"
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Career Path
                </Button>
              )}
            </div>

            {loadingTests ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : tests.length === 0 ? (
              user?.role === 'COMPANY' ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400 mb-4">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No career tests found</h3>
                  <p className="text-gray-500 mb-6">Start by creating your first career test</p>
                  <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                    Create your first career test
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                  <p className="text-gray-500">Hiện chưa có bài test định hướng nào trên hệ thống.</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map((test) => (
                  <div key={test.id} className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                    {/* Image Section */}
                    <div className="h-48 overflow-hidden relative bg-gray-100">
                      {test.imageUrl || (test as any).image ? (
                        <img
                          src={test.imageUrl || (test as any).image}
                          alt={test.title}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}

                      {/* Fallback Gradient Placeholder */}
                      <div className={`w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ${test.imageUrl || (test as any).image ? 'hidden' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                          <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                          <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                        </svg>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {test.title}
                      </h3>

                      <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1">
                        {test.description || 'No description available for this test.'}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                          <span>{new Date(test.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-auto">
                        {user?.role === 'STUDENT' && test.id && (
                          <Button
                            variant="unstyled"
                            onClick={() => navigate(`/career-tests/${test.id}/take`)}
                            className="flex-1 px-4 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                              <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            Làm bài kiểm tra
                          </Button>
                        )}

                        <Button
                          variant="unstyled"
                          onClick={() => {
                            // Navigate to details page
                            window.location.href = `/career-paths/${test.id}`;
                          }}
                          className="flex-1 px-4 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          Xem chi tiết
                        </Button>

                        {user?.role === 'COMPANY' && (
                          <Button
                            variant="unstyled"
                            onClick={() => handleDeleteTest(test.id)}
                            className="p-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                            title="Delete Test"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        );
    }
  };

  return (
    <MainTemplate>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="flex min-h-screen bg-gray-50">
        {/* Custom Sidebar */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 min-h-screen sticky top-0">
          <div className="p-6 flex flex-col min-h-screen">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Navigation</h2>

            <nav className="space-y-2 flex-1">
              {/* Career Paths - visible for all roles */}
              <Button
                variant="unstyled"
                onClick={() => setActiveView('career-paths')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeView === 'career-paths'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <span className={activeView === 'career-paths' ? 'text-blue-600' : 'text-gray-400'}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                </span>
                <span>Career Paths</span>
              </Button>
            </nav>

            {/* Logout button at bottom */}
            <div className="mt-auto pt-4 border-t border-gray-200">
              <Button
                variant="unstyled"
                onClick={() => {
                  logout();
                  window.location.href = '/signin';
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-600 hover:bg-red-50 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Add Test Modal */}
      <AddTestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTest}
        loading={loading}
      />
    </MainTemplate>
  );
};

const CareerPathsPageWithProtection = () => (
  <ProtectedRoute>
    <CareerPathsPage />
  </ProtectedRoute>
);

export default CareerPathsPageWithProtection;
