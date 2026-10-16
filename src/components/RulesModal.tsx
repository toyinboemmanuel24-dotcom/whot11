import React from 'react';
import { X, BookOpen, AlertCircle, Clock, ShoppingCart, Award } from 'lucide-react';
import { ShapeIcon } from './CardView';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border border-amber-600/40 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl text-stone-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-amber-300">Wott Official Rules & Cheatsheet</h2>
              <p className="text-xs text-stone-400">Classic African Whot card game rules & tournament regulations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Objective */}
          <div className="bg-stone-950/50 p-4 rounded-xl border border-stone-800">
            <h3 className="font-bold text-amber-400 flex items-center gap-2 mb-1.5">
              <Award size={18} /> Game Objective
            </h3>
            <p className="text-stone-300 leading-relaxed">
              Each player starts with <strong className="text-white">5 cards</strong>. The first player to shed all their cards shouts <strong className="text-amber-400 font-black">"CHECK!"</strong> and wins the match! When you have only 1 card remaining, declare <strong className="text-amber-400">"Last Card!"</strong>.
            </p>
          </div>

          {/* Special Cards */}
          <div>
            <h3 className="font-bold text-amber-400 mb-3 flex items-center gap-2">
              <AlertCircle size={18} /> Special Action Cards
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-stone-800/60 p-3 rounded-xl border border-red-500/30 flex items-start gap-3">
                <span className="bg-red-500 text-white font-black px-2.5 py-1 rounded-lg text-base">
                  5
                </span>
                <div>
                  <div className="font-bold text-red-400">PICK 3</div>
                  <div className="text-xs text-stone-300">
                    Next player must immediately draw <strong>3 cards</strong> from the General Market!
                  </div>
                </div>
              </div>

              <div className="bg-stone-800/60 p-3 rounded-xl border border-blue-500/30 flex items-start gap-3">
                <span className="bg-blue-500 text-white font-black px-2.5 py-1 rounded-lg text-base">
                  2
                </span>
                <div>
                  <div className="font-bold text-blue-400">PICK 2</div>
                  <div className="text-xs text-stone-300">
                    Next player must immediately draw <strong>2 cards</strong> from the General Market.
                  </div>
                </div>
              </div>

              <div className="bg-stone-800/60 p-3 rounded-xl border border-amber-500/30 flex items-start gap-3">
                <span className="bg-amber-500 text-stone-950 font-black px-2 py-1 rounded-lg text-base">
                  14
                </span>
                <div>
                  <div className="font-bold text-amber-400">GENERAL MARKET</div>
                  <div className="text-xs text-stone-300">
                    <strong className="text-amber-300">Every opponent</strong> in the game must draw 1 card from the General Market!
                  </div>
                </div>
              </div>

              <div className="bg-stone-800/60 p-3 rounded-xl border border-emerald-500/30 flex items-start gap-3">
                <span className="bg-emerald-500 text-white font-black px-2.5 py-1 rounded-lg text-base">
                  1
                </span>
                <div>
                  <div className="font-bold text-emerald-400">HOLD ON</div>
                  <div className="text-xs text-stone-300">
                    The same player plays again! If they have no playable card, they can go to market.
                  </div>
                </div>
              </div>

              <div className="bg-stone-800/60 p-3 rounded-xl border border-purple-500/30 flex items-start gap-3">
                <span className="bg-purple-500 text-white font-black px-2.5 py-1 rounded-lg text-base">
                  8
                </span>
                <div>
                  <div className="font-bold text-purple-400">SUSPENSION</div>
                  <div className="text-xs text-stone-300">
                    The next player is suspended and skipped.
                  </div>
                </div>
              </div>

              <div className="bg-stone-800/60 p-3 rounded-xl border border-pink-500/30 flex items-start gap-3">
                <span className="bg-gradient-to-r from-pink-500 to-indigo-500 text-white font-black px-2 py-1 rounded-lg text-base">
                  20
                </span>
                <div>
                  <div className="font-bold text-pink-400">WOTT (WILDCARD)</div>
                  <div className="text-xs text-stone-300">
                    Can be played on <em>any card</em>! The player declares what shape all subsequent cards must follow.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shapes & General Market Recycling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-stone-950/50 p-4 rounded-xl border border-stone-800">
              <h3 className="font-bold text-amber-400 mb-2 flex items-center gap-2">
                <ShoppingCart size={18} /> General Market Rules
              </h3>
              <ul className="text-xs space-y-1.5 text-stone-300 list-disc list-inside">
                <li>If you cannot match the shape or number, draw 1 card from General Market.</li>
                <li>The market starts with 30 cards.</li>
                <li><strong>Recycle Rule:</strong> If the General Market runs out of cards, the discard pile is automatically shuffled back into the market!</li>
              </ul>
            </div>

            <div className="bg-stone-950/50 p-4 rounded-xl border border-stone-800">
              <h3 className="font-bold text-amber-400 mb-2 flex items-center gap-2">
                <Clock size={18} /> Turn Timer & Penalties
              </h3>
              <ul className="text-xs space-y-1.5 text-stone-300 list-disc list-inside">
                <li><strong className="text-white">25 Seconds</strong> regular turn time limit.</li>
                <li>If time runs out, <strong>+1 penalty card</strong> is added to your hand, and you receive a warning.</li>
                <li>On your next round, timer increases to <strong className="text-amber-400">35 Seconds</strong>.</li>
                <li>If you timeout twice consecutively in 35s, you are <strong className="text-red-400 font-bold">ELIMINATED</strong> from the game!</li>
              </ul>
            </div>
          </div>

          {/* The 5 Shapes */}
          <div>
            <h4 className="text-xs uppercase font-bold text-stone-400 mb-2">The 5 Authentic Shapes</h4>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs font-semibold">
                <ShapeIcon shape="circle" size={16} /> Circle
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950/60 border border-blue-800 text-blue-300 text-xs font-semibold">
                <ShapeIcon shape="triangle" size={16} /> Triangle
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-300 text-xs font-semibold">
                <ShapeIcon shape="cross" size={16} /> Cross
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold">
                <ShapeIcon shape="square" size={16} /> Square
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/60 border border-purple-800 text-purple-300 text-xs font-semibold">
                <ShapeIcon shape="star" size={16} /> Star
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-lg transition-colors"
          >
            Got It, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
