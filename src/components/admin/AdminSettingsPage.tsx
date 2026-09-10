import React, { useEffect, useState } from 'react';
import { Header } from '../ui/Header';
import { LoadingSpinner } from '../ui/EmptyState';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';

interface ServerSettings {
  id: number;
  load_interval: number;
  max_concurrent_loads: number;
  rate_limit: number;
}

export function AdminSettingsPage() {
  const { setScreen } = useAppStore();
  const [settings, setSettings] = useState<ServerSettings | null>(null);
  const [loadInterval, setLoadInterval] = useState('');
  const [maxConcurrentLoads, setMaxConcurrentLoads] = useState('');
  const [rateLimit, setRateLimit] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('server_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (fetchError) throw fetchError;

      setSettings(data);
      setLoadInterval(data.load_interval.toString());
      setMaxConcurrentLoads(data.max_concurrent_loads.toString());
      setRateLimit(data.rate_limit.toString());
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('خطا در بارگذاری تنظیمات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    if (!loadInterval || !maxConcurrentLoads || !rateLimit) {
      setError('تمام فیلدها الزامی هستند');
      return;
    }

    const interval = parseInt(loadInterval);
    const concurrent = parseInt(maxConcurrentLoads);
    const limit = parseInt(rateLimit);

    if (isNaN(interval) || isNaN(concurrent) || isNaN(limit)) {
      setError('تمام مقادیر باید عدد باشند');
      return;
    }

    if (interval < 0 || concurrent < 0 || limit < 0) {
      setError('مقادیر نمی‌تواند منفی باشند');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { error: updateError } = await supabase
        .from('server_settings')
        .update({
          load_interval: interval,
          max_concurrent_loads: concurrent,
          rate_limit: limit,
        })
        .eq('id', 1);

      if (updateError) throw updateError;

      setSuccess('تنظیمات با موفقیت ذخیره شد');
      await fetchSettings();
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('خطا در ذخیره تنظیمات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="تنظیمات" showBack />
      <div className="p-4 pb-24">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          {/* Load Interval */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              فاصله بارگذاری (ثانیه)
            </label>
            <input
              type="number"
              value={loadInterval}
              onChange={(e) => setLoadInterval(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">زمانی که بارهای جدید درخواست می‌شوند</p>
          </div>

          {/* Max Concurrent Loads */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              حداکثر بارهای همزمان
            </label>
            <input
              type="number"
              value={maxConcurrentLoads}
              onChange={(e) => setMaxConcurrentLoads(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">تعداد بارهایی که هر کاربر می‌تواند فعال داشته باشد</p>
          </div>

          {/* Rate Limit */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              محدودیت نرخ (درخواست در ساعت)
            </label>
            <input
              type="number"
              value={rateLimit}
              onChange={(e) => setRateLimit(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">حداکثر درخواست‌های مجاز در هر ساعت</p>
          </div>

          {/* Error Message */}
          {error && <div className="mb-4 p-3 bg-danger-100 text-danger-700 rounded-lg text-sm">{error}</div>}

          {/* Success Message */}
          {success && <div className="mb-4 p-3 bg-success-100 text-success-700 rounded-lg text-sm">{success}</div>}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary-500 text-white rounded-lg py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors"
          >
            {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
          </button>
        </div>
      </div>
    </div>
  );
}
