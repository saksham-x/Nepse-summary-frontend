import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { INDICATOR_LABELS, validateSettings, type IndicatorSettings } from '../lib/indicators';

interface Props {
  value: IndicatorSettings;
  onChange: (s: IndicatorSettings) => void;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex items-center gap-1 text-xs text-ink-3">
      {label}
      <input
        type="number"
        min={1}
        max={500}
        step={1}
        value={Number.isNaN(value) ? '' : value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="w-14 rounded border border-line bg-surface-1 px-1.5 py-0.5 text-xs text-ink-1 focus:border-accent focus:outline-none"
      />
    </label>
  );
}

/**
 * Indicator toggles and periods. Edits stay local until they are valid, so
 * the API is never asked for impossible parameters.
 */
export function IndicatorSettingsPanel({ value, onChange }: Props) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const error = validateSettings(draft);

  const update = (next: IndicatorSettings) => {
    setDraft(next);
    if (validateSettings(next) === null) onChange(next);
  };

  const toggle = (key: keyof IndicatorSettings) => update({ ...draft, [key]: { ...draft[key], enabled: !draft[key].enabled } });

  const chip = (key: keyof IndicatorSettings) => (
    <button
      type="button"
      aria-pressed={draft[key].enabled}
      onClick={() => toggle(key)}
      className={cn(
        'rounded-md border px-2 py-0.5 text-xs font-medium',
        draft[key].enabled ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-2 hover:text-ink-1',
      )}
    >
      {INDICATOR_LABELS[key]}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <span className="text-xs font-medium text-ink-3">Indicators</span>
      {(['sma', 'ema', 'rsi'] as const).map((key) => (
        <div key={key} className="flex items-center gap-2">
          {chip(key)}
          {draft[key].enabled && (
            <NumberField label="period" value={draft[key].period} onChange={(period) => update({ ...draft, [key]: { ...draft[key], period } })} />
          )}
        </div>
      ))}
      <div className="flex items-center gap-2">
        {chip('macd')}
        {draft.macd.enabled && (
          <>
            <NumberField label="fast" value={draft.macd.fast} onChange={(fast) => update({ ...draft, macd: { ...draft.macd, fast } })} />
            <NumberField label="slow" value={draft.macd.slow} onChange={(slow) => update({ ...draft, macd: { ...draft.macd, slow } })} />
            <NumberField label="signal" value={draft.macd.signal} onChange={(signal) => update({ ...draft, macd: { ...draft.macd, signal } })} />
          </>
        )}
      </div>
      {error && <p role="alert" className="w-full text-xs text-ink-2"><span aria-hidden className="mr-1 font-bold text-critical">!</span>{error}</p>}
    </div>
  );
}
