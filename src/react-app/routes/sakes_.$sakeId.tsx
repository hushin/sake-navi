import { createFileRoute, notFound } from '@tanstack/react-router';
import { SakeDetailPage, SakeDetailSkeleton, sakeQuery } from '@/react-app/pages/sake-detail';

export const Route = createFileRoute('/sakes_/$sakeId')({
  component: SakeDetailRoute,
  // loader が遅いとき（既定の pendingMs = 1 秒を超えたとき）はページと同じ骨組みを出す
  pendingComponent: SakeDetailSkeleton,
  beforeLoad: ({ params }) => {
    // 数値でない id は API を叩く前に 404 にする（worker 側の parseIdParam と同じ判定）
    if (!/^[1-9]\d*$/.test(params.sakeId)) {
      throw notFound();
    }
  },
  // 遷移前にキャッシュを温める。画面も同じ queryOptions を購読するので、ここで取れたら再取得しない
  loader: async ({ context, params }) => {
    try {
      // retry: false にするのは、リトライ待ちで遷移を止めないため（再試行は画面側の useQuery が持つ）
      await context.queryClient.query({ ...sakeQuery(Number(params.sakeId)), retry: false });
    } catch {
      // 失敗しても遷移は止めない。画面の useQuery が同じキャッシュを読んでエラー UI と再試行を出す
    }
  },
});

function SakeDetailRoute() {
  const { sakeId } = Route.useParams();

  return <SakeDetailPage sakeId={Number(sakeId)} />;
}
