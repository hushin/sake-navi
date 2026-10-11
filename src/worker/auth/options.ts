import type { BetterAuthOptions } from 'better-auth';
import { nicknameSchema } from '../../shared/schemas/profile';

/**
 * DB / secret / provider の資格情報を除いた、実行時と CLI（スキーマ生成）で共通の設定。
 *
 * plugin や additionalFields を足すときはここに書く。こうしておくと
 * CLI（`npx auth generate` 相当）が plugin のテーブルも含めたスキーマを吐いてくれる。
 *
 * 注意: このファイルは Node 上の CLI からも読み込むので、import は相対パスにする
 * （`@/` エイリアスは CLI から解決できない）。
 */
export const authOptions = {
  basePath: '/api/auth',
  plugins: [],
  user: {
    additionalFields: {
      /**
       * アプリ内で表示する名前。Google のアカウント名とは別に、初回サインイン後に本人が決める。
       * `input: true` なので `authClient.updateUser({ nickname })` で設定できる。
       * 検証はクライアントのフォームと同じ zod スキーマをサーバ側でも通す。
       */
      nickname: {
        type: 'string',
        required: false,
        input: true,
        validator: { input: nicknameSchema },
      },
      /**
       * `owner` はメンバー（サインインを許可する Google アカウント）を追加できる。
       * 最初にサインインしたユーザーが自動で owner になる（`src/worker/auth/index.ts`）。
       * `input: false` なのでクライアントからは設定できない。
       */
      role: {
        type: 'string',
        required: false,
        defaultValue: 'member',
        input: false,
      },
    },
  },
} satisfies BetterAuthOptions;
