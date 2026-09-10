import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Header } from '../ui/Header';
import { LoadingSpinner } from '../ui/EmptyState';
import { Lock, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store';

interface ServerSettings {
  features: {
    chat_enabled: boolean;
    radio_enabled: boolean;
    games_enabled: boolean;
    dm_enabled: boolean;
  };
  security: {
    rate_limit_requests: number;
    rate_limit_window: number;
  };
  system: {
    blocked_ips: string[];
  };
}

export function ManagerSettingsPage() {
  const { setScreen } = useAppStore();
  const [settings, setSettings] = useState<ServerSettings>({
    features: {
      chat_enabled: true,
      radio_enabled: true,
      games_enabled: true,
      dm_enabled: true,
    },
    security: {
      rate_limit_requests: 100,
      rate_limit_window: 60,
    },
    system: {
      blocked_ips: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('server_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = (feature: keyof ServerSettings['features']) => {
    setSettings(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features[feature],
      },
    }));
  };

  const handleRateLimitChange = (field: 'rate_limit_requests' | 'rate_limit_window', value: number) => {
    setSettings(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [field]: value,
      },
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('server_settings')
        .upsert(settings);

      if (error) throw error;
      // Show success message
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      // Show error
      return;
    }

    // In a real app, this would call a backend endpoint
    console.log('Change password:', { oldPassword, newPassword });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 safe-bottom">
      <Header title="تنظیمات مدیر" showBack />

      <div className="p-4 pb-20 space-y-6">
        {/* Security Section */}
        <div className="bg-white rounded-lg border border-gray-100 p-4 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            امنیت
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رمز عبور فعلی</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="رمز عبور فعلی را وارد کنید"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رمز عبور جدید</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="رمز عبور جدید را وارد کنید"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تأیید رمز عبور</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="رمز عبور را تأیید کنید"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <button
            onClick={handleChangePassword}
            disabled={!oldPassword || !newPassword || !confirmPassword}
            className="w-full btn-primary"
          >
            تغییر رمز عبور
          </button>
        </div>

        {/* Rate Limiting */}
        <div className="bg-white rounded-lg border border-gray-100 p-4 space-y-4">
          <h2 className="font-semibold text-gray-800">محدودیت نرخ درخواست</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">حداکثر درخواست</label>
            <input
              type="number"
              value={settings.security.rate_limit_requests}
              onChange={(e) => handleRateLimitChange('rate_limit_requests', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">بازه زمانی (ثانیه)</label>
            <input
              type="number"
              value={settings.security.rate_limit_window}
              onChange={(e) => handleRateLimitChange('rate_limit_window', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="bg-white rounded-lg border border-gray-100 p-4 space-y-3">
          <h2 className="font-semibold text-gray-800 mb-4">ویژگی‌ها</h2>

          {Object.entries(settings.features).map(([key, value]) => (
            <FeatureToggle
              key={key}
              label={
                key === 'chat_enabled' ? 'چت گروهی'
                : key === 'radio_enabled' ? 'رادیو'
                : key === 'games_enabled' ? 'بازی‌ها'
                : 'پیام‌های خصوصی'
              }
              enabled={value}
              onChange={() => handleToggleFeature(key as keyof ServerSettings['features'])}
            />
          ))}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full btn-primary"
        >
          {saving ? 'درحال ذخیره...' : 'ذخیره تنظیمات'}
        </button>
      </div>
    </div>
  );
}

function FeatureToggle({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors text-right"
    >
      <span className="text-gray-800 font-medium">{label}</span>
      <div onClick={(e) => e.stopPropagation()}>
        {enabled ? (
          <ToggleRight className="w-6 h-6 text-success-500" />
        ) : (
          <ToggleLeft className="w-6 h-6 text-gray-300" />
        )}
      </div>
    </button>
  );
}
