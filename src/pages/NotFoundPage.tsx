import { Link } from 'react-router';
import { EmptyState } from '@/components/ui/States';

export function NotFoundPage() {
  return (
    <EmptyState title="Page not found">
      <Link to="/" className="text-accent underline">Go to the instrument list</Link>
    </EmptyState>
  );
}
