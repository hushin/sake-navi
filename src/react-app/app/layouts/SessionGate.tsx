import type { AuthState } from '@/react-app/shared/api';
import { Button } from '@/react-app/shared/ui';
import type { ReactNode } from 'react';

/**
 * セッションが解決するまで中身を出さないゲート。
 *
 * route の `beforeLoad` は context の session を読むだけ（HTTP を待たない）ので、起動直後の
 * 「まだ分からない」状態はここで受け止める。取得に失敗したときは未認証と区別して再試行を出す。
 */
export function SessionGate({ auth, children }: { auth: AuthState; children: ReactNode }) {
  if (auth.isPending) {
    return (
      <div
        role="status"
        aria-label="読み込み中"
        className="flex min-h-screen items-center justify-center"
      >
        <div className="size-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  if (auth.error && !auth.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm font-medium">セッションを確認できませんでした</p>
        <Button variant="outline" size="sm" onClick={() => void auth.refetch()}>
          再試行
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
