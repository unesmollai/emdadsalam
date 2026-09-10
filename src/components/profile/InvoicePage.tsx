import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { Invoice, Profile } from '../../types';

interface InvoiceWithUser extends Invoice {
  other_user?: Profile;
}

export function InvoicePage() {
  const { user, setScreen } = useAppStore();
  const [invoices, setInvoices] = useState<InvoiceWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'sent' | 'received'>('sent');

  useEffect(() => {
    if (!user?.id) {
      setScreen('profile');
      return;
    }
    fetchInvoices();
  }, [user?.id, tab]);

  const fetchInvoices = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const column = tab === 'sent' ? 'from_user_id' : 'to_user_id';
      const otherColumn = tab === 'sent' ? 'to_user_id' : 'from_user_id';

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          other_user:${otherColumn}(id, name, code, phone, is_verified, verification_status, ownership_type, rank, total_loads, completed_loads, is_active, created_at, updated_at)
        `)
        .eq(column, user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR', {
      style: 'currency',
      currency: 'IRR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="فاکتورها" showBack />
      <div className="pb-24">
        {/* Tabs */}
        <div className="flex gap-2 p-4 bg-white border-b border-gray-100">
          <button
            onClick={() => setTab('sent')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
              tab === 'sent'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ارسالی
          </button>
          <button
            onClick={() => setTab('received')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
              tab === 'received'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            دریافتی
          </button>
        </div>

        {/* Invoices List */}
        <div className="p-4">
          {loading ? (
            <LoadingSpinner />
          ) : invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <button
                  key={invoice.id}
                  onClick={() => {
                    // Could navigate to detail view
                  }}
                  className="w-full bg-white rounded-xl p-4 border border-gray-100 text-right hover:border-primary-300 hover:shadow-sm transition-all active:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{invoice.other_user?.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(invoice.created_at)}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">{formatCurrency(invoice.amount)}</p>
                    </div>
                  </div>
                  {invoice.description && (
                    <p className="text-sm text-gray-600 mb-2">{invoice.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invoice.status === 'paid'
                          ? 'bg-success-100 text-success-700'
                          : invoice.status === 'pending'
                          ? 'bg-warning-100 text-warning-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {invoice.status === 'paid'
                        ? 'پرداخت شده'
                        : invoice.status === 'pending'
                        ? 'در انتظار'
                        : 'لغو شده'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Plus}
              title="فاکتوری وجود ندارد"
              description={`هیچ فاکتور ${tab === 'sent' ? 'ارسالی' : 'دریافتی'} وجود ندارد`}
            />
          )}
        </div>
      </div>

      {/* FAB - Create Invoice */}
      <button
        onClick={() => setScreen('invoice-create')}
        className="fixed bottom-24 left-4 w-14 h-14 bg-primary-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-600 transition-colors active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
