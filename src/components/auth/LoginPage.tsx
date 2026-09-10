import React, { useState } from 'react';
import { ArrowLeft, AlertCircle, Smartphone } from 'lucide-react';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';

export default function LoginPage() {
  const { setScreen, setUser } = useAppStore();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const validatePhone = (value: string) => {
    if (value && !/^09\d{9}$/.test(value)) {
      return 'شماره تلفن باید ۱۱ رقم با شروع ۰۹ باشد';
    }
    return '';
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(value);
    setPhoneError(validatePhone(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      return;
    }

    if (!phone) {
      setPhoneError('شماره تلفن الزامی است');
      return;
    }

    setLoading(true);

    try {
      // Find user by phone
      const { data: profile, error: findError } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') {
        console.error('Login error:', findError);
        setError('خطا در اتصال به سرور. لطفاً دوباره تلاش کنید.');
        setLoading(false);
        return;
      }

      if (!profile) {
        setError('این شماره تلفن ثبت‌نام نشده است');
        setLoading(false);
        return;
      }

      if (!profile.is_active) {
        setError('حساب کاربری شما غیرفعال شده است');
        setLoading(false);
        return;
      }

      // Validate profile data
      if (!profile.id || !profile.name) {
        setError('خطا: داده‌های پروفایل ناقص است');
        setLoading(false);
        return;
      }

      const userData: Profile = {
        id: profile.id,
        name: profile.name || '',
        code: profile.code || phone.slice(-4),
        phone: profile.phone || '',
        is_verified: profile.is_verified || false,
        verification_status: profile.verification_status || 'unverified',
        ownership_type: profile.ownership_type || null,
        rank: profile.rank || 'none',
        total_loads: profile.total_loads || 0,
        completed_loads: profile.completed_loads || 0,
        is_active: profile.is_active || false,
        created_at: profile.created_at || new Date().toISOString(),
        updated_at: profile.updated_at || new Date().toISOString(),
      };

      setUser(userData);
      setScreen('loads');
    } catch (err) {
      console.error('Login error:', err);
      setError('خطای ناشناخته. لطفاً دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-6 px-6 pb-12">
      <button
        onClick={() => setScreen('landing')}
        className="flex items-center gap-2 text-primary-500 mb-8 self-end p-2 -mr-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">بازگشت</span>
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-primary-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ورود امدادگر</h1>
          <p className="text-gray-600">شماره تلفن خود را وارد کنید</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              شماره تلفن
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              maxLength={11}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right ${
                phoneError ? 'border-danger-500' : 'border-gray-300'
              }`}
            />
            {phoneError && <p className="text-danger-600 text-xs mt-2 text-right">{phoneError}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !phone || !!phoneError}
            className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold mt-4 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors"
          >
            {loading ? 'درحال ورود...' : 'ورود'}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-gray-600 text-sm">
            حساب ندارید؟{' '}
            <button
              onClick={() => setScreen('register')}
              className="text-primary-500 font-medium hover:text-primary-600"
            >
              ثبت‌نام کنید
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}