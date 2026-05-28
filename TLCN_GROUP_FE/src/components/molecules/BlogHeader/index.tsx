import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Blog } from "../../../api/blogApi";
import { Button } from "../../atoms/Button/Button";
import { Avatar } from "../../atoms/Avatar";
import { canUserModifyPost } from "../../../utils/userUtils";
import { userApi } from "../../../api/userApi";

type BlogHeaderProps = {
    blog: Blog;
    currentUser: any;
    onEdit?: (blog: Blog) => void;
    onDelete?: (id: string) => void;
};

export const BlogHeader: React.FC<BlogHeaderProps> = ({
    blog,
    currentUser,
    onEdit,
    onDelete
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [authorName, setAuthorName] = useState<string>("Unknown");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDropdown]);

    const isOwner = () => {
        return canUserModifyPost(currentUser, blog.author);
    };

    useEffect(() => {
        const fallbackName = () => {
            if (typeof blog.author === 'object') {
                return blog.author?.username || 'Unknown';
            }
            return blog.author || 'Unknown';
        };

        const loadAuthorName = async () => {
            if (typeof blog.author !== 'object' || !blog.author?.id) {
                setAuthorName(fallbackName());
                return;
            }

            try {
                const user = await userApi.getById(blog.author.id);
                if (user.role === 'COMPANY' && (user as any).company?.companyName) {
                    setAuthorName((user as any).company.companyName);
                    return;
                }
                setAuthorName(user.fullName || user.username || fallbackName());
            } catch {
                setAuthorName(fallbackName());
            }
        };

        loadAuthorName();
    }, [blog.author]);

    const getAuthorName = () => {
        return authorName;
    };

    const getAuthorInitial = () => {
        return authorName?.[0]?.toUpperCase() || 'U';
    };

    const getAuthorId = () => {
        if (typeof blog.author === 'object') {
            return blog.author?.id;
        }
        return null;
    };

    const getAuthorAvatar = () => {
        if (typeof blog.author === 'object') {
            return blog.author?.avatar;
        }
        return undefined;
    };

    const handleAuthorClick = () => {
        const authorId = getAuthorId();
        if (authorId) {
            navigate(`/users/${authorId}`);
        }
    };

    return (
        <div className="flex items-center justify-between mb-3">
            <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleAuthorClick}
            >
                <Avatar 
                    src={getAuthorAvatar()} 
                    name={getAuthorInitial()} 
                    size="sm" 
                />
                <div>
                    <p className="font-medium text-sm">{getAuthorName()}</p>
                    <p className="text-xs text-gray-500">
                        {new Date(blog.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                </div>
            </div>

            {currentUser && isOwner() && (
                <div className="relative" ref={dropdownRef}>
                    <Button
                        variant="icon"
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="text-gray-500 hover:text-gray-700 p-2"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                    </Button>

                    {showDropdown && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                            <Button
                                variant="unstyled"
                                onClick={() => {
                                    onEdit?.(blog);
                                    setShowDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-none"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                </svg>
                                Edit
                            </Button>
                            <Button
                                variant="unstyled"
                                onClick={() => {
                                    onDelete?.(blog.id);
                                    setShowDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-none"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                </svg>
                                Delete
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

