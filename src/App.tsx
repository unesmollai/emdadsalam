import { useEffect } from 'react';
import { useAppStore } from './store';
import { supabase } from './lib/supabase';
import type { AppScreen } from './types';

import LandingPage from './components/landing/LandingPage';
import RegisterPage from './components/auth/RegisterPage';
import LoginPage from './components/auth/LoginPage';
import AdminLoginPage from './components/auth/AdminLoginPage';
import { LoadsPage } from './components/loads/LoadsPage';
import { LoadDetailPage } from './components/loads/LoadDetailPage';
import { NewLoadPage } from './components/loads/NewLoadPage';
import { ChatPage } from './components/chat/ChatPage';
import { DMListPage } from './components/dm/DMListPage';
import { DMChatPage } from './components/dm/DMChatPage';
import { RadioPage } from './components/radio/RadioPage';
import { RadioChannelPage } from './components/radio/RadioChannelPage';
import { GamesPage } from './components/games/GamesPage';
import { HokmGamePage } from './components/games/HokmGamePage';
import { ManchGamePage } from './components/games/ManchGamePage';
import { ProfilePage } from './components/profile/ProfilePage';
import { ProfileEditPage } from './components/profile/ProfileEditPage';
import { BlacklistPage } from './components/profile/BlacklistPage';
import { InvoicePage } from './components/profile/InvoicePage';
import { InvoiceCreatePage } from './components/profile/InvoiceCreatePage';
import { VerificationPage } from './components/verification/VerificationPage';
import { TicketsPage } from './components/tickets/TicketsPage';
import { TicketDetailPage } from './components/tickets/TicketDetailPage';
import { NotificationsPage } from './components/notifications/NotificationsPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminUsersPage } from './components/admin/AdminUsersPage';
import { AdminUserDetailPage } from './components/admin/AdminUserDetailPage';
import { AdminVerificationPage } from './components/admin/AdminVerificationPage';
import { AdminTicketsPage } from './components/admin/AdminTicketsPage';
import { AdminReportsPage } from './components/admin/AdminReportsPage';
import { AdminDirectedLoadPage } from './components/admin/AdminDirectedLoadPage';
import { AdminSettingsPage } from './components/admin/AdminSettingsPage';
import { ManagerDashboard } from './components/manager/ManagerDashboard';
import { ManagerAdminsPage } from './components/manager/ManagerAdminsPage';
import { ManagerBackupPage } from './components/manager/ManagerBackupPage';
import { ManagerLogsPage } from './components/manager/ManagerLogsPage';
import { ManagerSettingsPage } from './components/manager/ManagerSettingsPage';
import { BottomNav } from './components/layout/BottomNav';

const authScreens: AppScreen[] = ['landing', 'register', 'login', 'admin-login'];
const adminScreens: AppScreen[] = [
  'admin-dashboard', 'admin-users', 'admin-user-detail',
  'admin-verification', 'admin-tickets', 'admin-reports',
  'admin-directed-load', 'admin-settings',
  'manager-dashboard', 'manager-admins', 'manager-backup',
  'manager-logs', 'manager-settings',
];

function ScreenRouter() {
  const { currentScreen } = useAppStore();

  const screens: Record<AppScreen, React.ReactNode> = {
    'landing': <LandingPage />,
    'register': <RegisterPage />,
    'login': <LoginPage />,
    'admin-login': <AdminLoginPage />,
    'loads': <LoadsPage />,
    'load-detail': <LoadDetailPage />,
    'new-load': <NewLoadPage />,
    'chat': <ChatPage />,
    'dm-list': <DMListPage />,
    'dm-chat': <DMChatPage />,
    'radio': <RadioPage />,
    'radio-channel': <RadioChannelPage />,
    'games': <GamesPage />,
    'hokm-game': <HokmGamePage />,
    'manch-game': <ManchGamePage />,
    'profile': <ProfilePage />,
    'profile-edit': <ProfileEditPage />,
    'blacklist': <BlacklistPage />,
    'invoice': <InvoicePage />,
    'invoice-create': <InvoiceCreatePage />,
    'verification': <VerificationPage />,
    'tickets': <TicketsPage />,
    'ticket-detail': <TicketDetailPage />,
    'notifications': <NotificationsPage />,
    'admin-dashboard': <AdminDashboard />,
    'admin-users': <AdminUsersPage />,
    'admin-user-detail': <AdminUserDetailPage />,
    'admin-verification': <AdminVerificationPage />,
    'admin-tickets': <AdminTicketsPage />,
    'admin-reports': <AdminReportsPage />,
    'admin-directed-load': <AdminDirectedLoadPage />,
    'admin-settings': <AdminSettingsPage />,
    'manager-dashboard': <ManagerDashboard />,
    'manager-admins': <ManagerAdminsPage />,
    'manager-backup': <ManagerBackupPage />,
    'manager-logs': <ManagerLogsPage />,
    'manager-settings': <ManagerSettingsPage />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {screens[currentScreen] || <LandingPage />}
      {!authScreens.includes(currentScreen) && !adminScreens.includes(currentScreen) && <BottomNav />}
    </div>
  );
}

export default function App() {
  const { setUser, setScreen, setAdmin } = useAppStore();

  useEffect(() => {
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          setAdmin(null);
          setScreen('landing');
        }
      });

      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    } catch (error) {
      console.error('Auth subscription error:', error);
    }
  }, [setUser, setAdmin, setScreen]);

  return <ScreenRouter />;
}