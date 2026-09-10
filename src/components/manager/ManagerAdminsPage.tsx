import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Header } from '../ui/Header';
import { Modal, ConfirmDialog } from '../ui/Modal';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAppStore } from '../../store';
import type { Admin } from '../../types';

const roleConfig: Record<string, { label: string; color: string }> = {
  admin: { label: 'ادمین', color: 'bg-blue-100 text-blue-700' },
  manager: { label: 'مدیر', color: 'bg-purple-100 text-purple-700' },
};

export function ManagerAdminsPage() {
  const { setScreen } = useAppStore();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', role: 'admin' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (err) {
      console.error('Error fetching admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdmin.username.trim() || !newAdmin.password.trim()) return;

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('admins')
        .insert({
          username: newAdmin.username.trim(),
          password: newAdmin.password,
          role: newAdmin.role,
          is_active: true,
        });

      if (error) throw error;

      setNewAdmin({ username: '', password: '', role: 'admin' });
      setShowNewModal(false);
      await fetchAdmins();
    } catch (err) {
      console.error('Error creating admin:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (adminId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('admins')
        .update({ is_active: !isActive })
        .eq('id', adminId);

      if (error) throw error;
      await fetchAdmins();
    } catch (err) {
      console.error('Error toggling admin status:', err);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', adminId);

      if (error) throw error;
      setShowDeleteConfirm(null);
      await fetchAdmins();
    } catch (err) {
      console.error('Error deleting admin:', err);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 safe-bottom">
      <Header title="مدیریت ادمین‌ها" showBack />

      <div className="p-4 pb-20">
        {admins.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="ادمینی وجود ندارد"
            description="ادمین جدید اضافه کنید"
            action={
              <button onClick={() => setShowNewModal(true)} className="btn-primary mt-4">
                اضافه کردن ادمین
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="p-4 bg-white rounded-lg border border-gray-100 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{admin.username}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${roleConfig[admin.role]?.color}`}>
                        {roleConfig[admin.role]?.label}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        admin.is_active
                          ? 'bg-success-100 text-success-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {admin.is_active ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(admin.id, admin.is_active)}
                    className="text-gray-400 hover:text-primary-500 transition-colors"
                  >
                    {admin.is_active ? (
                      <ToggleRight className="w-6 h-6 text-success-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                </div>

                {admin.shift_start && admin.shift_end && (
                  <div className="text-xs text-gray-500">
                    شیفت: {admin.shift_start} - {admin.shift_end}
                  </div>
                )}

                <button
                  onClick={() => setShowDeleteConfirm(admin.id)}
                  className="w-full flex items-center justify-center gap-2 p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Admin Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="اضافه کردن ادمین جدید"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نام کاربری</label>
            <input
              type="text"
              value={newAdmin.username}
              onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
              placeholder="نام کاربری را وارد کنید"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رمز عبور</label>
            <input
              type="password"
              value={newAdmin.password}
              onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              placeholder="رمز عبور را وارد کنید"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نقش</label>
            <select
              value={newAdmin.role}
              onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="admin">ادمین</option>
              <option value="manager">مدیر</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowNewModal(false)} className="btn-ghost flex-1">
              انصراف
            </button>
            <button
              onClick={handleCreateAdmin}
              disabled={!newAdmin.username.trim() || !newAdmin.password.trim() || submitting}
              className="btn-primary flex-1"
            >
              {submitting ? 'درحال ایجاد...' : 'اضافه کردن'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => {
          if (showDeleteConfirm) {
            handleDeleteAdmin(showDeleteConfirm);
          }
        }}
        title="حذف ادمین"
        message="آیا مطمئن هستید؟ این عملیات قابل بازگشت نیست."
        confirmText="حذف"
        danger
      />
    </div>
  );
}
