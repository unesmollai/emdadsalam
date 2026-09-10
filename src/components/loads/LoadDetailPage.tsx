import React, { useEffect, useState } from 'react';
import { Check, X, RotateCcw } from 'lucide-react';
import { Header } from '../ui/Header';
import { StatusBadge } from '../ui/StatusBadge';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import type { Load, LoadRespondent } from '../../types';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'همین الآن';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} دقیقه پیش`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ساعت پیش`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} روز پیش`;
  return new Date(dateString).toLocaleDateString('fa-IR');
}

export function LoadDetailPage() {
  const { setScreen, user, selectedLoadId } = useAppStore();
  const [load, setLoad] = useState<Load | null>(null);
  const [respondents, setRespondents] = useState<LoadRespondent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);

  useEffect(() => {
    if (!selectedLoadId) {
      setScreen('loads');
      return;
    }
    fetchLoadDetail();
  }, [selectedLoadId]);

  const fetchLoadDetail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('loads')
        .select('*')
        .eq('id', selectedLoadId)
        .single();

      if (error) throw error;
      setLoad(data);
      setIsOwner(data.owner_id === user?.id);

      // Fetch respondents
      const { data: respondentsData } = await supabase
        .from('load_respondents')
        .select('*')
        .eq('load_id', selectedLoadId);

      setRespondents(respondentsData || []);

      // Check if current user has responded
      if (user?.id) {
        const hasResponse = respondentsData?.some(
          (r: LoadRespondent) => r.user_id === user.id
        );
        setHasResponded(!!hasResponse);
      }
    } catch (error) {
      console.error('Error fetching load detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!user?.id || !load?.id) return;

    try {
      const { error } = await supabase.from('load_respondents').insert({
        load_id: load.id,
        user_id: user.id,
        user_name: user.name,
        user_code: user.code,
      });

      if (error) throw error;
      setHasResponded(true);
      await fetchLoadDetail();
    } catch (error) {
      console.error('Error responding to load:', error);
    }
  };

  const handleConfirmRespondent = async (respondentId: string) => {
    if (!load?.id) return;

    try {
      const { error } = await supabase
        .from('loads')
        .update({
          status: 'in_progress',
          confirmed_respondent_id: respondentId,
        })
        .eq('id', load.id);

      if (error) throw error;
      await fetchLoadDetail();
    } catch (error) {
      console.error('Error confirming respondent:', error);
    }
  };

  const handleChangeStatus = async (newStatus: 'coordinated' | 'cancelled') => {
    if (!load?.id) return;

    try {
      const { error } = await supabase
        .from('loads')
        .update({ status: newStatus })
        .eq('id', load.id);

      if (error) throw error;
      await fetchLoadDetail();
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const handleRelist = async () => {
    if (!load?.id) return;

    try {
      const { error } = await supabase
        .from('loads')
        .update({ status: 'active' })
        .eq('id', load.id);

      if (error) throw error;
      await fetchLoadDetail();
    } catch (error) {
      console.error('Error relisting load:', error);
    }
  };

  if (loading || !load) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Header title="جزئیات بار" showBack />
        <div className="flex-1">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header title="جزئیات بار" showBack />

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="p-4 space-y-4">
          {/* Load Content Card */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">
                  {load.owner_name} <span className="text-gray-500 text-sm">#{load.owner_code}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(load.created_at)}</p>
              </div>
              <StatusBadge status={load.status} />
            </div>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{load.text}</p>
          </div>

          {/* Respond Button (if active and not owner) */}
          {load.status === 'active' && !isOwner && !hasResponded && (
            <button
              onClick={handleRespond}
              className="w-full bg-success-500 text-white py-3 rounded-lg font-medium active:bg-success-600 transition-colors"
            >
              اعلام آمادگی
            </button>
          )}

          {hasResponded && load.status === 'active' && !isOwner && (
            <div className="bg-success-50 border border-success-200 rounded-lg p-3 text-success-700 text-sm text-center">
              شما به این بار پاسخ داده‌اید
            </div>
          )}

          {/* Respondents Section */}
          {respondents.length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-3">پاسخ‌دهندگان ({respondents.length})</h2>
              <div className="space-y-2">
                {respondents.map((respondent) => (
                  <div
                    key={respondent.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      load.confirmed_respondent_id === respondent.id
                        ? 'bg-success-50 border border-success-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {respondent.user_name} <span className="text-gray-500 text-sm">#{respondent.user_code}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatTimeAgo(respondent.created_at)}</p>
                    </div>

                    {/* Owner Actions */}
                    {isOwner && load.status === 'active' && (
                      <button
                        onClick={() => handleConfirmRespondent(respondent.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          load.confirmed_respondent_id === respondent.id
                            ? 'bg-success-500 text-white'
                            : 'bg-white text-primary-500 border border-primary-500 active:bg-primary-50'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}

                    {load.confirmed_respondent_id === respondent.id && (
                      <div className="text-success-600 text-xs font-medium">تأیید شده</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owner Status Actions */}
          {isOwner && (
            <div className="bg-white rounded-lg p-4 shadow-sm space-y-2">
              {load.status === 'active' && respondents.length > 0 && (
                <button
                  onClick={() => handleChangeStatus('coordinated')}
                  className="w-full bg-primary-500 text-white py-2 rounded-lg font-medium text-sm active:bg-primary-600 transition-colors"
                >
                  تأیید
                </button>
              )}

              {(load.status === 'active' || load.status === 'in_progress') && (
                <button
                  onClick={() => handleChangeStatus('cancelled')}
                  className="w-full bg-danger-500 text-white py-2 rounded-lg font-medium text-sm active:bg-danger-600 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  کنسل
                </button>
              )}

              {load.status === 'cancelled' && (
                <button
                  onClick={handleRelist}
                  className="w-full bg-warning-500 text-white py-2 rounded-lg font-medium text-sm active:bg-warning-600 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  برگشت
                </button>
              )}
            </div>
          )}

          {/* Coordinated Info */}
          {load.status === 'coordinated' && load.confirmed_respondent_id && (
            <div className="bg-success-50 border border-success-200 rounded-lg p-4">
              <h3 className="font-semibold text-success-700 mb-2">بار هماهنگ شده</h3>
              {respondents
                .filter((r) => r.id === load.confirmed_respondent_id)
                .map((r) => (
                  <p key={r.id} className="text-sm text-success-600">
                    {r.user_name} <span className="text-gray-500">#{r.user_code}</span>
                  </p>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
