import { createFileRoute } from '@tanstack/react-router';
import { SakeListPage, type SakeListSearch } from '@/react-app/pages/sakes';

export const Route = createFileRoute('/sakes')({
  component: SakesRoute,
  validateSearch: (search: Record<string, unknown>): SakeListSearch => ({
    q: typeof search.q === 'string' && search.q.length > 0 ? search.q : undefined,
    category:
      typeof search.category === 'string' && search.category.length > 0
        ? search.category
        : undefined,
    hasPaidTasting: search.hasPaidTasting === 'true' || search.hasPaidTasting === true || undefined,
    needsPrice: search.needsPrice === 'true' || search.needsPrice === true || undefined,
  }),
});

function SakesRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <SakeListPage
      // 入力欄は非制御なので、URL の q が変わったら作り直す
      key={search.q ?? ''}
      search={search}
      onSearchChange={(next) => {
        void navigate({ to: '/sakes', search: next, replace: true });
      }}
    />
  );
}
