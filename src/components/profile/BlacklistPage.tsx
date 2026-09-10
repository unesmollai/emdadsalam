import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { ConfirmDialog } from '../ui/Modal';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';

interface BlacklistEntry {
  id: string;
  user_id: string;
  blocked_user_id: string;
  blocked_user?: Profile;
  created_at: string;
}

export function BlacklistPage() {
  const { user, setScreen } = useAppStore();
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setScreen('profile');
      return;
    }
    fetchBlacklist();
  }, [user?.id]);

  const fetchBlacklist = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blacklist')
        .select('*, blocked_user:blocked_user_id(id, name, code, phone, is_verified, verification_status, ownership_type, rank, total_loads, completed_loads, is_active, created_at, updated_at)')
        .eq('user_id', user.id);

      if (error) throw error;
      setBlacklist(data || []);
    } catch (error) {
      console.error('Error fetching blacklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`name.ilike.%${query}%, code.ilike.%${query}%`)
        .not('id', 'eq', user?.id || '')
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching profiles:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleBlockUser = async () => {
    if (!user?.id || !selectedUser?.id) return;

    try {
      // Check if already blocked
      const { data: existing } = await supabase
        .from('blacklist')
        .select('id')
        .eq('user_id', user.id)
        .eq('blocked_user_id', selectedUser.id);

      if (existing && existing.length > 0) {
        alert('این کاربر قبلاً در لیست سیاه شما است');
        return;
      }

      const { error } = await supabase.from('blacklist').insert({
        user_id: user.id,
        blocked_user_id: selectedUser.id,
      });

      if (error) throw error;

      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setShowConfirm(false);
      await fetchBlacklist();
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('خطا در افزودن کاربر به لیست سیاه');
    }
  };

  const handleUnblock = async (blockedId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('blacklist')
        .delete()
        .eq('user_id', user.id)
        .eq('blocked_user_id', blockedId);

      if (error) throw error;
      await fetchBlacklist();
    } catch (error) {
      console.error('Error unblocking user:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="لیست سیاه" showBack />
      <div className="pb-24">
        {/* Search Section */}
        <div className="p-4 bg-white border-b border-gray-100">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="جستجو کاربر..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
            />
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="mt-3 max-h-48 overflow-y-auto">
              {searching ? (
                <p className="text-sm text-gray-500 py-2">در حال جستجو...</p>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => {
                        setSelectedUser(profile);
                        setShowConfirm(true);
                      }}
                      className="w-full text-right p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <p className="font-medium text-sm">{profile.name}</p>
                      <p className="text-xs text-gray-500">کد: {profile.code}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-2">نتیجه‌ای یافت نشد</p>
              )}
            </div>
          )}
        </div>

        {/* Blacklist */}
        <div className="p-4">
          {loading ? (
            <LoadingSpinner />
          ) : blacklist.length > 0 ? (
            <div className="space-y-2">
              {blacklist.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex-1 text-right">
                    <p className="font-medium">{entry.blocked_user?.name}</p>
                    <p className="text-xs text-gray-500">کد: {entry.blocked_user?.code}</p>
                  </div>
                  <button
                    onClick={() => handleUnblock(entry.blocked_user_id)}
                    className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title="لیست سیاه خالی"
              description="هیچ کاربری در لیست سیاه شما نیست"
            />
          )}
        </div>
      </div>

      {/* Confirm Block Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setSelectedUser(null);
        }}
        onConfirm={handleBlockUser}
        title="افزودن به لیست سیاه"
        message={`آیا مطمئن هستید که می‌خواهید ${selectedUser?.name} را به لیست سیاه خود اضافه کنید؟`}
        confirmText="افزودن"
        danger
      />
    </div>
  );
}
