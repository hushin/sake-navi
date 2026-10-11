import { createFileRoute } from '@tanstack/react-router';
import { BookmarksPage } from '@/react-app/pages/bookmarks';

export const Route = createFileRoute('/bookmarks')({
  component: BookmarksPage,
});
