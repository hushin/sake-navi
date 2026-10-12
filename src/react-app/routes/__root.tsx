import { createRootRouteWithContext, Link, redirect } from '@tanstack/react-router';
import type { RouterContext } from '@/react-app/app/bootstrap';
import { RootLayout, SessionGate } from '@/react-app/app/layouts';
import { Button } from '@/react-app/shared/ui';

/** サインインしていなくても開ける画面 */
const PUBLIC_PATHS = new Set(['/sign-in']);

/** サインインは要るが、ニックネーム登録より前に開ける画面 */
const NICKNAME_EXEMPT_PATHS = new Set(['/welcome']);

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootRouteComponent,
  notFoundComponent: NotFound,
  beforeLoad: ({ context, location }) => {
    if (PUBLIC_PATHS.has(location.pathname)) {
      return;
    }

    // 起動直後は session がまだ分からない。中身は SessionGate が止めているのでここは通す
    // （取得に失敗したときも、サインインではなく SessionGate が再試行を出す）
    if (context.auth.isPending || (context.auth.error && !context.auth.data)) {
      return;
    }

    if (!context.auth.data) {
      throw redirect({ to: '/sign-in' });
    }

    // 初回はニックネームを決めてもらう（アプリ内の表示名になる）
    if (!context.auth.data.user.nickname && !NICKNAME_EXEMPT_PATHS.has(location.pathname)) {
      throw redirect({ to: '/welcome' });
    }
  },
});

function RootRouteComponent() {
  const { auth } = Route.useRouteContext();

  return (
    <SessionGate auth={auth}>
      <RootLayout />
    </SessionGate>
  );
}

function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">ページが見つかりません</h1>
      <p className="text-sm text-muted-foreground">
        URL が変わったか、削除された画面かもしれません。
      </p>
      <Button variant="outline" size="sm" render={<Link to="/map" />}>
        マップへ
      </Button>
    </div>
  );
}
