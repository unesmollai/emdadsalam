import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Header } from '../ui/Header';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { Profile, Load } from '../../types';

export function InvoiceCreatePage() {
  const { user, setScreen } = useAppStore();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [userLoads, setUserLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) {
      setScreen('profile');
      return;
    }
  }, []);

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
        .not('id', 'eq', user?.id || '')
        .limit(10);

      if (searchError) throw searchError;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = async (profile: Profile) => {
    setSelectedUser(profile);
    setUserSearch('');
    setSearchResults([]);

    try {
      const { data, error: loadsError } = await supabase
        .from('loads')
        .select('*')
        .eq('owner_id', user?.id)
        .eq('status', 'active');

      if (loadsError) throw loadsError;
      setUserLoads(data || []);
    } catch (err) {
      console.error('Error fetching loads:', err);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id || !selectedUser?.id) {
      setError('لطفاً کاربری را انتخاب کنید');
      return;
    }

    if (!amount.trim()) {
      setError('لطفاً مبلغ را وارد کنید');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('مبلغ باید عدد مثبت باشد');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { error: insertError } = await supabase.from('invoices').insert({
        from_user_id: user.id,
        to_user_id: selectedUser.id,
        load_id: selectedLoad?.id || null,
        amount: amountNum,
        description: description.trim() || null,
        status: 'pending',
      });

      if (insertError) throw insertError;

      setScreen('invoice');
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError('خطا در ایجاد فاکتور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="فاکتور جدید" showBack />
      <div className="p-4 pb-24">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          {/* User Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              دریافت‌کننده <span className="text-danger-500">*</span>
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
                    setSelectedLoad(null);
                    setUserLoads([]);
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

          {/* Load Selection - Optional */}
          {selectedUser && userLoads.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                مرجع بار (اختیاری)
              </label>
              <select
                value={selectedLoad?.id || ''}
                onChange={(e) => {
                  const load = userLoads.find((l) => l.id === e.target.value);
                  setSelectedLoad(load || null);
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
              >
                <option value="">انتخاب نکنید</option>
                {userLoads.map((load) => (
                  <option key={load.id} value={load.id}>
                    {load.text.substring(0, 50)}...
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مبلغ (تومان) <span className="text-danger-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
              min="0"
              step="1000"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              توضیح (اختیاری)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="توضیحات فاکتور..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right resize-none"
            />
          </div>

          {/* Error Message */}
          {error && <div className="mb-4 p-3 bg-danger-100 text-danger-700 rounded-lg text-sm">{error}</div>}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedUser}
            className="w-full bg-primary-500 text-white rounded-lg py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors"
          >
            {loading ? 'در حال ایجاد...' : 'ایجاد فاکتور'}
          </button>
        </div>
      </div>
    </div>
  );
}
