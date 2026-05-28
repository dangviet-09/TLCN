import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { userApi } from '../../../api/userApi';
import conversationApi from '../../../api/conversationApi';
import { blogApi, Blog } from '../../../api/blogApi';
import followApi from '../../../api/followApi';
import { FollowInfo } from '../../../types/types';
import MainTemplate from '../../templates/MainTemplate/MainTemplate';
import { UserWallHeader } from '../../organisms/UserWallHeader';
import { UserAboutSection } from '../../organisms/UserAboutSection';
import { UserCoursesSection } from '../../organisms/UserCoursesSection';
import { NavTabs } from '../../molecules/NavTabs';
import { BlogCard } from '../../molecules/BlogCard';
import { UserProfile } from '../../../types/types';
import { Toast } from '../../molecules/ToastNotification';

const UserWallPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { user: currentUser, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('about');
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userBlogs, setUserBlogs] = useState<Blog[]>([]);
    const [blogsLoading, setBlogsLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
    const [followInfo, setFollowInfo] = useState<FollowInfo | null>(null);
    const [followLoading, setFollowLoading] = useState(false);
    const [totalCourses, setTotalCourses] = useState(0);

    useEffect(() => {
        fetchUserProfile();
    }, [userId]);

    useEffect(() => {
        if (userProfile && userProfile.type === 'company') {
            fetchUserBlogs();
        }
    }, [userProfile]);

    useEffect(() => {
        if (userId) {
            fetchFollowInfo();
        }
    }, [userId]);

    const fetchUserProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            const userData = await userApi.getById(userId);
            const studentInfo = (userData as any).student;
            const companyInfo = (userData as any).company;
            const isCompany = userData.role === 'COMPANY';
            const displayName = isCompany
                ? (companyInfo?.companyName || userData.fullName || userData.username)
                : (userData.fullName || userData.username);

            const profile: UserProfile = {
                id: userData.id,
                name: displayName,
                email: userData.email,
                role: userData.role || 'USER',
                type: userData.role === 'STUDENT' ? 'student' : 'company',
                avatar: userData.avatar,
                school: studentInfo?.school,
                major: studentInfo?.major,
                companyName: companyInfo?.companyName,
                industry: companyInfo?.industry,
                description: companyInfo?.description,
                yearEstablished: companyInfo?.yearEstablished,
                website: companyInfo?.website,
                address: userData.address,
                courses: 0,
                followers: 0,
                points: 0,
                enrolledCourses: [],
            };

            setUserProfile(profile);
        } catch (error: any) {
            console.error('Failed to load user profile:', error);
            console.error('Error response:', error?.response);
            setError(error?.response?.data?.message || error?.message || 'Failed to load user profile');
        } finally {
            setLoading(false);
        }
    };

    const fetchFollowInfo = async () => {
        if (!userId) return;

        try {
            const info = await followApi.getFollowInfo(userId);
            setFollowInfo(info);
        } catch (error) {
            console.error('Failed to fetch follow info:', error);
        }
    };

    const handleFollowClick = async () => {
        if (!userId || followLoading) return;

        setFollowLoading(true);
        try {
            const updatedInfo = await followApi.toggleFollow(userId);
            setFollowInfo(updatedInfo);
            setToast({
                message: updatedInfo.isFollowing ? 'Following user successfully!' : 'Unfollowed user successfully!',
                type: 'success',
            });
        } catch (error: any) {
            console.error('Failed to toggle follow:', error);
            setToast({
                message: error?.response?.data?.message || 'Failed to follow/unfollow user. Please try again.',
                type: 'error',
            });
        } finally {
            setFollowLoading(false);
        }
    };

    const handleChatClick = async () => {
        if (!userId) return;

        try {
            // Debug logging
            console.log('Attempting to create conversation with userId:', userId);
            
            // Call API to get or create conversation with this user
            const conversationData = await conversationApi.getOrCreateConversation(userId);
            
            // Debug response
            console.log('Conversation API response:', conversationData);

            // Check if response has valid conversation data
            if (!conversationData || !conversationData.conversation || !conversationData.conversation.id) {
                console.error('Invalid conversation data structure:', conversationData);
                throw new Error('Invalid conversation response from server');
            }

            // Navigate to connections page with the conversation ID
            navigate(`/connections?conversationId=${conversationData.conversation.id}`);
        } catch (error: any) {
            console.error('Failed to create conversation:', error);
            setToast({ message: 'Failed to start chat. Please try again.', type: 'error' });
        }
    };

    const handleAvatarChange = async (file: File) => {
        if (!userId) return;

        try {
            const updatedUser = await userApi.updateAvatar(userId, file);


            setUserProfile(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    avatar: updatedUser.avatar,
                };
            });

            if (isOwnProfile && refreshUser) {
                await refreshUser();
            }

            setToast({ message: 'Avatar updated successfully!', type: 'success' });
        } catch (error) {
            console.error('Failed to update avatar:', error);
            setToast({ message: 'Failed to update avatar. Please try again.', type: 'error' });
        }
    };

    const fetchUserBlogs = async () => {
        setBlogsLoading(true);
        try {
            const allBlogs = await blogApi.getAll();
            const filteredBlogs = allBlogs.filter(blog => {
                if (typeof blog.author === 'object' && blog.author !== null) {
                    return blog.author.id === userId;
                }
                return blog.author === userId;
            });
            setUserBlogs(filteredBlogs);
        } catch (error) {
            console.error('Failed to load user blogs:', error);
        } finally {
            setBlogsLoading(false);
        }
    };

    const handleBlogDelete = async (blogId: string) => {
        try {
            await blogApi.delete(blogId);
            setUserBlogs(prev => prev.filter(b => b.id !== blogId));
        } catch (error) {
            console.error('Failed to delete blog:', error);
        }
    };

    const handleBlogEdit = (blog: Blog) => {
        console.log('Edit blog:', blog);
    };

    const tabs = [
        {
            id: 'about',
            label: 'About',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            ),
        },
        {
            id: 'courses',
            label: 'Courses',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
            ),
        },
    ];

    if (loading) {
        return (
            <MainTemplate>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                        <p className="mt-4 text-gray-600">Loading profile...</p>
                    </div>
                </div>
            </MainTemplate>
        );
    }

    if (error || !userProfile) {
        return (
            <MainTemplate>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400 mb-4">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">User not found</h2>
                        <p className="text-gray-600 mb-6">{error || 'The user you are looking for does not exist.'}</p>
                        <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                            Back to Home
                        </Link>
                    </div>
                </div>
            </MainTemplate>
        );
    }

    const isOwnProfile = currentUser?.id === userProfile.id;

    return (
        <MainTemplate>
            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <UserWallHeader
                    userId={userProfile.id}
                    name={userProfile.name}
                    role={userProfile.role}
                    description={userProfile.description}
                    avatar={userProfile.avatar}
                    coverColor={userProfile.coverColor}
                    type={userProfile.type}
                    stats={{
                        courses: totalCourses,
                        followers: followInfo?.followerCount ?? userProfile.followers,
                        ...(userProfile.type === 'company' ? { students: 0 } : { points: userProfile.points }),
                    }}
                    isOwnProfile={isOwnProfile}
                    isFollowing={followInfo?.isFollowing ?? false}
                    followLoading={followLoading}
                    onFollowClick={handleFollowClick}
                    onChatClick={handleChatClick}
                    onAvatarChange={isOwnProfile ? handleAvatarChange : undefined}
                />

                {/* Navigation Tabs */}
                <div className="bg-white rounded-lg shadow-sm">
                    <NavTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                </div>

                {/* Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {activeTab === 'about' && (
                            <UserAboutSection
                                type={userProfile.type}
                                studentInfo={
                                    userProfile.type === 'student'
                                        ? {
                                            school: userProfile.school,
                                            major: userProfile.major,
                                        }
                                        : undefined
                                }
                                companyInfo={
                                    userProfile.type === 'company'
                                        ? {
                                            companyName: userProfile.companyName,
                                            industry: userProfile.industry,
                                            yearEstablished: userProfile.yearEstablished,
                                            website: userProfile.website,
                                            address: userProfile.address,
                                        }
                                        : undefined
                                }
                            />
                        )}
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        {activeTab === 'courses' && (
                            <UserCoursesSection
                                userId={userProfile.id}
                                onCoursesLoaded={(count) => setTotalCourses(count)}
                            />
                        )}
                        {activeTab === 'about' && (
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
                                {userProfile.type === 'company' ? (
                                    blogsLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        </div>
                                    ) : userBlogs.length > 0 ? (
                                        <div className="space-y-4">
                                            {userBlogs.map((blog) => (
                                                <BlogCard
                                                    key={blog.id}
                                                    blog={blog}
                                                    onEdit={handleBlogEdit}
                                                    onDelete={handleBlogDelete}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-gray-400">
                                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                                            </svg>
                                            <p>No posts yet</p>
                                        </div>
                                    )
                                ) : (
                                    <div className="text-center py-12 text-gray-500">
                                        <p>Timeline is only available for companies</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </MainTemplate>
    );
};

export default UserWallPage;
