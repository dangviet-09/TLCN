import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authService } from "../services/authService";
import { User } from "../types/types";
import { apiClient } from "../services/apiClient";
import socketService from "../services/socket";
import conversationApi from "../api/conversationApi";

type AuthContextType = {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<User>;
    register: (userData: any) => Promise<any>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    unreadMessages?: number;
    resetUnread?: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [unreadMessages, setUnreadMessages] = useState<number>(0);
    const [notifications, setNotifications] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem('messageNotifications');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [messageHistory, setMessageHistory] = useState<any[]>([]);

    const getUnreadKey = (userId?: string) => (userId ? `unreadMessages_${userId}` : 'unreadMessages');
    const getMessageHistoryKey = (userId?: string) => (userId ? `persistedMessages_${userId}` : 'persistedMessages');


    // Debug: Monitor messageHistory changes
    useEffect(() => {
    }, [messageHistory]);

    // Restore user on mount
    useEffect(() => {
        let cancelled = false;

        const initializeAuth = async () => {
            try {
                const oauthResult = authService.handleOAuthCallback();

                if (cancelled) return;

                if (oauthResult) {
                    // Fix: Get user info after setting tokens
                    try {
                        const response = await apiClient.get<{ user: User }>('/auth/me');
                        if (!cancelled) {
                            setUser(response.user);
                            localStorage.setItem("user", JSON.stringify(response.user));
                            // Clear URL only after successful fetch
                            window.history.replaceState({}, "", window.location.pathname);
                        }
                    } catch (error) {
                        console.error('Failed to get user info after OAuth:', error);
                    }
                } else {
                    const savedUser = await authService.getCurrentUser();
                    if (!cancelled) {
                        if (savedUser && authService.isAuthenticated()) {
                            setUser(savedUser);
                        } else {
                            authService.clearSession();
                        }
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                if (!cancelled) {
                    authService.clearSession();
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        initializeAuth();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        try {
            if (user?.id) {
                const saved = localStorage.getItem(getUnreadKey(user.id));
                setUnreadMessages(saved ? parseInt(saved, 10) : 0);
            } else {
                setUnreadMessages(0);
            }
        } catch {
            setUnreadMessages(0);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) {
            setMessageHistory([]);
            return;
        }
        try {
            const saved = localStorage.getItem(getMessageHistoryKey(user.id));
            setMessageHistory(saved ? JSON.parse(saved) : []);
        } catch (error) {
            console.error('AuthContext - Error loading persisted messages:', error);
            setMessageHistory([]);
        }
    }, [user?.id]);

    const login = async (username: string, password: string): Promise<void> => {
        try {
            setIsLoading(true);
            const response = await authService.login({ username, password });
            setUser(response.user);
            // socket handler registration done in user-effect
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async (): Promise<void> => {
        try {
            setIsLoading(true);
            await authService.logout();
            // disconnect socket when logging out
            try { socketService.disconnectSocket(); } catch (e) { }
            // Clear message notifications on logout
            setNotifications([]);
            setUnreadMessages(0);
            setMessageHistory([]);
            localStorage.removeItem('messageNotifications');
            localStorage.removeItem('unreadMessages');
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
            authService.clearSession();
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshUser = async (): Promise<void> => {
        try {
            if (authService.isAuthenticated()) {
                try {
                    const response = await apiClient.get<{ user: User }>('/auth/me');
                    const updatedUser = response.user;
                    setUser(updatedUser);
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                } catch (apiError) {
                    console.warn('Failed to refresh from API, using cached data:', apiError);
                    const currentUser = await authService.getCurrentUser();
                    setUser(currentUser);
                }
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Refresh user error:', error);
            setUser(null);
        }
    };

    const register = async (userData: any): Promise<any> => {
        try {
            setIsLoading(true);
            const response = await authService.register(userData);

            if (response && response.user) {
                setUser(response.user);
            } else {
                console.error("Invalid response from register:", response);
            }

            return response;
        } catch (error) {
            console.error("Register error:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const resetUnread = () => {
        setUnreadMessages(0);
        if (user?.id) {
            localStorage.setItem(getUnreadKey(user.id), '0');
        } else {
            localStorage.setItem('unreadMessages', '0');
        }
    };

    // Register a single global socket handler when `user` becomes available
    useEffect(() => {
        let off: any = null;
        if (user) {
            try {
                socketService.connectSocket(user.id);
                off = socketService.onNewMessage((payload: any) => {
                    if (!payload) return;
                    const { message, conversationId } = payload;
                    if (message && message.sender && String(message.sender.id) === String(user.id)) return;
                    setUnreadMessages((v) => {
                        const newCount = v + 1;
                        localStorage.setItem(getUnreadKey(user.id), newCount.toString());
                        return newCount;
                    });
                    // add to messages notifications (separate from system notifications)
                    // Add to temporary notifications for real-time display
                    setNotifications((prev) => {
                        const next = [{ message, conversationId, receivedAt: Date.now(), type: 'MESSAGE' }, ...prev];
                        const sliced = next.slice(0, 20);
                        localStorage.setItem('messageNotifications', JSON.stringify(sliced));
                        return sliced;
                    });
                    // Add to persistent message history
                    setMessageHistory((prev) => {
                        const messageData = { message, conversationId, receivedAt: Date.now(), type: 'MESSAGE', id: Date.now() + Math.random() };
                        const next = [messageData, ...prev];
                        const sliced = next.slice(0, 50); // Keep more messages in history
                        localStorage.setItem(getMessageHistoryKey(user.id), JSON.stringify(sliced));
                        return sliced;
                    });
                });
            } catch (e) {
                console.error('Failed to connect socket or register handler', e);
            }
        } else {
            // ensure disconnect when no user
            try { socketService.disconnectSocket(); } catch (e) { }
            // Only reset unread count and temporary notifications, keep message history
            setUnreadMessages(0);
            setNotifications([]);
            localStorage.removeItem('messageNotifications');
            localStorage.removeItem('unreadMessages');
            // Don't clear message history here - only on explicit logout
        }

        return () => {
            try { if (off && typeof off === 'function') off(); } catch (e) { }
        };
    }, [user]);

    const clearNotifications = () => {
        setNotifications([]);
        localStorage.removeItem('messageNotifications');
    };

    const clearMessageHistory = () => {
        setMessageHistory([]);
        if (user?.id) {
            localStorage.removeItem(getMessageHistoryKey(user.id));
        }
    };

    useEffect(() => {
        const hydrateMessageHistory = async () => {
            if (!user?.id) return;

            try {
                const conversations = await conversationApi.listConversations();
                const recentIncoming = (conversations || [])
                    .filter((item: any) => item?.lastMessage && String(item.lastMessage.senderId) !== String(user.id))
                    .map((item: any) => ({
                        id: item.lastMessage.id,
                        type: 'MESSAGE',
                        conversationId: item.conversation?.id,
                        message: item.lastMessage,
                        receivedAt: item.lastMessage.createdAt ? new Date(item.lastMessage.createdAt).getTime() : Date.now(),
                    }));

                const storageKey = getMessageHistoryKey(user.id);
                const stored = (() => {
                    try {
                        const raw = localStorage.getItem(storageKey);
                        return raw ? JSON.parse(raw) : [];
                    } catch {
                        return [];
                    }
                })();

                const combined = [...recentIncoming, ...(stored || [])];
                const uniqueMap = new Map<string, any>();
                combined.forEach((entry: any) => {
                    const key = entry?.message?.id || entry?.id || `${entry?.conversationId}-${entry?.receivedAt}`;
                    if (!uniqueMap.has(key)) {
                        uniqueMap.set(key, entry);
                    }
                });

                const merged = Array.from(uniqueMap.values())
                    .sort((a: any, b: any) => (b?.receivedAt || 0) - (a?.receivedAt || 0))
                    .slice(0, 50);

                const storedKeys = new Set(
                    (stored || []).map((entry: any) => entry?.message?.id || entry?.id || `${entry?.conversationId}-${entry?.receivedAt}`)
                );
                const newEntries = merged.filter((entry: any) => {
                    const key = entry?.message?.id || entry?.id || `${entry?.conversationId}-${entry?.receivedAt}`;
                    return !storedKeys.has(key);
                });

                if (newEntries.length > 0) {
                    setUnreadMessages((prev) => {
                        const base = Number.isFinite(prev) ? prev : 0;
                        const nextCount = base + newEntries.length;
                        localStorage.setItem(getUnreadKey(user.id), nextCount.toString());
                        return nextCount;
                    });
                }

                localStorage.setItem(storageKey, JSON.stringify(merged));
                setMessageHistory(merged);
            } catch (error) {
                console.error('Failed to hydrate message history from conversations:', error);
            }
        };

        hydrateMessageHistory();
    }, [user?.id]);

    const removeMessagesFromConversation = (conversationId: string) => {
        setMessageHistory((prev) => {
            const filtered = prev.filter((msg) => {
                // Remove messages from the specified conversation
                return msg.conversationId !== conversationId && 
                       msg.message?.conversationId !== conversationId;
            });
            // Update localStorage
            localStorage.setItem('persistedMessages', JSON.stringify(filtered));
            return filtered;
        });

        // Also clear read messages state for users from this conversation
        try {
            const savedReadMessages = localStorage.getItem('readMessages');
            if (savedReadMessages) {
                const readMessages = JSON.parse(savedReadMessages);
                // Remove read state for all participants of this conversation
                // Note: We don't have direct conversation->users mapping here,
                // so MessageDropdown will handle this cleanup
                console.log('Conversation deleted, MessageDropdown will clean up read states');
            }
        } catch (e) {
            console.error('Error cleaning read messages:', e);
        }
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: authService.isAuthenticated() && !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        unreadMessages,
        resetUnread,
        notifications,
        clearNotifications,
        messageHistory,
        clearMessageHistory,
        removeMessagesFromConversation,
    } as any;

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}