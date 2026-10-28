/** URL for an instrument page. Symbols may contain '/', so they are encoded. */
export const instrumentPath = (symbol: string) => `/instrument/${encodeURIComponent(symbol.toUpperCase())}`;
