import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { InferResponseType } from 'hono/client';
import { useState } from 'react';
import { client, throwApiError, useSession } from '@/react-app/shared/api';
import { formatJstDateTime } from '@/react-app/shared/lib';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
} from '@/react-app/shared/ui';
import { memberEmailSchema } from '@/shared/schemas/member';

type MembersResponse = InferResponseType<(typeof client.api.members)['$get'], 200>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const membersQuery = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const res = await client.api.members.$get();
      if (!res.ok) {
        throwApiError(res, 'メンバーを取得できませんでした');
      }
      return res.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['members'] });

  const addMutation = useMutation({
    mutationFn: async (value: string) => {
      const res = await client.api.members.$post({ json: { email: value } });
      if (res.status === 409) {
        throw new Error('このアカウントはすでに追加されています');
      }
      if (!res.ok) {
        throwApiError(res, 'メンバーを追加できませんでした');
      }
      return res.json();
    },
    onSuccess: () => {
      setEmail('');
      void invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (value: string) => {
      const res = await client.api.members[':email'].$delete({ param: { email: value } });
      if (!res.ok) {
        throwApiError(res, '招待を取り消せませんでした');
      }
      return res.json();
    },
    onSuccess: () => {
      void invalidate();
    },
  });

  const data: MembersResponse | undefined = membersQuery.data;
  const canManage = data?.canManage ?? false;
  // 自分のロールはサーバが返すメンバー一覧から取る
  // （セッションの型に additionalFields を載せる設定をしていないため）
  const me = data?.members.find((member) => member.id === session?.user.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">メンバー</h1>
        <p className="text-sm text-muted-foreground">
          このアプリを使える Google アカウントの一覧です。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-base font-semibold">自分のアカウント</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p className="text-sm font-medium">{session?.user.nickname ?? session?.user.name}</p>
          <p className="text-sm text-muted-foreground">{session?.user.email}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {me?.role === 'owner' ? 'オーナーとしてサインイン中' : 'メンバーとしてサインイン中'}
          </p>
          <div className="mt-3">
            <Button variant="outline" size="sm" render={<Link to="/welcome" />}>
              ニックネームを変更
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-base font-semibold">参加メンバー</h2>
          </CardTitle>
          <CardDescription>サインイン済みのアカウントです。</CardDescription>
        </CardHeader>
        <CardContent>
          {membersQuery.isPending ? (
            <p role="status" aria-label="読み込み中" className="text-sm text-muted-foreground">
              読み込み中…
            </p>
          ) : membersQuery.isError ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-destructive">
                {errorMessage(membersQuery.error) || 'メンバーを取得できませんでした'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void membersQuery.refetch()}
                disabled={membersQuery.isFetching}
              >
                再試行
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data?.members.map((member) => (
                <li key={member.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{member.nickname ?? member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <div className="ml-auto shrink-0">
                    <RoleBadge role={member.role} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-base font-semibold">招待（許可する Google アカウント）</h2>
          </CardTitle>
          <CardDescription>
            ここに追加した Google アカウントがサインインできるようになります。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canManage ? (
            <form
              className="flex flex-col gap-2"
              // 検証は shared の zod スキーマで行うので、ブラウザ標準の検証は切る
              // （type="email" はモバイルのキーボードのために残す）
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                const parsed = memberEmailSchema.safeParse({ email });
                if (!parsed.success) {
                  setEmailError(
                    parsed.error.issues[0]?.message ?? 'メールアドレスを確認してください',
                  );
                  return;
                }
                setEmailError('');
                addMutation.mutate(parsed.data.email);
              }}
            >
              <Label htmlFor="member-email">Google アカウントのメールアドレス</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="friend@example.com"
                  aria-invalid={emailError.length > 0 || undefined}
                  className="h-9"
                />
                <Button type="submit" size="lg" disabled={addMutation.isPending}>
                  {addMutation.isPending ? '追加中…' : '追加'}
                </Button>
              </div>
              {emailError.length > 0 && <p className="text-sm text-destructive">{emailError}</p>}
              {addMutation.isError && (
                <p className="text-sm text-destructive">{errorMessage(addMutation.error)}</p>
              )}
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              メンバーの追加・削除はオーナーだけができます。
            </p>
          )}

          {data && data.invitations.length > 0 && (
            <>
              <Separator />
              <ul className="flex flex-col divide-y divide-border">
                {data.invitations.map((invitation) => (
                  <li key={invitation.email} className="flex items-center gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{invitation.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatJstDateTime(invitation.createdAt)} に追加
                      </p>
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto shrink-0 hover:bg-destructive/10 hover:text-destructive"
                        disabled={removeMutation.isPending}
                        aria-label={`${invitation.email} の招待を取り消す`}
                        onClick={() => removeMutation.mutate(invitation.email)}
                      >
                        取り消す
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {removeMutation.isError && (
                <p className="text-sm text-destructive">{errorMessage(removeMutation.error)}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RoleBadge({ role }: { role: string | undefined }) {
  if (role === 'owner') {
    return <Badge>オーナー</Badge>;
  }
  return <Badge variant="secondary">メンバー</Badge>;
}
