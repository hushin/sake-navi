import { signIn } from '@/react-app/shared/api';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/react-app/shared/ui';

/** サインインを拒否したときの better-auth のエラーコード（worker 側と揃える） */
const ACCESS_DENIED_ERROR = 'access_denied';

export function SignInPage({ error }: { error?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          {/* CardTitle は div なので、ページ見出しとして h1 を中に置く */}
          <CardTitle>
            <h1 className="text-base font-semibold">サインイン</h1>
          </CardTitle>
          <CardDescription>
            Google アカウントでサインインします。許可されたアカウントだけが利用できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error === ACCESS_DENIED_ERROR ? (
            <p role="alert" className="text-sm text-destructive">
              この Google アカウントには利用が許可されていません。オーナーに追加を依頼してください。
            </p>
          ) : error ? (
            <p role="alert" className="text-sm text-destructive">
              サインインに失敗しました。もう一度お試しください。
            </p>
          ) : null}
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              void signIn.social({
                provider: 'google',
                callbackURL: '/map',
                errorCallbackURL: '/sign-in',
              });
            }}
          >
            Google でサインイン
          </Button>
          <p className="text-xs text-muted-foreground">
            参加するには、オーナーに Google アカウントの追加を依頼してください。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
