import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { Bell, MessageSquare, AlertCircle, CheckCircle, Info } from 'lucide-react';
import type { Notification } from '../../types';

const notificationIcons: Record<string, React.ElementType> = {
  ticket: MessageSquare,
  verification: CheckCircle,
  alert: AlertCircle,
  info: Info,
};

export function NotificationsPage() {
  const { user, setScreen, setUnreadNotifications } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id]);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );

      const unreadCount = notifications.filter(n => !n.is_read && n.id !== notificationId).length;
      setUnreadNotifications(unreadCount);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotifications(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  if (loading) return <LoadingSpinner />;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50 safe-bottom">
      <Header
        title="اعلان‌ها"
        showBack
        rightAction={
          unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-white hover:bg-white/10 px-3 py-1 rounded-lg text-xs font-medium transition-colors"
            >
              خواندن همه
            </button>
          )
        }
      />

      <div className="p-4 pb-20">
        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="اعلان جدیدی ندارید"
            description="اطلاعات جدید به اینجا نمایش داده خواهد شد"
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const IconComponent = notificationIcons[notification.type] || Bell;
              return (
                <button
                  key={notification.id}
                  onClick={() => {
                    if (!notification.is_read) {
                      handleMarkAsRead(notification.id);
                    }
                  }}
                  className={`w-full p-4 rounded-lg border border-gray-100 text-right transition-colors ${
                    notification.is_read
                      ? 'bg-white hover:bg-gray-50'
                      : 'bg-primary-50 border-primary-200 hover:bg-primary-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        notification.is_read
                          ? 'bg-gray-100'
                          : 'bg-primary-100'
                      }`}
                    >
                      <IconComponent
                        className={`w-5 h-5 ${
                          notification.is_read ? 'text-gray-500' : 'text-primary-600'
                        }`}
                      />
                    </div>

                    <div className="flex-1">
                      <h3 className={`font-semibold text-sm ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {notification.title}
                      </h3>
                      <p className={`text-xs mt-1 ${notification.is_read ? 'text-gray-500' : 'text-gray-600'}`}>
                        {notification.body}
                      </p>
                      <p className={`text-xs mt-2 ${notification.is_read ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(notification.created_at).toLocaleDateString('fa-IR')}
                      </p>
                    </div>

                    {!notification.is_read && (
                      <div className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
