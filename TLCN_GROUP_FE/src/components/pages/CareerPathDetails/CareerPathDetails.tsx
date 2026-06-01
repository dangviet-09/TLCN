import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lesson, Test, Course, SubmissionField } from '../../../types/types';
import { getCareerTestById } from '../../../api/careerPathApi';
import { createLesson, getLessonById, updateLesson } from '../../../api/lessonApi';
import { createTest, updateTest } from '../../../api/testApi';
import { courseApi } from '../../../api/courseApi';
import { Button } from '../../atoms/Button/Button';
import { Toast } from '../../molecules/ToastNotification';
import AddLessonModal from '../../molecules/AddLessonModal';
import AddTestToLessonModal from '../../molecules/AddTestToLessonModal';
import EditLessonModal, { type EditLessonFormValues } from '../../molecules/EditLessonModal';
import EditTestModal from '../../molecules/EditTestModal';
import MainTemplate from '../../templates/MainTemplate/MainTemplate';

const CareerPathDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [courseData, setCourseData] = useState<Course | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

    const [showAddLessonModal, setShowAddLessonModal] = useState(false);
    const [showAddTestModal, setShowAddTestModal] = useState(false);
    const [isAddingLessonTest, setIsAddingLessonTest] = useState(false);

    const [showEditLessonModal, setShowEditLessonModal] = useState(false);
    const [showEditTestModal, setShowEditTestModal] = useState(false);
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [editingTestId, setEditingTestId] = useState<string | null>(null);

    const [showLessonDetailModal, setShowLessonDetailModal] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [lessonTests, setLessonTests] = useState<Test[]>([]);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    const [addLessonForm, setAddLessonForm] = useState({
        title: '',
        order: 1,
        content: '',
    });
    const [editLessonForm, setEditLessonForm] = useState<EditLessonFormValues>({
        title: '',
        order: 1,
        type: 'THEORY',
        theoryContent: '',
        taskDescription: '',
        rubric: '',
        submissionFields: [],
    });
    const [testForm, setTestForm] = useState({ title: '', description: '', type: 'MINI' as 'MINI' | 'FINAL_PATH', maxScore: 100, content: '' });
    const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            loadTestDetails(id);
        }
    }, [id]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openDropdownId) {
                setOpenDropdownId(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [openDropdownId]);

    const loadTestDetails = async (testId: string) => {
        try {
            setLoading(true);
            const response = await getCareerTestById(testId);
            const data = (response as any).data || response;
            setCourseData(data);

            // Extract lessons from course data
            if (data.lessons && Array.isArray(data.lessons)) {
                setLessons(data.lessons);
            }
        } catch (error) {
            console.error('Failed to load test details:', error);
            setToast({ message: 'Unable to load details.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleViewLessonDetail = async (lesson: Lesson) => {
        try {
            setSelectedLesson(lesson);
            // Get lesson details with tests from API
            const response = await getLessonById(lesson.id) as any;
            const lessonData = response.data || response;


            // Extract tests from lesson data
            if (lessonData.tests && Array.isArray(lessonData.tests)) {
                setLessonTests(lessonData.tests);
            } else {
                setLessonTests([]);
            }

            setShowLessonDetailModal(true);
        } catch (error) {
            console.error('Failed to load lesson details:', error);
            setToast({ message: 'Unable to load lesson information.', type: 'error' });
        }
    };

    const handleEditLesson = (lesson: Lesson) => {
        setEditingLessonId(lesson.id);
        // Legacy: map content -> theoryContent or taskDescription
        const migratedType: 'THEORY' | 'TASK' = (lesson as any).type ?? 'THEORY';
        const migratedContent = (lesson as any).content ?? '';
        const theoryContent = migratedType === 'THEORY' ? migratedContent : '';
        const taskDescription = migratedType === 'TASK' ? migratedContent : '';

        // Legacy: map string[] submissionFields to SubmissionField[]
        const migratedFields: SubmissionField[] = ((lesson as any).submissionFields ?? []).map((f: any) => {
            if (typeof f === 'string') {
                return { id: crypto.randomUUID(), type: 'EXPLANATION' as const, label: f, required: true };
            }
            return f as SubmissionField;
        });

        setEditLessonForm({
            title: lesson.title,
            order: lesson.order,
            type: migratedType,
            theoryContent,
            taskDescription,
            rubric: (lesson as any).rubric ?? '',
            submissionFields: migratedFields,
        });
        setShowEditLessonModal(true);
        setShowLessonDetailModal(false);
        setOpenDropdownId(null);
    };

    const handleDeleteLesson = async (lessonId: string) => {
        if (!confirm('Are you sure you want to delete this lesson?')) return;

        try {
            await import('../../../api/lessonApi').then(module => module.deleteLesson(lessonId));
            setToast({ message: 'Lesson deleted successfully!', type: 'success' });
            setOpenDropdownId(null);
            if (id) {
                await loadTestDetails(id);
            }
        } catch (error) {
            console.error('Failed to delete lesson:', error);
            setToast({ message: 'Failed to delete lesson.', type: 'error' });
        }
    };

    const handleAddTestToLesson = (lesson: Lesson) => {
        setCurrentLessonId(lesson.id);
        setIsAddingLessonTest(true);
        setTestForm({ title: '', description: '', type: 'MINI', maxScore: 100, content: '' });
        setOpenDropdownId(null);
        setShowAddTestModal(true);
    };

    const handleUpdateLesson = async (values: {
        title?: string;
        order?: number;
        type?: 'THEORY' | 'TASK';
        theoryContent?: string;
        taskDescription?: string;
        rubric?: string;
        submissionFields?: SubmissionField[];
    }) => {
        const title = values.title ?? '';
        if (!editingLessonId || !title.trim()) {
            setToast({ message: 'Please enter lesson title!', type: 'warning' });
            return;
        }

        try {
            const payload: Record<string, unknown> = {
                title: title.trim(),
                order: values.order ?? 1,
                type: values.type ?? 'THEORY',
            };

            if (values.type === 'THEORY') {
                if (values.theoryContent) {
                    payload.theoryContent = values.theoryContent.trim();
                }
            } else {
                if (values.taskDescription) {
                    payload.taskDescription = values.taskDescription.trim();
                }
                if (values.rubric) {
                    payload.rubric = values.rubric.trim();
                }
                // Safely filter submissionFields — guard against undefined
                const fields = (values.submissionFields || []);
                const migrated = fields.map((f: any) => {
                    if (typeof f === 'string') {
                        return { id: crypto.randomUUID(), type: 'EXPLANATION' as const, label: f, required: true };
                    }
                    return f as SubmissionField;
                });
                payload.submissionFields = migrated.filter((f: SubmissionField) => f.label?.trim() !== '');
            }

            await updateLesson(editingLessonId, payload);

            setToast({ message: 'Lesson updated successfully!', type: 'success' });
            setShowEditLessonModal(false);
            setEditingLessonId(null);
            setEditLessonForm({ title: '', order: 1, type: 'THEORY', theoryContent: '', taskDescription: '', rubric: '', submissionFields: [] });

            if (id) {
                await loadTestDetails(id);
            }
        } catch (error) {
            console.error('Failed to update lesson:', error);
            setToast({ message: 'Failed to update lesson.', type: 'error' });
        }
    };

    const handleAddLesson = async () => {
        if (!id || !addLessonForm.title.trim()) {
            setToast({ message: 'Please enter lesson title!', type: 'warning' });
            return;
        }
        try {
            const response = await createLesson(id, {
                title: addLessonForm.title.trim(),
                order: addLessonForm.order,
                content: addLessonForm.content,
            });

            setToast({ message: 'Lesson added successfully!', type: 'success' });
            setShowAddLessonModal(false);
            setAddLessonForm({ title: '', order: addLessonForm.order + 1, content: '' });

            // Reload course data to show new lesson
            if (id) {
                await loadTestDetails(id);
            }

            if (confirm('Would you like to add a test for this lesson now?')) {
                setCurrentLessonId((response as any).data?.id || (response as any).id);
                setIsAddingLessonTest(true);
                setTestForm({ title: '', description: '', type: 'MINI', maxScore: 100, content: '' });
                setShowAddTestModal(true);
            }
        } catch (error) {
            setToast({ message: 'Failed to add lesson.', type: 'error' });
        }
    };

    const handleEditTest = (test: Test) => {
        setEditingTestId(test.id);
        setTestForm({
            title: test.title,
            description: test.description || '',
            type: test.type,
            maxScore: test.maxScore,
            content: typeof test.content === 'string' ? test.content : JSON.stringify(test.content || '', null, 2)
        });
        setShowEditTestModal(true);
    };

    const handleUpdateTest = async () => {
        if (!editingTestId || !testForm.title.trim()) {
            setToast({ message: 'Please enter test title!', type: 'warning' });
            return;
        }

        try {
            await updateTest(editingTestId, {
                title: testForm.title,
                description: testForm.description,
                maxScore: testForm.maxScore,
                content: testForm.content
            });

            setToast({ message: 'Test updated successfully!', type: 'success' });
            setShowEditTestModal(false);
            setEditingTestId(null);
            setTestForm({ title: '', description: '', type: 'MINI', maxScore: 100, content: '' });

            if (id) {
                await loadTestDetails(id);
            }
        } catch (error) {
            console.error('Failed to update test:', error);
            setToast({ message: 'Failed to update test.', type: 'error' });
        }
    };

    const handleAddTest = async () => {
        try {
            if (isAddingLessonTest && currentLessonId) {
                await createTest({
                    lessonId: currentLessonId,
                    title: testForm.title,
                    description: testForm.description,
                    type: 'MINI',
                    maxScore: testForm.maxScore,
                    content: testForm.content
                });
                setToast({ message: 'Mini test added successfully!', type: 'success' });

                // Reload lesson and reopen lesson detail modal
                if (selectedLesson) {
                    const response = await getLessonById(currentLessonId) as any;
                    const lessonData = response.data || response;
                    if (lessonData.tests && Array.isArray(lessonData.tests)) {
                        setLessonTests(lessonData.tests);
                    }
                    setShowLessonDetailModal(true);
                }
            } else {
                if (id) {
                    await createTest({
                        careerPathId: id,
                        title: testForm.title,
                        description: testForm.description,
                        type: 'FINAL_PATH',
                        maxScore: testForm.maxScore,
                        content: testForm.content
                    });
                    setToast({ message: 'Final test added successfully!', type: 'success' });
                    // Reload course data to show new final test
                    await loadTestDetails(id);
                }
            }
            setShowAddTestModal(false);
            setIsAddingLessonTest(false);
            setCurrentLessonId(null);
            setTestForm({ title: '', description: '', type: 'MINI', maxScore: 100, content: '' });
        } catch (error) {
            console.error('Failed to add test:', error);
            setToast({ message: 'Failed to add test.', type: 'error' });
        }
    };

    const getNextStatus = (currentStatus?: string) => {
        switch (currentStatus) {
            case 'DRAFT': return 'PUBLISHED';
            case 'PUBLISHED': return 'ARCHIVED';
            case 'ARCHIVED': return 'DRAFT';
            default: return 'PUBLISHED';
        }
    };

    const getStatusButtonText = (status?: string) => {
        switch (status) {
            case 'DRAFT': return 'Publish';
            case 'PUBLISHED': return 'Archive';
            case 'ARCHIVED': return 'Restore';
            default: return 'Publish';
        }
    };

    const handleStatusChange = async () => {
        if (!courseData || !id) return;

        const newStatus = getNextStatus(courseData.status);

        try {
            setStatusLoading(true);
            await courseApi.updateStatus(id, newStatus);

            setCourseData({ ...courseData, status: newStatus });
            setToast({
                message: `Update status to ${newStatus === 'PUBLISHED' ? 'Publish' : newStatus === 'ARCHIVED' ? 'Archived' : 'Draft'} successfully!`,
                type: 'success'
            });
        } catch (error) {
            console.error('Failed to update status:', error);
            setToast({ message: 'Failed to update status.', type: 'error' });
        } finally {
            setStatusLoading(false);
        }
    };

    return (
        <MainTemplate>
            <div className="min-h-screen bg-gray-50 pb-12">
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}

                {/* Back Button */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <Button
                        onClick={() => navigate('/career-paths')}
                        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Back to list
                    </Button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : courseData ? (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible">
                            {/* Header with Image */}
                            <div className="relative h-64 bg-gray-100">
                                {courseData.image ? (
                                    <img
                                        src={courseData.image}
                                        alt={courseData.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                                        </svg>
                                    </div>
                                )}
                                <div className="absolute top-4 right-4">
                                    <span className={`px-4 py-2 rounded-full text-sm font-semibold shadow-lg ${courseData.status === 'PUBLISHED'
                                        ? 'bg-green-500 text-white'
                                        : courseData.status === 'ARCHIVED'
                                            ? 'bg-gray-500 text-white'
                                            : 'bg-yellow-500 text-white'
                                        }`}>
                                        {courseData.status === 'PUBLISHED' ? '✓  Published' : courseData.status === 'ARCHIVED' ? ' Archived' : ' Draft'}
                                    </span>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8 flex justify-between items-end">
                                    <h1 className="text-4xl font-bold text-white">{courseData.title}</h1>
                                </div>
                            </div>

                            {/* Action Buttons Bar */}
                            <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
                                <Button
                                    variant="primary"
                                    onClick={() => setShowAddLessonModal(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white font-medium rounded-lg border border-gray-300 transition-opacity hover:opacity-80"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9"></path>
                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                    </svg>
                                    Add Lesson
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        setIsAddingLessonTest(false);
                                        setTestForm({ title: '', description: '', type: 'FINAL_PATH', maxScore: 100, content: '' });
                                        setShowAddTestModal(true);
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-medium rounded-lg border border-gray-300 transition-opacity hover:opacity-60"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="12" y1="18" x2="12" y2="12"></line>
                                        <line x1="9" y1="15" x2="15" y2="15"></line>
                                    </svg>
                                    Add Final Test
                                </Button>
                                <div className="ml-auto">
                                    <Button
                                        variant="primary"
                                        onClick={handleStatusChange}
                                        disabled={statusLoading}
                                        className="flex items-center gap-2 px-5 py-2.5 font-medium rounded-lg border border-gray-300 transition-opacity hover:opacity-60 bg-white text-black"
                                    >
                                        {statusLoading ? (
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="23 4 23 10 17 10"></polyline>
                                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                            </svg>
                                        )}
                                        {getStatusButtonText(courseData.status)}
                                    </Button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-8 space-y-8">
                                {/* Description */}
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                            <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                        Description
                                    </h3>
                                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-lg">
                                            {courseData.description || 'No detailed description available.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Lessons List */}
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                                        </svg>
                                        Lessons ({lessons.length})
                                    </h3>

                                    {lessons.length > 0 ? (
                                        <div className="space-y-3">
                                            {lessons.map((lesson, index) => (
                                                <div
                                                    key={lesson.id}
                                                    className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-gray-300 group relative overflow-visible"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div
                                                            className="flex items-center gap-4 flex-1 cursor-pointer"
                                                            onClick={() => handleViewLessonDetail(lesson)}
                                                        >
                                                            <div className="w-10 h-10 rounded-full text-gray-700 flex items-center justify-center font-semibold flex-shrink-0">
                                                                {index + 1}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-semibold text-gray-900 transition-colors truncate">{lesson.title}</h4>
                                                                <p className="text-sm text-gray-500 line-clamp-1">{lesson.content}</p>
                                                            </div>
                                                        </div>

                                                        {/* Dropdown Menu */}
                                                        <div className="relative">
                                                            <Button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenDropdownId(openDropdownId === lesson.id ? null : lesson.id);
                                                                }}
                                                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <circle cx="12" cy="12" r="1"></circle>
                                                                    <circle cx="12" cy="5" r="1"></circle>
                                                                    <circle cx="12" cy="19" r="1"></circle>
                                                                </svg>
                                                            </Button>

                                                            {openDropdownId === lesson.id && (
                                                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[9999]">
                                                                    <Button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleEditLesson(lesson);
                                                                        }}
                                                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 flex items-center gap-2"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                                        </svg>
                                                                        Edit Lesson
                                                                    </Button>
                                                                    <Button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleViewLessonDetail(lesson);
                                                                            setOpenDropdownId(null);
                                                                        }}
                                                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 flex items-center gap-2"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                                            <polyline points="14 2 14 8 20 8"></polyline>
                                                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                                                        </svg>
                                                                        View Tests
                                                                    </Button>
                                                                    <Button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleAddTestToLesson(lesson);
                                                                        }}
                                                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 flex items-center gap-2"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                                            <polyline points="14 2 14 8 20 8"></polyline>
                                                                            <line x1="12" y1="18" x2="12" y2="12"></line>
                                                                            <line x1="9" y1="15" x2="15" y2="15"></line>
                                                                        </svg>
                                                                        Add Test to Lesson
                                                                    </Button>
                                                                    <hr className="my-1 border-gray-200" />
                                                                    <Button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteLesson(lesson.id);
                                                                        }}
                                                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 flex items-center gap-2"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                                                        </svg>
                                                                        Delete Lesson
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400 mb-3">
                                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                                            </svg>
                                            <p className="text-gray-500 text-lg">No lessons have been added yet.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Final Test Section */}
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                            <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                        Final Test
                                    </h3>

                                    {courseData.finalTest ? (
                                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                                                            FINAL TEST
                                                        </span>
                                                        <span className="text-sm text-gray-500">
                                                            Max Score: {courseData.finalTest.maxScore}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                                        {courseData.finalTest.title}
                                                    </h4>
                                                    <p className="text-gray-600 text-sm">
                                                        {courseData.finalTest.description || 'No description provided'}
                                                    </p>
                                                </div>
                                                <Button
                                                    onClick={() => handleEditTest(courseData.finalTest!)}
                                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                                                    title="Edit final test"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400 mb-3">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                            </svg>
                                            <p className="text-gray-500 text-lg mb-4">No final test has been added yet.</p>
                                            <p className="text-gray-400 text-sm">Click "Add Final Test" button above to create one</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">No information found</h2>
                        <p className="text-gray-500">The test does not exist or has been deleted.</p>
                        <Button variant="primary" onClick={() => navigate('/career-paths')} className="mt-6">
                            Back to list
                        </Button>
                    </div>
                )}

                {/* Add Lesson Modal */}
                <AddLessonModal
                    isOpen={showAddLessonModal}
                    onClose={() => {
                        setShowAddLessonModal(false);
                        setAddLessonForm({ title: '', order: 1, content: '' });
                    }}
                    onSubmit={handleAddLesson}
                    lessonForm={addLessonForm}
                    setLessonForm={setAddLessonForm}
                />

                {/* Add Test Modal */}
                <AddTestToLessonModal
                    isOpen={showAddTestModal}
                    onClose={() => {
                        setShowAddTestModal(false);
                        setIsAddingLessonTest(false);
                        setCurrentLessonId(null);
                    }}
                    onSubmit={handleAddTest}
                    isAddingLessonTest={isAddingLessonTest}
                    testForm={testForm}
                    setTestForm={setTestForm}
                />

                {/* Lesson Detail Modal */}
                {showLessonDetailModal && selectedLesson && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl p-8 w-full max-w-4xl shadow-2xl transform transition-all max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-900">{selectedLesson.title}</h3>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => handleEditLesson(selectedLesson)}
                                        className="p-2 text-gray-400 hover:opacity-60 rounded-lg transition-opacity"
                                        title="Edit lesson"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </Button>
                                    <Button onClick={() => setShowLessonDetailModal(false)} className="text-gray-400 hover:opacity-60 transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </Button>
                                </div>
                            </div>
                            <div className="prose max-w-none">
                                <p className="text-gray-700 whitespace-pre-wrap">{selectedLesson.content}</p>
                            </div>
                            {lessonTests.length > 0 && (
                                <div className="mt-6 pt-6 border-t">
                                    <h4 className="font-semibold text-gray-900 mb-3">Tests for this lesson:</h4>
                                    <div className="space-y-2">
                                        {lessonTests.map((test) => (
                                            <div key={test.id} className="bg-gray-50 p-3 rounded-lg flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium">{test.title}</p>
                                                    <p className="text-sm text-gray-500">{test.description}</p>
                                                </div>
                                                <Button
                                                    onClick={() => handleEditTest(test)}
                                                    className="p-2 text-gray-400 hover:opacity-60 rounded-lg transition-opacity flex-shrink-0"
                                                    title="Edit test"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Lesson Modal */}
            <EditLessonModal
                isOpen={showEditLessonModal}
                onClose={() => {
                    setShowEditLessonModal(false);
                    setEditLessonForm({ title: '', order: 1, type: 'THEORY', theoryContent: '', taskDescription: '', rubric: '', submissionFields: [] });
                }}
                onSubmit={handleUpdateLesson}
                lessonForm={editLessonForm}
                setLessonForm={setEditLessonForm}
            />

            {/* Edit Test Modal */}
            <EditTestModal
                isOpen={showEditTestModal}
                onClose={() => setShowEditTestModal(false)}
                onSubmit={handleUpdateTest}
                testForm={testForm}
                setTestForm={setTestForm}
            />
        </MainTemplate>
    );
};

export default CareerPathDetailsPage;
