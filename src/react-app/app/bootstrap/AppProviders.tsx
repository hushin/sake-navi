import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useSession } from '@/react-app/shared/api';
import { queryClient } from './query-client';
import { router } from './router';

export function AppProviders() {
  // session は better-auth のストアを唯一の出所にする（beforeLoad のガードも context 経由でここから読む）
  const auth = useSession();

  // 「中身」が変わったときだけ beforeLoad を評価し直す。ストアは refetch のたびに新しい
  // オブジェクトを作るので、依存に object を置くと値が同じでも invalidate が走ってしまう
  const sessionKey = auth.isPending
    ? 'pending'
    : `${auth.data?.user.id ?? ''}:${auth.data?.user.nickname ?? ''}`;

  useEffect(() => {
    if (sessionKey === 'pending') {
      return;
    }
    void router.invalidate();
  }, [sessionKey]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ auth }} />
    </QueryClientProvider>
  );
}
