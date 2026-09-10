import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { RankBadge, VerificationBadge } from '../ui/StatusBadge';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';

export function AdminUsersPage() {
  const { setScreen, setSelectedUserId } = useAppStore();
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%, code.ilike.%${searchQuery}%, phone.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setScreen('admin-user-detail');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="مدیریت کاربران" showBack />
      <div className="pb-24">
        {/* Search Bar */}
        <div className="p-4 bg-white border-b border-gray-100">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو نام، کد یا شماره..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
            />
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Users List */}
        <div className="p-4">
          {loading ? (
            <LoadingSpinner />
          ) : users.length > 0 ? (
            <div className="space-y-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  className="w-full bg-white rounded-xl p-4 border border-gray-100 text-right hover:border-primary-300 hover:shadow-sm transition-all active:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <RankBadge rank={user.rank} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">کد: {user.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <VerificationBadge status={user.verification_status} />
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active
                            ? 'bg-success-100 text-success-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {user.is_active ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{user.phone}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title="کاربری یافت نشد"
              description={searchQuery ? 'نتیجه‌ای با این معیار موجود نیست' : 'هیچ کاربری ثبت نشده است'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
