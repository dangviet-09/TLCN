import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Send, Search, MoreVertical, Phone, Video, Trash2 } from 'lucide-react';
import socketService from "../../../services/socket";
import { useAuth } from "../../../contexts/AuthContext";
import conversationApi from "../../../api/conversationApi";
import { userApi } from "../../../api/userApi";
import { ConversationListItem } from "../../../types/types";
import { Button } from "../../atoms/Button/Button";
import { Input } from "../../atoms/Input/Input";
import { Toast } from "../../molecules/ToastNotification";

const ConnectionsPage: React.FC = () => {
  const { user } = useAuth();
  const { resetUnread, removeMessagesFromConversation } = useAuth() as any;
  const location = useLocation();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selected, setSelected] = useState<ConversationListItem | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const convoRetryRef = useRef<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchConversations();
    try { resetUnread(); } catch (e) { }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchConversations();
    }
  }, [user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const convoId = params.get("conversationId");
    if (!convoId) return;
    if (conversations.length > 0) {
      const found = conversations.find((c) => c.conversation.id === convoId);
      if (found) setSelected(found);
      if (!found && !convoRetryRef.current[convoId]) {
        convoRetryRef.current[convoId] = true;
        fetchConversations();
      }
    }
  }, [conversations]);

  useEffect(() => {
    if (selected) {
      fetchMessages(selected.conversation.id);
      try {
        const sock = socketService.connectSocket(user?.id || '');
        if (sock) {
          if ((sock as any).connected) {
            socketService.joinConversationRoom(selected.conversation.id);
          } else {
            const onConn = () => {
              try { socketService.joinConversationRoom(selected.conversation.id); } catch (e) { }
              try { (sock as any).off('connect', onConn); } catch (e) { }
            };
            (sock as any).on('connect', onConn);
          }
        }
      } catch (e) {
        console.error('Failed to join conversation room', e);
      }
    }
  }, [selected]);

  useEffect(() => {
    let prevId: string | null = null;
    if (selected) prevId = selected.conversation.id;
    return () => {
      if (prevId) {
        try { socketService.leaveConversationRoom(prevId); } catch (e) { }
      }
    };
  }, [selected]);

  useEffect(() => {
    const off = socketService.onNewMessage((payload: any) => {
      try {
        if (!payload) return;
        const { conversationId, message } = payload;
        if (message && message.sender && user && String(message.sender.id) === String(user.id)) {
          return;
        }
        if (selected && selected.conversation.id === conversationId) {
          setMessages((s) => [...s, message]);
          scrollToBottom();
        } else {
          setConversations((prev) => prev.map((c) => {
            if (c.conversation.id === conversationId) {
              return { ...c, lastMessage: message };
            }
            return c;
          }));
        }
      } catch (e) {
        console.error('Error handling new_message payload', e);
      }
    });

    return () => {
      try {
        if (off && typeof off === 'function') off();
      } catch (e) { }
    };
  }, [selected]);

  const fetchConversations = async () => {
    try {
      const data = await conversationApi.listConversations();
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadDisplayNames = async () => {
      const ids = Array.from(new Set(
        conversations
          .map((item) => otherParticipant(item)?.id)
          .filter(Boolean)
      )) as string[];

      const missing = ids.filter((id) => !displayNames[id]);
      if (missing.length === 0) return;

      try {
        const results = await Promise.all(
          missing.map((id) => userApi.getById(id).catch(() => null))
        );

        setDisplayNames((prev) => {
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
        console.error('Failed to load display names:', error);
      }
    };

    if (conversations.length > 0) {
      loadDisplayNames();
    }
  }, [conversations, displayNames]);

  const fetchMessages = async (conversationId: string) => {
    try {
      const msgs = await conversationApi.getMessages(conversationId, { limit: 50 });
      setMessages(msgs);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelect = (item: ConversationListItem) => {
    setSelected(item);
  };

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const handleSend = async () => {
    if (!selected) return;
    if (!messageText.trim()) return;
    try {
      const newMsg = await conversationApi.sendMessage(selected.conversation.id, messageText.trim());
      setMessages((s) => [...s, newMsg]);
      setMessageText("");
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConversation = async () => {
    if (!selected) return;
    setShowConfirmDialog(true);
  };

  const confirmDeleteConversation = async () => {
    if (!selected) return;

    try {
      await conversationApi.deleteConversation(selected.conversation.id);
      setConversations(prev => prev.filter(c => c.conversation.id !== selected.conversation.id));
      removeMessagesFromConversation(selected.conversation.id);

      setSelected(null);
      setShowOptionsDropdown(false);
      setShowConfirmDialog(false);
      setToast({ message: 'Conversation deleted successfully!', type: 'success' });
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setToast({ message: 'An error occurred while deleting the conversation!', type: 'error' });
      setShowConfirmDialog(false);
    }
  };

  const otherParticipant = (item: ConversationListItem) => {
    if (!user) return null;
    return item.participants.find((p) => p.id !== user.id) || item.participants[0];
  };

  const filteredConversations = conversations.filter((c) => {
    const other = otherParticipant(c);
    const name = (displayNames[other?.id || ''] || other?.fullName || other?.username || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOptionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50">
      <div className="w-96 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-auto">
          {filteredConversations.length === 0 && (
            <div className="p-6 text-center text-gray-500 text-sm">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          )}
          <ul>
            {filteredConversations.map((c) => {
              const other = otherParticipant(c);
              const isSelected = selected?.conversation.id === c.conversation.id;
              return (
                <li
                  key={c.conversation.id}
                  onClick={() => handleSelect(c)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                        {other?.avatar ? (
                          <img src={other.avatar} alt={(other.username || other.fullName) ?? ''} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-semibold text-lg">
                            {(other?.fullName || other?.username || 'U').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {displayNames[other?.id || ''] || other?.fullName || other?.username || 'Unknown'}
                        </span>
                        {c.lastMessage && (
                          <span className="text-xs text-gray-500">
                            {new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {c.lastMessage?.content || 'Start a conversation'}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Right: Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selected ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                  {otherParticipant(selected)?.avatar ? (
                    <img
                      src={otherParticipant(selected)?.avatar ?? ''}
                      alt={displayNames[otherParticipant(selected)?.id || ''] || otherParticipant(selected)?.username || otherParticipant(selected)?.fullName || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold">
                      {(displayNames[otherParticipant(selected)?.id || ''] || otherParticipant(selected)?.fullName || otherParticipant(selected)?.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {displayNames[otherParticipant(selected)?.id || ''] || otherParticipant(selected)?.fullName || otherParticipant(selected)?.username}
                  </h2>
                  <p className="text-xs text-green-600">Active now</p>
                </div>
              </div>
              <div className="flex items-center gap-2" ref={dropdownRef}>
                <div className="relative">
                  <Button
                    onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                    className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </Button>

                  {showOptionsDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        <button
                          onClick={handleDeleteConversation}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Conversation</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((m) => {
                  const isMine = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isMine ? '' : 'flex items-start gap-2'}`}>
                        {!isMine && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-semibold">
                              {(displayNames[otherParticipant(selected)?.id || ''] || otherParticipant(selected)?.fullName || otherParticipant(selected)?.username || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className={`px-4 py-2 rounded-2xl ${isMine
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-white border border-gray-200 rounded-bl-sm'
                            }`}>
                            <p className="text-sm">{m.content}</p>
                          </div>
                          <div className={`text-[10px] text-gray-500 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="px-6 py-4 border-t bg-white">
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 px-4 py-3 bg-gray-100 border-0 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[44px] max-h-32 overflow-y-auto"
                  style={{
                    height: 'auto',
                    minHeight: '44px'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                  }}
                />
                <Button
                  onClick={handleSend}
                  disabled={!messageText.trim()}
                  variant="primary"
                  className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Your Messages</h3>
            <p className="text-sm text-gray-500">Select a conversation to start chatting</p>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmed deletion</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this conversation? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteConversation}
                className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ConnectionsPage;
