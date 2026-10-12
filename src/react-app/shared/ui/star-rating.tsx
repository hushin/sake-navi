import { Star } from 'lucide-react';
import { cn } from '@/react-app/shared/lib';
import { formatRating, RATING_MAX, toRatingStep } from '@/shared/schemas/sake';

/** 星の位置（1 つ目〜5 つ目）。塗る割合は値から計算する */
const RATINGS = [1, 2, 3, 4, 5] as const;

const sizeClasses = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
  xl: 'size-8',
} as const;

type StarRatingProps = {
  /** 0〜5。0.25 刻みに丸めて塗る（平均評価のような端数も渡せる） */
  value: number;
  size?: keyof typeof sizeClasses;
  label?: string;
  className?: string;
};

/**
 * 星 5 段階の表示。4.25 なら 4 つと 5 つ目の 1/4 が塗られる。
 * 入力には使わない（0.25 刻みの入力は `RatingInput` のスライダー）。
 */
export function StarRating({ value, size = 'md', label = '評価', className }: StarRatingProps) {
  const filled = toRatingStep(value);

  return (
    <span
      role="img"
      aria-label={`${label} ${formatRating(value)} / ${RATING_MAX}`}
      className={cn('inline-flex items-center gap-0.5', className)}
    >
      {RATINGS.map((position) => {
        // その星が塗られる割合（例: 4.25 なら 5 つ目が 0.25）
        const fraction = Math.min(Math.max(filled - (position - 1), 0), 1);

        return (
          <span key={position} className="relative inline-flex">
            <Star
              aria-hidden="true"
              className={cn(sizeClasses[size], 'text-muted-foreground/40')}
            />
            {fraction > 0 && (
              // 塗った星を重ねて幅で切り取る（半分の星のアイコンを持たずに端数を出す）
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fraction * 100}%` }}
              >
                <Star
                  aria-hidden="true"
                  className={cn(sizeClasses[size], 'fill-amber-400 text-amber-400')}
                />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
