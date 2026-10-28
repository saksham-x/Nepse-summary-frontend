import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Status = 'good' | 'warning' | 'serious' | 'critical' | 'neutral';

const DOT: Record<Status, string> = {
  good: 'bg-good',
  warning: 'bg-warning',
  serious: 'bg-serious',
  critical: 'bg-critical',
  neutral: 'bg-ink-3',
};

const ICON: Record<Status, string> = {
  good: '✓',
  warning: '!',
  serious: '!',
  critical: '✕',
  neutral: '•',
};

/** Status is always shown as icon + label; the color is never the only signal. */
export function StatusBadge({ status, children, title }: { status: Status; children: ReactNode; title?: string }) {
  return (
    <span title={title} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-2">
      <span
        aria-hidden
        className={cn(
          'grid size-3.5 place-items-center rounded-full text-[9px] font-bold leading-none',
          status === 'warning' ? 'text-black' : 'text-white',
          DOT[status],
        )}
      >
        {ICON[status]}
      </span>
      {children}
    </span>
  );
}
