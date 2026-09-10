import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Paperclip,
  MoreVertical,
  Smile,
  Copy,
  ReplyIcon,
  Share2,
  Trash2,
  Flag,
  Users,
  Sticker,
} from 'lucide-react';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { ChatMessage, Profile } from '../../types';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';

export function ChatPage() {
  const { user } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    messageId: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(200);

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel('public:chat_messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as ChatMessage]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? (payload.new as ChatMessage) : m))
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Simulate online users count
  useEffect(() => {
    const randomCount = Math.floor(Math.random() * 50) + 10;
    setOnlineCount(randomCount);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      messageId,
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !user) return;

    try {
      const { error } = await supabase.from('chat_messages').insert({
        user_id: user.id,
        user_name: user.name,
        type: 'text',
        text: inputText,
        reply_to: replyingTo?.id || null,
        reactions: {},
        deleted_for: [],
        deleted_for_all: false,
        read_by: [],
        delivered_to: [],
      });

      if (error) throw error;

      setInputText('');
      setReplyingTo(null);
      textInputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleDeleteForMe = async (messageId: string) => {
    if (!user) return;

    try {
      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      const updatedDeletedFor = Array.from(new Set([...message.deleted_for, user.id]));

      const { error } = await supabase
        .from('chat_messages')
        .update({ deleted_for: updatedDeletedFor })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message for me:', error);
    }

    setContextMenu(null);
  };

  const handleDeleteForAll = async (messageId: string) => {
    if (!user) return;

    try {
      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      // Check if within 5 minutes and is own message
      const now = new Date().getTime();
      const messageTime = new Date(message.created_at).getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (now - messageTime > fiveMinutes || message.user_id !== user.id) {
        alert('تنها می‌توانید پیام‌های خود را در مدت ۵ دقیقه حذف کنید');
        return;
      }

      const { error } = await supabase
        .from('chat_messages')
        .update({ deleted_for_all: true })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message for all:', error);
    }

    setContextMenu(null);
  };

  const handleCopyMessage = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message?.text) {
      navigator.clipboard.writeText(message.text);
    }
    setContextMenu(null);
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      const reactions = { ...message.reactions };
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }

      if (!reactions[emoji].includes(user.id)) {
        reactions[emoji].push(user.id);
      } else {
        reactions[emoji] = reactions[emoji].filter((id) => id !== user.id);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      }

      const { error } = await supabase
        .from('chat_messages')
        .update({ reactions })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding reaction:', error);
    }

    setContextMenu(null);
  };

  const handleReportMessage = async (messageId: string) => {
    if (!user) return;

    try {
      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        target_type: 'message',
        target_id: messageId,
        reason: 'Reported from chat',
        status: 'pending',
      });

      if (error) throw error;
      alert('پیام گزارش شد');
    } catch (error) {
      console.error('Error reporting message:', error);
    }

    setContextMenu(null);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isMessageDeletedForMe = (message: ChatMessage) => {
    return message.deleted_for.includes(user?.id || '');
  };

  const contextMenuMessage = contextMenu
    ? messages.find((m) => m.id === contextMenu.messageId)
    : null;

  const stickers = [
    'استیکر شادی',
    'استیکر دریافت',
    'استیکر تشکر',
    'استیکر بغض',
    'استیکر خنده',
    'استیکر دوست داشتن',
  ];

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <Header
          title="گفتگوی عمومی"
          rightAction={
            <div className="flex items-center gap-1 text-sm text-white">
              <Users className="w-4 h-4" />
              <span>{onlineCount}</span>
            </div>
          }
        />
        <LoadingSpinner text="در حال بارگذاری پیام‌ها..." />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <Header
          title="گفتگوی عمومی"
          rightAction={
            <div className="flex items-center gap-1 text-sm text-white">
              <Users className="w-4 h-4" />
              <span>{onlineCount}</span>
            </div>
          }
        />
        <EmptyState
          icon={Smile}
          title="هیچ پیام‌ی وجود ندارد"
          description="اولین پیام را بفرستید"
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header
        title="گفتگوی عمومی"
        rightAction={
          <div className="flex items-center gap-1 text-sm text-white">
            <Users className="w-4 h-4" />
            <span>{onlineCount}</span>
          </div>
        }
      />

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => {
          const isCurrentUser = message.user_id === user?.id;
          const isDeleted = message.deleted_for_all || isMessageDeletedForMe(message);

          if (isDeleted) return null;

          return (
            <div
              key={message.id}
              className={`flex ${isCurrentUser ? 'justify-start' : 'justify-end'}`}
              onContextMenu={(e) => handleContextMenu(e, message.id)}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-2xl ${
                  isCurrentUser
                    ? 'bg-blue-500 text-white rounded-bl-none'
                    : 'bg-white text-gray-900 rounded-br-none border border-gray-200'
                }`}
              >
                {/* Reply indicator */}
                {message.reply_to && (
                  <div className={`text-xs mb-1 pb-1 border-b ${
                    isCurrentUser ? 'border-blue-400' : 'border-gray-300'
                  }`}>
                    <div className={isCurrentUser ? 'text-blue-100' : 'text-gray-500'}>
                      ↳ پاسخ به پیام‌ای
                    </div>
                  </div>
                )}

                {/* User name for others */}
                {!isCurrentUser && (
                  <p className="text-xs font-semibold text-primary-600 mb-0.5">
                    {message.user_name}
                  </p>
                )}

                {/* Message text */}
                <p className="break-words text-sm">{message.text}</p>

                {/* Time and read ticks */}
                <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                  isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <span>{formatTime(message.created_at)}</span>
                  {isCurrentUser && (
                    <span>
                      {message.read_by.length > 0 ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>

                {/* Reactions */}
                {Object.keys(message.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 pt-1 border-t border-gray-300">
                    {Object.entries(message.reactions).map(([emoji, users]) => (
                      <span
                        key={emoji}
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          isCurrentUser
                            ? 'bg-blue-400'
                            : 'bg-gray-100'
                        }`}
                      >
                        {emoji} {users.length}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-blue-50 border-r-4 border-blue-500 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <ReplyIcon className="w-4 h-4 text-blue-600" />
            <div className="text-sm text-gray-600 overflow-hidden">
              <p className="font-semibold text-blue-600 text-xs">{replyingTo.user_name}</p>
              <p className="truncate text-xs">{replyingTo.text}</p>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <input
            ref={textInputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            placeholder="پیام بنویسید..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />

          {/* Sticker button */}
          <button className="p-2 text-gray-500 hover:text-primary-600 transition-colors" title="استیکر">
            <Sticker className="w-5 h-5" />
          </button>

          {/* Image button */}
          <button className="p-2 text-gray-500 hover:text-primary-600 transition-colors" title="تصویر">
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && contextMenuMessage && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-max"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          {contextMenuMessage.user_id === user?.id ? (
            <>
              <button
                onClick={() => {
                  setReplyingTo(contextMenuMessage);
                  setContextMenu(null);
                }}
                className="w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center justify-end gap-2 text-sm text-gray-700"
              >
                <ReplyIcon className="w-4 h-4" />
                پاسخ
              </button>
              <button
                onClick={() => handleCopyMessage(contextMenuMessage.id)}
                className="w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center justify-end gap-2 text-sm text-gray-700"
              >
                <Copy className="w-4 h-4" />
                کپی
              </button>
              <div className="border-t border-gray-200 px-4 py-2 flex gap-1 justify-end">
                {['❤️', '😂', '👍', '😮', '😢', '🔥'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAddReaction(contextMenuMessage.id, emoji)}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleDeleteForMe(contextMenuMessage.id)}
                className="w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center justify-end gap-2 text-sm text-gray-700"
              >
                <Trash2 className="w-4 h-4" />
                حذف برای من
              </button>
              <button
                onClick={() => handleDeleteForAll(contextMenuMessage.id)}
                className="w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center justify-end gap-2 text-sm text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                حذف برای همه
              </button>
              <button
                onClick={() => handleReportMessage(contextMenuMessage.id)}
                className="w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center justify-end gap-2 text-sm text-red-600 border-t border-gray-200"
              >
                <Flag className="w-4 h-4" />
                گزارش
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setReplyingTo(contextMenuMessage);
                  setContextMenu(null);
                }}
                className="w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center justify-end gap-2 text-sm text-gray-700"
              >
                <ReplyIcon className="w-4 h-4" />
                پاسخ
              </button>
              <button
                onClick={() => handleCopyMessage(contextMenuMessage.id)}
                className="w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center justify-end gap-2 text-sm text-gray-700"
              >
                <Copy className="w-4 h-4" />
                کپی
              </button>
              <div className="border-t border-gray-200 px-4 py-2 flex gap-1 justify-end">
                {['❤️', '😂', '👍', '😮', '😢', '🔥'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAddReaction(contextMenuMessage.id, emoji)}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleDeleteForMe(contextMenuMessage.id)}
                className="w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center justify-end gap-2 text-sm text-gray-700 border-t border-gray-200"
              >
                <Trash2 className="w-4 h-4" />
                حذف برای من
              </button>
              <button
                onClick={() => handleReportMessage(contextMenuMessage.id)}
                className="w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center justify-end gap-2 text-sm text-red-600"
              >
                <Flag className="w-4 h-4" />
                گزارش
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
