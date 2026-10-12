import { inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import type { Auth } from '@/worker/auth';

// SPA と Worker は同一オリジンなので baseURL は不要。basePath だけ worker 側と合わせる。
// inferAdditionalFields を入れると、additionalFields（nickname / role）が
// セッションの user 型に載る。
export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [inferAdditionalFields<Auth>()],
});

export const { signIn, signOut, useSession } = authClient;

/** `useSession()` の戻り値。router context に載せて beforeLoad のガードから読む */
export type AuthState = ReturnType<typeof useSession>;
