import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { DMConversation, Profile } from '../../types';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';

export function DMListPage() {
  const { user, setScreen, setSelectedDmUserId } = useAppStore();
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherUsers, setOtherUsers] = useState<Record<string, Profile>>({});

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);

        // Fetch conversations
        const { data: convData, error: convError } = await supabase
          .from('dm_conversations')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order('last_message_at', { ascending: false });

        if (convError) throw convError;

        // Fetch all user profiles
        const userIds = new Set<string>();
        convData?.forEach((conv) => {
          userIds.add(conv.user1_id);
          userIds.add(conv.user2_id);
        });

        if (userIds.size > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', Array.from(userIds));

          if (profileError) throw profileError;

          const profileMap: Record<string, Profile> = {};
          profileData?.forEach((profile) => {
            profileMap[profile.id] = profile;
          });
          setOtherUsers(profileMap);
        }

        setConversations(convData || []);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Subscribe to conversation changes
    const subscription = supabase
      .channel(`public:dm_conversations`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_conversations',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const handleSelectConversation = (conversation: DMConversation) => {
    const otherUserId = conversation.user1_id === user?.id ? conversation.user2_id : conversation.user1_id;
    setSelectedDmUserId(otherUserId);
    setScreen('dm-chat');
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'اکنون';
    if (diffMins < 60) return `${diffMins}د`;
    if (diffHours < 24) return `${diffHours}س`;
    if (diffDays < 7) return `${diffDays}ر`;

    return messageDate.toLocaleDateString('fa-IR');
  };

  const getLastMessagePreview = async (conversationId: string): Promise<string> => {
    const { data, error } = await supabase
      .from('dm_messages')
      .select('text')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return 'بدون پیام';
    return data?.text || 'تصویر';
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <Header title="چت خصوصی" showBack />
        <LoadingSpinner text="در حال بارگذاری..." />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header title="چت خصوصی" showBack />

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquarePlus}
          title="هیچ گفتگویی وجود ندارد"
          description="یک گفتگوی خصوصی جدید شروع کنید"
          action={
            <button
              onClick={() => setScreen('loads')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              شروع گفتگو
            </button>
          }
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => {
            const otherUserId =
              conversation.user1_id === user?.id
                ? conversation.user2_id
                : conversation.user1_id;
            const otherUser = otherUsers[otherUserId];

            if (!otherUser) return null;

            return (
              <button
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation)}
                className="w-full px-4 py-3 flex items-center gap-3 border-b border-gray-200 hover:bg-gray-100 transition-colors text-right"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary-600">
                    {otherUser.name.charAt(0)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-semibold text-gray-900 text-sm">
                      {otherUser.name}
                    </p>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatTime(conversation.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">
                    {otherUser.code}
                  </p>
                  <p className="text-sm text-gray-600 truncate mt-1">
                    آخرین پیام...
                  </p>
                </div>

                {/* Unread indicator */}
                <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* New DM button */}
      {conversations.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            onClick={() => setScreen('loads')}
            className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <MessageSquarePlus className="w-5 h-5" />
            گفتگوی جدید
          </button>
        </div>
      )}
    </div>
  );
}
