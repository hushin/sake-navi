import { z } from 'zod';

/**
 * ブックマークの登録。保存するのは酒蔵ではなく銘柄（同じ酒蔵でも銘柄ごとに興味が分かれるため）。
 * 解除はパスパラメータ（`DELETE /api/bookmarks/:sakeId`）なので、ここには無い。
 */
export const bookmarkInputSchema = z.object({
  sakeId: z.number().int().positive(),
});

export type BookmarkInput = z.infer<typeof bookmarkInputSchema>;
