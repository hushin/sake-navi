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

export const SAKE_NAME_MAX_LENGTH = 100;
export const SAKE_TYPE_MAX_LENGTH = 50;
export const SAKE_PAID_TASTING_PRICE_MAX = 100000;

/**
 * 銘柄マスタの編集。
 *
 * 有料試飲の価格は会場に行くまで分からないので、当日その場で手入力して直す想定。
 * 未入力は `null`（「無料」とは区別しない。決まったら入力する）。
 */
export const sakeUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'お酒の名前を入力してください')
    .max(SAKE_NAME_MAX_LENGTH, `お酒の名前は ${SAKE_NAME_MAX_LENGTH} 文字までです`),
  type: z
    .string()
    .trim()
    .max(SAKE_TYPE_MAX_LENGTH, `種類は ${SAKE_TYPE_MAX_LENGTH} 文字までです`)
    .nullable(),
  category: sakeCategorySchema,
  isLimited: z.boolean(),
  paidTastingPrice: z
    .number()
    .int()
    .positive('1 以上の金額を入力してください')
    .max(SAKE_PAID_TASTING_PRICE_MAX, '金額が大きすぎます')
    .nullable(),
});

export type SakeUpdateInput = z.infer<typeof sakeUpdateSchema>;

/**
 * 銘柄の編集フォームの入力。
 * 金額は入力欄の都合で文字列で持ち、空文字を「未入力」として扱う（`toSakeUpdateInput` で変換する）。
 */
export const sakeEditSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'お酒の名前を入力してください')
    .max(SAKE_NAME_MAX_LENGTH, `お酒の名前は ${SAKE_NAME_MAX_LENGTH} 文字までです`),
  type: z.string().trim().max(SAKE_TYPE_MAX_LENGTH, `種類は ${SAKE_TYPE_MAX_LENGTH} 文字までです`),
  category: sakeCategorySchema,
  isLimited: z.boolean(),
  paidTastingPrice: z
    .string()
    .trim()
    .regex(/^\d*$/, '金額は数字で入力してください')
    .refine((value) => value === '' || Number(value) > 0, '1 以上の金額を入力してください')
    .refine(
      (value) => value === '' || Number(value) <= SAKE_PAID_TASTING_PRICE_MAX,
      '金額が大きすぎます',
    ),
});

export type SakeEditInput = z.infer<typeof sakeEditSchema>;

/** フォームの値（文字列の金額）を API の入力（数値 or null）に変換する */
export function toSakeUpdateInput(value: SakeEditInput): SakeUpdateInput {
  return {
    name: value.name,
    type: value.type === '' ? null : value.type,
    category: value.category,
    isLimited: value.isLimited,
    paidTastingPrice: value.paidTastingPrice === '' ? null : Number(value.paidTastingPrice),
  };
}

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
