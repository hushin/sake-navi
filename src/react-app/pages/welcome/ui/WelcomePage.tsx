import { useState } from 'react';
import { authClient, useSession } from '@/react-app/shared/api';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/react-app/shared/ui';
import { NICKNAME_MAX_LENGTH, profileInputSchema } from '@/shared/schemas/profile';

/**
 * 初回サインイン後にニックネームを決める画面。
 * 以降はレビューやタイムラインにこの名前が出る（Google のアカウント名は使わない）。
 *
 * 入力欄は毎回空から始める（初回の登録と、あとからの変更の両方で使うため）。
 * いまの表示名はセッションから読んで参考表示する。
 */
export function WelcomePage({ onSaved }: { onSaved: () => void }) {
  const { data: session } = useSession();
  const [nickname, setNickname] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const currentNickname = session?.user.nickname;

  const save = async (value: string) => {
    setIsSaving(true);
    setErrorMessage('');

    const { error } = await authClient.updateUser({ nickname: value });

    setIsSaving(false);
    if (error) {
      setErrorMessage(error.message ?? 'ニックネームを登録できませんでした');
      return;
    }

    onSaved();
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          {/* CardTitle は div なので、ページ見出しとして h1 を中に置く */}
          <CardTitle>
            <h1 className="text-base font-semibold">
              {currentNickname ? 'ニックネームを変更' : 'ニックネームを決める'}
            </h1>
          </CardTitle>
          <CardDescription>
            レビューやタイムラインに表示される名前です。あとから変更できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            // 検証は shared の zod スキーマで行う
            noValidate
            onSubmit={(event) => {
              event.preventDefault();

              const parsed = profileInputSchema.safeParse({ nickname });
              if (!parsed.success) {
                setErrorMessage(
                  parsed.error.issues[0]?.message ?? 'ニックネームを確認してください',
                );
                return;
              }

              void save(parsed.data.nickname);
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="nickname">ニックネーム</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                maxLength={NICKNAME_MAX_LENGTH}
                placeholder="たろう"
                aria-invalid={errorMessage.length > 0 || undefined}
              />
              {currentNickname && (
                <p className="text-xs text-muted-foreground">いまの表示名: {currentNickname}</p>
              )}
              {errorMessage.length > 0 && (
                <p role="alert" className="text-sm text-destructive">
                  {errorMessage}
                </p>
              )}
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={isSaving}>
              {isSaving ? '保存中…' : '保存する'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
