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

  // استخراج ۵ رقم انتهایی شماره به عنوان رمز عبور
  const getPasswordFromPhone = (phoneNumber: string) => {
    return phoneNumber.slice(-5);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      return;
    }

    setLoading(true);

    try {
      const password = getPasswordFromPhone(phone);

      // Find user by phone
      const { data: profile, error: findError } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (findError || !profile) {
        setError('این شماره تلفن ثبت‌نام نشده است');
        setLoading(false);
        return;
      }

      // بررسی رمز عبور (مقایسه با ۵ رقم انتهایی)
      const expectedPassword = profile.code; // کد ذخیره شده در پروفایل
      if (expectedPassword !== password) {
        setError('خطا در تأیید هویت');
        setLoading(false);
        return;
      }

      if (!profile.is_active) {
        setError('حساب کاربری شما غیرفعال شده است');
        setLoading(false);
        return;
      }

      setUser(profile as Profile);
      setScreen('loads');
    } catch (err) {
      console.error('Login error:', err);
      setError('خطای ناشناخته');
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
          <p className="text-xs text-gray-400 mt-2">رمز عبور شما ۵ رقم انتهایی شماره تلفن است</p>
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
            {phone && (
              <p className="text-xs text-gray-400 mt-1 text-right">
                رمز عبور شما: {phone.slice(-5)}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold mt-4 disabled:opacity-50"
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