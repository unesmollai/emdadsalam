import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { Header } from '../ui/Header';
import { Modal, ConfirmDialog } from '../ui/Modal';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { VerificationBadge } from '../ui/StatusBadge';
import { Upload, Users, Home, Truck, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import type { VerificationRequest, Profile } from '../../types';

type VerificationStep = 'type' | 'documents' | 'review' | 'pending' | 'result';
type OwnershipType = 'personal' | 'company' | 'rental';

export function VerificationPage() {
  const { user, setUser, setScreen } = useAppStore();
  const [step, setStep] = useState<VerificationStep>('type');
  const [ownershipType, setOwnershipType] = useState<OwnershipType | null>(null);
  const [documents, setDocuments] = useState<Record<string, File | null>>({
    idCard: null,
    vehicleReg: null,
    insuranceCert: null,
    companyDoc: null,
  });
  const [currentRequest, setCurrentRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCurrentRequest();
  }, [user?.id]);

  const fetchCurrentRequest = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (err && err.code !== 'PGRST116') throw err;

      if (data) {
        setCurrentRequest(data);
        if (data.status === 'pending') {
          setStep('pending');
        } else {
          setStep('result');
        }
      }
    } catch (err) {
      console.error('Error fetching verification request:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (fieldName: string, file: File | null) => {
    setDocuments(prev => ({
      ...prev,
      [fieldName]: file
    }));
  };

  const handleSubmitVerification = async () => {
    if (!user?.id || !ownershipType) {
      setError('لطفا نوع مالکیت را انتخاب کنید');
      return;
    }

    const requiredDocs = ownershipType === 'personal'
      ? ['idCard', 'vehicleReg']
      : ownershipType === 'company'
      ? ['idCard', 'vehicleReg', 'companyDoc']
      : ['idCard', 'vehicleReg', 'insuranceCert'];

    const missingDocs = requiredDocs.filter(doc => !documents[doc]);
    if (missingDocs.length > 0) {
      setError('لطفا تمام مستندات مورد نیاز را آپلود کنید');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Insert verification request
      const { data: verificationData, error: verificationError } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          ownership_type: ownershipType,
          status: 'pending',
        })
        .select()
        .single();

      if (verificationError) throw verificationError;

      // Upload documents to storage
      for (const [fieldName, file] of Object.entries(documents)) {
        if (!file) continue;

        const fileName = `${user.id}/${verificationData.id}/${fieldName}`;
        const { error: uploadError } = await supabase.storage
          .from('verification-documents')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;
      }

      setCurrentRequest(verificationData);
      setStep('pending');
    } catch (err: any) {
      setError(err.message || 'خطا در ارسال مستندات');
      console.error('Error submitting verification:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 safe-bottom">
      <Header title="احراز هویت" showBack onBack={() => setScreen('profile')} />

      <div className="p-4">
        {step === 'type' && (
          <div className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold text-gray-800">نوع مالکیت خود را انتخاب کنید</h2>

            {error && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
                {error}
              </div>
            )}

            <div className="grid gap-3">
              <button
                onClick={() => {
                  setOwnershipType('personal');
                  setStep('documents');
                }}
                className="p-4 rounded-lg border-2 border-gray-200 hover:border-primary-500 transition-colors bg-white"
              >
                <Home className="w-8 h-8 text-primary-500 mb-2" />
                <h3 className="font-semibold text-gray-800">شخصی</h3>
                <p className="text-xs text-gray-500 mt-1">راننده فردی</p>
              </button>

              <button
                onClick={() => {
                  setOwnershipType('company');
                  setStep('documents');
                }}
                className="p-4 rounded-lg border-2 border-gray-200 hover:border-primary-500 transition-colors bg-white"
              >
                <Users className="w-8 h-8 text-primary-500 mb-2" />
                <h3 className="font-semibold text-gray-800">شرکتی</h3>
                <p className="text-xs text-gray-500 mt-1">نماینده شرکت حمل</p>
              </button>

              <button
                onClick={() => {
                  setOwnershipType('rental');
                  setStep('documents');
                }}
                className="p-4 rounded-lg border-2 border-gray-200 hover:border-primary-500 transition-colors bg-white"
              >
                <Truck className="w-8 h-8 text-primary-500 mb-2" />
                <h3 className="font-semibold text-gray-800">اجاره‌ای</h3>
                <p className="text-xs text-gray-500 mt-1">راننده خودروی اجاره‌ای</p>
              </button>
            </div>
          </div>
        )}

        {step === 'documents' && ownershipType && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setStep('type')}
                className="text-primary-500 hover:text-primary-600"
              >
                ←
              </button>
              <h2 className="text-lg font-semibold text-gray-800">مستندات مورد نیاز</h2>
            </div>

            {error && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <DocumentInput
                label="کارت شناسایی"
                fieldName="idCard"
                value={documents.idCard}
                onChange={(f) => handleFileChange('idCard', f)}
              />

              <DocumentInput
                label="سند مالکیت خودرو"
                fieldName="vehicleReg"
                value={documents.vehicleReg}
                onChange={(f) => handleFileChange('vehicleReg', f)}
              />

              {ownershipType === 'company' && (
                <DocumentInput
                  label="مجوز شرکت"
                  fieldName="companyDoc"
                  value={documents.companyDoc}
                  onChange={(f) => handleFileChange('companyDoc', f)}
                />
              )}

              {ownershipType === 'rental' && (
                <DocumentInput
                  label="گواهینامه بیمه"
                  fieldName="insuranceCert"
                  value={documents.insuranceCert}
                  onChange={(f) => handleFileChange('insuranceCert', f)}
                />
              )}
            </div>

            <button
              onClick={() => setStep('review')}
              disabled={submitting}
              className="w-full btn-primary mt-6"
            >
              بررسی و ارسال
            </button>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold text-gray-800">بررسی اطلاعات</h2>

            <div className="space-y-3 bg-white p-4 rounded-lg">
              <div>
                <label className="text-xs font-semibold text-gray-500">نوع مالکیت</label>
                <p className="text-gray-800">
                  {ownershipType === 'personal' && 'شخصی'}
                  {ownershipType === 'company' && 'شرکتی'}
                  {ownershipType === 'rental' && 'اجاره‌ای'}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">مستندات آپلود شده</label>
                <div className="space-y-2 mt-2">
                  {Object.entries(documents).map(([key, file]) => (
                    file && <p key={key} className="text-sm text-gray-700">✓ {file.name}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('documents')}
                className="btn-ghost flex-1"
              >
                بازگشت
              </button>
              <button
                onClick={handleSubmitVerification}
                disabled={submitting}
                className="btn-primary flex-1"
              >
                {submitting ? 'درحال ارسال...' : 'تأیید و ارسال'}
              </button>
            </div>
          </div>
        )}

        {step === 'pending' && currentRequest && (
          <div className="mt-8 text-center">
            <div className="w-16 h-16 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-warning-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">درخواست شما در انتظار بررسی است</h2>
            <p className="text-gray-500 text-sm mt-2">
              پیام تأیید یا رد شدگی را از طریق اعلان‌ها دریافت خواهید کرد
            </p>
          </div>
        )}

        {step === 'result' && currentRequest && (
          <div className="mt-8 space-y-4">
            <div className="text-center">
              {currentRequest.status === 'approved' && (
                <>
                  <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-success-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">احراز هویت تأیید شد</h2>
                  <p className="text-gray-500 text-sm mt-2">حساب شما تأیید شده است</p>
                </>
              )}
              {currentRequest.status === 'rejected' && (
                <>
                  <div className="w-16 h-16 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-8 h-8 text-danger-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">احراز هویت رد شد</h2>
                  <p className="text-gray-500 text-sm mt-2">{currentRequest.admin_note}</p>
                </>
              )}
              {currentRequest.status === 'revision_requested' && (
                <>
                  <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-accent-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">نیاز به ویرایش</h2>
                  <p className="text-gray-500 text-sm mt-2">{currentRequest.admin_note}</p>
                </>
              )}
            </div>

            <button
              onClick={() => setScreen('profile')}
              className="btn-primary w-full"
            >
              بازگشت به پروفایل
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentInput({
  label,
  fieldName,
  value,
  onChange,
}: {
  label: string;
  fieldName: string;
  value: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <input
          type="file"
          id={fieldName}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          accept="image/*,.pdf"
          className="hidden"
        />
        <label
          htmlFor={fieldName}
          className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors bg-gray-50"
        >
          <Upload className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">
            {value ? value.name : 'انتخاب فایل'}
          </span>
        </label>
      </div>
    </div>
  );
}
