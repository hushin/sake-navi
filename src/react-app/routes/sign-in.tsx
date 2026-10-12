import { createFileRoute } from '@tanstack/react-router';
import { SignInPage } from '@/react-app/pages/sign-in';
import { z } from 'zod';

export const Route = createFileRoute('/sign-in')({
  component: SignInRoute,
  // zod v4 はスキーマをそのまま渡せる。空の `?error=` は undefined に正規化して URL から消す
  validateSearch: z.object({
    error: z.string().min(1).optional().catch(undefined),
  }),
});

function SignInRoute() {
  const { error } = Route.useSearch();

  return <SignInPage error={error} />;
}
