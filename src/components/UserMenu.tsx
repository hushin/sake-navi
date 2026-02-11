'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { NoPrefetchLink as Link } from '@/components/NoPrefetchLink';
import {
  UserIcon,
  BookmarkIcon,
  StarIcon,
  ClockIcon,
  SearchIcon,
  LogoutIcon,
} from '@/components/icons';
import { getAuth, clearAuth } from '@/lib/auth';

/**
 * ユーザーメニューコンポーネント
 * - 画面右上にアバターアイコンを表示
 * - クリックでメニューを開く
 * - ユーザー名とログアウトボタンを表示
 */
export function UserMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const auth = getAuth();
    if (auth) {
      setUserName(auth.userName);
    }
  }, []);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    clearAuth();
    router.push('/');
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* アバターアイコン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-teal-600 cursor-pointer text-white font-semibold flex items-center justify-center hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
        aria-label="ユーザーメニュー"
      >
        <UserIcon />
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* ユーザー名表示 */}
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm text-gray-500">ログイン中</p>
            <p className="font-semibold text-gray-900 truncate">{userName}</p>
          </div>

          {/* ブックマーク */}
          <Link
            href="/bookmarks"
            onClick={() => setIsOpen(false)}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <BookmarkIcon />
            ブックマーク
          </Link>

          {/* レビュー一覧 */}
          <Link
            href="/reviews"
            onClick={() => setIsOpen(false)}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <StarIcon />
            レビュー一覧
          </Link>

          {/* タイムライン */}
          <Link
            href="/timeline"
            onClick={() => setIsOpen(false)}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <ClockIcon />
            タイムライン
          </Link>

          {/* お酒検索 */}
          <Link
            href="/search"
            onClick={() => setIsOpen(false)}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <SearchIcon />
            お酒検索
          </Link>
          {/* ログアウトボタン */}
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <LogoutIcon />
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}
