import React, { useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';

export default function RegisterPage() {
  const { setScreen, setUser } = useAppStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({ name: '', phone: '' });

  const validateName = (value: string) => {
    if (value.length < 2) return 'نام باید حداقل ۲ حرف باشد';
    if (value.length > 50) return 'نام نمی‌تواند بیش از ۵۰ حرف باشد';
    return '';
  };

  const validatePhone = (value: string) => {
    if (!/^09\d{9}$/.test(value)) return 'شماره تلفن باید ۱۱ رقم با شروع ۰۹ باشد';
    return '';
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    setErrors(prev => ({ ...prev, name: validateName(value) }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(value);
    setErrors(prev => ({ ...prev, phone: validatePhone(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const nameError = validateName(name);
    const phoneError = validatePhone(phone);

    if (nameError || phoneError) {
      setErrors({ name: nameError, phone: phoneError });
      return;
    }

    setLoading(true);

    try {
      // Check if phone already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('phone')
        .eq('phone', phone)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUser) {
        setError('این شماره تلفن قبلاً ثبت‌نام کرده است');
        setLoading(false);
        return;
      }

      const userId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name,
          code: phone.slice(-4), // Use last 4 digits as code for display purposes
          phone,
          is_verified: false,
          verification_status: 'unverified',
          ownership_type: null,
          rank: 'none',
          total_loads: 0,
          completed_loads: 0,
          is_active: true,
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        setError('خطا در ایجاد پروفایل. لطفاً دوباره تلاش کنید.');
        setLoading(false);
        return;
      }

      if (!profileData) {
        setError('خطا: پروفایل ایجاد نشد.');
        setLoading(false);
        return;
      }

      const profile: Profile = {
        id: profileData.id,
        name: profileData.name,
        code: profileData.code,
        phone: profileData.phone,
        is_verified: profileData.is_verified,
        verification_status: profileData.verification_status,
        ownership_type: profileData.ownership_type,
        rank: profileData.rank,
        total_loads: profileData.total_loads,
        completed_loads: profileData.completed_loads,
        is_active: profileData.is_active,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
      };

      setUser(profile);
      setScreen('loads');
    } catch (err) {
      console.error('Registration error:', err);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ثبت‌نام امدادگر</h1>
          <p className="text-gray-600">نام و شماره تلفن خود را وارد کنید</p>
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
              نام و نام‌خانوادگی
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="نام خود را وارد کنید"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right ${
                errors.name ? 'border-danger-500' : 'border-gray-300'
              }`}
            />
            {errors.name && <p className="text-danger-600 text-xs mt-2 text-right">{errors.name}</p>}
          </div>

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
                errors.phone ? 'border-danger-500' : 'border-gray-300'
              }`}
            />
            {errors.phone && <p className="text-danger-600 text-xs mt-2 text-right">{errors.phone}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !name || !phone}
            className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold mt-4 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors"
          >
            {loading ? 'درحال ثبت‌نام...' : 'ثبت‌نام و ورود'}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-gray-600 text-sm">
            قبلاً ثبت‌نام کرده‌اید؟{' '}
            <button
              onClick={() => setScreen('login')}
              className="text-primary-500 font-medium hover:text-primary-600"
            >
              وارد شوید
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}