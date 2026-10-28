import type { ReactNode } from 'react';
import { describeError } from '@/lib/error-messages';
import { ApiError } from '@/lib/api-client';

export function ErrorState({ error, onRetry, compact }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  const { title, description } = describeError(error);
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return (
    <div role="alert" className={compact ? 'p-3' : 'flex flex-col items-center px-6 py-10 text-center'}>
      <p className="text-sm font-semibold text-ink-1">
        <span aria-hidden className="mr-1.5 inline-grid size-4 place-items-center rounded-full bg-critical text-[10px] font-bold text-white">✕</span>
        {title}
      </p>
      <p className="mt-1 max-w-prose text-sm text-ink-2">{description}</p>
      {requestId && <p className="mt-1 font-mono text-[11px] text-ink-3">Request ID: {requestId}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-1 hover:bg-surface-2">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <p className="text-sm font-semibold text-ink-1">{title}</p>
      {children && <div className="mt-1 max-w-prose text-sm text-ink-2">{children}</div>}
    </div>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em] text-ink-1">{children}</code>;
}
