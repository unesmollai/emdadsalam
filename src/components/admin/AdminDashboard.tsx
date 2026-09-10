import React, { useEffect, useState } from 'react';
import { Users, Shield, Ticket, AlertTriangle, Navigation, Settings } from 'lucide-react';
import { Header } from '../ui/Header';
import { LoadingSpinner } from '../ui/EmptyState';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';

interface Stats {
  totalUsers: number;
  pendingVerifications: number;
  openTickets: number;
  pendingReports: number;
}

export function AdminDashboard() {
  const { setScreen, admin } = useAppStore();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    pendingVerifications: 0,
    openTickets: 0,
    pendingReports: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin?.id) {
      setScreen('profile');
      return;
    }
    fetchStats();
  }, [admin?.id]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const [usersRes, verificationsRes, ticketsRes, reportsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('verification_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open'),
        supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        pendingVerifications: verificationsRes.count || 0,
        openTickets: ticketsRes.count || 0,
        pendingReports: reportsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { icon: Users, label: 'کاربران', screen: 'admin-users' as const, count: stats.totalUsers },
    { icon: Shield, label: 'احراز هویت', screen: 'admin-verification' as const, count: stats.pendingVerifications },
    { icon: Ticket, label: 'تیکت‌ها', screen: 'admin-tickets' as const, count: stats.openTickets },
    { icon: AlertTriangle, label: 'گزارش‌ها', screen: 'admin-reports' as const, count: stats.pendingReports },
    { icon: Navigation, label: 'هدایت بار', screen: 'admin-directed-load' as const },
    { icon: Settings, label: 'تنظیمات', screen: 'admin-settings' as const },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="پنل ادمین" showBack />
      <div className="pb-24">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="p-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-sm text-blue-100 mt-1">کل کاربران</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
                <p className="text-2xl font-bold">{stats.pendingVerifications}</p>
                <p className="text-sm text-amber-100 mt-1">احراز در انتظار</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                <p className="text-2xl font-bold">{stats.openTickets}</p>
                <p className="text-sm text-purple-100 mt-1">تیکت‌های باز</p>
              </div>
              <div className="bg-gradient-to-br from-danger-500 to-danger-600 rounded-xl p-4 text-white">
                <p className="text-2xl font-bold">{stats.pendingReports}</p>
                <p className="text-sm text-red-100 mt-1">گزارش‌های در انتظار</p>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <h3 className="text-sm font-semibold text-gray-700 mb-3">عملیات سریع</h3>
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map(({ icon: Icon, label, screen, count }) => (
                <button
                  key={screen}
                  onClick={() => setScreen(screen)}
                  className="bg-white rounded-xl p-4 flex flex-col items-center text-center border border-gray-100 hover:border-primary-300 hover:shadow-sm transition-all active:bg-gray-50"
                >
                  <Icon className="w-6 h-6 text-primary-600 mb-2" />
                  <p className="text-xs font-medium text-gray-900 mb-1">{label}</p>
                  {count !== undefined && count > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-danger-500 text-white text-[10px] font-bold rounded-full">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
