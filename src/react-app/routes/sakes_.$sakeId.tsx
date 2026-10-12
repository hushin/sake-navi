import { createFileRoute, notFound } from '@tanstack/react-router';
import { SakeDetailPage, sakeQuery } from '@/react-app/pages/sake-detail';

export const Route = createFileRoute('/sakes_/$sakeId')({
  component: SakeDetailRoute,
  beforeLoad: ({ params }) => {
    // 数値でない id は API を叩く前に 404 にする（worker 側の parseIdParam と同じ判定）
    if (!/^[1-9]\d*$/.test(params.sakeId)) {
      throw notFound();
    }
  },
  // 遷移前にキャッシュを温める。取得は query()、鮮度管理は Query に任せる
  loader: ({ context, params }) =>
    context.queryClient.query({ ...sakeQuery(Number(params.sakeId)), staleTime: 'static' }),
});

function SakeDetailRoute() {
  const { sakeId } = Route.useParams();

  return <SakeDetailPage sakeId={Number(sakeId)} />;
}
