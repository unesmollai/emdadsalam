import React, { useEffect, useState } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { Header } from '../ui/Header';
import { StatusBadge } from '../ui/StatusBadge';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { Load } from '../../types';

type LoadStatus = 'all' | 'active' | 'in_progress' | 'coordinated';

const TAB_LABELS: Record<LoadStatus, string> = {
  all: 'همه',
  active: 'فعال',
  in_progress: 'در انجام',
  coordinated: 'هماهنگ شده',
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'همین الآن';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} دقیقه پیش`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ساعت پیش`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} روز پیش`;
  return new Date(dateString).toLocaleDateString('fa-IR');
}

export function LoadsPage() {
  const { setScreen, user, setSelectedLoadId } = useAppStore();
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LoadStatus>('all');
  const [blacklistedUsers, setBlacklistedUsers] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch blacklisted users
  useEffect(() => {
    const fetchBlacklist = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('blacklist')
        .select('blocked_user_id')
        .eq('user_id', user.id);
      setBlacklistedUsers(data?.map((item: any) => item.blocked_user_id) || []);
    };
    fetchBlacklist();
  }, [user?.id]);

  // Fetch loads
  const fetchLoads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('loads')
        .select('*, load_respondents(id, user_id, user_name, user_code)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out loads from blacklisted users
      const filtered = (data || []).filter(
        (load: any) => !blacklistedUsers.includes(load.owner_id)
      );
      setLoads(filtered);
    } catch (error) {
      console.error('Error fetching loads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoads();
  }, [blacklistedUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLoads();
    setRefreshing(false);
  };

  const filteredLoads = loads.filter((load) => {
    if (activeTab === 'all') return true;
    return load.status === activeTab;
  });

  const handleLoadClick = (loadId: string) => {
    setSelectedLoadId(loadId);
    setScreen('load-detail');
  };

  const handleNewLoad = () => {
    setScreen('new-load');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header title="اعلام بار" showNotifications showBack={false} />

      {/* Tabs */}
      <div className="sticky top-14 z-30 bg-white border-b border-gray-200">
        <div className="flex overflow-x-auto scrollbar-hide">
          {(Object.keys(TAB_LABELS) as LoadStatus[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-gray-600 active:bg-gray-50'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24 pt-4 px-4">
        {loading ? (
          <LoadingSpinner />
        ) : filteredLoads.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="بار موجود نیست"
            description={
              activeTab === 'all'
                ? 'برای شروع یک بار جدید اعلام کنید'
                : `هیچ باری با وضعیت ${TAB_LABELS[activeTab]} وجود ندارد`
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredLoads.map((load) => (
              <button
                key={load.id}
                onClick={() => handleLoadClick(load.id)}
                className="w-full bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow text-right"
              >
                {/* Owner Info */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {load.owner_name} <span className="text-gray-500 text-sm">#{load.owner_code}</span>
                    </p>
                  </div>
                  <StatusBadge status={load.status} />
                </div>

                {/* Load Text (Truncated) */}
                <p className="text-sm text-gray-700 mb-2 line-clamp-2">{load.text}</p>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatTimeAgo(load.created_at)}</span>
                  <span>{load.load_respondents?.length || 0} پاسخ</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FAB Button */}
      <button
        onClick={handleNewLoad}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center active:bg-primary-600 transition-colors"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Pull to Refresh Indicator */}
      {refreshing && (
        <div className="fixed top-14 left-0 right-0 bg-blue-50 px-4 py-2 text-center text-xs text-blue-600">
          در حال بروزرسانی...
        </div>
      )}
    </div>
  );
}
