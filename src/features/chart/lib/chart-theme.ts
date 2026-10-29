/**
 * Chart colors. Canvas rendering can't read CSS variables, so the values are
 * mirrored from src/index.css.
 *
 * Validated with the data-viz palette checker (light surface #fcfcfb, dark #1a1a19):
 * - Overlay/indicator pair blue + orange passes every check in both modes.
 * - Conventional green/red candles FAIL colour-vision-deficiency separation
 *   (ΔE 4.1, deuteranopia). They are kept as the default because NEPSE users
 *   expect them (solid TradingView-style bodies); users who need it can switch
 *   to the "colour-blind safe" scheme, which uses
 *   blue/red, which passes (ΔE 21.6 light / 19.2 dark).
 */

export type ResolvedTheme = 'light' | 'dark';
export type CandleScheme = 'conventional' | 'colorblind';

export interface ChartColors {
  surface: string;
  text: string;
  textMuted: string;
  grid: string;
  border: string;
  crosshair: string;
  up: string;
  down: string;
  volume: string;
  series1: string;
  series2: string;
  reference: string;
}

const BASE: Record<ResolvedTheme, Omit<ChartColors, 'up' | 'down' | 'series1' | 'series2'>> = {
  light: {
    surface: '#fcfcfb',
    text: '#52514e',
    textMuted: '#75746f',
    grid: '#efeeea',
    border: '#e2e1dc',
    crosshair: '#75746f',
    volume: 'rgba(117, 116, 111, 0.45)',
    reference: '#b8b7b0',
  },
  dark: {
    surface: '#1a1a19',
    text: '#c3c2b7',
    textMuted: '#9a998f',
    grid: '#262624',
    border: '#383835',
    crosshair: '#9a998f',
    volume: 'rgba(154, 153, 143, 0.4)',
    reference: '#57564f',
  },
};

const SERIES: Record<ResolvedTheme, { series1: string; series2: string }> = {
  light: { series1: '#2a78d6', series2: '#eb6834' },
  dark: { series1: '#3987e5', series2: '#d95926' },
};

const CANDLES: Record<CandleScheme, Record<ResolvedTheme, { up: string; down: string }>> = {
  conventional: {
    light: { up: '#0ca30c', down: '#d03b3b' },
    dark: { up: '#0ca30c', down: '#d03b3b' },
  },
  colorblind: {
    light: { up: '#2a78d6', down: '#e34948' },
    dark: { up: '#3987e5', down: '#e66767' },
  },
};

export function chartColors(theme: ResolvedTheme, scheme: CandleScheme): ChartColors {
  return { ...BASE[theme], ...SERIES[theme], ...CANDLES[scheme][theme] };
}
