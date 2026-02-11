import { NoPrefetchLink as Link } from './NoPrefetchLink';

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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
          clipRule="evenodd"
        />
      </svg>
      {/* <span className="text-sm font-medium">マップで開く</span> */}
    </Link>
  );
}
