import React, { useEffect, useState } from 'react';
import { Play, Users, Gamepad2 } from 'lucide-react';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';

interface Game {
  id: string;
  type: 'hokm' | 'manch';
  players: string[];
  status: 'waiting' | 'in_progress' | 'finished';
  created_at: string;
  created_by: string;
  target_score?: number;
}

export function GamesPage() {
  const { setScreen, setSelectedGameId, user } = useAppStore();
  const [hokmGames, setHokmGames] = useState<Game[]>([]);
  const [manchGames, setManchGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [gameType, setGameType] = useState<'hokm' | 'manch' | null>(null);
  const [targetScore, setTargetScore] = useState('5');

  useEffect(() => {
    loadGames();
    const subscription = supabase
      .channel('games_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games_hokm' }, () => {
        loadGames();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games_manch' }, () => {
        loadGames();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      const { data: hokm, error: hokmError } = await supabase
        .from('games_hokm')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: manch, error: manchError } = await supabase
        .from('games_manch')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(10);

      if (hokmError) throw hokmError;
      if (manchError) throw manchError;

      setHokmGames((hokm as Game[]) || []);
      setManchGames((manch as Game[]) || []);
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async () => {
    if (!gameType || !user?.id) return;

    try {
      const newGame = {
        type: gameType,
        players: [user.id],
        status: 'waiting',
        created_by: user.id,
        ...(gameType === 'hokm' && { target_score: parseInt(targetScore) }),
      };

      const table = gameType === 'hokm' ? 'games_hokm' : 'games_manch';
      const { data, error } = await supabase
        .from(table)
        .insert(newGame)
        .select();

      if (error) throw error;

      if (data?.[0]) {
        setSelectedGameId(data[0].id);
        setScreen(gameType === 'hokm' ? 'hokm-game' : 'manch-game');
      }

      setShowCreateModal(false);
      setGameType(null);
      setTargetScore('5');
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  };

  const handleJoinGame = async (gameId: string, type: 'hokm' | 'manch') => {
    if (!user?.id) return;

    try {
      const table = type === 'hokm' ? 'games_hokm' : 'games_manch';
      const { data: game, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq('id', gameId)
        .single();

      if (fetchError) throw fetchError;

      if (game.players.includes(user.id)) {
        setSelectedGameId(gameId);
        setScreen(type === 'hokm' ? 'hokm-game' : 'manch-game');
        return;
      }

      const { error: updateError } = await supabase
        .from(table)
        .update({ players: [...game.players, user.id] })
        .eq('id', gameId);

      if (updateError) throw updateError;

      setSelectedGameId(gameId);
      setScreen(type === 'hokm' ? 'hokm-game' : 'manch-game');
    } catch (error) {
      console.error('Failed to join game:', error);
    }
  };

  const handleStartGame = async (type: 'hokm' | 'manch') => {
    setGameType(type);
    setShowCreateModal(true);
  };

  const gameStats = {
    hokm: hokmGames.reduce((acc, g) => acc + g.players.length, 0),
    manch: manchGames.reduce((acc, g) => acc + g.players.length, 0),
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header title="بازی" />

      <div className="flex-1 overflow-auto">
        {loading ? (
          <LoadingSpinner text="در حال بارگذاری بازی‌ها..." />
        ) : (
          <div className="p-4 space-y-4">
            {/* Game Type Cards */}
            <div className="space-y-3">
              {/* Hokm Card */}
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <button
                    onClick={() => handleStartGame('hokm')}
                    className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
                  >
                    شروع بازی
                  </button>
                  <div className="text-right">
                    <h2 className="text-lg font-bold text-gray-900">حکم</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      بازی کارتی ایرانی
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{gameStats.hokm} بازیکن در حال بازی</span>
                </div>
              </div>

              {/* Manch Card */}
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <button
                    onClick={() => handleStartGame('manch')}
                    className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
                  >
                    شروع بازی
                  </button>
                  <div className="text-right">
                    <h2 className="text-lg font-bold text-gray-900">منچ</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      بازی تاس و مهره
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{gameStats.manch} بازیکن در حال بازی</span>
                </div>
              </div>
            </div>

            {/* Active Games Section */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-right">
                بازی‌های فعال
              </h3>

              {hokmGames.length === 0 && manchGames.length === 0 ? (
                <EmptyState
                  icon={Gamepad2}
                  title="بازی فعالی وجود ندارد"
                  description="یک بازی جدید شروع کنید"
                />
              ) : (
                <div className="space-y-2">
                  {/* Hokm Games */}
                  {hokmGames.map((game) => (
                    <div
                      key={game.id}
                      className="p-3 bg-white rounded-lg border border-gray-200 flex items-center justify-between"
                    >
                      <button
                        onClick={() => handleJoinGame(game.id, 'hokm')}
                        className="px-3 py-1.5 bg-primary-100 text-primary-600 rounded-lg text-sm font-semibold hover:bg-primary-200 transition-colors"
                      >
                        {game.players.includes(user?.id || '') ? 'ادامه' : 'پیوستن'}
                      </button>
                      <div className="text-right flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          حکم {game.target_score ? `(تا ${game.target_score})` : ''}
                        </p>
                        <p className="text-xs text-gray-500">
                          {game.players.length}/4 بازیکن
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Gamepad2 className="w-4 h-4" />
                      </div>
                    </div>
                  ))}

                  {/* Manch Games */}
                  {manchGames.map((game) => (
                    <div
                      key={game.id}
                      className="p-3 bg-white rounded-lg border border-gray-200 flex items-center justify-between"
                    >
                      <button
                        onClick={() => handleJoinGame(game.id, 'manch')}
                        className="px-3 py-1.5 bg-primary-100 text-primary-600 rounded-lg text-sm font-semibold hover:bg-primary-200 transition-colors"
                      >
                        {game.players.includes(user?.id || '') ? 'ادامه' : 'پیوستن'}
                      </button>
                      <div className="text-right flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          منچ
                        </p>
                        <p className="text-xs text-gray-500">
                          {game.players.length}/4 بازیکن
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Gamepad2 className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Game Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setGameType(null);
        }}
        title={gameType === 'hokm' ? 'بازی حکم جدید' : 'بازی منچ جدید'}
      >
        <div className="space-y-4">
          {gameType === 'hokm' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                هدف امتیاز
              </label>
              <select
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                dir="rtl"
              >
                <option value="5">5 امتیاز</option>
                <option value="7">7 امتیاز</option>
                <option value="11">11 امتیاز</option>
              </select>
            </div>
          )}

          <p className="text-sm text-gray-600 text-center">
            {gameType === 'hokm'
              ? 'آنلاین کانال بازی حکم شما ایجاد خواهد شد'
              : 'آنلاین کانال بازی منچ شما ایجاد خواهد شد'}
          </p>

          <button
            onClick={handleCreateGame}
            className="w-full p-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            ایجاد بازی
          </button>
        </div>
      </Modal>
    </div>
  );
}
