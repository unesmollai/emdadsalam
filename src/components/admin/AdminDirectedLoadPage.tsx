import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Header } from '../ui/Header';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';

export function AdminDirectedLoadPage() {
  const { setScreen, admin } = useAppStore();
  const [loadText, setLoadText] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  if (!admin?.id) {
    setScreen('profile');
    return null;
  }

  const handleUserSearch = async (query: string) => {
    setUserSearch(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const { data, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .or(`name.ilike.%${query}%, code.ilike.%${query}%`)
        .limit(10);

      if (searchError) throw searchError;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = (profile: Profile) => {
    setSelectedUser(profile);
    setUserSearch('');
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    if (!loadText.trim()) {
      setError('لطفاً متن بار را وارد کنید');
      return;
    }

    if (!selectedUser?.id) {
      setError('لطفاً کاربری را انتخاب کنید');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { error: insertError } = await supabase.from('loads').insert({
        owner_id: admin.id,
        owner_name: 'Admin',
        owner_code: admin.username,
        text: loadText.trim(),
        status: 'active',
        is_directed: true,
        directed_to: selectedUser.id,
      });

      if (insertError) throw insertError;

      setLoadText('');
      setSelectedUser(null);
      setPriority('medium');
      alert('بار با موفقیت ایجاد شد');
      setScreen('loads');
    } catch (err) {
      console.error('Error creating directed load:', err);
      setError('خطا در ایجاد بار');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="هدایت بار" showBack />
      <div className="p-4 pb-24">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          {/* Load Text */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              متن بار <span className="text-danger-500">*</span>
            </label>
            <textarea
              value={loadText}
              onChange={(e) => setLoadText(e.target.value)}
              placeholder="توضیح بار را وارد کنید..."
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right resize-none"
            />
          </div>

          {/* User Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              هدایت به <span className="text-danger-500">*</span>
            </label>
            {selectedUser ? (
              <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg border border-primary-200">
                <div className="text-right">
                  <p className="font-medium text-gray-900">{selectedUser.name}</p>
                  <p className="text-xs text-gray-500">کد: {selectedUser.code}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  تغییر
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    placeholder="جستجو کاربر..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                  />
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                </div>
                {userSearch && (
                  <div className="mt-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                    {searching ? (
                      <p className="text-sm text-gray-500 p-3">در حال جستجو...</p>
                    ) : searchResults.length > 0 ? (
                      <div className="divide-y">
                        {searchResults.map((profile) => (
                          <button
                            key={profile.id}
                            onClick={() => handleSelectUser(profile)}
                            className="w-full text-right p-3 hover:bg-gray-50 transition-colors"
                          >
                            <p className="font-medium text-sm">{profile.name}</p>
                            <p className="text-xs text-gray-500">کد: {profile.code}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 p-3">نتیجه‌ای یافت نشد</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Priority */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اولویت
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
            >
              <option value="low">کم</option>
              <option value="medium">متوسط</option>
              <option value="high">بالا</option>
            </select>
          </div>

          {/* Error Message */}
          {error && <div className="mb-4 p-3 bg-danger-100 text-danger-700 rounded-lg text-sm">{error}</div>}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedUser}
            className="w-full bg-primary-500 text-white rounded-lg py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors"
          >
            {loading ? 'در حال ایجاد...' : 'هدایت بار'}
          </button>
        </div>
      </div>
    </div>
  );
}
