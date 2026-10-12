import { queryOptions } from '@tanstack/react-query';
import { client, throwApiError } from '@/react-app/shared/api';

/**
 * 酒蔵の詳細（出品酒つき）。
 *
 * route の `loader`（遷移前の取得）と画面（購読）で同じ定義を使う。`staleTime` をここに置く理由は
 * `sake-detail` の `sakeQuery` と同じ（mount 時の二重取得を避ける）。
 */
export function breweryQuery(breweryId: number) {
  return queryOptions({
    queryKey: ['brewery', breweryId],
    staleTime: 30_000,
    queryFn: async () => {
      const res = await client.api.breweries[':id'].$get({ param: { id: String(breweryId) } });
      if (res.status === 404) {
        throwApiError(res, '酒蔵が見つかりませんでした');
      }
      if (!res.ok) {
        throwApiError(res, '酒蔵の情報を取得できませんでした');
      }
      return res.json();
    },
  });
}
