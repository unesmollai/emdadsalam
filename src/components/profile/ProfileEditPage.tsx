import React, { useState } from 'react';
import { Header } from '../ui/Header';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';

export function ProfileEditPage() {
  const { setScreen, user, setUser } = useAppStore();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!user?.id) return;

    if (!name.trim()) {
      setError('نام نمی‌تواند خالی باشد');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      const updatedUser = { ...user, name: name.trim() };
      setUser(updatedUser);
      setScreen('profile');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('خطا در بروزرسانی پروفایل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="ویرایش پروفایل" showBack />
      <div className="p-4 pb-24">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          {/* Name Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">نام</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
              placeholder="نام خود را وارد کنید"
            />
          </div>

          {/* Code Field - Read Only */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">کد</label>
            <input
              type="text"
              value={user?.code || ''}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-right cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">کد قابل تغییر نیست</p>
          </div>

          {/* Phone Field - Read Only */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">شماره تلفن</label>
            <input
              type="tel"
              value={user?.phone || ''}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-right cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">شماره تلفن قابل تغییر نیست</p>
          </div>

          {/* Error Message */}
          {error && <div className="mb-4 p-3 bg-danger-100 text-danger-700 rounded-lg text-sm">{error}</div>}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-primary-500 text-white rounded-lg py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors"
          >
            {loading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>
    </div>
  );
}
