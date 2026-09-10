import React, { useEffect, useState } from 'react';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { ConfirmDialog } from '../ui/Modal';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { VerificationRequest, Profile } from '../../types';

interface VerificationRequestWithUser extends VerificationRequest {
  user?: Profile;
}

export function AdminVerificationPage() {
  const { setScreen } = useAppStore();
  const [requests, setRequests] = useState<VerificationRequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequestWithUser | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');

  useEffect(() => {
    fetchVerificationRequests();
  }, []);

  const fetchVerificationRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`
          *,
          user:user_id(id, name, code, phone, is_verified, verification_status, ownership_type, rank, total_loads, completed_loads, is_active, created_at, updated_at)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching verification requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest?.id || !selectedRequest?.user_id) return;

    try {
      const { error: updateReqError } = await supabase
        .from('verification_requests')
        .update({
          status: 'approved',
          reviewed_by: 'admin',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (updateReqError) throw updateReqError;

      const { error: updateUserError } = await supabase
        .from('profiles')
        .update({
          is_verified: true,
          verification_status: 'verified',
          ownership_type: selectedRequest.ownership_type,
        })
        .eq('id', selectedRequest.user_id);

      if (updateUserError) throw updateUserError;

      setShowApproveDialog(false);
      setSelectedRequest(null);
      await fetchVerificationRequests();
    } catch (error) {
      console.error('Error approving verification:', error);
      alert('خطا در تأیید احراز هویت');
    }
  };

  const handleRequestRevision = async () => {
    if (!selectedRequest?.id || !selectedRequest?.user_id) return;

    try {
      const { error: updateReqError } = await supabase
        .from('verification_requests')
        .update({
          status: 'revision_requested',
          admin_note: revisionNote,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (updateReqError) throw updateReqError;

      const { error: updateUserError } = await supabase
        .from('profiles')
        .update({ verification_status: 'revision_requested' })
        .eq('id', selectedRequest.user_id);

      if (updateUserError) throw updateUserError;

      setShowRevisionDialog(false);
      setRevisionNote('');
      setSelectedRequest(null);
      await fetchVerificationRequests();
    } catch (error) {
      console.error('Error requesting revision:', error);
      alert('خطا در درخواست اصلاح');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest?.id || !selectedRequest?.user_id) return;

    try {
      const { error: updateReqError } = await supabase
        .from('verification_requests')
        .update({
          status: 'rejected',
          reviewed_by: 'admin',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (updateReqError) throw updateReqError;

      const { error: updateUserError } = await supabase
        .from('profiles')
        .update({ verification_status: 'rejected' })
        .eq('id', selectedRequest.user_id);

      if (updateUserError) throw updateUserError;

      setShowRejectDialog(false);
      setSelectedRequest(null);
      await fetchVerificationRequests();
    } catch (error) {
      console.error('Error rejecting verification:', error);
      alert('خطا در رد کردن احراز هویت');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="احراز هویت" showBack />
      <div className="pb-24">
        <div className="p-4">
          {loading ? (
            <LoadingSpinner />
          ) : requests.length > 0 ? (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-xl p-4 border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 text-right">
                      <p className="font-semibold text-gray-900">{request.user?.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">کد: {request.user?.code}</p>
                      <p className="text-xs text-gray-500">
                        نوع: {
                          request.ownership_type === 'personal'
                            ? 'شخصی'
                            : request.ownership_type === 'company'
                            ? 'شرکتی'
                            : 'اجاره‌ای'
                        }
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-700">
                      در انتظار
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{formatDate(request.created_at)}</p>
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="w-full py-2 px-3 bg-primary-50 text-primary-600 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
                  >
                    بررسی مستندات
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Header as any}
              title="درخواست احراز هویت نیست"
              description="تمامی درخواست‌های احراز هویت بررسی شده‌اند"
            />
          )}
        </div>
      </div>

      {/* Review Dialog */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setSelectedRequest(null)}>
          <div className="absolute inset-0 bg-black/50 animate-fade-in" />
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">{selectedRequest.user?.name}</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-3">مستندات (URL):</p>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">مستندات درخواست</p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowApproveDialog(true);
                    setSelectedRequest(selectedRequest);
                  }}
                  className="w-full bg-success-500 text-white rounded-lg py-3 font-semibold hover:bg-success-600 transition-colors"
                >
                  تأیید
                </button>
                <button
                  onClick={() => setShowRevisionDialog(true)}
                  className="w-full bg-warning-500 text-white rounded-lg py-3 font-semibold hover:bg-warning-600 transition-colors"
                >
                  درخواست اصلاح
                </button>
                <button
                  onClick={() => {
                    setShowRejectDialog(true);
                    setSelectedRequest(selectedRequest);
                  }}
                  className="w-full bg-danger-500 text-white rounded-lg py-3 font-semibold hover:bg-danger-600 transition-colors"
                >
                  رد کردن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={showApproveDialog}
        onClose={() => setShowApproveDialog(false)}
        onConfirm={handleApprove}
        title="تأیید احراز هویت"
        message={`آیا مطمئن هستید که می‌خواهید ${selectedRequest?.user?.name} را تأیید کنید؟`}
        confirmText="تأیید"
      />

      <ConfirmDialog
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onConfirm={handleReject}
        title="رد کردن احراز هویت"
        message={`آیا مطمئن هستید که می‌خواهید درخواست ${selectedRequest?.user?.name} را رد کنید؟`}
        confirmText="رد کردن"
        danger
      />

      {/* Revision Dialog */}
      {showRevisionDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowRevisionDialog(false)}>
          <div className="absolute inset-0 bg-black/50 animate-fade-in" />
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">درخواست اصلاح</h2>
              <button
                onClick={() => setShowRevisionDialog(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                پیام اصلاح
              </label>
              <textarea
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="توضیح اصلاح مورد نیاز..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-right resize-none"
              />
              <button
                onClick={handleRequestRevision}
                className="w-full mt-4 bg-warning-500 text-white rounded-lg py-3 font-semibold hover:bg-warning-600 transition-colors"
              >
                ارسال درخواست اصلاح
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
