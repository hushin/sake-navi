import { z } from 'zod';

export const BREWERY_NOTE_MAX_LENGTH = 300;

/**
 * 酒蔵ノートの投稿・編集。列の長さや売り切れ、混雑など酒以外の一次情報を共有する。
 * 投稿（POST）と編集（PUT）で同じ形を使う。
 */
export const breweryNoteInputSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(1, 'コメントを入力してください')
    .max(BREWERY_NOTE_MAX_LENGTH, `コメントは ${BREWERY_NOTE_MAX_LENGTH} 文字までです`),
});

export type BreweryNoteInput = z.infer<typeof breweryNoteInputSchema>;
