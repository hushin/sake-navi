import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { WelcomePage } from '@/react-app/pages/welcome';
import { useSession } from '@/react-app/shared/api';

export const Route = createFileRoute('/welcome')({
  component: WelcomeRoute,
});

function WelcomeRoute() {
  const navigate = Route.useNavigate();
  const { data: session } = useSession();
  const [isSaved, setIsSaved] = useState(false);
  const nickname = session?.user.nickname;

  // 遷移は「保存した」ではなく「ストアが新しいセッションに追いついた」を合図にする。
  // `WelcomePage` が await している refetch は、`updateUser` の直後に better-auth 自身が
  // 走らせる再取得に abort されて、更新前の値のまま返ることがある。その状態で /map へ進むと
  // beforeLoad のガード（ニックネーム未登録）に弾かれて /welcome に戻ってしまう
  useEffect(() => {
    if (isSaved && nickname) {
      void navigate({ to: '/map' });
    }
  }, [isSaved, nickname, navigate]);

  return <WelcomePage onSaved={() => setIsSaved(true)} />;
}
