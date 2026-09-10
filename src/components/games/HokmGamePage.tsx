import React, { useEffect, useState } from 'react';
import { LogOut, Crown } from 'lucide-react';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';

interface HokmGameState {
  id: string;
  players: string[];
  player_names: string[];
  status: 'waiting' | 'determining_hakem' | 'trumping' | 'playing_round' | 'round_end' | 'game_end';
  current_player: number;
  hakem: number;
  trump_suit: string | null;
  teams: { [key: number]: number[] };
  team_scores: { [key: number]: number };
  hands: { [key: number]: string[] };
  played_cards: { [key: number]: string | null };
  target_score: number;
  round_number: number;
  created_by: string;
  created_at: string;
}

const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_NAMES = {
  '♠': 'سپاه',
  '♥': 'قلب',
  '♦': 'الماس',
  '♣': 'دل',
};

export function HokmGamePage() {
  const { setScreen, selectedGameId, user } = useAppStore();
  const [game, setGame] = useState<HokmGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTrumpModal, setShowTrumpModal] = useState(false);

  useEffect(() => {
    if (selectedGameId) {
      loadGame();
      const subscription = supabase
        .channel(`hokm_game_${selectedGameId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'games_hokm',
            filter: `id=eq.${selectedGameId}`,
          },
          () => {
            loadGame();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedGameId]);

  const loadGame = async () => {
    if (!selectedGameId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('games_hokm')
        .select('*')
        .eq('id', selectedGameId)
        .single();

      if (error) throw error;
      setGame(data as HokmGameState);
    } catch (error) {
      console.error('Failed to load game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayCard = async (card: string) => {
    if (!selectedGameId || !game || !user?.id) return;

    const playerIndex = game.players.indexOf(user.id);
    if (playerIndex === -1 || game.current_player !== playerIndex) return;

    try {
      const newHands = { ...game.hands };
      newHands[playerIndex] = newHands[playerIndex].filter(c => c !== card);

      const newPlayedCards = { ...game.played_cards };
      newPlayedCards[playerIndex] = card;

      const allPlayed = Object.values(newPlayedCards).every(c => c !== null);
      const newStatus = allPlayed ? 'round_end' : 'playing_round';

      await supabase
        .from('games_hokm')
        .update({
          hands: newHands,
          played_cards: newPlayedCards,
          current_player: (playerIndex + 1) % 4,
          status: newStatus,
        })
        .eq('id', selectedGameId);

      await loadGame();
    } catch (error) {
      console.error('Failed to play card:', error);
    }
  };

  const handleSetTrump = async (suit: string) => {
    if (!selectedGameId || !game) return;

    try {
      const { team_scores } = game;
      const hakem_team = game.teams[game.hakem];

      await supabase
        .from('games_hokm')
        .update({
          trump_suit: suit,
          status: 'playing_round',
          current_player: (game.hakem + 1) % 4,
        })
        .eq('id', selectedGameId);

      setShowTrumpModal(false);
      await loadGame();
    } catch (error) {
      console.error('Failed to set trump:', error);
    }
  };

  const handleLeaveGame = async () => {
    if (!selectedGameId) return;

    try {
      await supabase
        .from('games_hokm')
        .delete()
        .eq('id', selectedGameId);

      setScreen('games');
    } catch (error) {
      console.error('Failed to leave game:', error);
    }
  };

  if (loading || !game) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Header title="حکم" showBack />
        <LoadingSpinner text="در حال بارگذاری بازی..." />
      </div>
    );
  }

  const playerIndex = game.players.indexOf(user?.id || '');
  const isHakem = playerIndex === game.hakem;
  const isCurrentPlayer = playerIndex === game.current_player;
  const myHand = game.hands[playerIndex] || [];

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <Header title={`حکم - دور ${game.round_number}`} showBack />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Game Status */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-gray-800 rounded-lg text-center">
            <p className="text-xs text-gray-400 mb-1">تیم ۱</p>
            <p className="text-2xl font-bold text-blue-400">
              {game.team_scores[0] || 0}
            </p>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg text-center">
            <p className="text-xs text-gray-400 mb-1">تیم ۲</p>
            <p className="text-2xl font-bold text-red-400">
              {game.team_scores[1] || 0}
            </p>
          </div>
        </div>

        {/* Trump and Hakem Info */}
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
          <div className="text-right">
            {game.trump_suit && (
              <div>
                <p className="text-xs text-gray-400">رنگ برگ</p>
                <p className="text-xl font-bold">
                  {game.trump_suit}{' '}
                  {SUIT_NAMES[game.trump_suit as keyof typeof SUIT_NAMES]}
                </p>
              </div>
            )}
          </div>
          {isHakem && <Crown className="w-6 h-6 text-amber-400" />}
        </div>

        {/* Players Info */}
        <div className="grid grid-cols-2 gap-2">
          {game.players.map((playerId, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg ${
                idx === game.current_player ? 'bg-green-700 ring-2 ring-green-400' : 'bg-gray-800'
              }`}
            >
              <p className="text-xs text-gray-400 mb-1">
                {idx === game.hakem ? '◆ حاکم' : `بازیکن ${idx + 1}`}
              </p>
              <p className="font-semibold">{game.player_names[idx]}</p>
            </div>
          ))}
        </div>

        {/* Played Cards */}
        {Object.values(game.played_cards).some(c => c !== null) && (
          <div className="p-4 bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-400 mb-3 text-center">کارت‌های بازی شده</p>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(game.played_cards).map(([playerIdx, card]) =>
                card ? (
                  <div key={playerIdx} className="p-2 bg-gray-700 rounded text-center">
                    <p className="font-bold text-lg">{card}</p>
                  </div>
                ) : (
                  <div key={playerIdx} className="p-2 bg-gray-700 rounded opacity-50" />
                )
              )}
            </div>
          </div>
        )}

        {/* Trump Selection */}
        {isHakem && !game.trump_suit && game.status === 'determining_hakem' && (
          <div className="p-4 bg-blue-900 rounded-lg">
            <p className="text-sm mb-3 text-center">انتخاب رنگ برگ</p>
            <div className="grid grid-cols-4 gap-2">
              {SUITS.map((suit) => (
                <button
                  key={suit}
                  onClick={() => handleSetTrump(suit)}
                  className="p-3 bg-blue-700 hover:bg-blue-600 rounded-lg font-bold text-2xl transition-colors"
                >
                  {suit}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Game Status Messages */}
        {isCurrentPlayer && (
          <div className="p-3 bg-green-900 rounded-lg text-center">
            <p className="font-semibold">نوبت شما است</p>
          </div>
        )}

        {game.status === 'game_end' && (
          <EmptyState
            icon={Crown}
            title="بازی تمام شد"
            description={`تیم برنده: ${game.team_scores[0] > game.team_scores[1] ? 'تیم ۱' : 'تیم ۲'}`}
          />
        )}
      </div>

      {/* Hand Cards */}
      <div className="bg-gray-800 border-t border-gray-700 p-4 pb-safe max-h-40 overflow-y-auto">
        <p className="text-xs text-gray-400 mb-2 text-center">دست شما</p>
        <div className="flex gap-2 justify-center flex-wrap">
          {myHand.map((card, idx) => (
            <button
              key={idx}
              onClick={() => handlePlayCard(card)}
              disabled={!isCurrentPlayer}
              className={`px-3 py-2 rounded-lg font-bold text-lg transition-all ${
                isCurrentPlayer
                  ? 'bg-blue-600 hover:bg-blue-500 cursor-pointer'
                  : 'bg-gray-700 opacity-60 cursor-not-allowed'
              }`}
            >
              {card}
            </button>
          ))}
        </div>
      </div>

      {/* Leave Button */}
      <div className="p-4 border-t border-gray-700 bg-gray-800 pb-safe">
        <button
          onClick={handleLeaveGame}
          className="w-full p-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          خروج از بازی
        </button>
      </div>
    </div>
  );
}
