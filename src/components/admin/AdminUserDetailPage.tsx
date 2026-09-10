import React, { useEffect, useState } from 'react';
import { Copy, Lock, Trash2, CheckCircle } from 'lucide-react';
import { Header } from '../ui/Header';
import { LoadingSpinner } from '../ui/EmptyState';
import { RankBadge, VerificationBadge } from '../ui/StatusBadge';
import { ConfirmDialog } from '../ui/Modal';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';

export function AdminUserDetailPage() {
  const { setScreen, selectedUserId } = useAppStore();
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmDeactivate, setShowConfirmDeactivate] = useState(false);
  const [showConfirmVerify, setShowConfirmVerify] = useState(false);

  useEffect(() => {
    if (!selectedUserId) {
      setScreen('admin-users');
      return;
    }
    fetchUserDetail();
  }, [selectedUserId]);

  const fetchUserDetail = async () => {
    if (!selectedUserId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', selectedUserId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error('Error fetching user detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_verified: true,
          verification_status: 'verified',
        })
        .eq('id', user.id);

      if (error) throw error;

      const updated = { ...user, is_verified: true, verification_status: 'verified' as const };
      setUser(updated);
      setShowConfirmVerify(false);
    } catch (error) {
      console.error('Error verifying user:', error);
      alert('خطا در تأیید کاربر');
    }
  };

  const handleDeactivate = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', user.id);

      if (error) throw error;

      const updated = { ...user, is_active: false };
      setUser(updated);
      setShowConfirmDeactivate(false);
    } catch (error) {
      console.error('Error deactivating user:', error);
      alert('خطا در غیرفعال کردن کاربر');
    }
  };

  const handleDelete = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', user.id);

      if (error) throw error;

      setShowConfirmDelete(false);
      setScreen('admin-users');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('خطا در حذف کاربر');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) return <LoadingSpinner />;

  if (!user)
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="کاربر" showBack />
        <div className="p-4">
          <p className="text-center text-gray-500">کاربری یافت نشد</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={user.name} showBack />
      <div className="pb-24">
        {/* User Header */}
        <div className="bg-gradient-to-b from-primary-500 to-primary-600 text-white px-4 pt-4 pb-8">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-primary-600 font-bold text-3xl mb-3">
              {user.name.charAt(0)}
            </div>
            <h2 className="text-xl font-bold text-center">{user.name}</h2>
          </div>
        </div>

        <div className="p-4">
          {/* Info Cards */}
          <div className="space-y-3 mb-6">
            {/* Code */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-2">کد کاربری</p>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => copyToClipboard(user.code)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <p className="font-mono text-sm text-gray-900">{user.code}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-2">شماره تلفن</p>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => copyToClipboard(user.phone)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <p className="text-sm text-gray-900">{user.phone}</p>
              </div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-3">وضعیت</p>
              <div className="flex items-center gap-2">
                <VerificationBadge status={user.verification_status} />
                <RankBadge rank={user.rank} />
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
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                <p className="text-2xl font-bold text-primary-600">{user.total_loads}</p>
                <p className="text-xs text-gray-600 mt-1">کل بارها</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                <p className="text-2xl font-bold text-success-600">{user.completed_loads}</p>
                <p className="text-xs text-gray-600 mt-1">بارهای انجام شده</p>
              </div>
            </div>

            {/* Ownership Type */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-2">نوع مالکیت</p>
              <p className="text-sm text-gray-900">
                {user.ownership_type === 'personal'
                  ? 'شخصی'
                  : user.ownership_type === 'company'
                  ? 'شرکتی'
                  : user.ownership_type === 'rental'
                  ? 'اجاره‌ای'
                  : 'مشخص نشده'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {user.verification_status !== 'verified' && (
              <button
                onClick={() => setShowConfirmVerify(true)}
                className="w-full bg-success-500 text-white rounded-xl p-4 flex items-center justify-center gap-2 font-semibold hover:bg-success-600 transition-colors"
              >
                <CheckCircle className="w-5 h-5" />
                تأیید کاربر
              </button>
            )}

            {user.is_active && (
              <button
                onClick={() => setShowConfirmDeactivate(true)}
                className="w-full bg-warning-500 text-white rounded-xl p-4 flex items-center justify-center gap-2 font-semibold hover:bg-warning-600 transition-colors"
              >
                <Lock className="w-5 h-5" />
                غیرفعال کردن
              </button>
            )}

            <button
              onClick={() => setShowConfirmDelete(true)}
              className="w-full bg-danger-500 text-white rounded-xl p-4 flex items-center justify-center gap-2 font-semibold hover:bg-danger-600 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              حذف کاربر
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={showConfirmVerify}
        onClose={() => setShowConfirmVerify(false)}
        onConfirm={handleVerify}
        title="تأیید کاربر"
        message={`آیا مطمئن هستید که می‌خواهید ${user.name} را تأیید کنید؟`}
        confirmText="تأیید"
      />

      <ConfirmDialog
        isOpen={showConfirmDeactivate}
        onClose={() => setShowConfirmDeactivate(false)}
        onConfirm={handleDeactivate}
        title="غیرفعال کردن"
        message={`آیا مطمئن هستید که می‌خواهید ${user.name} را غیرفعال کنید؟`}
        confirmText="غیرفعال کردن"
        danger
      />

      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="حذف کاربر"
        message={`آیا مطمئن هستید که می‌خواهید ${user.name} را حذف کنید؟ این عمل برگشت‌پذیر نیست.`}
        confirmText="حذف"
        danger
      />
    </div>
  );
}
