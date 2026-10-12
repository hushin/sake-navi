import { queryOptions } from '@tanstack/react-query';
import { client, throwApiError } from '@/react-app/shared/api';

/**
 * 銘柄の詳細。
 *
 * route の `loader`（遷移前の取得）と画面（購読）で同じ定義を使う。`staleTime` をここに置くのは、
 * 両方の observer に同じ値が効くようにするため（片方だけに指定すると、loaders が温めても
 * 画面のマウント時にもう一度取りに行く）。
 */
export function sakeQuery(sakeId: number) {
  return queryOptions({
    queryKey: ['sake', sakeId],
    staleTime: 30_000,
    queryFn: async () => {
      const res = await client.api.sakes[':id'].$get({ param: { id: String(sakeId) } });
      if (res.status === 404) {
        throwApiError(res, 'お酒が見つかりませんでした');
      }
      if (!res.ok) {
        throwApiError(res, 'お酒の情報を取得できませんでした');
      }
      return res.json();
    },
  });
}
