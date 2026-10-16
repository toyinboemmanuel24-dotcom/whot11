import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Clock,
  ShoppingCart,
  RotateCcw,
  AlertTriangle,
  Flame,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Sparkles,
  Info,
  Crown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardShape, GameRoom, PlayerSummary } from '../types/wott';
import { CardView, ShapeIcon } from './CardView';
import { WottShapePickerModal } from './WottShapePickerModal';
import { SHAPE_CONFIG, canPlayCard } from '../utils/wottDeck';
import { sounds } from '../utils/audio';

interface GameBoardProps {
  room: GameRoom;
  currentPlayerId: string;
  playerHand: Card[];
  onPlayCard: (card: Card, declaredShape?: CardShape) => Promise<void>;
  onDrawFromMarket: () => Promise<void>;
  onHandleTimeout: (playerId: string) => Promise<void>;
  onRematch: () => Promise<void>;
  onOpenRules: () => void;
  isHost: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  room,
  currentPlayerId,
  playerHand,
  onPlayCard,
  onDrawFromMarket,
  onHandleTimeout,
  onRematch,
  onOpenRules,
  isHost,
}) => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showShapePicker, setShowShapePicker] = useState<boolean>(false);
  const [pendingWottCard, setPendingWottCard] = useState<Card | null>(null);
  const [isActionPending, setIsActionPending] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(25);

  const prevTurnPlayerRef = useRef<string | null>(null);
  const timeoutTriggeredRef = useRef<boolean>(false);

  const isMyTurn = room.turnPlayerId === currentPlayerId && room.status === 'in_progress';
  const activePlayer = room.players.find((p) => p.id === room.turnPlayerId);
  const me = room.players.find((p) => p.id === currentPlayerId);

  // Play audio chime when it becomes current player's turn
  useEffect(() => {
    if (room.status === 'in_progress' && room.turnPlayerId === currentPlayerId) {
      if (prevTurnPlayerRef.current !== currentPlayerId) {
        sounds.playTurnAlert();
      }
    }
    prevTurnPlayerRef.current = room.turnPlayerId;
  }, [room.turnPlayerId, room.status, currentPlayerId]);

  // Turn timer calculation and enforcement
  useEffect(() => {
    if (room.status !== 'in_progress') return;

    timeoutTriggeredRef.current = false;

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsedSec = Math.floor((now - (room.turnStartedAt || now)) / 1000);
      const remaining = Math.max(0, (room.turnDuration || 25) - elapsedSec);

      setTimeLeft(remaining);

      // Warning tick sound when under 5 seconds
      if (remaining <= 5 && remaining > 0 && isMyTurn) {
        sounds.playTick();
      }

      // If time runs out (0 seconds), trigger timeout handler (only host or active player triggers to avoid duplicate calls)
      if (remaining === 0 && !timeoutTriggeredRef.current) {
        timeoutTriggeredRef.current = true;
        if (isMyTurn || isHost) {
          onHandleTimeout(room.turnPlayerId);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [room.turnStartedAt, room.turnDuration, room.turnPlayerId, room.status, isMyTurn, isHost, onHandleTimeout]);

  // Win confetti effect
  useEffect(() => {
    if (room.status === 'finished' && room.winnerId) {
      sounds.playWin();
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6'],
        });
      } catch {
        // Ignore confetti error
      }
    }
  }, [room.status, room.winnerId]);

  // Handle card click from player's hand
  const handleCardClick = (card: Card) => {
    if (!isMyTurn || isActionPending) return;

    // Check if playable
    const isPlayable = canPlayCard(card, room.activeCard, room.declaredShape);
    if (!isPlayable) return;

    // If card is Wott 20, show shape picker modal
    if (card.number === 20 || card.shape === 'whot') {
      setPendingWottCard(card);
      setShowShapePicker(true);
      return;
    }

    // Otherwise play directly
    executePlay(card);
  };

  const handleShapeSelected = (shape: CardShape) => {
    setShowShapePicker(false);
    if (pendingWottCard) {
      executePlay(pendingWottCard, shape);
      setPendingWottCard(null);
    }
  };

  const executePlay = async (card: Card, declaredShape?: CardShape) => {
    try {
      setIsActionPending(true);
      sounds.playCard();
      if (card.isSpecial) {
        sounds.playSpecial();
      }
      await onPlayCard(card, declaredShape);
    } finally {
      setIsActionPending(false);
    }
  };

  const executeDraw = async () => {
    if (!isMyTurn || isActionPending) return;
    try {
      setIsActionPending(true);
      sounds.playDraw();
      await onDrawFromMarket();
    } finally {
      setIsActionPending(false);
    }
  };

  // Other players around the table (excluding myself)
  const otherPlayers = room.players.filter((p) => p.id !== currentPlayerId);

  // Check if player has playable cards
  const playableCardIds = new Set(
    playerHand
      .filter((c) => canPlayCard(c, room.activeCard, room.declaredShape))
      .map((c) => c.id)
  );

  return (
    <div className="relative w-full max-w-6xl mx-auto flex flex-col justify-between min-h-[82vh] py-2 px-2 sm:px-4 text-stone-100 select-none">
      {/* Top Bar: Turn Alert Banner & Game Info */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 bg-stone-950/80 border border-stone-800 p-2.5 sm:p-3 rounded-2xl shadow-xl backdrop-blur-md mb-2">
        {/* Turn indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black tracking-wide ${
              isMyTurn
                ? 'bg-emerald-500 text-stone-950 animate-pulse shadow-lg shadow-emerald-500/30'
                : 'bg-stone-800 text-stone-200 border border-stone-700'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isMyTurn ? 'bg-stone-950 animate-ping' : 'bg-amber-400'
              }`}
            />
            {isMyTurn ? (
              <span>YOUR TURN TO PLAY!</span>
            ) : (
              <span>
                {activePlayer ? `${activePlayer.name}'s turn` : 'Waiting for turn'}
              </span>
            )}
          </div>

          {/* Timer Display */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs sm:text-sm ${
              timeLeft <= 5
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                : 'bg-stone-800/80 text-amber-300 border border-stone-700'
            }`}
          >
            <Clock size={15} />
            <span>{timeLeft}s</span>
            {room.turnDuration === 35 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded ml-1 font-sans">
                35s Grace
              </span>
            )}
          </div>
        </div>

        {/* Room Code & Rules Shortcut */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-stone-400 font-mono">
            Room: <strong className="text-amber-400 tracking-wider">{room.id}</strong>
          </div>
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1 text-xs text-stone-300 hover:text-amber-300 bg-stone-800/60 px-2.5 py-1 rounded-lg border border-stone-700/60 transition-colors cursor-pointer"
          >
            <Info size={14} /> Rules
          </button>
        </div>
      </div>

      {/* Opponents Circle / Row */}
      <div className="w-full flex items-center justify-center gap-3 sm:gap-6 flex-wrap py-2">
        {otherPlayers.map((player) => {
          const isPlayerTurn = room.turnPlayerId === player.id;
          return (
            <div
              key={player.id}
              className={`relative flex flex-col items-center p-2 rounded-2xl transition-all duration-300 ${
                isPlayerTurn
                  ? 'bg-amber-950/40 border-2 border-amber-400 shadow-xl shadow-amber-500/20 scale-105'
                  : 'bg-stone-900/60 border border-stone-800'
              } ${player.eliminated ? 'opacity-40 grayscale' : ''}`}
            >
              {/* Avatar + Turn indicator ring */}
              <div className="relative mb-1">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-inner ${
                    isPlayerTurn
                      ? 'bg-gradient-to-tr from-amber-600 to-yellow-500 ring-4 ring-amber-400/50'
                      : 'bg-stone-800 border border-stone-700'
                  }`}
                >
                  {player.avatar}
                </div>

                {/* Mic Status */}
                {player.isMicActive && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-stone-950 rounded-full flex items-center justify-center text-[10px] shadow">
                    <Mic size={10} />
                  </span>
                )}

                {/* Last Card alert badge */}
                {player.cardCount === 1 && !player.eliminated && (
                  <span className="absolute -bottom-2 -left-2 bg-red-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-lg animate-bounce border border-white">
                    LAST CARD!
                  </span>
                )}
              </div>

              {/* Player Name */}
              <div className="text-xs font-bold text-stone-200 text-center max-w-[90px] truncate">
                {player.name}
              </div>

              {/* Player Card Count (Hidden cards shown as backs!) */}
              <div className="mt-1 flex items-center gap-1">
                {player.eliminated ? (
                  <span className="text-[10px] font-black uppercase text-red-400">
                    Eliminated
                  </span>
                ) : (
                  <div className="flex items-center gap-1 bg-stone-950/80 px-2 py-0.5 rounded-full border border-stone-800 text-[11px] font-bold text-amber-300">
                    <span className="w-2.5 h-3.5 bg-amber-700 rounded-xs border border-amber-500/40 inline-block" />
                    <span>{player.cardCount} Cards</span>
                  </div>
                )}
              </div>

              {/* Timeout Warning Badge */}
              {player.hasTimeoutWarning && !player.eliminated && (
                <div className="mt-1 text-[9px] text-amber-400 flex items-center gap-0.5 font-bold">
                  <AlertTriangle size={10} /> 35s Warning
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Center Arena: General Market & Active Discard Pile */}
      <div className="flex-1 flex flex-col items-center justify-center my-3 sm:my-4 relative">
        {/* Declared Shape Banner (when 20 Wott was played) */}
        {room.declaredShape && (
          <div className="mb-3 px-4 py-1.5 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white shadow-xl flex items-center gap-2 border border-white/30 animate-pulse">
            <Sparkles size={16} />
            <span className="font-extrabold text-xs sm:text-sm tracking-wide">
              WOTT CALLED: {SHAPE_CONFIG[room.declaredShape].name.toUpperCase()} REQUIRED!
            </span>
            <ShapeIcon shape={room.declaredShape} size={18} />
          </div>
        )}

        {/* Center Cards Layout */}
        <div className="flex items-center justify-center gap-6 sm:gap-12 relative">
          {/* General Market Deck */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={executeDraw}>
              {/* Stack effect */}
              <div className="absolute top-1 left-1 w-20 h-28 sm:w-24 sm:h-34 rounded-xl bg-amber-950 border border-amber-800 opacity-60" />
              <div className="absolute -top-1 -left-1 w-20 h-28 sm:w-24 sm:h-34 rounded-xl bg-amber-950 border border-amber-850 opacity-80" />

              <CardView
                isBack={true}
                size="md"
                badge={`${room.marketCount}`}
                className={`relative z-10 transition-transform ${
                  isMyTurn ? 'hover:scale-105 ring-2 ring-amber-400/80 shadow-2xl' : 'opacity-85'
                }`}
              />
            </div>

            <button
              onClick={executeDraw}
              disabled={!isMyTurn || isActionPending}
              className={`mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-lg ${
                isMyTurn
                  ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer shadow-amber-500/20 active:scale-95'
                  : 'bg-stone-800 text-stone-400 cursor-not-allowed border border-stone-700/60'
              }`}
            >
              <ShoppingCart size={13} />
              <span>Go to Market</span>
            </button>
            <span className="text-[10px] text-stone-400 mt-0.5">
              {room.marketCount} left in Market
            </span>
          </div>

          {/* Active Discard Pile */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {/* Underneath discard shadow/stack */}
              {room.discardPile.length > 1 && (
                <div className="absolute -top-1 -right-1 w-20 h-28 sm:w-24 sm:h-34 rounded-xl bg-stone-300 opacity-50 rotate-3" />
              )}
              <CardView
                card={room.activeCard}
                size="md"
                className="relative z-10 shadow-2xl ring-2 ring-amber-500/40"
              />
            </div>
            <div className="mt-2 text-center">
              <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                Current Card
              </span>
              <div className="text-[10px] text-stone-400">
                Match {room.declaredShape ? SHAPE_CONFIG[room.declaredShape].name : `${SHAPE_CONFIG[room.activeCard.shape].name} or ${room.activeCard.number}`}
              </div>
            </div>
          </div>
        </div>

        {/* Last Action Notification Ticker */}
        {room.lastAction && (
          <div className="mt-4 px-4 py-1.5 rounded-full bg-stone-950/80 border border-stone-800 text-xs text-stone-300 flex items-center gap-2 max-w-md text-center shadow-md">
            <span className="text-amber-400 font-bold">⚡️ Latest:</span>
            <span className="truncate">{room.lastAction.text}</span>
          </div>
        )}
      </div>

      {/* Bottom Area: Player's Own Hand & Action Controls */}
      <div className="w-full bg-stone-950/90 border border-amber-600/40 rounded-3xl p-3 sm:p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{me?.avatar}</span>
            <div>
              <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <span>{me?.name} (You)</span>
                {me?.hasTimeoutWarning && (
                  <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/40 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                    <AlertTriangle size={10} /> 35s Warning Active
                  </span>
                )}
              </div>
              <div className="text-[11px] text-stone-400">
                {playerHand.length} {playerHand.length === 1 ? 'Card' : 'Cards'} in Hand
              </div>
            </div>
          </div>

          {/* Last Card Shout Indicator */}
          {playerHand.length === 1 && (
            <div className="flex items-center gap-2 bg-red-600 text-white font-black px-3 py-1 rounded-xl text-xs shadow-lg animate-pulse">
              <Flame size={15} />
              <span>LAST CARD!</span>
            </div>
          )}

          {/* Turn status tag */}
          <div className="text-right">
            {isMyTurn ? (
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Select a card to play or draw
              </span>
            ) : (
              <span className="text-xs text-stone-400">
                Opponent thinking...
              </span>
            )}
          </div>
        </div>

        {/* Interactive Hand of Cards */}
        <div className="relative py-2 flex items-center justify-center gap-2 sm:gap-3 flex-wrap min-h-[120px] sm:min-h-[150px]">
          {playerHand.map((card, index) => {
            const isPlayable = isMyTurn && playableCardIds.has(card.id);

            return (
              <div
                key={card.id}
                style={{
                  zIndex: index + 10,
                }}
                className="transition-all duration-200"
              >
                <CardView
                  card={card}
                  size="md"
                  isPlayable={isPlayable}
                  onClick={() => isPlayable && handleCardClick(card)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Wott 20 Shape Picker Modal */}
      <WottShapePickerModal
        isOpen={showShapePicker}
        onSelectShape={handleShapeSelected}
      />

      {/* Game Finished / Check Modal */}
      {room.status === 'finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-stone-900 border-2 border-amber-500 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl shadow-amber-500/20 text-stone-100">
            <div className="inline-flex p-4 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-stone-950 mb-3 shadow-xl">
              <Trophy size={48} />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
              Match Complete
            </div>

            <h2 className="text-3xl font-black text-white tracking-tight">
              CHECK! 🏆
            </h2>

            <p className="text-base text-stone-300 mt-2 mb-6">
              <strong className="text-amber-400 text-lg">{room.winnerName}</strong> has emptied their hand and won the match!
            </p>

            <div className="flex flex-col gap-2">
              {isHost && (
                <button
                  onClick={onRematch}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} /> Play Rematch (New Round)
                </button>
              )}
              <button
                onClick={onOpenRules}
                className="w-full py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors cursor-pointer"
              >
                View Rules & Cheatsheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
