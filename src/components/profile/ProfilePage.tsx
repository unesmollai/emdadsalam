import React, { useEffect, useState } from 'react';
import { LogOut, Edit2, Shield, MessageSquare, FileText, AlertCircle, Ticket, Bell } from 'lucide-react';
import { Header } from '../ui/Header';
import { RankBadge, VerificationBadge } from '../ui/StatusBadge';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';

export function ProfilePage() {
  const { setScreen, user, setUser, admin } = useAppStore();
  const [profileStats, setProfileStats] = useState({ totalLoads: 0, completedLoads: 0 });

  useEffect(() => {
    if (!user) {
      setScreen('login');
      return;
    }
    fetchProfileStats();
  }, [user?.id]);

  const fetchProfileStats = async () => {
    if (!user?.id) return;
    try {
      const { data: loads } = await supabase
        .from('loads')
        .select('status')
        .eq('owner_id', user.id);

      if (loads) {
        const completed = loads.filter((l) => l.status === 'coordinated').length;
        setProfileStats({
          totalLoads: loads.length,
          completedLoads: completed,
        });
      }
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setScreen('landing');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!user) return null;

  const userInitial = user.name.charAt(0);
  const nextRank = { none: 'bronze', bronze: 'silver', silver: 'gold', gold: 'diamond', diamond: 'diamond' }[user.rank];
  const rankThresholds = { none: 0, bronze: 5, silver: 15, gold: 30, diamond: 50 };
  const currentThreshold = rankThresholds[user.rank as keyof typeof rankThresholds];
  const nextThreshold = rankThresholds[nextRank as keyof typeof rankThresholds];
  const progress = ((user.completed_loads - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

  const menuItems = [
    { icon: Edit2, label: 'ویرایش پروفایل', screen: 'profile-edit' as const },
    { icon: Shield, label: 'احراز هویت', screen: 'verification' as const },
    { icon: MessageSquare, label: 'چت خصوصی', screen: 'dm-list' as const },
    { icon: FileText, label: 'فاکتورها', screen: 'invoice' as const },
    { icon: AlertCircle, label: 'لیست سیاه', screen: 'blacklist' as const },
    { icon: Ticket, label: 'تیکت‌ها', screen: 'tickets' as const },
    { icon: Bell, label: 'اعلان‌ها', screen: 'notifications' as const },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="پروفایل" />
      <div className="pb-24">
        {/* Profile Header */}
        <div className="bg-gradient-to-b from-primary-500 to-primary-600 text-white px-4 pt-4 pb-8">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-primary-600 font-bold text-3xl mb-3">
              {userInitial}
            </div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-sm text-white/80">کد: {user.code}</p>
            <p className="text-sm text-white/80">{user.phone}</p>
          </div>
        </div>

        {/* Status and Verification */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <VerificationBadge status={user.verification_status} />
            <RankBadge rank={user.rank} />
          </div>

          {/* Rank Progress */}
          {user.rank !== 'diamond' && (
            <div className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">تا رتبه‌ی {nextRank}</span>
                <span className="text-xs text-gray-500">{Math.min(100, Math.round(progress))}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round(progress))}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
              <p className="text-2xl font-bold text-primary-600">{profileStats.totalLoads}</p>
              <p className="text-xs text-gray-600 mt-1">کل بارها</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
              <p className="text-2xl font-bold text-success-600">{profileStats.completedLoads}</p>
              <p className="text-xs text-gray-600 mt-1">بارهای انجام شده</p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-2 mb-6">
            {menuItems.map(({ icon: Icon, label, screen }) => (
              <button
                key={screen}
                onClick={() => setScreen(screen)}
                className="w-full bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 active:bg-gray-50 transition-colors text-right"
              >
                <span className="text-lg">{label}</span>
                <Icon className="w-5 h-5 text-gray-400 mr-auto" />
              </button>
            ))}
          </div>

          {/* Admin/Manager Panels */}
          {admin && (
            <>
              {admin.role === 'admin' && (
                <button
                  onClick={() => setScreen('admin-dashboard')}
                  className="w-full bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-xl p-4 font-semibold mb-2"
                >
                  پنل ادمین
                </button>
              )}
              {admin.role === 'manager' && (
                <button
                  onClick={() => setScreen('manager-dashboard')}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 font-semibold mb-2"
                >
                  پنل مدیر
                </button>
              )}
            </>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full bg-danger-500 text-white rounded-xl p-4 flex items-center justify-center gap-2 font-semibold hover:bg-danger-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            خروج
          </button>
        </div>
      </div>
    </div>
  );
}
