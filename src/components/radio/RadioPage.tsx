import React, { useEffect, useState } from 'react';
import { Plus, Users, Lock, Crown } from 'lucide-react';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import type { RadioChannel } from '../../types';

export function RadioPage() {
  const { setScreen, setSelectedChannelId, user } = useAppStore();
  const [channels, setChannels] = useState<RadioChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [joinChannelId, setJoinChannelId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    loadChannels();
  }, [user?.id]);

  const loadChannels = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('radio_members')
        .select('channel_id')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const channelIds = data.map(m => m.channel_id);
        const { data: channelsData, error: chError } = await supabase
          .from('radio_channels')
          .select(`
            *,
            radio_members(id, user_id)
          `)
          .in('id', channelIds);

        if (chError) throw chError;
        setChannels(channelsData || []);
      } else {
        setChannels([]);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!user?.id || !createName.trim()) {
      setCreateError('نام کانال الزامی است');
      return;
    }

    const createdChannels = channels.filter(ch => ch.owner_id === user.id);
    if (createdChannels.length >= 1) {
      setCreateError('شما فقط می‌توانید یک کانال بسازید');
      return;
    }

    try {
      setCreateError('');
      const { data, error } = await supabase
        .from('radio_channels')
        .insert({
          name: createName,
          owner_id: user.id,
          password: createPassword || null,
        })
        .select();

      if (error) throw error;

      if (data?.[0]) {
        await supabase.from('radio_members').insert({
          channel_id: data[0].id,
          user_id: user.id,
        });

        setChannels([...channels, data[0]]);
        setCreateName('');
        setCreatePassword('');
        setShowCreateModal(false);
      }
    } catch (error) {
      setCreateError('خطا در ایجاد کانال');
      console.error(error);
    }
  };

  const handleJoinChannel = async () => {
    if (!user?.id || !joinChannelId.trim()) {
      setJoinError('شناسه کانال الزامی است');
      return;
    }

    const joinedCount = channels.filter(ch => ch.owner_id !== user.id).length;
    if (joinedCount >= 3) {
      setJoinError('شما فقط می‌توانید در ۳ کانال عضو شوید');
      return;
    }

    try {
      setJoinError('');
      const { data: channelData, error: channelError } = await supabase
        .from('radio_channels')
        .select()
        .eq('id', joinChannelId)
        .single();

      if (channelError) {
        setJoinError('کانال یافت نشد');
        return;
      }

      if (channelData.password && channelData.password !== joinPassword) {
        setJoinError('رمز عبور نادرست است');
        return;
      }

      const { error: memberError } = await supabase
        .from('radio_members')
        .insert({
          channel_id: joinChannelId,
          user_id: user.id,
        });

      if (memberError) throw memberError;

      loadChannels();
      setJoinChannelId('');
      setJoinPassword('');
      setShowJoinModal(false);
    } catch (error) {
      setJoinError('خطا در پیوستن به کانال');
      console.error(error);
    }
  };

  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    setScreen('radio-channel');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header title="بیسیم خصوصی" />

      <div className="flex-1 overflow-auto">
        {loading ? (
          <LoadingSpinner text="در حال بارگذاری کانال‌ها..." />
        ) : channels.length === 0 ? (
          <EmptyState
            icon={Users}
            title="هیچ کانالی وجود ندارد"
            description="یک کانال جدید بسازید یا به یک کانال موجود بپیوندید"
            action={
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg font-semibold"
                >
                  ایجاد کانال
                </button>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-4 py-2 border border-primary-500 text-primary-500 rounded-lg font-semibold"
                >
                  پیوستن
                </button>
              </div>
            }
          />
        ) : (
          <div className="p-4 space-y-3">
            {channels.map((channel) => {
              const memberCount = (channel.members || []).length;
              const isOwner = channel.owner_id === user?.id;

              return (
                <button
                  key={channel.id}
                  onClick={() => handleSelectChannel(channel.id)}
                  className="w-full p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-right"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900">
                          {channel.name}
                        </h3>
                        {isOwner && (
                          <Crown className="w-4 h-4 text-amber-500" />
                        )}
                        {channel.password && (
                          <Lock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <Users className="w-4 h-4" />
                        <span>{memberCount} عضو</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            <div className="flex gap-2 sticky bottom-0 bg-gray-50 pt-3 pb-safe">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex-1 flex items-center justify-center gap-2 p-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                ساخت کانال جدید
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="flex-1 p-3 border border-primary-500 text-primary-500 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
              >
                پیوستن
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="ساخت کانال جدید">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              نام کانال
            </label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="نام کانال را وارد کنید"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              dir="rtl"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              رمز عبور (اختیاری)
            </label>
            <input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="رمز عبور را وارد کنید"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              dir="rtl"
            />
          </div>
          {createError && (
            <p className="text-sm text-red-600 text-center">{createError}</p>
          )}
          <button
            onClick={handleCreateChannel}
            className="w-full p-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            ایجاد
          </button>
        </div>
      </Modal>

      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="پیوستن به کانال">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              شناسه کانال
            </label>
            <input
              type="text"
              value={joinChannelId}
              onChange={(e) => setJoinChannelId(e.target.value)}
              placeholder="شناسه کانال را وارد کنید"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              رمز عبور (اگر موجود است)
            </label>
            <input
              type="password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              placeholder="رمز عبور را وارد کنید"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              dir="rtl"
            />
          </div>
          {joinError && (
            <p className="text-sm text-red-600 text-center">{joinError}</p>
          )}
          <button
            onClick={handleJoinChannel}
            className="w-full p-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            پیوستن
          </button>
        </div>
      </Modal>
    </div>
  );
}
