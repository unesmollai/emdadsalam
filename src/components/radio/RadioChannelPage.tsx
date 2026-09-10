import React, { useEffect, useState, useRef } from 'react';
import { Mic, LogOut, MoreVertical, User, Trash2, Lock } from 'lucide-react';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import type { RadioChannel, RadioMessage, RadioMember } from '../../types';

export function RadioChannelPage() {
  const { setScreen, setSelectedChannelId, user, selectedChannelId } = useAppStore();
  const [channel, setChannel] = useState<RadioChannel | null>(null);
  const [members, setMembers] = useState<(RadioMember & { profile?: { name: string } })[]>([]);
  const [messages, setMessages] = useState<RadioMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPTTPressed, setIsPTTPressed] = useState(false);
  const [pttDuration, setPTTDuration] = useState(0);
  const pttInterval = useRef<NodeJS.Timeout | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedChannelId) {
      loadChannelData();
      const subscription = supabase
        .channel(`radio_messages_${selectedChannelId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'radio_messages',
            filter: `channel_id=eq.${selectedChannelId}`,
          },
          () => {
            loadMessages();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedChannelId]);

  const loadChannelData = async () => {
    if (!selectedChannelId) return;
    try {
      setLoading(true);
      const { data: channelData, error: channelError } = await supabase
        .from('radio_channels')
        .select(`
          *,
          radio_members(id, user_id)
        `)
        .eq('id', selectedChannelId)
        .single();

      if (channelError) throw channelError;
      setChannel(channelData);

      await loadMembers();
      await loadMessages();
    } catch (error) {
      console.error('Failed to load channel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!selectedChannelId) return;
    try {
      const { data, error } = await supabase
        .from('radio_members')
        .select(`
          *,
          profiles(name)
        `)
        .eq('channel_id', selectedChannelId);

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedChannelId) return;
    try {
      const { data, error } = await supabase
        .from('radio_messages')
        .select('*')
        .eq('channel_id', selectedChannelId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setMessages((data || []).reverse());
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handlePTTPress = () => {
    setIsPTTPressed(true);
    setPTTDuration(0);
    pttInterval.current = setInterval(() => {
      setPTTDuration((d) => d + 1);
    }, 1000);
  };

  const handlePTTRelease = async () => {
    setIsPTTPressed(false);
    if (pttInterval.current) {
      clearInterval(pttInterval.current);
    }

    if (!user?.id || !selectedChannelId) return;

    try {
      await supabase.from('radio_messages').insert({
        channel_id: selectedChannelId,
        user_id: user.id,
        user_name: user.name,
        duration_seconds: pttDuration,
        media_url: null,
      });

      await loadMessages();
    } catch (error) {
      console.error('Failed to save message:', error);
    }

    setPTTDuration(0);
  };

  const handleLeaveChannel = async () => {
    if (!user?.id || !selectedChannelId) return;

    try {
      await supabase
        .from('radio_members')
        .delete()
        .eq('channel_id', selectedChannelId)
        .eq('user_id', user.id);

      setSelectedChannelId(null);
      setScreen('radio');
    } catch (error) {
      console.error('Failed to leave channel:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await supabase
        .from('radio_members')
        .delete()
        .eq('id', memberId);

      await loadMembers();
      setSelectedMemberId(null);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedChannelId || !newPassword.trim()) return;

    try {
      await supabase
        .from('radio_channels')
        .update({ password: newPassword })
        .eq('id', selectedChannelId);

      setNewPassword('');
      setShowPasswordModal(false);
      await loadChannelData();
    } catch (error) {
      console.error('Failed to change password:', error);
    }
  };

  const isOwner = channel?.owner_id === user?.id;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header
        title={`${channel?.name || 'کانال'} (${members.length})`}
        showBack
        rightAction={
          isOwner && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="relative p-2 rounded-lg active:bg-white/10"
            >
              <MoreVertical className="w-5 h-5" />
              {showMenu && (
                <div className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-lg z-50 w-48">
                  <button
                    onClick={() => {
                      setShowPasswordModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-right text-sm hover:bg-gray-100 flex items-center gap-2 justify-end text-gray-700"
                  >
                    <Lock className="w-4 h-4" />
                    تغییر رمز عبور
                  </button>
                </div>
              )}
            </button>
          )
        }
      />

      {loading ? (
        <LoadingSpinner text="در حال بارگذاری کانال..." />
      ) : (
        <>
          {/* Members Section */}
          {members.length > 0 && (
            <div className="border-b border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3 text-right">
                اعضا ({members.length})
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col items-center gap-1 min-w-fit"
                  >
                    <div
                      className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer relative group"
                      onClick={() => {
                        if (isOwner && member.user_id !== user?.id) {
                          setSelectedMemberId(member.id);
                        }
                      }}
                    >
                      <User className="w-6 h-6" />
                      {isOwner && member.user_id !== user?.id && (
                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Trash2 className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 text-center max-w-12 truncate">
                      {member.profile?.name || 'کاربر'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages Section */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <EmptyState
                icon={Mic}
                title="هیچ پیام صوتی نیست"
                description="اولین پیام صوتی خود را ارسال کنید"
              />
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString('fa-IR')}
                    </span>
                    <span className="font-semibold text-sm text-gray-900">
                      {msg.user_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 bg-primary-100 text-primary-600 rounded-lg hover:bg-primary-200 transition-colors">
                      <Mic className="w-4 h-4" />
                    </button>
                    <div className="flex-1 bg-gray-100 rounded-lg h-1" />
                    <span className="text-xs text-gray-500">
                      {msg.duration_seconds}s
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PTT Button Section */}
          <div className="bg-white border-t border-gray-200 p-4 pb-safe flex flex-col gap-3 items-center">
            {isPTTPressed && (
              <div className="text-center">
                <p className="text-sm font-semibold text-primary-600 animate-pulse">
                  در حال صحبت...
                </p>
                <p className="text-xs text-gray-500">{pttDuration} ثانیه</p>
              </div>
            )}
            <button
              onMouseDown={handlePTTPress}
              onMouseUp={handlePTTRelease}
              onTouchStart={handlePTTPress}
              onTouchEnd={handlePTTRelease}
              className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-white transition-all transform ${
                isPTTPressed
                  ? 'bg-red-600 scale-95 shadow-lg'
                  : 'bg-primary-500 hover:bg-primary-600 shadow-md'
              }`}
            >
              <Mic className="w-8 h-8" />
            </button>
            <button
              onClick={handleLeaveChannel}
              className="w-full p-2 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              خروج از کانال
            </button>
          </div>
        </>
      )}

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="تغییر رمز عبور"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              رمز عبور جدید
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="رمز عبور جدید را وارد کنید"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              dir="rtl"
            />
          </div>
          <button
            onClick={handleChangePassword}
            className="w-full p-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            تغییر رمز عبور
          </button>
        </div>
      </Modal>

      {/* Remove Member Confirmation */}
      {selectedMemberId && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedMemberId(null)}
          title="حذف عضو"
        >
          <div className="space-y-4">
            <p className="text-gray-700 text-center">
              آیا می‌خواهید این عضو را از کانال حذف کنید؟
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMemberId(null)}
                className="flex-1 p-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={() => {
                  handleRemoveMember(selectedMemberId);
                }}
                className="flex-1 p-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                حذف
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
