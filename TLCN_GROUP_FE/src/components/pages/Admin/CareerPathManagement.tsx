import React, { useState, useEffect } from "react";
import { AdminLayout } from "../../templates/AdminLayout/AdminLayout";
import { AdminOnly } from "../../atoms/AdminOnly/AdminOnly";
import { Button } from "../../atoms/Button/Button";
import { Input } from "../../atoms/Input/Input";
import { getAllCareerTests, deleteCareerTest } from "../../../api/careerPathApi";
import { CareerTest } from "../../../types/types";
import { Toast } from "../../molecules/ToastNotification";
import { ConfirmModal } from "../../molecules/ConfirmModal/ConfirmModal";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/apiClient";

export const CareerPathManagement: React.FC = () => {
    const [careerPaths, setCareerPaths] = useState<CareerTest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCareerPaths();
    }, []);

    const fetchCareerPaths = async () => {
        try {
            setLoading(true);
            const response = await getAllCareerTests();
            setCareerPaths(response);
        } catch (error) {
            console.error("Error fetching career paths:", error);
            setToast({ message: 'Failed to load career paths', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setShowDeleteConfirm(id);
    };

    const handleDeleteConfirm = async () => {
        if (!showDeleteConfirm) return;

        try {
            await deleteCareerTest(showDeleteConfirm);
            setCareerPaths(careerPaths.filter((path) => path.id !== showDeleteConfirm));
            setToast({ message: 'Career path deleted successfully!', type: 'success' });
            setShowDeleteConfirm(null);
        } catch (error) {
            console.error("Error deleting career path:", error);
            setToast({ message: 'Failed to delete career path', type: 'error' });
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteConfirm(null);
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            // Gọi API update status
            await apiClient.patch(`/career-paths/${id}/status`, { status: newStatus });
            setToast({ message: 'Cập nhật trạng thái thành công!', type: 'success' });
            fetchCareerPaths(); // Load lại dữ liệu
        } catch (error: any) {
            console.error("Error updating status:", error);
            setToast({
                message: error?.response?.data?.message || 'Lỗi cập nhật trạng thái (Có thể do phân quyền Backend)',
                type: 'error'
            });
        }
    };

    const filteredPaths = careerPaths.filter((path) => {
        return (path.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (path.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Career Path Management</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage all career paths and assessments
                        </p>
                    </div>
                    <AdminOnly>
                        <Button
                            variant="primary"
                            className="flex items-center space-x-2"
                            onClick={() => navigate("/career-paths")}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Create New Path</span>
                        </Button>
                    </AdminOnly>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Paths</p>
                                <p className="mt-2 text-3xl font-bold text-gray-900">{careerPaths.length}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">With Images</p>
                                <p className="mt-2 text-3xl font-bold text-gray-900">
                                    {careerPaths.filter(p => p.imageUrl).length}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-lg">
                                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Recent (7 days)</p>
                                <p className="mt-2 text-3xl font-bold text-gray-900">
                                    {careerPaths.filter(p => {
                                        const createdDate = new Date(p.createdAt);
                                        const weekAgo = new Date();
                                        weekAgo.setDate(weekAgo.getDate() - 7);
                                        return createdDate > weekAgo;
                                    }).length}
                                </p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
                        <div className="flex-1">
                            <Input
                                type="text"
                                placeholder="Search by title or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="secondary"
                                onClick={fetchCareerPaths}
                                className="flex items-center space-x-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Refresh</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Career Paths Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Title
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Image
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                <span className="ml-3 text-gray-600">Loading...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredPaths.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            No career paths found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPaths.map((path) => (
                                        <tr key={path.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {path.title}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-500 max-w-xs truncate">
                                                    {path.description || 'No description'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {path.imageUrl ? (
                                                        <img src={path.imageUrl} alt={path.title} className="h-10 w-10 rounded object-cover" />
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                            No image
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {new Date(path.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <select
                                                    value={(path as any).status || 'DRAFT'}
                                                    onChange={(e) => handleStatusChange(path.id, e.target.value)}
                                                    className="block w-full pl-3 pr-8 py-1.5 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-gray-50 cursor-pointer"
                                                >
                                                    <option value="PUBLISHED">PUBLISHED</option>
                                                    <option value="DRAFT">DRAFT</option>
                                                    <option value="ARCHIVED">ARCHIVED</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center space-x-3">
                                                    <Button
                                                        onClick={() => navigate(`/career-paths/${path.id}`)}
                                                        className="text-blue-600 hover:text-blue-900"
                                                        title="View"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </Button>
                                                    <AdminOnly>
                                                        <Button
                                                            onClick={() => handleDeleteClick(path.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                            title="Delete"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </Button>
                                                    </AdminOnly>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination - Placeholder for now as API might not support it yet or we just show all */}
                    {filteredPaths.length > 0 && (
                        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{filteredPaths.length}</span> of{" "}
                                    <span className="font-medium">{careerPaths.length}</span> results
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!showDeleteConfirm}
                title="Delete Career Path"
                message="Are you sure you want to delete this career path? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
                type="danger"
            />

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </AdminLayout>
    );
};
