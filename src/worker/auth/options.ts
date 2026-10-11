import type { BetterAuthOptions } from 'better-auth';

/**
 * DB / secret / provider の資格情報を除いた、実行時と CLI（スキーマ生成）で共通の設定。
 *
 * plugin や additionalFields を足すときはここに書く。こうしておくと
 * `npx @better-auth/cli generate` が plugin のテーブルも含めたスキーマを吐いてくれる。
 */
export const authOptions = {
  basePath: '/api/auth',
  plugins: [],
  user: {
    additionalFields: {
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
