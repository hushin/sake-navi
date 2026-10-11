import { createFileRoute } from '@tanstack/react-router';
import { ReviewsPage, type ReviewListSearch } from '@/react-app/pages/reviews';
import { reviewSortSchema } from '@/shared/schemas/sake';

export const Route = createFileRoute('/reviews')({
  component: ReviewsRoute,
  validateSearch: (search: Record<string, unknown>): ReviewListSearch => {
    const sort = reviewSortSchema.safeParse(search.sort);

    return {
      // 「評価の高い酒を探す」導線なので、既定は評価順にする
      sort: sort.success ? sort.data : 'rating',
      tags: typeof search.tags === 'string' && search.tags.length > 0 ? search.tags : undefined,
      mine: search.mine === 'true' || search.mine === true || undefined,
    };
  },
});

function ReviewsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <ReviewsPage
      search={search}
      onSearchChange={(next) => {
        void navigate({ to: '/reviews', search: next, replace: true });
      }}
    />
  );
}
