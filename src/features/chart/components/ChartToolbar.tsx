import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { RANGE_PRESETS, type RangePreset } from '@/lib/dates';
import type { Interval } from '@/types/api';
import type { ChartType } from './PriceChart';

interface Props {
  interval: Interval;
  onInterval: (i: Interval) => void;
  range: RangePreset;
  onRange: (r: RangePreset) => void;
  chartType: ChartType;
  onChartType: (t: ChartType) => void;
  view: 'chart' | 'table';
  onView: (v: 'chart' | 'table') => void;
}

const INTERVAL_OPTIONS = [
  { value: '1d', label: '1D', title: 'Daily' },
  { value: '1w', label: '1W', title: 'Weekly (aggregated from daily candles)' },
  { value: '1mo', label: '1M', title: 'Monthly (aggregated from daily candles)' },
] as const;

const RANGE_OPTIONS = RANGE_PRESETS.map((r) => ({ value: r, label: r === 'ALL' ? 'All' : r }));

export function ChartToolbar({ interval, onInterval, range, onRange, chartType, onChartType, view, onView }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl label="Interval" options={INTERVAL_OPTIONS} value={interval} onChange={onInterval} />
      <SegmentedControl label="Date range" options={RANGE_OPTIONS} value={range} onChange={onRange} />
      <SegmentedControl
        label="Chart type"
        options={[
          { value: 'candles', label: 'Candles' },
          { value: 'line', label: 'Line' },
        ]}
        value={chartType}
        onChange={onChartType}
      />
      <SegmentedControl
        label="View"
        options={[
          { value: 'chart', label: 'Chart' },
          { value: 'table', label: 'Table' },
        ]}
        value={view}
        onChange={onView}
      />
    </div>
  );
}
