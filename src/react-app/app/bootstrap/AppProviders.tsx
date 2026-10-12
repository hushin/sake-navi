import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useSession } from '@/react-app/shared/api';
import { queryClient } from './query-client';
import { router } from './router';

export function AppProviders() {
  // session は better-auth のストアを唯一の出所にする（beforeLoad のガードも context 経由でここから読む）
  const auth = useSession();

  // ストアが解決・更新したら beforeLoad を評価し直す（context が変わっただけでは再実行されない）
  useEffect(() => {
    if (!auth.isPending) {
      void router.invalidate();
    }
  }, [auth]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ auth }} />
    </QueryClientProvider>
  );
}
