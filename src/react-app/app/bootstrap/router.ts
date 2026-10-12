import type { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import type { AuthState } from '@/react-app/shared/api';
import { routeTree } from '@/react-app/routeTree.gen';
import { queryClient } from './query-client';

/** router context の形。live な `auth` は `AppProviders` から注入する */
export type RouterContext = {
  queryClient: QueryClient;
  auth: AuthState;
};

export const router = createRouter({
  routeTree,
  // auth の実体は <RouterProvider router={router} context={{ auth }} /> で入る。
  // createRouter の context は省略できないので、ここは型を満たすための置き場
  context: { queryClient, auth: undefined! },
  // 既定 30 秒の preload キャッシュに Query の鮮度判断を横取りさせない
  defaultPreloadStaleTime: 0,
  // hover / touch で先読みする（既定は false）。loader を入れた画面で効く
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
