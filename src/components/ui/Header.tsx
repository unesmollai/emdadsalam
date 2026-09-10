import React from 'react';
import { ArrowRight, Bell } from 'lucide-react';
import { useAppStore } from '../../store';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  showNotifications?: boolean;
  rightAction?: React.ReactNode;
}

export function Header({ title, showBack, onBack, showNotifications, rightAction }: HeaderProps) {
  const { setScreen, unreadNotifications } = useAppStore();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setScreen('loads');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-primary-500 text-white shadow-sm">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-1.5 -mr-1.5 rounded-lg active:bg-white/10 transition-colors flex-shrink-0"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-lg font-semibold truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {showNotifications && (
            <button
              onClick={() => setScreen('notifications')}
              className="relative p-2 rounded-lg active:bg-white/10 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -left-0.5 w-4 h-4 bg-accent-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          )}
          {rightAction}
        </div>
      </div>
    </header>
  );
}
