import React from 'react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const checkSizeMap = {
  sm: 'text-[8px]',
  md: 'text-[10px]',
  lg: 'text-xs',
};

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size = 'sm', className }) => {
  return (
    <div
      className={cn(
        sizeMap[size],
        'rounded-full bg-black flex items-center justify-center ring-2 ring-blue-500 flex-shrink-0',
        className
      )}
    >
      <span className={cn(checkSizeMap[size], 'text-white font-bold leading-none')}>✓</span>
    </div>
  );
};

export default VerifiedBadge;
