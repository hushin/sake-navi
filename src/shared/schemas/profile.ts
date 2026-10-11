import { z } from 'zod';

export const NICKNAME_MAX_LENGTH = 20;

/**
 * アプリ内で表示するニックネーム。Google の本名とは別に、本人が決める。
 * Better Auth の `additionalFields.nickname` の validator と、
 * クライアントのフォーム検証の両方で使う。
 */
export const nicknameSchema = z
  .string()
  .trim()
  .min(1, 'ニックネームを入力してください')
  .max(NICKNAME_MAX_LENGTH, `ニックネームは ${NICKNAME_MAX_LENGTH} 文字までです`);

export const profileInputSchema = z.object({
  nickname: nicknameSchema,
});

export type ProfileInput = z.infer<typeof profileInputSchema>;
