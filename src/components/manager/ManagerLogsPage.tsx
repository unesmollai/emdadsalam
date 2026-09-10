import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { FileText, Download } from 'lucide-react';
import { useAppStore } from '../../store';

interface AdminLog {
  id: string;
  admin_id: string | null;
  admin_username: string | null;
  action: string;
  target: string;
  details: string | null;
  created_at: string;
}

export function ManagerLogsPage() {
  const { setScreen } = useAppStore();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [filterAction, filterDate]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterAction) {
        query = query.eq('action', filterAction);
      }

      if (filterDate) {
        const targetDate = new Date(filterDate);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        query = query
          .gte('created_at', targetDate.toISOString())
          .lt('created_at', nextDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = logs
      .map(log =>
        `"${log.admin_username || 'سیستم'}","${log.action}","${log.target}","${new Date(log.created_at).toLocaleString('fa-IR')}","${log.details || ''}"`
      )
      .join('\n');

    const header = '"نام مدیر","عملیات","هدف","زمان","جزئیات"\n';
    const data = new Blob([header + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) return <LoadingSpinner />;

  const actionTypes = Array.from(new Set(logs.map(log => log.action)));

  return (
    <div className="min-h-screen bg-gray-50 safe-bottom">
      <Header title="لاگ‌ها" showBack />

      <div className="p-4 pb-20 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-100 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع عملیات</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">همه</option>
              {actionTypes.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تاریخ</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <button
            onClick={handleExport}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            دانلود گزارش
          </button>
        </div>

        {/* Logs List */}
        {logs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="لاگی وجود ندارد"
            description="هیچ لاگی با این فیلترها یافت نشد"
          />
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 bg-white rounded-lg border border-gray-100 text-right"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-gray-800">
                      {log.admin_username || 'سیستم'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(log.created_at).toLocaleString('fa-IR')}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                    {log.action}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-gray-600">
                  <p><span className="font-medium">هدف:</span> {log.target}</p>
                  {log.details && (
                    <p><span className="font-medium">جزئیات:</span> {log.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
