import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Gift, Coins, X } from 'lucide-react';

export interface GiftDefinition {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  animation: 'bounce' | 'spin' | 'pulse' | 'shake';
}

export const GIFTS: GiftDefinition[] = [
  { id: 'rose', name: 'Rose', emoji: '🌹', cost: 1, animation: 'bounce' },
  { id: 'heart', name: 'Heart', emoji: '❤️', cost: 5, animation: 'pulse' },
  { id: 'fire', name: 'Fire', emoji: '🔥', cost: 10, animation: 'shake' },
  { id: 'star', name: 'Star', emoji: '⭐', cost: 25, animation: 'spin' },
  { id: 'diamond', name: 'Diamond', emoji: '💎', cost: 50, animation: 'bounce' },
  { id: 'crown', name: 'Crown', emoji: '👑', cost: 100, animation: 'spin' },
  { id: 'rocket', name: 'Rocket', emoji: '🚀', cost: 200, animation: 'bounce' },
  { id: 'universe', name: 'Universe', emoji: '🌌', cost: 500, animation: 'pulse' },
];

interface GiftPanelProps {
  isOpen: boolean;
  onClose: () => void;
  coinBalance: number;
  onSendGift: (gift: GiftDefinition) => void;
}

const GiftPanel: React.FC<GiftPanelProps> = ({ isOpen, onClose, coinBalance, onSendGift }) => {
  const [selectedGift, setSelectedGift] = useState<GiftDefinition | null>(null);

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-28 left-0 right-0 z-30 animate-fade-in">
      <div className="mx-2 bg-black/90 backdrop-blur-lg rounded-2xl border border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-pink-400" />
            <span className="text-white text-sm font-semibold">Send a Gift</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-1 rounded-full">
              <Coins className="w-3 h-3 text-yellow-400" />
              <span className="text-yellow-400 text-xs font-semibold">{coinBalance}</span>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {GIFTS.map(gift => (
            <button
              key={gift.id}
              onClick={() => setSelectedGift(gift)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                selectedGift?.id === gift.id 
                  ? 'bg-pink-500/30 border border-pink-500/50 scale-105' 
                  : 'bg-white/5 hover:bg-white/10 border border-transparent'
              } ${coinBalance < gift.cost ? 'opacity-40' : ''}`}
              disabled={coinBalance < gift.cost}
            >
              <span className="text-2xl">{gift.emoji}</span>
              <span className="text-white text-[10px]">{gift.name}</span>
              <div className="flex items-center gap-0.5">
                <Coins className="w-2.5 h-2.5 text-yellow-400" />
                <span className="text-yellow-400 text-[10px]">{gift.cost}</span>
              </div>
            </button>
          ))}
        </div>

        {selectedGift && (
          <Button
            className="w-full bg-pink-500 hover:bg-pink-600 text-white rounded-full"
            onClick={() => {
              onSendGift(selectedGift);
              setSelectedGift(null);
            }}
            disabled={coinBalance < selectedGift.cost}
          >
            Send {selectedGift.emoji} {selectedGift.name} ({selectedGift.cost} coins)
          </Button>
        )}
      </div>
    </div>
  );
};

export default GiftPanel;
