import React from 'react';
import { Ambulance, Shield, Radio, MessageCircle, Gamepad2, Truck } from 'lucide-react';
import { useAppStore } from '../../store';

export default function LandingPage() {
  const { setScreen } = useAppStore();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 via-primary-700 to-primary-500 text-white flex flex-col overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-8 w-40 h-40 rounded-full bg-white/5 animate-pulse" />
        <div className="absolute bottom-40 right-8 w-56 h-56 rounded-full bg-white/5" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-12 w-20 h-20 rounded-full bg-accent-500/10" />
        <div className="absolute bottom-1/3 left-16 w-32 h-32 rounded-full bg-white/5" style={{ animationDelay: '2s' }} />
        {/* Road lines decorative */}
        <div className="absolute bottom-0 left-0 right-0 h-32 opacity-5">
          <div className="absolute bottom-8 left-1/4 w-16 h-1 bg-white rounded" />
          <div className="absolute bottom-8 left-1/2 w-16 h-1 bg-white rounded" />
          <div className="absolute bottom-8 left-3/4 w-16 h-1 bg-white rounded" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-8">
        {/* Logo Area */}
        <div className="flex flex-col items-center animate-fade-in">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-accent-500/20 rounded-3xl blur-xl scale-150" />
            <div className="relative bg-white/15 backdrop-blur-md rounded-3xl p-5 border border-white/20">
              <Ambulance className="w-14 h-14 text-white" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-5xl font-bold text-center mb-3 tracking-tight">امدادگران</h1>

          <p className="text-center text-white/80 text-base leading-relaxed max-w-xs mx-auto font-light mb-2">
            سامانه هوشمند اعلام بار و ارتباط امدادگران خودرو
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-4 mb-8 max-w-sm">
            {[
              { icon: Truck, label: 'اعلام بار' },
              { icon: MessageCircle, label: 'گپ عمومی' },
              { icon: Radio, label: 'بیسیم' },
              { icon: Gamepad2, label: 'بازی' },
              { icon: Shield, label: 'احراز هویت' },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium border border-white/10">
                <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="animate-slide-up w-full max-w-sm mx-auto space-y-3 mt-4">
          <button
            onClick={() => setScreen('register')}
            className="w-full bg-white text-primary-700 font-semibold py-4 px-6 rounded-2xl text-base
            active:scale-[0.98] transition-all duration-150 shadow-xl shadow-black/20
            hover:bg-white/95"
          >
            ورود امدادگر
          </button>
          <button
            onClick={() => setScreen('admin-login')}
            className="w-full bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 font-semibold py-4 px-6 rounded-2xl text-base
            active:scale-[0.98] transition-all duration-150
            hover:bg-white/20"
          >
            ورود ادمین/مدیر
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center pb-8 px-6">
        <div className="w-12 h-0.5 bg-white/20 mx-auto mb-4 rounded-full" />
        <p className="text-white/50 text-sm font-light">
          ساخت‌شده توسط{' '}
          <span className="text-white/80 font-medium">حسن و حسین</span>
          {' '}از سیلیکون ولی
        </p>
      </div>
    </div>
  );
}
