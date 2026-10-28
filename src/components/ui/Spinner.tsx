import { cn } from '@/lib/cn';

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-block size-4 animate-spin rounded-full border-2 border-line border-t-accent', className)} />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-surface-2', className)} />;
}
