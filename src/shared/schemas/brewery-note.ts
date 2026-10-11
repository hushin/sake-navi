import { z } from 'zod';

export const BREWERY_NOTE_MAX_LENGTH = 300;

/**
 * 酒蔵ノートの投稿・編集。列の長さや売り切れ、混雑など酒以外の一次情報を共有する。
 * 投稿（POST）と編集（PUT）で同じ形を使う。
 *
 * 通知は既定 ON（レビューと違って投稿が稀で、売り切れなどの情報は早く届けたい）。
 */
export const breweryNoteInputSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(1, 'コメントを入力してください')
    .max(BREWERY_NOTE_MAX_LENGTH, `コメントは ${BREWERY_NOTE_MAX_LENGTH} 文字までです`),
  notifyDiscord: z.boolean().default(true),
});

export type BreweryNoteInput = z.infer<typeof breweryNoteInputSchema>;

/** ノートフォームの入力。`breweryNoteInputSchema` から default を外しただけ */
export const breweryNoteFormSchema = breweryNoteInputSchema.extend({
  notifyDiscord: z.boolean(),
});

export type BreweryNoteFormInput = z.infer<typeof breweryNoteFormSchema>;
