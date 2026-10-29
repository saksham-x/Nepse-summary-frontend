const positiveInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export const config = {
  /** Base URL of nepse-api's versioned API, without a trailing slash. */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, ''),
  quotePollMs: positiveInt(import.meta.env.VITE_QUOTE_POLL_MS, 60_000),
  /** Socket.IO server origin; empty means this site's origin (the dev/preview proxy forwards /socket.io). */
  socketUrl: (import.meta.env.VITE_SOCKET_URL || '').replace(/\/+$/, ''),
  /** Candles per page; the backend allows up to 1000. */
  candlePageSize: 500,
} as const;
