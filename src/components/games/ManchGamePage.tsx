import React, { useEffect, useState } from 'react';
import { LogOut, Dices } from 'lucide-react';
import { Header } from '../ui/Header';
import { LoadingSpinner, EmptyState } from '../ui/EmptyState';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';

interface Piece {
  player: number;
  position: number;
  at_home: boolean;
}

interface ManchGameState {
  id: string;
  players: string[];
  player_names: string[];
  status: 'waiting' | 'in_progress' | 'finished';
  current_player: number;
  pieces: Piece[];
  dice_value: number | null;
  dice_roll_count: number;
  last_move: string | null;
  created_by: string;
  created_at: string;
}

const POSITIONS = 52;
const HOME_START = 52;

export function ManchGamePage() {
  const { setScreen, selectedGameId, user } = useAppStore();
  const [game, setGame] = useState<ManchGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<number[]>([]);

  useEffect(() => {
    if (selectedGameId) {
      loadGame();
      const subscription = supabase
        .channel(`manch_game_${selectedGameId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'games_manch',
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
        .from('games_manch')
        .select('*')
        .eq('id', selectedGameId)
        .single();

      if (error) throw error;
      setGame(data as ManchGameState);
      setPossibleMoves([]);
      setSelectedPiece(null);
    } catch (error) {
      console.error('Failed to load game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRollDice = async () => {
    if (!selectedGameId || !game || !user?.id) return;

    const playerIndex = game.players.indexOf(user.id);
    if (playerIndex === -1 || game.current_player !== playerIndex) return;

    try {
      const diceValue = Math.floor(Math.random() * 6) + 1;

      await supabase
        .from('games_manch')
        .update({
          dice_value: diceValue,
          dice_roll_count: game.dice_roll_count + 1,
        })
        .eq('id', selectedGameId);

      await loadGame();

      if (diceValue === 6 && game.dice_roll_count < 2) {
        setPossibleMoves([]);
      } else {
        const moves = calculatePossibleMoves(game, playerIndex, diceValue);
        setPossibleMoves(moves);
      }
    } catch (error) {
      console.error('Failed to roll dice:', error);
    }
  };

  const calculatePossibleMoves = (gameState: ManchGameState, playerIdx: number, dice: number): number[] => {
    const playerPieces = gameState.pieces.filter(p => p.player === playerIdx);
    const possibleDestinations: number[] = [];

    playerPieces.forEach((piece) => {
      if (piece.at_home) return;

      if (dice === 6 && piece.position === -1) {
        possibleDestinations.push(0);
      } else if (piece.position >= 0) {
        const newPos = piece.position + dice;
        if (newPos <= HOME_START + 4) {
          possibleDestinations.push(newPos);
        }
      }
    });

    return possibleDestinations;
  };

  const handleMovePiece = async (piece: Piece, targetPosition: number) => {
    if (!selectedGameId || !game || !user?.id) return;

    const playerIndex = game.players.indexOf(user.id);
    if (playerIndex === -1 || game.current_player !== playerIndex || !game.dice_value) return;

    try {
      const newPieces = game.pieces.map((p) => {
        if (p.player === piece.player && p.position === piece.position) {
          return { ...p, position: targetPosition, at_home: targetPosition >= HOME_START };
        }
        return p;
      });

      const nextPlayer = game.dice_value !== 6 ? (playerIndex + 1) % 4 : playerIndex;

      const allAtHome = newPieces
        .filter(p => p.player === playerIndex)
        .every(p => p.at_home);

      await supabase
        .from('games_manch')
        .update({
          pieces: newPieces,
          current_player: nextPlayer,
          dice_value: null,
          dice_roll_count: game.dice_value === 6 ? 1 : 0,
          status: allAtHome ? 'finished' : 'in_progress',
        })
        .eq('id', selectedGameId);

      await loadGame();
      setSelectedPiece(null);
      setPossibleMoves([]);
    } catch (error) {
      console.error('Failed to move piece:', error);
    }
  };

  const handleLeaveGame = async () => {
    if (!selectedGameId) return;

    try {
      await supabase
        .from('games_manch')
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
        <Header title="منچ" showBack />
        <LoadingSpinner text="در حال بارگذاری بازی..." />
      </div>
    );
  }

  const playerIndex = game.players.indexOf(user?.id || '');
  const isCurrentPlayer = playerIndex === game.current_player;
  const playerPieces = game.pieces.filter(p => p.player === playerIndex);
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'];

  const allPiecesPerPlayer = game.pieces.reduce((acc, piece) => {
    if (!acc[piece.player]) acc[piece.player] = [];
    acc[piece.player].push(piece);
    return acc;
  }, {} as Record<number, Piece[]>);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header title={`منچ - نوبت ${game.current_player + 1}`} showBack />

      <div className="flex-1 overflow-auto p-4">
        {/* Game Board */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <svg viewBox="0 0 400 400" className="w-full aspect-square">
            {/* Board Background */}
            <rect width="400" height="400" fill="#f5f5f5" />

            {/* Four Quadrants */}
            <rect x="0" y="0" width="200" height="200" fill="#fee2e2" opacity="0.5" />
            <rect x="200" y="0" width="200" height="200" fill="#dbeafe" opacity="0.5" />
            <rect x="200" y="200" width="200" height="200" fill="#dcfce7" opacity="0.5" />
            <rect x="0" y="200" width="200" height="200" fill="#fef08a" opacity="0.5" />

            {/* Start Positions */}
            {[0, 1, 2, 3].map((player) => {
              const startPositions = [
                { x: 50, y: 50 },
                { x: 350, y: 50 },
                { x: 350, y: 350 },
                { x: 50, y: 350 },
              ];
              const pos = startPositions[player];
              return (
                <circle
                  key={`start-${player}`}
                  cx={pos.x}
                  cy={pos.y}
                  r="15"
                  fill={colors[player]}
                  opacity="0.3"
                  stroke={colors[player]}
                  strokeWidth="2"
                />
              );
            })}

            {/* Home Positions */}
            <rect x="175" y="175" width="50" height="50" fill="gold" opacity="0.3" stroke="gold" strokeWidth="2" />

            {/* Pieces */}
            {game.pieces.map((piece, idx) => {
              const positionMap: Record<number, { x: number; y: number }> = {};

              // Map positions to board coordinates
              for (let i = 0; i < POSITIONS; i++) {
                const angle = (i / POSITIONS) * Math.PI * 2;
                positionMap[i] = {
                  x: 200 + Math.cos(angle) * 120,
                  y: 200 + Math.sin(angle) * 120,
                };
              }

              // Home positions
              for (let i = 0; i < 4; i++) {
                positionMap[HOME_START + i] = {
                  x: 190 + (i % 2) * 20,
                  y: 190 + Math.floor(i / 2) * 20,
                };
              }

              let pos = positionMap[piece.position] || { x: 200, y: 200 };
              if (piece.at_home) {
                pos = positionMap[HOME_START + (idx % 4)] || { x: 200, y: 200 };
              }

              return (
                <circle
                  key={idx}
                  cx={pos.x}
                  cy={pos.y}
                  r="8"
                  fill={colors[piece.player]}
                  stroke="white"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  opacity={selectedPiece === piece ? 1 : 0.7}
                />
              );
            })}
          </svg>
        </div>

        {/* Current Player Info */}
        <div className={`p-3 rounded-lg mb-4 text-center font-semibold ${isCurrentPlayer ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {isCurrentPlayer ? 'نوبت شما است' : `نوبت ${game.player_names[game.current_player]}`}
        </div>

        {/* Dice Value */}
        {game.dice_value !== null && (
          <div className="p-4 bg-blue-100 rounded-lg mb-4 text-center">
            <p className="text-sm text-gray-600 mb-1">نتیجه تاس</p>
            <p className="text-4xl font-bold text-blue-600">{game.dice_value}</p>
          </div>
        )}

        {/* Player Pieces */}
        {playerPieces.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2 text-right">مهره‌های شما</p>
            <div className="grid grid-cols-4 gap-2">
              {playerPieces.map((piece, idx) => {
                const isSelectable = isCurrentPlayer && possibleMoves.length > 0;
                const isSelected = selectedPiece === piece;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (isSelectable) {
                        setSelectedPiece(isSelected ? null : piece);
                      }
                    }}
                    disabled={!isSelectable}
                    className={`p-3 rounded-lg font-bold transition-all ${
                      isSelectable
                        ? isSelected
                          ? `${colors[playerIndex]} text-white ring-2 ring-offset-2`
                          : `${colors[playerIndex]} text-white opacity-50 hover:opacity-100`
                        : 'bg-gray-200 opacity-50'
                    }`}
                  >
                    مهره {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Possible Moves */}
        {possibleMoves.length > 0 && selectedPiece && (
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-3 mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2 text-right">حرکت‌های ممکن</p>
            <div className="flex gap-2 flex-wrap-reverse justify-end">
              {possibleMoves.map((move) => (
                <button
                  key={move}
                  onClick={() => handleMovePiece(selectedPiece, move)}
                  className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  {move < HOME_START ? `موقعیت ${move}` : 'خانه'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white border-t border-gray-200 p-4 pb-safe space-y-2">
        {isCurrentPlayer && game.dice_value === null ? (
          <button
            onClick={handleRollDice}
            className="w-full p-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
          >
            <Dices className="w-5 h-5" />
            پرتاب تاس
          </button>
        ) : null}

        <button
          onClick={handleLeaveGame}
          className="w-full p-2 border border-red-300 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          خروج از بازی
        </button>
      </div>

      {/* Game End */}
      {game.status === 'finished' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 text-center max-w-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">بازی تمام شد</h2>
            <p className="text-gray-600 mb-4">
              {game.player_names[game.current_player]} برنده شد!
            </p>
            <button
              onClick={() => setScreen('games')}
              className="w-full p-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
            >
              بازگشت
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
