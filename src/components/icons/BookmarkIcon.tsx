import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;

export function BookmarkIcon({ className = 'h-5 w-5', ...props }: Props): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      {...props}
    >
      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
    </svg>
  );
}
