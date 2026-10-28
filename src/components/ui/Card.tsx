import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-xl border border-line bg-surface-1', className)}>{children}</section>;
}

export function CardHeader({ title, actions, subtitle }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink-1">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
