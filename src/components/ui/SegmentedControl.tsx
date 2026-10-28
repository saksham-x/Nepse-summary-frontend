import { cn } from '@/lib/cn';

interface Option<T extends string> {
  value: T;
  label: string;
  title?: string;
}

interface Props<T extends string> {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

/** A single-choice button group (radio semantics). */
export function SegmentedControl<T extends string>({ label, options, value, onChange, size = 'sm' }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              active ? 'bg-surface-1 text-ink-1 shadow-sm' : 'text-ink-2 hover:text-ink-1',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
