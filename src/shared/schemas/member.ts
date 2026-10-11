import { z } from 'zod';

/**
 * メンバー（許可する Google アカウント）の追加。
 * メールアドレスは大文字小文字を区別しないので、検証の前に小文字へ正規化する。
 */
export const memberEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, 'メールアドレスが長すぎます')
    .pipe(z.email('メールアドレスを入力してください')),
});

export type MemberEmailInput = z.infer<typeof memberEmailSchema>;
