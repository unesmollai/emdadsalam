import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { Plus, MessageSquare } from 'lucide-react';
import type { Ticket } from '../../types';

const ticketStatusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'باز', color: 'bg-success-100 text-success-700' },
  warned: { label: 'هشدار شده', color: 'bg-warning-100 text-warning-700' },
  closed: { label: 'بسته شده', color: 'bg-gray-100 text-gray-600' },
};

export function TicketsPage() {
  const { user, setScreen, setSelectedTicketId } = useAppStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchTickets();
    }
  }, [user?.id]);

  const fetchTickets = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!user?.id || !newSubject.trim()) return;

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('tickets')
        .insert({
          user_id: user.id,
          subject: newSubject.trim(),
          status: 'open',
        });

      if (error) throw error;

      setNewSubject('');
      setShowNewModal(false);
      await fetchTickets();
    } catch (err) {
      console.error('Error creating ticket:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setScreen('ticket-detail');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 safe-bottom">
      <Header title="تیکت‌ها" showBack />

      <div className="p-4 pb-20">
        {tickets.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="هیچ تیکتی نیست"
            description="تیکت جدید ایجاد کنید تا با تیم پشتیبانی تماس بگیرید"
            action={
              <button onClick={() => setShowNewModal(true)} className="btn-primary mt-4">
                ایجاد تیکت جدید
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => handleSelectTicket(ticket.id)}
                className="w-full p-4 bg-white rounded-lg border border-gray-100 hover:border-primary-500 transition-colors text-right"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-sm">{ticket.subject}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(ticket.created_at).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticketStatusConfig[ticket.status]?.color || ''}`}>
                      {ticketStatusConfig[ticket.status]?.label || ticket.status}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowNewModal(true)}
        className="fixed bottom-20 left-4 w-14 h-14 bg-primary-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-600 transition-colors active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* New Ticket Modal */}
      <NewTicketModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={handleCreateTicket}
        subject={newSubject}
        onSubjectChange={setNewSubject}
        submitting={submitting}
      />
    </div>
  );
}

function NewTicketModal({
  isOpen,
  onClose,
  onSubmit,
  subject,
  onSubjectChange,
  submitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  subject: string;
  onSubjectChange: (value: string) => void;
  submitting: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />
      <div
        className="relative bg-white rounded-t-3xl w-full max-w-lg p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">تیکت جدید</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              موضوع
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder="موضوع تیکت را وارد کنید"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1">
              انصراف
            </button>
            <button
              onClick={onSubmit}
              disabled={!subject.trim() || submitting}
              className="btn-primary flex-1"
            >
              {submitting ? 'درحال ایجاد...' : 'ایجاد'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
