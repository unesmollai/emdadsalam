import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Clock, Shield } from 'lucide-react';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { Admin } from '../../types';

const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_DURATION_MS = 15 * 60 * 1000;

export default function AdminLoginPage() {
  const { setScreen, setAdmin } = useAppStore();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateLimited, setRateLimited] = useState(false);
  const [retryTime, setRetryTime] = useState<number | null>(null);

  useEffect(() => {
    checkRateLimit();
    const interval = setInterval(checkRateLimit, 1000);
    return () => clearInterval(interval);
  }, []);

  const getAttemptKey = () => `admin_login_attempts_${new Date().toDateString()}`;
  const getRateLimitKey = () => `admin_login_rate_limit_${new Date().toDateString()}`;

  const checkRateLimit = () => {
    const rateLimitTime = localStorage.getItem(getRateLimitKey());
    if (rateLimitTime) {
      const limitTime = parseInt(rateLimitTime, 10);
      const now = Date.now();
      if (now < limitTime) {
        setRateLimited(true);
        setRetryTime(Math.ceil((limitTime - now) / 1000));
        return;
      } else {
        localStorage.removeItem(getRateLimitKey());
        localStorage.removeItem(getAttemptKey());
      }
    }
    setRateLimited(false);
    setRetryTime(null);
  };

  const recordFailedAttempt = () => {
    const attemptsStr = localStorage.getItem(getAttemptKey());
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
    const newAttempts = attempts + 1;

    if (newAttempts >= RATE_LIMIT_ATTEMPTS) {
      const rateLimitTime = Date.now() + RATE_LIMIT_DURATION_MS;
      localStorage.setItem(getRateLimitKey(), rateLimitTime.toString());
      setRateLimited(true);
      setRetryTime(15 * 60);
    } else {
      localStorage.setItem(getAttemptKey(), newAttempts.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rateLimited) {
      setError('تلاش‌های مجاز تمام شد. لطفاً ۱۵ دقیقه صبر کنید.');
      return;
    }

    if (!/^\d{4}$/.test(password)) {
      setError('رمز باید ۴ رقم باشد');
      return;
    }

    setLoading(true);

    try {
      // Look up admin by password (999 = manager, 888 = admin)
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('password', password)
        .eq('is_active', true)
        .maybeSingle();

      if (adminError || !adminData) {
        setError('رمز اشتباه است');
        recordFailedAttempt();
        setLoading(false);
        return;
      }

      const admin: Admin = {
        id: adminData.id,
        username: adminData.username,
        role: adminData.role,
        is_active: adminData.is_active,
        shift_start: adminData.shift_start,
        shift_end: adminData.shift_end,
        created_at: adminData.created_at,
      };

      setAdmin(admin);
      localStorage.removeItem(getAttemptKey());

      if (admin.role === 'manager') {
        setScreen('manager-dashboard');
      } else {
        setScreen('admin-dashboard');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError('خطای ناشناخته');
      recordFailedAttempt();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 via-primary-700 to-primary-500 text-white flex flex-col">
      {/* Back Button */}
      <div className="pt-6 px-6">
        <button
          onClick={() => setScreen('landing')}
          className="flex items-center gap-2 text-white/70 mb-8 p-2 -mr-2 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">بازگشت</span>
        </button>
      </div>

      {/* Form Container */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="max-w-sm mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">ورود ادمین / مدیر</h1>
            <p className="text-white/60">رمز ۴ رقمی خود را وارد کنید</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-danger-500/20 border border-danger-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-danger-300 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger-200">{error}</p>
            </div>
          )}

          {/* Rate Limit Alert */}
          {rateLimited && retryTime && (
            <div className="mb-6 p-4 bg-warning-500/20 border border-warning-500/30 rounded-xl flex items-start gap-3">
              <Clock className="w-5 h-5 text-warning-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-warning-200 font-medium">تلاش‌های مجاز تمام شد</p>
                <p className="text-xs text-warning-300 mt-1">
                  لطفاً {Math.ceil(retryTime / 60)} دقیقه صبر کنید
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2 text-right">
                رمز ورود (۴ رقم)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPassword(value);
                }}
                placeholder="****"
                inputMode="numeric"
                maxLength={4}
                disabled={rateLimited}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-4 text-center text-3xl tracking-[0.5em] font-mono text-white
                placeholder:text-white/30 placeholder:tracking-[0.5em] placeholder:text-2xl
                focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40
                disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || rateLimited || !/^\d{4}$/.test(password)}
              className="w-full bg-white text-primary-700 font-semibold py-4 px-6 rounded-2xl text-base
              active:scale-[0.98] transition-all duration-150 shadow-xl shadow-black/20
              hover:bg-white/95
              disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'درحال ورود...' : 'ورود'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
