import { QueryClient } from '@tanstack/react-query';
import { apiErrorStatus } from '@/react-app/shared/api';

/**
 * アプリ全体で 1 つだけ使う QueryClient。
 *
 * `AppProviders`（画面）と `router`（loader の context）の両方から同じ実体を参照する。
 * 別インスタンスを作ると loader と画面が別のキャッシュを見て二重取得になる。
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 存在しない id の 404 のような 4xx は投げ直しても直らないので即座に諦める。
      // ネットワークの瞬断は既定と同じ 3 回まで粘る
      retry: (failureCount, error) => {
        const status = apiErrorStatus(error);
        if (status !== undefined && status >= 400 && status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});
