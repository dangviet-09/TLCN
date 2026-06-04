import React, { useState, useRef, useEffect } from "react";
import NavLinks from "../../molecules/NavLinks/NavLinks";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../atoms/Button/Button";
import { useAuth } from "../../../contexts/AuthContext";
import searchApi, { } from '../../../api/searchApi';
import { SearchAllResponse } from '../../../types/types';
import { userApi } from '../../../api/userApi';
import { Input } from "../../atoms/Input/Input";
import NotificationDropdown from "../../molecules/NotificationDropdown";
import MessageDropdown from "../../molecules/MessageDropdown";

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, refreshUser } = useAuth() as any;
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchAllResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<'message' | 'notification' | null>(null);
  const [blogAuthorNames, setBlogAuthorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isAuthenticated && refreshUser) {
      refreshUser().catch((err: any) => console.error('Failed to refresh user:', err));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target) && showProfileDropdown) {
        setShowProfileDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(target) && showSearchDropdown) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileDropdown, showSearchDropdown]);

  const handleLogout = async () => {
    try {
      await logout();
      setShowProfileDropdown(false);
      navigate('/'); // Redirect to home page after logout
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = () => {
    if (user?.fullName) {
      return user.fullName.charAt(0).toUpperCase();
    } else if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return "U";
  };

  // Debug: Log user avatar
  useEffect(() => {
    if (user) {
      console.log('Navbar user data:', {
        id: user.id,
        avatar: user.avatar,
        fullName: user.fullName
      });
    }
  }, [user]);

  // Close other dropdowns when one opens
  useEffect(() => {
    if (activeDropdown === 'message') {
      setShowProfileDropdown(false);
      setShowSearchDropdown(false);
    } else if (activeDropdown === 'notification') {
      setShowProfileDropdown(false);
      setShowSearchDropdown(false);
    }
  }, [activeDropdown]);

  // Search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      setShowSearchDropdown(false);
      setSearchLoading(false); // Stop loading nếu query quá ngắn
      return;
    }

    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchApi.searchAll(searchQuery.trim(), 5);
        setSearchResults(results);
        setShowSearchDropdown(true);
      } catch (error) {
        setSearchResults(null);
        setShowSearchDropdown(false);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    const loadBlogAuthorNames = async () => {
      const blogAuthors = (searchResults?.blogs || [])
        .map((blog) => blog.author?.id)
        .filter(Boolean) as string[];

      const missing = blogAuthors.filter((id) => !blogAuthorNames[id]);
      if (missing.length === 0) return;

      try {
        const results = await Promise.all(
          missing.map((id) => userApi.getById(id).catch(() => null))
        );

        setBlogAuthorNames((prev) => {
          const next = { ...prev };
          results.forEach((result, index) => {
            const id = missing[index];
            if (!id || !result) return;
            if (result.role === 'COMPANY' && (result as any).company?.companyName) {
              next[id] = (result as any).company.companyName;
            } else {
              next[id] = result.fullName || result.username || prev[id] || 'Blog';
            }
          });
          return next;
        });
      } catch (error) {
        console.error('Failed to load blog author names:', error);
      }
    };

    if (searchResults?.blogs?.length) {
      loadBlogAuthorNames();
    }
  }, [searchResults, blogAuthorNames]);

  if (['/signin', '/signup', '/forgot-password'].includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 flex items-center px-4 sm:px-10 py-4 border-b border-[#F3D94B] bg-white shadow-sm">
      {/* Search Bar - Left */}
      <div className="flex-shrink-0">
        <div className="relative w-64" ref={searchRef}>
          <div className="relative flex items-center rounded-full bg-gray-100 transition-all duration-200">
            <div className="absolute left-4 flex items-center pointer-events-none">
              {searchLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              )}
            </div>
            <Input
              type="text"
              placeholder="Search information..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              overrideDefaultStyles={true}
              className="w-full pl-10 pr-4 py-2 bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-500 rounded-full"
            />
            {searchQuery && (
              <Button
                variant="unstyled"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                  setShowSearchDropdown(false);
                }}
                className="absolute right-3 flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-200 transition-colors p-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </Button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchDropdown && searchResults && (
            <div
              className="absolute left-0 top-full mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden"
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="max-h-96 overflow-y-auto">
                {/* Users Section */}
                {searchResults.users && searchResults.users.length > 0 && (
                  <div className="py-1">
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase">
                      Users
                    </div>
                    {searchResults.users.map((user) => (
                      <Link
                        key={user.id}
                        to={`/users/${user.id}`}
                        onClick={() => {
                          setShowSearchDropdown(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center text-xs font-medium overflow-hidden flex-shrink-0">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.fullName || user.username} className="w-full h-full object-cover" />
                          ) : (
                            <span>{(user.fullName || user.username).charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.fullName || user.username}</p>
                          <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                        </div>
                        {user.role && (
                          <span className="text-xs text-gray-500">{user.role}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Companies Section */}
                {searchResults.companies && searchResults.companies.length > 0 && (
                  <div className="py-1 border-t border-gray-100">
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase">
                      Companies
                    </div>
                    {searchResults.companies.map((company) => (
                      <Link
                        key={company.id}
                        to={`/users/${company.userId || company.id}`}
                        onClick={() => {
                          setShowSearchDropdown(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center overflow-hidden flex-shrink-0">
                          {company.avatar ? (
                            <img src={company.avatar} alt={company.companyName} className="w-full h-full object-cover" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{company.companyName}</p>
                          {company.industry && <p className="text-xs text-gray-500 truncate">{company.industry}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Courses Section */}
                {searchResults.courses && searchResults.courses.length > 0 && (
                  <div className="py-1 border-t border-gray-100">
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase">
                      Courses
                    </div>
                    {searchResults.courses.map((course) => (
                      <Link
                        key={course.id}
                        to={`/courses/${course.id}`}
                        onClick={() => {
                          setShowSearchDropdown(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded bg-gray-600 text-white flex items-center justify-center overflow-hidden flex-shrink-0">
                          {course.thumbnail ? (
                            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {course.level && <span className="text-xs text-gray-500">{course.level}</span>}
                            {course.price !== undefined && course.price !== null && (
                              <span className="text-xs text-gray-600">{course.price === 0 ? 'Free' : `$${course.price}`}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Blogs Section */}
                {searchResults.blogs && searchResults.blogs.length > 0 && (
                  <div className="py-1 border-t border-gray-100">
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase">
                      Blogs
                    </div>
                    {searchResults.blogs.map((blog) => (
                      <Link
                        key={blog.id}
                        to="/"
                        state={{ scrollToBlogId: blog.id }}
                        onClick={() => {
                          setShowSearchDropdown(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center overflow-hidden flex-shrink-0">
                          {blog.author?.avatar ? (
                            <img src={blog.author.avatar} alt={blog.author.fullName || blog.author.username} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-semibold">
                              {(blog.author?.fullName || blog.author?.username || 'B').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {blog.author?.id
                              ? (blogAuthorNames[blog.author.id] || blog.author?.fullName || blog.author?.username || 'Blog')
                              : (blog.author?.fullName || blog.author?.username || 'Blog')}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {blog.content || blog.category || 'Blog post'}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {(!searchResults.users || searchResults.users.length === 0) &&
                  (!searchResults.companies || searchResults.companies.length === 0) &&
                  (!searchResults.courses || searchResults.courses.length === 0) &&
                  (!searchResults.blogs || searchResults.blogs.length === 0) && (
                    <div className="px-3 py-8 text-center text-gray-500">
                      <p className="text-sm">No results found</p>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute left-1/2 transform -translate-x-1/2">
        <NavLinks />
      </div>

      <div className="flex-shrink-0 flex items-center gap-3 ml-auto">
        {isAuthenticated && user ? (
          <div className="relative flex items-center" ref={profileRef}>
            <div className="mr-3 flex items-center gap-2">
              <MessageDropdown 
                onToggle={(isOpen) => setActiveDropdown(isOpen ? 'message' : null)}
              />

              <NotificationDropdown 
                onToggle={(isOpen) => setActiveDropdown(isOpen ? 'notification' : null)}
              />
            </div>

            <div className="relative">
              <Button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-10 h-10 rounded-full bg-gray-700 text-white flex items-center justify-center font-semibold focus:outline-none hover:bg-gray-800 transition-colors overflow-hidden"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.fullName || user.username || 'User'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.textContent = getInitials();
                    }}
                  />
                ) : (
                  getInitials()
                )}
              </Button>

              {showProfileDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg overflow-hidden z-20 border border-gray-200 animate-slideDown">
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-gray-900 font-medium text-sm truncate">
                      {user?.fullName || user?.username || 'User'}
                    </p>
                    <p className="text-gray-500 text-xs truncate mt-0.5">
                      {user?.email || ''}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link to="/profile" onClick={() => setShowProfileDropdown(false)}>
                      <Button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2 group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-blue-600 transition-colors">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>Profile</span>
                      </Button>
                    </Link>

                    {user?.role === 'STUDENT' && (
                      <Link to="/my-applications" onClick={() => setShowProfileDropdown(false)}>
                        <Button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2 group">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-blue-600 transition-colors">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                          <span>My Applications</span>
                        </Button>
                      </Link>
                    )}

                    {user?.role === 'ADMIN' && (
                      <>
                        <Link to="/admin/dashboard" onClick={() => setShowProfileDropdown(false)}>
                          <Button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2 group">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-red-600 transition-colors">
                              <path d="M3 12l2-2m0 0l7-7 7 7"></path>
                              <path d="M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3"></path>
                            </svg>
                            <span>Dashboard</span>
                          </Button>
                        </Link>
                        <Link to="/admin/courses" onClick={() => setShowProfileDropdown(false)}>
                          <Button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2 group">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-red-600 transition-colors">
                              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            </svg>
                            <span>Courses Management</span>
                          </Button>
                        </Link>
                      </>
                    )}

                    <Link to="/settings" onClick={() => setShowProfileDropdown(false)}>
                      <Button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center gap-2 group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-gray-900 transition-colors">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
                        </svg>
                        <span>Settings</span>
                      </Button>
                    </Link>

                    {user?.role === 'COMPANY' && (
                      <>
                        <Link to="/company/jobs" onClick={() => setShowProfileDropdown(false)}>
                          <Button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors flex items-center gap-2 group">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-purple-600 transition-colors">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                            </svg>
                            <span>Manage Jobs</span>
                          </Button>
                        </Link>

                        <Link to="/company/applications" onClick={() => setShowProfileDropdown(false)}>
                          <Button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors flex items-center gap-2 group">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-purple-600 transition-colors">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <span>Manage Applications</span>
                          </Button>
                        </Link>

                        <Link to="/company/career-tests" onClick={() => setShowProfileDropdown(false)}>
                          <Button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors flex items-center gap-2 group">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-purple-600 transition-colors">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <span>Manage Career Tests</span>
                          </Button>
                        </Link>
                      </>
                    )}

                    {/* Divider */}
                    <div className="my-1 border-t border-gray-100"></div>

                    <Button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2 group"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-red-600 transition-colors">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      <span>Log out</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="w-[102px] h-[44px] flex items-center justify-center">
              <Link to="/signin" className="w-full h-full">
                <Button
                  variant="secondary"
                  className="w-full h-full flex items-center justify-center text-black font-bold leading-[28px] hover:text-yellow-400 transition-colors"
                >
                  Sign In
                </Button>
              </Link>
            </div>
            <div className="w-[102px] h-[44px] rounded-[4px] border border-gray-300 flex items-center justify-center">
              <Link to="/signup" className="w-full h-full">
                <Button
                  variant="secondary"
                  className="w-full h-full rounded-[4px] flex items-center justify-center bg-black text-white font-bold leading-[28px] hover:bg-yellow-400 hover:text-black transition-colors"
                >
                  Sign Up
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
