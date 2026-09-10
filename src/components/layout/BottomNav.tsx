import React from 'react';
import { ClipboardList, MessageCircle, Radio, Gamepad2, User } from 'lucide-react';
import { useAppStore } from '../../store';
import type { AppScreen } from '../../types';

const tabs: { screen: AppScreen; icon: React.ElementType; label: string }[] = [
  { screen: 'loads', icon: ClipboardList, label: 'بارها' },
  { screen: 'chat', icon: MessageCircle, label: 'گپ' },
  { screen: 'radio', icon: Radio, label: 'بیسیم' },
  { screen: 'games', icon: Gamepad2, label: 'بازی' },
  { screen: 'profile', icon: User, label: 'پروفایل' },
];

const profileRelatedScreens: AppScreen[] = [
  'profile',
  'profile-edit',
  'blacklist',
  'dm-list',
  'dm-chat',
  'invoice',
  'invoice-create',
  'verification',
  'tickets',
  'ticket-detail',
  'notifications',
];

export function BottomNav() {
  const { currentScreen, setScreen } = useAppStore();

  const isActive = (screen: AppScreen) => {
    if (screen === 'loads' && ['loads', 'load-detail', 'new-load'].includes(currentScreen)) return true;
    if (screen === 'chat' && ['chat'].includes(currentScreen)) return true;
    if (screen === 'radio' && ['radio', 'radio-channel'].includes(currentScreen)) return true;
    if (screen === 'games' && ['games', 'hokm-game', 'manch-game'].includes(currentScreen)) return true;
    if (screen === 'profile' && profileRelatedScreens.includes(currentScreen)) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around z-40">
      {tabs.map(({ screen, icon: Icon, label }) => {
        const active = isActive(screen);
        return (
          <button
            key={screen}
            onClick={() => setScreen(screen)}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 flex-1 ${
              active ? 'text-primary-500' : 'text-gray-400'
            }`}
          >
            <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`} strokeWidth={active ? 2.5 : 1.5} />
            <span className={`text-[10px] mt-1 ${active ? 'font-semibold' : 'font-normal'}`}>{label}</span>
          </button>
        );
      })}  
    </nav>
  );
}