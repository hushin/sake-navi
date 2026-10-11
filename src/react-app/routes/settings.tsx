import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/react-app/pages/settings';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});
