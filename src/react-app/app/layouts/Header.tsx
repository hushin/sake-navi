import { Link } from '@tanstack/react-router';
import { signOut, useSession } from '@/react-app/shared/api';
import { Button } from '@/react-app/shared/ui';

const navLinkClass =
  'relative flex h-14 items-center px-3 text-sm text-muted-foreground transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity hover:text-foreground data-[status=active]:text-foreground data-[status=active]:after:opacity-100';

export function Header() {
  const { data: session, isPending } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center gap-6 px-4">
        <Link to="/sakes" className="text-sm font-semibold tracking-tight">
          酒ナビ
        </Link>
        <nav className="flex items-center overflow-x-auto">
          <Link to="/map" className={navLinkClass}>
            マップ
          </Link>
          <Link to="/sakes" className={navLinkClass}>
            お酒
          </Link>
          <Link to="/timeline" className={navLinkClass}>
            タイムライン
          </Link>
          <Link to="/reviews" search={{ sort: 'rating' }} className={navLinkClass}>
            レビュー
          </Link>
          <Link to="/bookmarks" className={navLinkClass}>
            ブックマーク
          </Link>
          <Link to="/settings" className={navLinkClass}>
            メンバー
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {isPending ? null : session ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.user.nickname ?? session.user.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void signOut();
                }}
              >
                サインアウト
              </Button>
            </>
          ) : (
            <Button size="sm" render={<Link to="/sign-in" />}>
              サインイン
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
