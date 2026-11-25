import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { describeError } from '@/lib/error-messages';
import { cn } from '@/lib/cn';

const control = 'w-full rounded-md border border-line bg-surface-1 px-2.5 py-1.5 text-sm text-ink-1 placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60';

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1', className)}>
      <span className="text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-ink-3">{hint}</span>}
    </label>
  );
}

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={cn(control, className)} />;
export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={cn(control, className)} />;
export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className={cn(control, 'min-h-20', className)} />;

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:opacity-90',
  secondary: 'border border-line bg-surface-1 text-ink-1 hover:bg-surface-2',
  danger: 'border border-critical text-critical hover:bg-critical hover:text-white',
  ghost: 'text-ink-2 hover:text-ink-1 hover:bg-surface-2',
};

export function Button({ variant = 'primary', busy, className, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || busy}
      className={cn('inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50', VARIANT[variant], className)}
    >
      {busy && <span aria-hidden className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

/** Inline error from a failed mutation. */
export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  const { title, description } = describeError(error);
  return (
    <p role="alert" className="rounded-md border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-ink-1">
      <span className="font-semibold">{title}.</span> {description}
    </p>
  );
}

export function Notice({ children, tone = 'good' }: { children: ReactNode; tone?: 'good' | 'warning' }) {
  return (
    <p role="status" className={cn('rounded-md border px-3 py-2 text-sm text-ink-1', tone === 'good' ? 'border-good/40 bg-good/10' : 'border-warning/50 bg-warning/10')}>
      {children}
    </p>
  );
}
