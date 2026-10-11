import { createFileRoute } from '@tanstack/react-router';
import { BreweryDetailPage } from '@/react-app/pages/brewery-detail';

export const Route = createFileRoute('/breweries/$breweryId')({
  component: BreweryDetailRoute,
});

function BreweryDetailRoute() {
  const { breweryId } = Route.useParams();

  // 数値でない id は API 側で 404 になるので、ここでは変換だけする
  return <BreweryDetailPage breweryId={Number(breweryId)} />;
}
