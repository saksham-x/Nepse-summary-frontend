import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { usePreferences, type ThemePreference } from '@/features/preferences/preferences-context';
import type { CandleScheme } from '@/features/chart/lib/chart-theme';

/** Theme and candle-colour preferences, stored per browser. */
export function SettingsMenu() {
  const { theme, setTheme, candleScheme, setCandleScheme } = usePreferences();
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-ink-2 hover:text-ink-1 [&::-webkit-details-marker]:hidden">
        Settings
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-72 space-y-4 rounded-lg border border-line bg-surface-1 p-4 shadow-lg">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-ink-3">Theme</p>
          <SegmentedControl<ThemePreference>
            label="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-ink-3">Candle colours</p>
          <SegmentedControl<CandleScheme>
            label="Candle colours"
            value={candleScheme}
            onChange={setCandleScheme}
            options={[
              { value: 'conventional', label: 'Green / red' },
              { value: 'colorblind', label: 'Colour-blind safe', title: 'Blue / red' },
            ]}
          />
          <p className="text-[11px] leading-snug text-ink-3">
            Rising candles are always hollow and falling candles filled, so direction is readable without colour.
          </p>
        </div>
      </div>
    </details>
  );
}
