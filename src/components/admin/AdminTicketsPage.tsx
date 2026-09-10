import React, { useEffect, useState } from 'react';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { ConfirmDialog } from '../ui/Modal';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { Ticket, Profile } from '../../types';

interface TicketWithUser extends Ticket {
  user?: Profile;
}

export function AdminTicketsPage() {
  const { setScreen } = useAppStore();
  const [tickets, setTickets] = useState<TicketWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [selectedTicket, setSelectedTicket] = useState<TicketWithUser | null>(null);
  const [showWarnDialog, setShowWarnDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('tickets')
        .select(`
          *,
          user:user_id(id, name, code, phone, is_verified, verification_status, ownership_type, rank, total_loads, completed_loads, is_active, created_at, updated_at)
        `);

      if (filter !== 'all') {
        query = query.eq('status', filter === 'open' ? 'open' : 'closed');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWarn = async () => {
    if (!selectedTicket?.id || !selectedTicket?.user_id) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'warned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      setShowWarnDialog(false);
      setSelectedTicket(null);
      await fetchTickets();
    } catch (error) {
      console.error('Error warning user:', error);
      alert('خطا در اخطار کاربر');
    }
  };

  const handleClose = async () => {
    if (!selectedTicket?.id) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'closed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      setShowCloseDialog(false);
      setSelectedTicket(null);
      await fetchTickets();
    } catch (error) {
      console.error('Error closing ticket:', error);
      alert('خطا در بستن تیکت');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  const getStatusBadge = (status: string) => {
    const badgeConfig: Record<string, { label: string; color: string }> = {
      open: { label: 'باز', color: 'bg-success-100 text-success-700' },
      warned: { label: 'اخطار داده شده', color: 'bg-warning-100 text-warning-700' },
      closed: { label: 'بسته شده', color: 'bg-gray-100 text-gray-600' },
    };
    const config = badgeConfig[status] || badgeConfig.open;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="تیکت‌ها" showBack />
      <div className="pb-24">
        {/* Filter Tabs */}
        <div className="flex gap-2 p-4 bg-white border-b border-gray-100">
          {(['all', 'open', 'closed'] as const).map((filterValue) => (
            <button
              key={filterValue}
              onClick={() => setFilter(filterValue)}
              className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                filter === filterValue
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filterValue === 'all' ? 'همه' : filterValue === 'open' ? 'باز' : 'بسته'}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        <div className="p-4">
          {loading ? (
            <LoadingSpinner />
          ) : tickets.length > 0 ? (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="w-full bg-white rounded-xl p-4 border border-gray-100 text-right hover:border-primary-300 hover:shadow-sm transition-all active:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{ticket.subject}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ticket.user?.name}</p>
                    </div>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(ticket.created_at)}</p>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Header as any}
              title="تیکتی وجود ندارد"
              description={`هیچ تیکت ${
                filter === 'all' ? 'ثبت نشده' : filter === 'open' ? 'باز' : 'بسته شده'
              } است`}
            />
          )}
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setSelectedTicket(null)}>
          <div className="absolute inset-0 bg-black/50 animate-fade-in" />
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">{selectedTicket.subject}</h2>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">کاربر</p>
                <p className="font-medium text-gray-900">{selectedTicket.user?.name}</p>
                <p className="text-xs text-gray-500">{selectedTicket.user?.code}</p>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">وضعیت</p>
                {getStatusBadge(selectedTicket.status)}
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">تاریخ</p>
                <p className="text-sm text-gray-900">{formatDate(selectedTicket.created_at)}</p>
              </div>

              {selectedTicket.status === 'open' && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowWarnDialog(true)}
                    className="w-full bg-warning-500 text-white rounded-lg py-3 font-semibold hover:bg-warning-600 transition-colors"
                  >
                    اخطار
                  </button>
                  <button
                    onClick={() => setShowCloseDialog(true)}
                    className="w-full bg-danger-500 text-white rounded-lg py-3 font-semibold hover:bg-danger-600 transition-colors"
                  >
                    بستن
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={showWarnDialog}
        onClose={() => setShowWarnDialog(false)}
        onConfirm={handleWarn}
        title="اخطار"
        message={`آیا مطمئن هستید که می‌خواهید ${selectedTicket?.user?.name} را اخطار دهید؟`}
        confirmText="اخطار"
      />

      <ConfirmDialog
        isOpen={showCloseDialog}
        onClose={() => setShowCloseDialog(false)}
        onConfirm={handleClose}
        title="بستن تیکت"
        message="آیا مطمئن هستید که می‌خواهید این تیکت را ببندید؟"
        confirmText="بستن"
      />
    </div>
  );
}
