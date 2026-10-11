import { Bookmark } from 'lucide-react';
import { cn } from '@/react-app/shared/lib';
import { Button } from './button';

type BookmarkButtonProps = {
  isBookmarked: boolean;
  /** 保存中はその銘柄のボタンだけを押せなくする */
  isPending?: boolean;
  onToggle: () => void;
  className?: string;
};

/**
 * 銘柄のブックマークを切り替えるボタン。
 *
 * 状態と操作は呼び出し側が持ち、ここは見た目だけを担う
 * （`shared/ui` に API 呼び出しを持ち込まない。組で使うのは `shared/api` の `useBookmarkToggle`）。
 */
export function BookmarkButton({
  isBookmarked,
  isPending = false,
  onToggle,
  className,
}: BookmarkButtonProps) {
  const label = isBookmarked ? 'ブックマークを解除' : 'ブックマークに追加';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-pressed={isBookmarked}
      aria-label={label}
      title={label}
      disabled={isPending}
      className={cn(isBookmarked && 'text-primary', className)}
      onClick={onToggle}
    >
      <Bookmark aria-hidden="true" className={cn('size-4', isBookmarked && 'fill-current')} />
    </Button>
  );
}
