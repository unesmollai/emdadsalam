import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Header } from '../ui/Header';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';

const MIN_CHARS = 5;
const MAX_CHARS = 300;

function isPersianText(text: string): boolean {
  const persianRegex = /[\u0600-\u06FF]/;
  return persianRegex.test(text);
}

export function NewLoadPage() {
  const { setScreen, user } = useAppStore();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidText =
    text.trim().length >= MIN_CHARS &&
    text.trim().length <= MAX_CHARS &&
    isPersianText(text);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user?.id) {
      setError('لطفا ابتدا وارد شوید');
      return;
    }

    if (!isValidText) {
      setError('متن باید بین 5 تا 300 کاراکتر باشد و شامل متن فارسی');
      return;
    }

    try {
      setLoading(true);
      const { error: insertError } = await supabase.from('loads').insert({
        owner_id: user.id,
        owner_name: user.name,
        owner_code: user.code,
        text: text.trim(),
        status: 'active',
      });

      if (insertError) throw insertError;

      setScreen('loads');
    } catch (err) {
      console.error('Error creating load:', err);
      setError('خطا در اعلام بار. لطفا دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header title="اعلام بار جدید" showBack />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4 gap-4">
        {/* Textarea */}
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="توضیحات بار را وارد کنید..."
            maxLength={MAX_CHARS}
            className="w-full h-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            dir="rtl"
          />
        </div>

        {/* Character Counter */}
        <div className="text-xs text-gray-500 text-center">
          {text.length}/{MAX_CHARS}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-danger-50 border border-danger-200 text-danger-700 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {/* Validation Messages */}
        {text.length > 0 && text.length < MIN_CHARS && (
          <div className="bg-warning-50 border border-warning-200 text-warning-700 p-3 rounded-lg text-xs text-center">
            متن باید حداقل {MIN_CHARS} کاراکتر باشد
          </div>
        )}

        {text.length > 0 && !isPersianText(text) && (
          <div className="bg-warning-50 border border-warning-200 text-warning-700 p-3 rounded-lg text-xs text-center">
            متن باید فارسی باشد
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isValidText || loading}
          className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${
            isValidText && !loading
              ? 'bg-primary-500 active:bg-primary-600'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {loading ? 'در حال اعلام...' : 'اعلام بار'}
        </button>
      </form>
    </div>
  );
}
