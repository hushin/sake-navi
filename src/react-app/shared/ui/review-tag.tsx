import { REVIEW_TAGS, type ReviewTag } from '@/shared/schemas/sake';
import { cn } from '@/react-app/shared/lib';
import { Badge } from './badge';
import { Button } from './button';

/**
 * レビューのタグの見た目。味の方向、香り、質感など、タグごとに色を決めておくと
 * 一覧を流し読みしたときに「どのへんの感想か」が色で分かる。
 *
 * - `badge` … レビューに付いたタグの表示。塗って、色で意味が分かるようにする
 * - `idle` … 未選択のチップ。まだ入れていないことが分かるように塗らず、border と文字だけ色を持つ
 * - `selected` … 選択中。塗りつぶして、色だけに頼らず面でも違いが分かるようにする
 */
type TagStyle = {
  badge: string;
  idle: string;
  selected: string;
};

const TAG_STYLES: Record<ReviewTag, TagStyle> = {
  甘口: {
    badge:
      'border-pink-300 bg-pink-100 text-pink-800 dark:border-pink-900 dark:bg-pink-950 dark:text-pink-200',
    idle: 'border-pink-200 bg-transparent text-pink-700 hover:border-pink-300 hover:bg-pink-50 dark:border-pink-900 dark:text-pink-300 dark:hover:bg-pink-950/40',
    selected: 'border-pink-700 bg-pink-700 text-white hover:bg-pink-800',
  },
  辛口: {
    badge:
      'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200',
    idle: 'border-blue-200 bg-transparent text-blue-700 hover:border-blue-300 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40',
    selected: 'border-blue-700 bg-blue-700 text-white hover:bg-blue-800',
  },
  濃醇: {
    badge:
      'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
    idle: 'border-amber-200 bg-transparent text-amber-700 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/40',
    selected: 'border-amber-700 bg-amber-700 text-white hover:bg-amber-800',
  },
  淡麗: {
    badge:
      'border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200',
    idle: 'border-sky-200 bg-transparent text-sky-700 hover:border-sky-300 hover:bg-sky-50 dark:border-sky-900 dark:text-sky-300 dark:hover:bg-sky-950/40',
    selected: 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800',
  },
  にごり: {
    badge:
      'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    idle: 'border-slate-200 bg-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60',
    selected: 'border-slate-700 bg-slate-700 text-white hover:bg-slate-800',
  },
  酸味: {
    badge:
      'border-lime-300 bg-lime-100 text-lime-800 dark:border-lime-900 dark:bg-lime-950 dark:text-lime-200',
    idle: 'border-lime-200 bg-transparent text-lime-700 hover:border-lime-300 hover:bg-lime-50 dark:border-lime-900 dark:text-lime-300 dark:hover:bg-lime-950/40',
    selected: 'border-lime-700 bg-lime-700 text-white hover:bg-lime-800',
  },
  旨味: {
    badge:
      'border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200',
    idle: 'border-orange-200 bg-transparent text-orange-700 hover:border-orange-300 hover:bg-orange-50 dark:border-orange-900 dark:text-orange-300 dark:hover:bg-orange-950/40',
    selected: 'border-orange-700 bg-orange-700 text-white hover:bg-orange-800',
  },
  熟成: {
    badge:
      'border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200',
    idle: 'border-yellow-200 bg-transparent text-yellow-700 hover:border-yellow-300 hover:bg-yellow-50 dark:border-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-950/40',
    selected: 'border-yellow-700 bg-yellow-700 text-white hover:bg-yellow-800',
  },
  苦味: {
    badge:
      'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    idle: 'border-emerald-200 bg-transparent text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40',
    selected: 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800',
  },
  渋味: {
    badge:
      'border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-200',
    idle: 'border-purple-200 bg-transparent text-purple-700 hover:border-purple-300 hover:bg-purple-50 dark:border-purple-900 dark:text-purple-300 dark:hover:bg-purple-950/40',
    selected: 'border-purple-700 bg-purple-700 text-white hover:bg-purple-800',
  },
  発泡: {
    badge:
      'border-cyan-300 bg-cyan-100 text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-200',
    idle: 'border-cyan-200 bg-transparent text-cyan-700 hover:border-cyan-300 hover:bg-cyan-50 dark:border-cyan-900 dark:text-cyan-300 dark:hover:bg-cyan-950/40',
    selected: 'border-cyan-700 bg-cyan-700 text-white hover:bg-cyan-800',
  },
  フルーティ: {
    badge:
      'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200',
    idle: 'border-rose-200 bg-transparent text-rose-700 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40',
    selected: 'border-rose-700 bg-rose-700 text-white hover:bg-rose-800',
  },
};

/** 未知のタグ（古いレビューなど）でも表示が壊れないようにする */
const FALLBACK_STYLE: TagStyle = {
  badge: 'border-border bg-muted text-muted-foreground',
  idle: 'border-border bg-transparent text-muted-foreground hover:border-ring hover:bg-muted',
  selected: 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
};

const TAG_NAMES: readonly string[] = REVIEW_TAGS;

function isKnownTag(tag: string): tag is ReviewTag {
  return TAG_NAMES.includes(tag);
}

function styleFor(tag: string): TagStyle {
  return isKnownTag(tag) ? TAG_STYLES[tag] : FALLBACK_STYLE;
}

/** レビューに付いたタグの表示（タイムライン・レビュー一覧・お酒詳細で共有する） */
export function TagBadge({ tag, className }: { tag: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn(styleFor(tag).badge, className)}>
      {tag}
    </Badge>
  );
}

/** タグを選ぶボタン（レビューの投稿フォームとレビュー一覧の絞り込みで共有する） */
export function TagToggle({
  tag,
  isSelected,
  onClick,
  size = 'default',
  className,
}: {
  tag: string;
  isSelected: boolean;
  onClick: () => void;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}) {
  const style = styleFor(tag);

  return (
    <Button
      type="button"
      size={size}
      aria-pressed={isSelected}
      onClick={onClick}
      className={cn(isSelected ? style.selected : style.idle, className)}
    >
      {tag}
    </Button>
  );
}
