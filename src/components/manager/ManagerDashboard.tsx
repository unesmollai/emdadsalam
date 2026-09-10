import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { Header } from '../ui/Header';
import { LoadingSpinner } from '../ui/EmptyState';
import { Users, Database, FileText, Settings, Activity, Clock } from 'lucide-react';

interface SystemStatus {
  totalUsers: number;
  activeUsersToday: number;
  serverUptime: number;
  adminCount: number;
}

export function ManagerDashboard() {
  const { setScreen, admin } = useAppStore();
  const [status, setStatus] = useState<SystemStatus>({
    totalUsers: 0,
    activeUsersToday: 0,
    serverUptime: 0,
    adminCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);

      // Fetch total users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' });

      // Fetch active users today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: activeData, error: activeError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .gte('updated_at', today.toISOString());

      // Fetch admin count
      const { data: adminsData, error: adminsError } = await supabase
        .from('admins')
        .select('id', { count: 'exact' });

      if (usersError || activeError || adminsError) {
        throw new Error('Failed to fetch system status');
      }

      setStatus({
        totalUsers: usersData?.length || 0,
        activeUsersToday: activeData?.length || 0,
        serverUptime: 99.9,
        adminCount: adminsData?.length || 0,
      });
    } catch (err) {
      console.error('Error fetching system status:', err);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      icon: Users,
      label: 'مدیریت ادمین‌ها',
      screen: 'manager-admins' as const,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Database,
      label: 'بک‌آپ',
      screen: 'manager-backup' as const,
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: FileText,
      label: 'لاگ‌ها',
      screen: 'manager-logs' as const,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: Settings,
      label: 'تنظیمات',
      screen: 'manager-settings' as const,
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 safe-bottom">
      <Header title="پنل مدیر" showBack />

      <div className="p-4 pb-20">
        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatusCard
            icon={Users}
            label="کل کاربران"
            value={status.totalUsers}
            color="bg-blue-100 text-blue-600"
          />
          <StatusCard
            icon={Activity}
            label="فعال امروز"
            value={status.activeUsersToday}
            color="bg-green-100 text-green-600"
          />
          <StatusCard
            icon={Clock}
            label="زمان فعالیت سرور"
            value={`${status.serverUptime}%`}
            color="bg-purple-100 text-purple-600"
          />
          <StatusCard
            icon={Users}
            label="تعداد ادمین‌ها"
            value={status.adminCount}
            color="bg-orange-100 text-orange-600"
          />
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.screen}
                onClick={() => setScreen(item.screen)}
                className="p-4 bg-white rounded-lg border border-gray-100 hover:border-primary-500 transition-colors text-center"
              >
                <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">{item.label}</h3>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-100">
      <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-2`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
