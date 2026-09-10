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

export function BottomNav() {
  const { currentScreen, setScreen } = useAppStore();

  const isActive = (screen: AppScreen) => {
    if (screen === 'loads' && ['loads', 'load-detail', 'new-load'].includes(currentScreen)) return true;
    if (screen === 'chat' && ['chat'].includes(currentScreen)) return true;
    if (screen === 'radio' && ['radio', 'radio-channel'].includes(currentScreen)) return true;
    if (screen === 'games' && ['games', 'hokm-game', 'manch-game'].includes(currentScreen)) return true;
    if (screen === 'profile' && ['profile', 'profile-edit', 'blacklist', 'dm-list', 'dm-chat', 'invoice', 'invoice-create', 'verification', 'tickets', 'ticket-detail', 'notifications'].includes(currentScreen)) return true;
    return false;
  };

  return (
    <nav className="bottom-nav">
      {tabs.map(({ screen, icon: Icon, label }) => {
        const active = isActive(screen);
        return (
          <button
            key={screen}
            onClick={() => setScreen(screen)}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
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
