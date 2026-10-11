import { createFileRoute } from '@tanstack/react-router';
import { SignInPage } from '@/react-app/pages/sign-in';

export const Route = createFileRoute('/sign-in')({
  component: SignInRoute,
  validateSearch: (search: Record<string, unknown>): { error?: string } => ({
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
});

function SignInRoute() {
  const { error } = Route.useSearch();

  return <SignInPage error={error} />;
}
