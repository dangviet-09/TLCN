import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { Button } from '../../atoms/Button/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { userApi } from '../../../api/userApi';

type MessageDropdownProps = {
    onToggle?: (isOpen: boolean) => void;
}

const MessageDropdown: React.FC<MessageDropdownProps> = ({ onToggle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { user, unreadMessages, resetUnread, messageHistory, clearMessageHistory } = useAuth() as any;
    const navigate = useNavigate();

    const readMessagesKey = user?.id ? `readMessages_${user.id}` : 'readMessages';

    const [readMessages, setReadMessages] = useState<Record<string, number>>(() => {
        try {
            const saved = localStorage.getItem(readMessagesKey);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const [senderNames, setSenderNames] = useState<Record<string, string>>({});

    useEffect(() => {
        try {
            const saved = localStorage.getItem(readMessagesKey);
            setReadMessages(saved ? JSON.parse(saved) : {});
        } catch {
            setReadMessages({});
        }
    }, [readMessagesKey]);

    useEffect(() => {
        const loadSenderNames = async () => {
            const ids = Array.from(new Set((messageHistory || [])
                .map((notification: any) => notification.message?.sender?.id)
                .filter(Boolean)));

            const missing = ids.filter((id) => !senderNames[id]);
            if (missing.length === 0) return;

            try {
                const results = await Promise.all(
                    missing.map((id) => userApi.getById(id).catch(() => null))
                );

                setSenderNames((prev) => {
                    const next = { ...prev };
                    results.forEach((result, index) => {
                        const id = missing[index];
                        if (!id || !result) return;
                        if (result.role === 'COMPANY' && (result as any).company?.companyName) {
                            next[id] = (result as any).company.companyName;
                        } else {
                            next[id] = result.fullName || result.username || prev[id] || 'Unknown';
                        }
                    });
                    return next;
                });
            } catch (error) {
                console.error('Failed to load sender names:', error);
            }
        };

        loadSenderNames();
    }, [messageHistory, senderNames]);

    const groupedMessages = React.useMemo(() => {
        const groups = new Map();

        (messageHistory || []).forEach((notification: any, index: any) => {
            const senderId = notification.message?.sender?.id;
            const senderKey = senderId || 'unknown';

            // Debug: Log first few messages to understand structure
            if (index < 2) {
                console.log(`Message ${index} structure:`, {
                    notification,
                    senderId,
                    messageContent: notification.message?.content,
                    receivedAt: notification.receivedAt
                });
            }

            if (groups.has(senderKey)) {
                const existing = groups.get(senderKey);
                existing.count += 1;
                // Keep the most recent message as lastMessage
                if (notification.receivedAt > existing.lastMessage.receivedAt) {
                    existing.lastMessage = notification;
                }
            } else {
                groups.set(senderKey, {
                    ...notification,
                    count: 1,
                    lastMessage: notification
                });
            }
        });

        // Calculate unread count for each group
        const groupsArray = Array.from(groups.values()).map(group => {
            const senderId = group.message?.sender?.id || 'unknown';
            const readCount = readMessages[senderId] || 0;
            
            // If user has read all current messages from this sender, unread should be 0
            // Only show unread if there are new messages beyond what was read
            const unreadCount = Math.max(0, group.count - readCount);

            return {
                ...group,
                unreadCount,
                hasUnread: unreadCount > 0,
                readCount // Add for debugging
            };
        });

        return groupsArray.sort((a, b) =>
            b.lastMessage.receivedAt - a.lastMessage.receivedAt
        );
    }, [messageHistory, readMessages, readMessagesKey]);

    const messageNotifications = groupedMessages;

    // Calculate total unread count from grouped messages
    const totalUnreadCount = React.useMemo(() => {
        return groupedMessages.reduce((total, group) => total + group.unreadCount, 0);
    }, [groupedMessages]);

    const badgeCount = Math.max(totalUnreadCount, unreadMessages || 0);

    // Cleanup read messages when messageHistory changes (e.g., conversations deleted)
    React.useEffect(() => {
        const currentSenderIds = new Set(
            (messageHistory || []).map((msg: any) => msg.message?.sender?.id || 'unknown')
        );
        
        // Check if any senders in readMessages no longer exist in messageHistory
        const currentReadMessages = { ...readMessages };
        let needsCleanup = false;
        
        Object.keys(currentReadMessages).forEach(senderId => {
            if (!currentSenderIds.has(senderId)) {
                delete currentReadMessages[senderId];
                needsCleanup = true;
            }
        });
        
        if (needsCleanup) {
            setReadMessages(currentReadMessages);
            localStorage.setItem(readMessagesKey, JSON.stringify(currentReadMessages));
            console.log('Cleaned up read messages for deleted conversations');
        }
    }, [messageHistory, readMessages]);

    // Close dropdown when parent tells us to
    React.useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('[data-dropdown="message"]')) {
                setIsOpen(false);
                onToggle?.(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onToggle]);

    const handleMessageClick = (conversationId: string, message?: any) => {
        try {
            // Mark messages from this sender as read
            if (message) {
                const senderId = message.message?.sender?.id || 'unknown';

                const updatedReadMessages = {
                    ...readMessages,
                    [senderId]: message.count
                };

                setReadMessages(updatedReadMessages);
                localStorage.setItem(readMessagesKey, JSON.stringify(updatedReadMessages));
            }

            resetUnread && resetUnread();
            // Don't clear message history - keep messages persistent
            navigate(`/connections?conversationId=${conversationId}`);
            setIsOpen(false);
        } catch (e) {
            console.error('Error handling message click:', e);
        }
    };

    const handleViewAllMessages = () => {
        try {
            resetUnread && resetUnread();
            // Don't clear message history - keep messages persistent
            navigate('/connections');
            setIsOpen(false);
        } catch (e) {
            console.error('Error viewing all messages:', e);
        }
    };

    const handleClearMessages = () => {
        try {
            clearMessageHistory && clearMessageHistory();
        } catch (e) {
            console.error('Error clearing messages:', e);
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    return (
        <div className="relative" data-dropdown="message">
            <Button
                onClick={() => {
                    const newIsOpen = !isOpen;
                    setIsOpen(newIsOpen);
                    onToggle?.(newIsOpen);
                    try {
                        resetUnread && resetUnread();
                    } catch (e) {
                        console.error('Error resetting unread:', e);
                    }
                }}
                className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                title="Messages"
            >
                <MessageCircle className="w-6 h-6" />
                {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">Messages</h3>
                            </div>
                            {messageNotifications.length > 0 && (
                                <Button
                                    onClick={handleClearMessages}
                                    className="text-xs text-red-600 hover:text-red-800 px-2 py-1"
                                    title="Clear all messages"
                                >
                                    Clear All
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {messageNotifications && messageNotifications.length > 0 ? (
                            messageNotifications.map((notification: any, index: number) => (
                                <div
                                    key={index}
                                    onClick={() => handleMessageClick(notification.lastMessage?.conversationId || notification.conversationId, notification)}
                                    className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                                >
                                    <div className="flex items-start space-x-3">
                                        {notification.message?.sender ? (
                                            <img
                                                src={
                                                    notification.message.sender.avatar ||
                                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                        senderNames[notification.message.sender.id] ||
                                                        notification.message.sender.fullName ||
                                                        notification.message.sender.username || 'User'
                                                    )}&background=3B82F6&color=fff&size=40`
                                                }
                                                alt={
                                                    senderNames[notification.message.sender.id] ||
                                                    notification.message.sender.fullName ||
                                                    notification.message.sender.username
                                                }
                                                className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    const name = senderNames[notification.message.sender?.id] ||
                                                        notification.message.sender?.fullName ||
                                                        notification.message.sender?.username || 'User';
                                                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6B7280&color=fff&size=40`;
                                                }}
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                                                <span className="text-white text-sm font-medium">?</span>
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {senderNames[notification.message?.sender?.id] ||
                                                        notification.message?.sender?.fullName ||
                                                        notification.message?.sender?.username || 'Someone'}
                                                </p>
                                                {notification.hasUnread && notification.unreadCount > 0 && (
                                                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
                                                        {notification.unreadCount > 9 ? '9+' : notification.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 truncate mt-1">
                                                {(() => {
                                                    if (notification.unreadCount > 1) {
                                                        return `${notification.unreadCount} new messages`;
                                                    }
                                                    return notification.lastMessage?.message?.content || 
                                                           notification.message?.content || 
                                                           notification.lastMessage?.content ||
                                                           'New message';
                                                })()}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {notification.lastMessage?.receivedAt
                                                    ? formatTimeAgo(new Date(notification.lastMessage.receivedAt).toISOString())
                                                    : (notification.receivedAt ? formatTimeAgo(new Date(notification.receivedAt).toISOString()) : 'Recently')
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-gray-500">
                                <div>No new messages</div>
                                {import.meta.env?.DEV && (
                                    <div className="mt-2 text-xs">
                                        <div>Total messages: {messageHistory?.length || 0}</div>
                                        <div>Grouped conversations: {groupedMessages?.length || 0}</div>
                                        <div>Unread count: {unreadMessages || 0}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-200">
                        <Button
                            onClick={handleViewAllMessages}
                            className="w-full text-center text-sm text-blue-600 hover:text-blue-800"
                        >
                            View all messages
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageDropdown;