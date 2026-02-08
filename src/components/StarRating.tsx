'use client';

import { useState } from 'react';

interface StarRatingProps {
  /** 星の評価値 (1-5) */
  value: number;
  /** 評価変更時のコールバック（指定時は選択可能モード） */
  onChange?: (rating: number) => void;
  /** 読み取り専用モード */
  readonly?: boolean;
  /** サイズ（Tailwindのテキストサイズ） */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'text-base',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
};

/**
 * 星評価コンポーネント
 * - 1-5の星評価を表示・選択できる
 * - 表示専用モードと選択可能モードの両方に対応
 */
export function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const isInteractive = !readonly && onChange !== undefined;
  const displayRating = hoverRating ?? value;

  const handleClick = (rating: number) => {
    if (isInteractive) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (isInteractive) {
      setHoverRating(rating);
    }
  };

  const handleMouseLeave = () => {
    if (isInteractive) {
      setHoverRating(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((rating) => {
        const isFilled = rating <= displayRating;

        return (
          <button
            key={rating}
            type="button"
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            onMouseLeave={handleMouseLeave}
            disabled={!isInteractive}
            className={`
              ${sizeClasses[size]}
              ${isInteractive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
              ${isFilled ? 'text-yellow-400' : 'text-gray-300'}
              transition-all duration-150 ease-in-out
              ${!isInteractive && 'pointer-events-none'}
            `}
            aria-label={`${rating}星`}
          >
            {isFilled ? '★' : '☆'}
          </button>
        );
      })}
      {!readonly && (
        <span className="ml-2 text-sm text-gray-600">
          {displayRating > 0 ? `${displayRating}.0` : '未評価'}
        </span>
      )}
    </div>
  );
}
