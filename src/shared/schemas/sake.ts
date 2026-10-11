import { z } from 'zod';

/**
 * レビューで使えるタグ。UI のタグ選択と API のバリデーションが同じ定義を参照する
 * （旧実装は 3 箇所に定数が散っていてドリフトしていた）。
 */
export const REVIEW_TAGS = [
  '甘口',
  '辛口',
  '濃醇',
  '淡麗',
  'にごり',
  '酸味',
  '旨味',
  '熟成',
  '苦味',
  '渋味',
  '発泡',
  'フルーティ',
] as const;

export const reviewTagSchema = z.enum(REVIEW_TAGS);

export type ReviewTag = (typeof REVIEW_TAGS)[number];

/** お酒の区分。会場の出品は清酒以外も含む */
export const SAKE_CATEGORIES = ['清酒', 'リキュール', 'みりん', 'その他'] as const;

export const sakeCategorySchema = z.enum(SAKE_CATEGORIES);

export type SakeCategory = (typeof SAKE_CATEGORIES)[number];

export const REVIEW_COMMENT_MAX_LENGTH = 500;

/**
 * レビュー入力の形。タグは配列を省略できる（API 用）。
 *
 * フォームの検証には `reviewFormSchema` を使う。`.default([])` があると
 * zod の input 型で `tags` が optional になり、TanStack Form の
 * Standard Schema 検証（input と form の型が一致している必要がある）で弾かれるため。
 */
export const reviewInputSchema = z.object({
  rating: z.number().int().min(1, '評価を選んでください').max(5, '評価は 5 までです'),
  tags: z.array(reviewTagSchema).max(REVIEW_TAGS.length).default([]),
  comment: z
    .string()
    .trim()
    .max(REVIEW_COMMENT_MAX_LENGTH, `コメントは ${REVIEW_COMMENT_MAX_LENGTH} 文字までです`)
    .optional(),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;

/** レビューフォームの入力。`reviewInputSchema` からタグの省略を外しただけ */
export const reviewFormSchema = reviewInputSchema.extend({
  tags: z.array(reviewTagSchema).max(REVIEW_TAGS.length),
});

export type ReviewFormInput = z.infer<typeof reviewFormSchema>;

/**
 * お酒一覧の検索条件。クエリ文字列なので数値・真偽値は文字列で受け取って変換する。
 */
export const sakeListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: sakeCategorySchema.optional(),
  isLimited: z.enum(['true', 'false']).optional(),
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type SakeListQuery = z.infer<typeof sakeListQuerySchema>;

/**
 * API から来たタグ（DB の JSON 列なので型は `string[]`）を、
 * 現在のタグ定義に合うものだけに絞る。
 */
export function filterReviewTags(tags: string[]): ReviewTag[] {
  return tags.filter((tag): tag is ReviewTag => reviewTagSchema.safeParse(tag).success);
}

/** 新着レビューの一覧（タイムライン）の取得条件 */
export const timelineQuerySchema = z.object({
  // `<createdAt の epoch ミリ秒>_<review id>`。同一ミリ秒の取りこぼしを防ぐ複合カーソル
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type TimelineQuery = z.infer<typeof timelineQuerySchema>;
