import { createFileRoute } from '@tanstack/react-router';
import { WelcomePage } from '@/react-app/pages/welcome';

export const Route = createFileRoute('/welcome')({
  component: WelcomeRoute,
});

function WelcomeRoute() {
  const navigate = Route.useNavigate();

  return (
    <WelcomePage
      onSaved={() => {
        void navigate({ to: '/map' });
      }}
    />
  );
}
