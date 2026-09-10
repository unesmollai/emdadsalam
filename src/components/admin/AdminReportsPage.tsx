import React, { useEffect, useState } from 'react';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { ConfirmDialog } from '../ui/Modal';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { Report, Profile } from '../../types';

interface ReportWithUser extends Report {
  reporter?: Profile;
  target_user?: Profile;
}

export function AdminReportsPage() {
  const { setScreen } = useAppStore();
  const [reports, setReports] = useState<ReportWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportWithUser | null>(null);
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  const [showWarnDialog, setShowWarnDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          reporter:reporter_id(id, name, code, phone, is_verified, verification_status, ownership_type, rank, total_loads, completed_loads, is_active, created_at, updated_at),
          target_user:target_id(id, name, code, phone, is_verified, verification_status, ownership_type, rank, total_loads, completed_loads, is_active, created_at, updated_at)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!selectedReport?.id) return;

    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'dismissed' })
        .eq('id', selectedReport.id);

      if (error) throw error;

      setShowDismissDialog(false);
      setSelectedReport(null);
      await fetchReports();
    } catch (error) {
      console.error('Error dismissing report:', error);
      alert('خطا در رد گزارش');
    }
  };

  const handleWarn = async () => {
    if (!selectedReport?.id || !selectedReport?.target_id) return;

    try {
      const [updateReportError, updateProfileError] = await Promise.all([
        supabase
          .from('reports')
          .update({ status: 'actioned' })
          .eq('id', selectedReport.id),
        supabase
          .from('profiles')
          .update({ is_active: false })
          .eq('id', selectedReport.target_id),
      ]);

      if (updateReportError.error) throw updateReportError.error;
      if (updateProfileError.error) throw updateProfileError.error;

      setShowWarnDialog(false);
      setSelectedReport(null);
      await fetchReports();
    } catch (error) {
      console.error('Error warning user:', error);
      alert('خطا در اخطار کاربر');
    }
  };

  const handleSuspend = async () => {
    if (!selectedReport?.id || !selectedReport?.target_id) return;

    try {
      const [updateReportError, updateProfileError] = await Promise.all([
        supabase
          .from('reports')
          .update({ status: 'actioned' })
          .eq('id', selectedReport.id),
        supabase
          .from('profiles')
          .update({ is_active: false })
          .eq('id', selectedReport.target_id),
      ]);

      if (updateReportError.error) throw updateReportError.error;
      if (updateProfileError.error) throw updateProfileError.error;

      setShowSuspendDialog(false);
      setSelectedReport(null);
      await fetchReports();
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('خطا در تعلیق کاربر');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="گزارش‌ها" showBack />
      <div className="pb-24">
        <div className="p-4">
          {loading ? (
            <LoadingSpinner />
          ) : reports.length > 0 ? (
            <div className="space-y-3">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="w-full bg-white rounded-xl p-4 border border-gray-100 text-right hover:border-primary-300 hover:shadow-sm transition-all active:bg-gray-50"
                >
                  <div className="mb-2">
                    <p className="font-semibold text-gray-900 text-sm">گزارش کننده: {report.reporter?.name}</p>
                    <p className="text-xs text-gray-500">هدف: {report.target_user?.name}</p>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">دلیل: {report.reason}</p>
                  <p className="text-xs text-gray-500">{formatDate(report.created_at)}</p>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Header as any}
              title="گزارشی وجود ندارد"
              description="هیچ گزارش در انتظار بررسی نیست"
            />
          )}
        </div>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setSelectedReport(null)}>
          <div className="absolute inset-0 bg-black/50 animate-fade-in" />
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">جزئیات گزارش</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">گزارش کننده</p>
                <p className="font-medium text-gray-900">{selectedReport.reporter?.name}</p>
                <p className="text-xs text-gray-500">{selectedReport.reporter?.code}</p>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">هدف</p>
                <p className="font-medium text-gray-900">{selectedReport.target_user?.name}</p>
                <p className="text-xs text-gray-500">{selectedReport.target_user?.code}</p>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">نوع</p>
                <p className="text-sm text-gray-900">
                  {selectedReport.target_type === 'message' ? 'پیام' : 'کاربر'}
                </p>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">دلیل</p>
                <p className="text-sm text-gray-900">{selectedReport.reason}</p>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">تاریخ</p>
                <p className="text-sm text-gray-900">{formatDate(selectedReport.created_at)}</p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setShowDismissDialog(true)}
                  className="w-full bg-gray-500 text-white rounded-lg py-3 font-semibold hover:bg-gray-600 transition-colors"
                >
                  رد کردن
                </button>
                <button
                  onClick={() => setShowWarnDialog(true)}
                  className="w-full bg-warning-500 text-white rounded-lg py-3 font-semibold hover:bg-warning-600 transition-colors"
                >
                  اخطار
                </button>
                <button
                  onClick={() => setShowSuspendDialog(true)}
                  className="w-full bg-danger-500 text-white rounded-lg py-3 font-semibold hover:bg-danger-600 transition-colors"
                >
                  تعلیق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={showDismissDialog}
        onClose={() => setShowDismissDialog(false)}
        onConfirm={handleDismiss}
        title="رد کردن گزارش"
        message="آیا مطمئن هستید که می‌خواهید این گزارش را رد کنید؟"
        confirmText="رد کردن"
      />

      <ConfirmDialog
        isOpen={showWarnDialog}
        onClose={() => setShowWarnDialog(false)}
        onConfirm={handleWarn}
        title="اخطار کاربر"
        message={`آیا مطمئن هستید که می‌خواهید ${selectedReport?.target_user?.name} را اخطار دهید؟`}
        confirmText="اخطار"
      />

      <ConfirmDialog
        isOpen={showSuspendDialog}
        onClose={() => setShowSuspendDialog(false)}
        onConfirm={handleSuspend}
        title="تعلیق کاربر"
        message={`آیا مطمئن هستید که می‌خواهید ${selectedReport?.target_user?.name} را تعلیق کنید؟ این عمل برگشت‌پذیر است.`}
        confirmText="تعلیق"
        danger
      />
    </div>
  );
}
