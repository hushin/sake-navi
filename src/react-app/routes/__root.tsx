import { createRootRoute, redirect } from '@tanstack/react-router';
import { RootLayout } from '@/react-app/app/layouts';
import { authClient } from '@/react-app/shared/api';

/** サインインしていなくても開ける画面 */
const PUBLIC_PATHS = new Set(['/sign-in']);

/** サインインは要るが、ニックネーム登録より前に開ける画面 */
const NICKNAME_EXEMPT_PATHS = new Set(['/welcome']);

export const Route = createRootRoute({
  component: RootLayout,
  beforeLoad: async ({ location }) => {
    if (PUBLIC_PATHS.has(location.pathname)) {
      return;
    }

    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: '/sign-in' });
    }

    // 初回はニックネームを決めてもらう（アプリ内の表示名になる）
    if (!session.data.user.nickname && !NICKNAME_EXEMPT_PATHS.has(location.pathname)) {
      throw redirect({ to: '/welcome' });
    }
  },
});
