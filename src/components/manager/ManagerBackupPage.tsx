import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Header } from '../ui/Header';
import { Modal, ConfirmDialog } from '../ui/Modal';
import { LoadingSpinner } from '../ui/EmptyState';
import { Database, Download, RotateCcw, AlertTriangle } from 'lucide-react';

interface BackupInfo {
  lastBackup: string | null;
  backupSize: string;
}

interface BackupLog {
  id: string;
  created_at: string;
  backup_size: string | null;
}

export function ManagerBackupPage() {
  const { setScreen } = useAppStore();
  const [backupInfo, setBackupInfo] = useState<BackupInfo>({
    lastBackup: null,
    backupSize: '0 MB',
  });
  const [backupHistory, setBackupHistory] = useState<BackupLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  useEffect(() => {
    fetchBackupInfo();
  }, []);

  const fetchBackupInfo = async () => {
    try {
      setLoading(true);

      // Fetch backup history from admin_logs
      const { data: logs, error: logsError } = await supabase
        .from('admin_logs')
        .select('*')
        .eq('action', 'backup')
        .order('created_at', { ascending: false })
        .limit(10);

      if (logsError) throw logsError;

      setBackupHistory(logs || []);

      if (logs && logs.length > 0) {
        const lastLog = logs[0];
        setBackupInfo({
          lastBackup: lastLog.created_at,
          backupSize: lastLog.backup_size || '0 MB',
        });
      }
    } catch (err) {
      console.error('Error fetching backup info:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualBackup = async () => {
    try {
      setBackingUp(true);

      // Create backup log entry
      const { error } = await supabase
        .from('admin_logs')
        .insert({
          action: 'backup',
          target: 'database',
          details: 'Manual backup initiated',
          backup_size: 'calculating...',
        });

      if (error) throw error;

      // In a real app, this would trigger an edge function or external service
      await new Promise(resolve => setTimeout(resolve, 2000));

      await fetchBackupInfo();
    } catch (err) {
      console.error('Error creating backup:', err);
    } finally {
      setBackingUp(false);
    }
  };

  const handleDownloadBackup = async () => {
    // Placeholder for download functionality
    console.log('Downloading backup...');
  };

  const handleRestore = async () => {
    try {
      // Placeholder for restore functionality
      // In a real app, this would trigger a restore process
      const { error } = await supabase
        .from('admin_logs')
        .insert({
          action: 'restore',
          target: 'database',
          details: 'Database restore initiated',
        });

      if (error) throw error;

      setShowRestoreConfirm(false);
      await fetchBackupInfo();
    } catch (err) {
      console.error('Error restoring backup:', err);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 safe-bottom">
      <Header title="بک‌آپ" showBack />

      <div className="p-4 pb-20 space-y-6">
        {/* Backup Status */}
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-800 mb-4">وضعیت بک‌آپ</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">آخرین بک‌آپ</label>
              <p className="text-gray-800 font-medium">
                {backupInfo.lastBackup
                  ? new Date(backupInfo.lastBackup).toLocaleDateString('fa-IR')
                  : 'هنوز بک‌آپی انجام نشده'}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">حجم بک‌آپ</label>
              <p className="text-gray-800 font-medium">{backupInfo.backupSize}</p>
            </div>
          </div>
        </div>

        {/* Backup Actions */}
        <div className="space-y-3">
          <button
            onClick={handleManualBackup}
            disabled={backingUp}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Database className="w-5 h-5" />
            {backingUp ? 'درحال ایجاد بک‌آپ...' : 'ایجاد بک‌آپ دستی'}
          </button>

          <button
            onClick={handleDownloadBackup}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            دانلود بک‌آپ
          </button>
        </div>

        {/* Restore Section */}
        <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-danger-900">بازگردانی بک‌آپ</h3>
              <p className="text-sm text-danger-700 mt-1">
                این عملیات تمام داده‌های فعلی را با بک‌آپ جایگزین می‌کند
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRestoreConfirm(true)}
            className="w-full flex items-center justify-center gap-2 p-2 text-danger-600 hover:bg-danger-100 rounded-lg transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            بازگردانی بک‌آپ
          </button>
        </div>

        {/* Backup History */}
        {backupHistory.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-100 p-4">
            <h2 className="font-semibold text-gray-800 mb-4">تاریخچه بک‌آپ</h2>
            <div className="space-y-2">
              {backupHistory.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <div>
                    <p className="text-gray-800 font-medium">
                      {new Date(log.created_at).toLocaleDateString('fa-IR')}
                    </p>
                    {log.backup_size && (
                      <p className="text-xs text-gray-500">{log.backup_size}</p>
                    )}
                  </div>
                  <div className="w-2 h-2 bg-success-500 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Restore Confirmation */}
      <ConfirmDialog
        isOpen={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
        onConfirm={handleRestore}
        title="تأیید بازگردانی"
        message="آیا مطمئن هستید که می‌خواهید بک‌آپ را بازگردانی کنید؟ این عملیات پایه‌ناپذیر است."
        confirmText="بازگردانی"
        danger
      />
    </div>
  );
}

import { useAppStore } from '../../store';
