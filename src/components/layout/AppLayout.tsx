import { Link, Outlet, useLocation } from 'react-router';
import { ApiStatus } from '@/features/health/components/ApiStatus';
import { SymbolSearch } from '@/features/instruments/components/SymbolSearch';
import { SettingsMenu } from './SettingsMenu';

export function AppLayout() {
  const { pathname } = useLocation();
  const onHome = pathname === '/';
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-surface-1/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold text-ink-1">
            <img src="/favicon.svg" alt="" className="size-6" />
            <span className="hidden sm:inline">NEPSE Summary</span>
          </Link>
          {/* On phones the search gets its own full-width row below the logo and status. */}
          {!onHome && <SymbolSearch className="order-last basis-full sm:order-none sm:max-w-md sm:flex-1 sm:basis-auto" />}
          <div className="ml-auto flex items-center gap-2">
            <ApiStatus />
            <SettingsMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5">
        <Outlet />
      </main>
      <footer className="border-t border-line px-4 py-3 text-center text-[11px] text-ink-3">
        Data from the unofficial nepalstock.com.np web endpoints via nepse-api. Not investment advice. Charts by{' '}
        <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer" className="underline">TradingView Lightweight Charts</a>.
      </footer>
    </div>
  );
}
