import { Link } from '@tanstack/react-router';
import { Bookmark, Clock, Map as MapIcon, Menu, Star, Users, Wine, X } from 'lucide-react';
import { useState } from 'react';
import { signOut, useSession } from '@/react-app/shared/api';
import { Button } from '@/react-app/shared/ui';

const navLinkClass =
  'relative flex h-14 items-center px-3 text-sm text-muted-foreground transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity hover:text-foreground data-[status=active]:text-foreground data-[status=active]:after:opacity-100';

/** モバイルのメニュー。指で押しやすい高さ（44px）を確保する */
const menuLinkClass =
  'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-muted data-[status=active]:text-foreground';

export function Header() {
  const { data: session, isPending } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // メニューの行き先を押したら閉じる（画面が変わっても開きっぱなしにしない）
  const closeMenu = () => setIsMenuOpen(false);

  const displayName = session?.user.nickname ?? session?.user.name;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center gap-4 px-4 md:gap-6">
        <Link to="/map" className="shrink-0 text-sm font-semibold tracking-tight">
          酒ナビ
        </Link>

        {/* デスクトップは全項目を並べる。狭い間はメニューボタンに畳む */}
        <nav className="hidden items-center overflow-x-auto md:flex">
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

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {isPending ? null : session ? (
            <>
              <span className="hidden max-w-40 truncate text-sm text-muted-foreground md:inline">
                {displayName}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="hidden md:inline-flex"
                onClick={() => {
                  void signOut();
                }}
              >
                サインアウト
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-expanded={isMenuOpen}
                aria-controls="mobile-nav"
                aria-label={isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
                onClick={() => setIsMenuOpen((open) => !open)}
              >
                {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
              </Button>
            </>
          ) : (
            <Button size="sm" render={<Link to="/sign-in" />}>
              サインイン
            </Button>
          )}
        </div>
      </div>

      {isMenuOpen && session && (
        <nav
          id="mobile-nav"
          aria-label="メインメニュー"
          className="flex flex-col gap-0.5 border-t border-border/70 px-3 py-2 md:hidden"
        >
          <Link to="/map" className={menuLinkClass} onClick={closeMenu}>
            <MapIcon aria-hidden="true" />
            マップ
          </Link>
          <Link to="/sakes" className={menuLinkClass} onClick={closeMenu}>
            <Wine aria-hidden="true" />
            お酒
          </Link>
          <Link to="/timeline" className={menuLinkClass} onClick={closeMenu}>
            <Clock aria-hidden="true" />
            タイムライン
          </Link>
          <Link
            to="/reviews"
            search={{ sort: 'rating' }}
            className={menuLinkClass}
            onClick={closeMenu}
          >
            <Star aria-hidden="true" />
            レビュー
          </Link>
          <Link to="/bookmarks" className={menuLinkClass} onClick={closeMenu}>
            <Bookmark aria-hidden="true" />
            ブックマーク
          </Link>
          <Link to="/settings" className={menuLinkClass} onClick={closeMenu}>
            <Users aria-hidden="true" />
            メンバー
          </Link>
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-border/70 px-3 pt-3">
            <span className="truncate text-sm text-muted-foreground">{displayName}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                closeMenu();
                void signOut();
              }}
            >
              サインアウト
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
