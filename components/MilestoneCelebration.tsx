import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles, X, Target, TrendingUp } from 'lucide-react';

interface MilestoneCelebrationProps {
  grandPrize: {
    emoji: string;
    title: string;
    description: string;
  };
  totalHours: number;
  triggeredBy?: {
    username: string;
    avatar_emoji: string;
  };
  onClose: () => void;
}

// Confetti piece component
const ConfettiPiece: React.FC<{
  color: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
  isCircle: boolean;
}> = ({ color, left, delay, duration, size, isCircle }) => (
  <div
    className="absolute animate-confetti-fall"
    style={{
      left: `${left}%`,
      top: '-20px',
      width: size,
      height: size,
      backgroundColor: color,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      borderRadius: isCircle ? '50%' : '0',
      transform: `rotate(${Math.random() * 360}deg)`
    }}
  />
);

// Confetti Effect Component
const ConfettiEffect: React.FC = () => {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98FB98'];
  const confettiPieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: colors[Math.floor(Math.random() * colors.length)],
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 2.5 + Math.random() * 2,
    size: 6 + Math.random() * 10,
    isCircle: Math.random() > 0.5
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[101]">
      {confettiPieces.map((piece) => (
        <ConfettiPiece key={piece.id} {...piece} />
      ))}
    </div>
  );
};

const MilestoneCelebration: React.FC<MilestoneCelebrationProps> = ({
  grandPrize,
  totalHours,
  triggeredBy,
  onClose
}) => {
  const [confettiActive, setConfettiActive] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Trigger content animation after a brief delay
    const contentTimer = setTimeout(() => setShowContent(true), 100);

    // Auto-disable confetti after 6 seconds for performance
    const confettiTimer = setTimeout(() => setConfettiActive(false), 6000);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(confettiTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Confetti Layer */}
      {confettiActive && <ConfettiEffect />}

      {/* Modal */}
      <div
        className={`bg-white rounded-3xl p-8 max-w-lg mx-4 shadow-2xl relative overflow-hidden transition-all duration-500 ${
          showContent ? 'animate-bounce-in opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Golden glow background */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-yellow-200/60 via-yellow-100/30 to-transparent" />

        {/* Decorative sparkles */}
        <div className="absolute top-6 left-6 text-yellow-400 animate-pulse">
          <Sparkles size={24} />
        </div>
        <div className="absolute top-6 right-16 text-yellow-400 animate-pulse" style={{ animationDelay: '0.5s' }}>
          <Sparkles size={20} />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Trophy animation */}
          <div className="relative inline-block">
            <div className="text-8xl mb-2 animate-bounce" style={{ animationDuration: '1s' }}>
              <Trophy className="w-24 h-24 text-yellow-500 mx-auto drop-shadow-lg" />
            </div>
            <div className="absolute -top-2 -right-2 text-3xl animate-ping" style={{ animationDuration: '2s' }}>
              ✨
            </div>
          </div>

          <h2 className="text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">
            HALFWAY THERE!
          </h2>

          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-1 rounded-full text-sm font-bold mb-4">
            <Target size={16} />
            50% MILESTONE UNLOCKED
          </div>

          <p className="text-lg text-gray-600 mb-2">
            The team logged <span className="font-bold text-cyan-600">{totalHours.toLocaleString()}</span> hours of sleep!
          </p>

          {triggeredBy && (
            <p className="text-sm text-gray-500 mb-4">
              {triggeredBy.avatar_emoji} <span className="font-medium">{triggeredBy.username}</span> pushed us over the line!
            </p>
          )}

          {/* Encouragement block */}
          <div className="bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-cyan-200 mb-6 shadow-inner">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="text-cyan-500" size={18} />
              <span className="text-xs font-bold text-cyan-700 uppercase tracking-widest">
                Keep The Momentum
              </span>
              <Sparkles className="text-cyan-500" size={18} />
            </div>

            <p className="text-sm text-gray-600 mb-3">The second half is where champions are made. Stay consistent, keep logging, and great things are coming!</p>

            <div className="text-4xl mb-2">🌙 💪 🏆</div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Let's Finish Strong! 🚀
          </button>

          <p className="text-xs text-gray-400 mt-3">
            Keep dreaming big — we're halfway there!
          </p>
        </div>
      </div>
    </div>
  );
};

export default MilestoneCelebration;
