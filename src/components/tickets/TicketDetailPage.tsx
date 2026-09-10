import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { Header } from '../ui/Header';
import { LoadingSpinner } from '../ui/EmptyState';
import { Send } from 'lucide-react';
import type { Ticket } from '../../types';

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  text: string;
  created_at: string;
}

export function TicketDetailPage() {
  const { user, selectedTicketId, setScreen } = useAppStore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedTicketId) {
      fetchTicket();
      fetchMessages();

      const subscription = supabase
        .channel(`ticket-messages-${selectedTicketId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ticket_messages',
            filter: `ticket_id=eq.${selectedTicketId}`,
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as TicketMessage]);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedTicketId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTicket = async () => {
    if (!selectedTicketId) return;
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', selectedTicketId)
        .single();

      if (error) throw error;
      setTicket(data);
    } catch (err) {
      console.error('Error fetching ticket:', err);
    }
  };

  const fetchMessages = async () => {
    if (!selectedTicketId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', selectedTicketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedTicketId || !user?.id) return;

    try {
      setSending(true);
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicketId,
          sender_id: user.id,
          sender_type: 'user',
          text: messageText.trim(),
        });

      if (error) throw error;
      setMessageText('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const ticketStatusConfig: Record<string, { label: string; color: string }> = {
    open: { label: 'باز', color: 'bg-success-100 text-success-700' },
    warned: { label: 'هشدار شده', color: 'bg-warning-100 text-warning-700' },
    closed: { label: 'بسته شده', color: 'bg-gray-100 text-gray-600' },
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col safe-bottom">
      <Header
        title={ticket?.subject || 'تیکت'}
        showBack
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status indicator */}
        {ticket && (
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
            <span className="text-sm text-gray-600">وضعیت:</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticketStatusConfig[ticket.status]?.color || ''}`}>
              {ticketStatusConfig[ticket.status]?.label || ticket.status}
            </span>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs p-3 rounded-2xl ${
                  message.sender_type === 'user'
                    ? 'bg-primary-500 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className={`text-xs mt-1 ${message.sender_type === 'user' ? 'text-primary-100' : 'text-gray-500'}`}>
                  {new Date(message.created_at).toLocaleTimeString('fa-IR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      {ticket?.status !== 'closed' && (
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="پیام خود را وارد کنید..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sending}
              className="flex-shrink-0 w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
