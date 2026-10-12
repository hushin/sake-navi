import { createFileRoute, notFound } from '@tanstack/react-router';
import { BreweryDetailPage, breweryQuery } from '@/react-app/pages/brewery-detail';

export const Route = createFileRoute('/breweries/$breweryId')({
  component: BreweryDetailRoute,
  beforeLoad: ({ params }) => {
    // 数値でない id は API を叩く前に 404 にする（worker 側の parseIdParam と同じ判定）
    if (!/^[1-9]\d*$/.test(params.breweryId)) {
      throw notFound();
    }
  },
  // 遷移前にキャッシュを温める。取得は query()、鮮度管理は Query に任せる
  loader: ({ context, params }) =>
    context.queryClient.query({ ...breweryQuery(Number(params.breweryId)), staleTime: 'static' }),
});

function BreweryDetailRoute() {
  const { breweryId } = Route.useParams();

  return <BreweryDetailPage breweryId={Number(breweryId)} />;
}
