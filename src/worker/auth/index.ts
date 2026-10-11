// `better-auth/minimal` は Kysely（内蔵アダプタ）を読み込まないエントリ。
// D1 へは drizzleAdapter で繋ぐので Kysely は不要で、Worker のバンドルが小さくなる。
// アダプタを渡さない場合だけ実行時にエラーになる（マイグレーションは drizzle-kit 側で行う）。
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createDb } from '@/worker/db';
import * as authSchema from '@/worker/db/auth-schema';
import {
  countUsers,
  findUserByEmail,
  isEmailAllowed,
  parseAllowedEmails,
} from '@/worker/repositories/allowed-emails';
import { authOptions } from './options';

/** サインインを拒否したときのエラーコード。サインイン画面がこの値で文言を出し分ける */
export const ACCESS_DENIED_ERROR = 'access_denied';

/**
 * Workers では env がリクエストスコープなので、モジュールトップで auth を作らず
 * ハンドラの中で `createAuth(c.env)` として都度生成する。
 */
export function createAuth(env: Env) {
  const db = createDb(env);
  const bootstrapEmails = parseAllowedEmails(env.ALLOWED_EMAILS);

  return betterAuth({
    ...authOptions,
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: authSchema,
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        // 端末に複数の Google アカウントがある場合に選ばせる（別アカウントでの参加を想定）
        prompt: 'select_account',
      },
    },
    user: {
      ...authOptions.user,
      /**
       * サインインを許可する Google アカウントを制限する。
       * 新規作成（create-user）と再サインイン（sign-in）の両方で見るので、
       * 許可リストから外したアカウントは次のサインインから入れなくなる。
       * オーナーだけは締め出されないように常に許可する。
       */
      validateUserInfo: async ({ user, source }) => {
        const email = user.email;

        // linkSocial は使っていないが、リンク時に拒否すると分かりにくいので素通しする
        if (source.action === 'link-account' || email === undefined) {
          return undefined;
        }

        const allowedOrOwner =
          (await isEmailAllowed(db, email, bootstrapEmails)) ||
          (await findUserByEmail(db, email))?.role === 'owner';

        return allowedOrOwner
          ? undefined
          : {
              error: ACCESS_DENIED_ERROR,
              errorDescription:
                'この Google アカウントには利用が許可されていません。オーナーに追加を依頼してください。',
            };
      },
    },
    databaseHooks: {
      user: {
        create: {
          // 最初にサインインしたユーザーをオーナーにする
          before: async (createdUser) => {
            const isFirstUser = (await countUsers(db)) === 0;
            return { data: { ...createdUser, role: isFirstUser ? 'owner' : 'member' } };
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSessionData = Auth['$Infer']['Session'];
export type AuthUser = AuthSessionData['user'];
export type AuthSession = AuthSessionData['session'];
