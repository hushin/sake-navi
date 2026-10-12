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
 * 銘柄の新規追加（酒蔵詳細の「酒を追加」）。編集と同じ項目を送る。
 * `is_custom = true` と追加者は route 側でセッションから入れる。
 */
export const sakeCreateSchema = sakeUpdateSchema;

export type SakeCreateInput = z.infer<typeof sakeCreateSchema>;

/**
 * 出典 PDF に金額の記載が無く「有料試飲である」ことだけ分かる場合に、この値を入れる約束にしている。
 * 金額そのものではないので、表示するときは `parsePaidTasting` を通す。
 */
export const PAID_TASTING_PRICE_UNDETERMINED = 7;

export type PaidTasting = {
  hasPaidTasting: boolean;
  /** 金額が分かっているときだけ数値。`null` は「金額は未確認」 */
  price: number | null;
};

/** DB の生の値（`null` / `7` / 実額）をアプリの意味に解釈する */
export function parsePaidTasting(value: number | null): PaidTasting {
  if (value === null) {
    return { hasPaidTasting: false, price: null };
  }
  if (value === PAID_TASTING_PRICE_UNDETERMINED) {
    return { hasPaidTasting: true, price: null };
  }
  return { hasPaidTasting: true, price: value };
}

/** API の `category` は文字列なので、既知の区分に寄せる */
export function toSakeCategory(value: string): SakeCategory {
  return SAKE_CATEGORIES.find((category) => category === value) ?? '清酒';
}

/**
 * 銘柄の編集フォームの入力。
 *
 * 金額は「有料試飲あり」のチェックと、金額の入力欄（文字列）に分けて持つ。
 * チェックだけ入れて金額が空なら「金額は未確認」として `7` を保存する。
 */
export const sakeEditSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'お酒の名前を入力してください')
      .max(SAKE_NAME_MAX_LENGTH, `お酒の名前は ${SAKE_NAME_MAX_LENGTH} 文字までです`),
    type: z
      .string()
      .trim()
      .max(SAKE_TYPE_MAX_LENGTH, `種類は ${SAKE_TYPE_MAX_LENGTH} 文字までです`),
    category: sakeCategorySchema,
    isLimited: z.boolean(),
    hasPaidTasting: z.boolean(),
    paidTastingPrice: z.string().trim().regex(/^\d*$/, '金額は数字で入力してください'),
  })
  .refine(
    (value) =>
      !value.hasPaidTasting || value.paidTastingPrice === '' || Number(value.paidTastingPrice) > 0,
    { path: ['paidTastingPrice'], message: '1 以上の金額を入力してください' },
  )
  .refine(
    (value) =>
      value.paidTastingPrice === '' ||
      Number(value.paidTastingPrice) <= SAKE_PAID_TASTING_PRICE_MAX,
    { path: ['paidTastingPrice'], message: '金額が大きすぎます' },
  );

export type SakeEditInput = z.infer<typeof sakeEditSchema>;

/** 保存済みの値からフォームの初期値を作る */
export function toSakeEditInput(sake: {
  name: string;
  type: string | null;
  category: string;
  isLimited: boolean;
  paidTastingPrice: number | null;
}): SakeEditInput {
  const paidTasting = parsePaidTasting(sake.paidTastingPrice);

  return {
    name: sake.name,
    type: sake.type ?? '',
    category: toSakeCategory(sake.category),
    isLimited: sake.isLimited,
    hasPaidTasting: paidTasting.hasPaidTasting,
    paidTastingPrice: paidTasting.price === null ? '' : String(paidTasting.price),
  };
}

/** フォームの値を API の入力（数値 or null）に変換する */
export function toSakeUpdateInput(value: SakeEditInput): SakeUpdateInput {
  return {
    name: value.name,
    type: value.type === '' ? null : value.type,
    category: value.category,
    isLimited: value.isLimited,
    paidTastingPrice: !value.hasPaidTasting
      ? null
      : value.paidTastingPrice === ''
        ? PAID_TASTING_PRICE_UNDETERMINED
        : Number(value.paidTastingPrice),
  };
}

/**
 * 評価の範囲と刻み。星 5 段階を 0.25 刻みで付ける。
 *
 * 0.25 は 2 進小数で正確に表せるので、`value * 4` のような計算をしても誤差が出ない
 * （0.1 刻みだと `multipleOf` が丸め誤差で揺れる）。入力のスライダー（`step`）と
 * API の検証が同じ定数を参照する。
 */
export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const RATING_STEP = 0.25;

/** 表示用に 0.25 刻みへ丸める（平均評価 4.37 → 4.25） */
export function toRatingStep(value: number): number {
  return Math.round(value / RATING_STEP) * RATING_STEP;
}

/** 評価の表示用の文字列（4 → `4`、4.25 → `4.25`） */
export function formatRating(value: number): string {
  return String(toRatingStep(value));
}

/**
 * レビュー入力の形。タグは配列を省略できる（API 用）。
 *
 * フォームの検証には `reviewFormSchema` を使う。`.default([])` があると
 * zod の input 型で `tags` が optional になり、TanStack Form の
 * Standard Schema 検証（input と form の型が一致している必要がある）で弾かれるため。
 */
export const reviewInputSchema = z.object({
  rating: z
    .number()
    .min(RATING_MIN, '評価を選んでください')
    .max(RATING_MAX, '評価は 5 までです')
    .multipleOf(RATING_STEP, `評価は ${RATING_STEP} 刻みで選んでください`),
  tags: z.array(reviewTagSchema).max(REVIEW_TAGS.length).default([]),
  comment: z
    .string()
    .trim()
    .max(REVIEW_COMMENT_MAX_LENGTH, `コメントは ${REVIEW_COMMENT_MAX_LENGTH} 文字までです`)
    .optional(),
  /** Discord への通知。レビューは頻度が高いので既定は OFF（ノートは既定 ON） */
  notifyDiscord: z.boolean().default(false),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;

/** レビューフォームの入力。`reviewInputSchema` から default を外しただけ */
export const reviewFormSchema = reviewInputSchema.extend({
  tags: z.array(reviewTagSchema).max(REVIEW_TAGS.length),
  notifyDiscord: z.boolean(),
});

export type ReviewFormInput = z.infer<typeof reviewFormSchema>;

/**
 * お酒一覧の検索条件。クエリ文字列なので数値・真偽値は文字列で受け取って変換する。
 *
 * 有料試飲の 2 つの絞り込みは `true` のときだけ効く。`paid_tasting_price` の `null` は
 * 「有料試飲なし」ではなく「未入力（分かったら入れる）」なので、`false` 側に意味がない。
 *
 * - `hasPaidTasting` … 有料試飲がある（金額が分かっていてもいなくても）
 * - `needsPrice` … 有料試飲とだけ分かっていて金額が未入力（会場で埋める作業用）
 */
export const sakeListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: sakeCategorySchema.optional(),
  isLimited: z.enum(['true', 'false']).optional(),
  hasPaidTasting: z.literal('true').optional(),
  needsPrice: z.literal('true').optional(),
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

/** レビュー一覧の並び順。`rating` だけカーソルの持ち方が違う（repository を参照） */
export const REVIEW_SORTS = ['latest', 'rating'] as const;

export const reviewSortSchema = z.enum(REVIEW_SORTS);

export type ReviewSort = (typeof REVIEW_SORTS)[number];

/**
 * レビュー一覧（横断検索）の取得条件。
 *
 * `tags` はカンマ区切りで、指定したタグを**すべて**含むレビューだけを返す（AND）。
 * カーソルは並び順によって形式が違うので、そのまま API に返してもらう。
 */
export const reviewListQuerySchema = z.object({
  sort: reviewSortSchema.default('latest'),
  tags: z.string().trim().max(200).optional(),
  userId: z.string().trim().max(100).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;

/** `tags=甘口,濃醇` を、現在のタグ定義に合うものだけに絞って分解する */
export function parseReviewTags(value: string | undefined): ReviewTag[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag): tag is ReviewTag => reviewTagSchema.safeParse(tag).success);
}
