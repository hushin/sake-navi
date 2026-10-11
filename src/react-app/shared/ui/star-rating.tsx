import { Star } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/react-app/shared/lib';

const RATINGS = [1, 2, 3, 4, 5] as const;

const sizeClasses = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
  xl: 'size-8',
} as const;

type StarRatingProps = {
  /** 1〜5。0 は未評価 */
  value: number;
  /** 渡すと入力になる。省略すると読み取り専用の表示 */
  onChange?: (rating: number) => void;
  size?: keyof typeof sizeClasses;
  label?: string;
  className?: string;
};

/**
 * 星 5 段階の評価。入力時はネイティブの radio を使うので、
 * キーボードの矢印キーでも選べる（`role="radiogroup"` を自前で作るより扱いが単純）。
 */
export function StarRating({
  value,
  onChange,
  size = 'md',
  label = '評価',
  className,
}: StarRatingProps) {
  const name = useId();

  if (!onChange) {
    return (
      <span
        role="img"
        aria-label={`${label} ${value} / 5`}
        className={cn('inline-flex items-center gap-0.5', className)}
      >
        {RATINGS.map((rating) => (
          <Star
            key={rating}
            aria-hidden="true"
            className={cn(
              sizeClasses[size],
              rating <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
            )}
          />
        ))}
      </span>
    );
  }

  return (
    <fieldset className={cn('inline-flex items-center', className)}>
      <legend className="sr-only">{label}</legend>
      {RATINGS.map((rating) => (
        <label
          key={rating}
          className="cursor-pointer rounded-md p-0.5 text-muted-foreground/40 transition-colors hover:text-amber-400 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
        >
          <input
            type="radio"
            name={name}
            value={rating}
            checked={value === rating}
            onChange={() => onChange(rating)}
            className="sr-only"
          />
          <span className="sr-only">星{rating}</span>
          <Star
            aria-hidden="true"
            className={cn(sizeClasses[size], rating <= value && 'fill-amber-400 text-amber-400')}
          />
        </label>
      ))}
    </fieldset>
  );
}
