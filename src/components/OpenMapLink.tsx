import { NoPrefetchLink as Link } from './NoPrefetchLink';
import { MapPinIcon } from '@/components/icons';

type Props = {
  breweryId: number;
};

export function OpenMapLink({ breweryId }: Props): React.ReactElement {
  return (
    <Link
      href={`/map?brewery=${breweryId}`}
      className="flex items-center gap-2 p-2 -m-2 text-slate-600 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
      title="マップで開く"
    >
      <MapPinIcon />
      {/* <span className="text-sm font-medium">マップで開く</span> */}
    </Link>
  );
}
