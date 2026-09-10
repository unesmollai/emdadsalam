import React from 'react';

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'فعال', color: 'bg-success-100 text-success-700' },
  in_progress: { label: 'در انجام', color: 'bg-warning-100 text-warning-700' },
  coordinated: { label: 'هماهنگ شده', color: 'bg-danger-100 text-danger-700' },
  cancelled: { label: 'لغو شده', color: 'bg-gray-100 text-gray-600' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

const rankConfig: Record<string, { label: string; color: string; icon: string }> = {
  none: { label: 'بدون رتبه', color: 'text-gray-500', icon: '⚪' },
  bronze: { label: 'برنزی', color: 'text-amber-700', icon: '🥉' },
  silver: { label: 'نقره‌ای', color: 'text-gray-400', icon: '🥈' },
  gold: { label: 'طلایی', color: 'text-yellow-500', icon: '🥇' },
  diamond: { label: 'الماسی', color: 'text-cyan-500', icon: '💎' },
};

export function RankBadge({ rank }: { rank: string }) {
  const config = rankConfig[rank] || rankConfig.none;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

const verificationConfig: Record<string, { label: string; color: string }> = {
  unverified: { label: 'احراز نشده', color: 'bg-gray-100 text-gray-600' },
  pending: { label: 'در انتظار بررسی', color: 'bg-warning-100 text-warning-700' },
  revision_requested: { label: 'نیاز به ویرایش', color: 'bg-accent-100 text-accent-700' },
  verified: { label: 'تأیید شده', color: 'bg-success-100 text-success-700' },
  rejected: { label: 'رد شده', color: 'bg-danger-100 text-danger-700' },
};

export function VerificationBadge({ status }: { status: string }) {
  const config = verificationConfig[status] || verificationConfig.unverified;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
