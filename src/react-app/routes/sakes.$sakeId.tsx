import { createFileRoute } from '@tanstack/react-router';
import { SakeDetailPage } from '@/react-app/pages/sake-detail';

export const Route = createFileRoute('/sakes/$sakeId')({
  component: SakeDetailRoute,
});

function SakeDetailRoute() {
  const { sakeId } = Route.useParams();

  // 数値でない id は API 側で 404 になるので、ここでは変換だけする
  return <SakeDetailPage sakeId={Number(sakeId)} />;
}
