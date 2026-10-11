import { createRootRoute, redirect } from '@tanstack/react-router';
import { RootLayout } from '@/react-app/app/layouts';
import { authClient } from '@/react-app/shared/api';

/** サインインしていない状態で開けるのはサインイン画面だけ */
const PUBLIC_PATHS = new Set(['/sign-in']);

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
  },
});
