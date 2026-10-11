import { HttpResponse, http, type RequestHandler } from 'msw';
import { authClient } from '@/react-app/shared/api';

/**
 * better-auth のセッション取得は Hono の route ではなく `auth.handler` が直接処理するため、
 * `AppType` から型を引けない。ここだけは msw の `http` をそのまま使う。
 */
export const signedInSession = {
  user: {
    id: 'user-1',
    name: '新潟 花子',
    email: 'hanako@example.com',
    emailVerified: true,
    image: null,
    // ニックネーム未登録の状態（表示は Google の名前になる）
    nickname: null,
    role: 'owner',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  session: {
    id: 'session-1',
    userId: 'user-1',
    token: 'test-token',
    expiresAt: '2099-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
} as const;

/** ニックネーム登録済みの状態 */
export const signedInSessionWithNickname = {
  ...signedInSession,
  user: { ...signedInSession.user, nickname: 'はなこ' },
} as const;

/** story から使うハンドラ一式 */
export const sessionHandlers = {
  signedIn: [http.get('/api/auth/get-session', () => HttpResponse.json(signedInSession))],
  signedInWithNickname: [
    http.get('/api/auth/get-session', () => HttpResponse.json(signedInSessionWithNickname)),
  ],
  // 未ログインのとき better-auth は 200 + null を返す
  signedOut: [http.get('/api/auth/get-session', () => HttpResponse.json(null))],
} as const satisfies Record<string, RequestHandler[]>;

/**
 * better-auth の `useSession` はモジュールスコープの nanostore にセッションをキャッシュし、
 * 購読が 0 になっても約 1 秒は store を生かしたままにする。story は連続で実行されるため、
 * 何もしないと 2 本目以降が 1 本目のセッションを再利用して msw のモックを無視する。
 * `$sessionSignal` を notify すると再取得が走る。
 *
 * msw のハンドラは story の `beforeEach` で登録される（global loader の `mswLoader` は
 * 各 story の前にハンドラをリセットする）。再取得は非同期で処理されるので、
 * この loader は **global loader の後に実行される** loader として呼ぶ。
 */
export const refetchSession = () => {
  authClient.$store.notify('$sessionSignal');
};
