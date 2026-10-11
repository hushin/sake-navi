import { createFileRoute } from '@tanstack/react-router';
import { TimelinePage } from '@/react-app/pages/timeline';

export const Route = createFileRoute('/timeline')({
  component: TimelinePage,
});
