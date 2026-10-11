import { createFileRoute } from '@tanstack/react-router';
import { MapPage } from '@/react-app/pages/map';

/** `?brewery=<id>` の値。文字列でも数値でも受け取れるようにしておく */
function parseBreweryId(value: unknown): number | undefined {
  const text = typeof value === 'number' ? String(value) : value;
  if (typeof text === 'string' && /^[1-9]\d*$/.test(text)) {
    return Number(text);
  }
  return undefined;
}

export const Route = createFileRoute('/map')({
  component: MapRoute,
  validateSearch: (search: Record<string, unknown>): { brewery?: number } => ({
    brewery: parseBreweryId(search.brewery),
  }),
});

function MapRoute() {
  const { brewery } = Route.useSearch();

  return <MapPage breweryId={brewery} />;
}
