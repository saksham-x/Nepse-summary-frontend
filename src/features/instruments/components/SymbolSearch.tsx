import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { instrumentPath } from '@/app/routes';
import { useInstrumentSearch } from '../api';

/** Combobox: type a symbol or company name, pick with mouse or arrow keys + Enter. */
export function SymbolSearch({ autoFocus, className }: { autoFocus?: boolean; className?: string }) {
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const term = useDebouncedValue(text, 200);
  const { data = [], isFetching, isError } = useInstrumentSearch(term, 8);
  const results = term.trim() ? data : [];

  const go = (symbol: string) => {
    setText('');
    setOpen(false);
    inputRef.current?.blur();
    navigate(instrumentPath(symbol));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const pick = results[active] ?? results[0];
      if (pick) go(pick.symbol);
      else if (text.trim()) go(text.trim().toUpperCase());
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && text.trim().length > 0;

  return (
    <div className={cn('relative', className)}>
      <label htmlFor={`${listId}-input`} className="sr-only">Search symbol or company</label>
      <input
        id={`${listId}-input`}
        ref={inputRef}
        autoFocus={autoFocus}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
        placeholder="Search symbol or company, e.g. NABIL"
        autoComplete="off"
        spellCheck={false}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className="w-full rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm text-ink-1 placeholder:text-ink-3 focus:border-accent focus:outline-none"
      />
      {isFetching && text && <Spinner className="absolute top-2.5 right-3" label="Searching" />}
      {showList && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-line bg-surface-1 py-1 shadow-lg">
          {isError && <li className="px-3 py-2 text-sm text-ink-2">Search is unavailable — is nepse-api running?</li>}
          {!isError && results.length === 0 && !isFetching && term === text && (
            <li className="px-3 py-2 text-sm text-ink-2">No matching instruments</li>
          )}
          {results.map((r, i) => (
            <li
              key={r.symbol}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(r.symbol)}
              onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-baseline gap-3 px-3 py-2', i === active && 'bg-surface-2')}
            >
              <span className="w-28 shrink-0 font-mono text-sm font-semibold text-ink-1">{r.symbol}</span>
              <span className="truncate text-sm text-ink-2">{r.name ?? 'Name not synced yet'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
