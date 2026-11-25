import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/Spinner';
import { AccountPreferencesSync } from '@/features/auth/api';
import { RequireAuth } from '@/features/auth/components';
import { LanguageProvider } from '@/features/i18n/i18n';
import { PreferencesProvider } from '@/features/preferences/preferences-context';
import { createQueryClient } from '@/lib/query-client';
import { LoginPage, RegisterPage } from '@/pages/AuthPages';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ErrorBoundary } from './ErrorBoundary';

// The instrument page carries the charting library; load it only when needed.
const InstrumentPage = lazy(() => import('@/pages/InstrumentPage').then((m) => ({ default: m.InstrumentPage })));

// Member area and platform admin: separate chunks, so the public site stays light.
const member = () => import('@/pages/member/member-routes');
const MemberHomePage = lazy(() => member().then((m) => ({ default: m.MemberHomePage })));
const PortfolioLayout = lazy(() => member().then((m) => ({ default: m.PortfolioLayout })));
const OverviewTab = lazy(() => member().then((m) => ({ default: m.OverviewTab })));
const DepositTab = lazy(() => member().then((m) => ({ default: m.DepositTab })));
const ContributionsTab = lazy(() => member().then((m) => ({ default: m.ContributionsTab })));
const HoldingsTab = lazy(() => member().then((m) => ({ default: m.HoldingsTab })));
const HoldingDetailPage = lazy(() => member().then((m) => ({ default: m.HoldingDetailPage })));
const ActivityTab = lazy(() => member().then((m) => ({ default: m.ActivityTab })));
const StatementsTab = lazy(() => member().then((m) => ({ default: m.StatementsTab })));
const ExitTab = lazy(() => member().then((m) => ({ default: m.ExitTab })));
const MembersTab = lazy(() => member().then((m) => ({ default: m.MembersTab })));
const SettingsPage = lazy(() => member().then((m) => ({ default: m.SettingsPage })));

const platform = () => import('@/pages/platform/PlatformPages');
const PlatformLayout = lazy(() => platform().then((m) => ({ default: m.PlatformLayout })));
const PlatformOverview = lazy(() => platform().then((m) => ({ default: m.PlatformOverview })));
const PlatformUsers = lazy(() => platform().then((m) => ({ default: m.PlatformUsers })));
const PlatformPortfolios = lazy(() => platform().then((m) => ({ default: m.PlatformPortfolios })));
const PlatformPrices = lazy(() => platform().then((m) => ({ default: m.PlatformPrices })));
const PlatformReports = lazy(() => platform().then((m) => ({ default: m.PlatformReports })));
const PlatformAudit = lazy(() => platform().then((m) => ({ default: m.PlatformAudit })));
const PlatformBilling = lazy(() => platform().then((m) => ({ default: m.PlatformBilling })));

const lazyPage = (node: ReactNode, height = 'h-[600px]') => <Suspense fallback={<Skeleton className={height} />}>{node}</Suspense>;
const authed = (node: ReactNode) => <RequireAuth>{lazyPage(node)}</RequireAuth>;

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PreferencesProvider>
          <LanguageProvider>
            <AccountPreferencesSync />
            <BrowserRouter>
              <Routes>
                <Route element={<AppLayout />}>
                  {/* Public market data */}
                  <Route index element={<HomePage />} />
                  {/* Splat route: symbols may contain '/' (e.g. NICD83/84). */}
                  <Route path="instrument/*" element={lazyPage(<InstrumentPage />)} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="register" element={<RegisterPage />} />

                  {/* Member area */}
                  <Route path="app">
                    <Route index element={authed(<MemberHomePage />)} />
                    <Route path="settings" element={authed(<SettingsPage />)} />
                    <Route path="portfolios/:portfolioId" element={authed(<PortfolioLayout />)}>
                      <Route index element={lazyPage(<OverviewTab />, 'h-64')} />
                      <Route path="deposit" element={lazyPage(<DepositTab />, 'h-64')} />
                      <Route path="contributions" element={lazyPage(<ContributionsTab />, 'h-64')} />
                      <Route path="holdings" element={lazyPage(<HoldingsTab />, 'h-64')} />
                      <Route path="holdings/:holdingId" element={lazyPage(<HoldingDetailPage />, 'h-64')} />
                      <Route path="activity" element={lazyPage(<ActivityTab />, 'h-64')} />
                      <Route path="statements" element={lazyPage(<StatementsTab />, 'h-64')} />
                      <Route path="exit" element={lazyPage(<ExitTab />, 'h-64')} />
                      <Route path="members" element={lazyPage(<MembersTab />, 'h-64')} />
                    </Route>
                  </Route>

                  {/* Platform admin (role + "Sign in as admin") */}
                  <Route path="platform-admin" element={authed(<PlatformLayout />)}>
                    <Route index element={lazyPage(<PlatformOverview />, 'h-48')} />
                    <Route path="users" element={lazyPage(<PlatformUsers />, 'h-48')} />
                    <Route path="portfolios" element={lazyPage(<PlatformPortfolios />, 'h-48')} />
                    <Route path="prices" element={lazyPage(<PlatformPrices />, 'h-48')} />
                    <Route path="reports" element={lazyPage(<PlatformReports />, 'h-48')} />
                    <Route path="audit" element={lazyPage(<PlatformAudit />, 'h-48')} />
                    <Route path="billing" element={lazyPage(<PlatformBilling />, 'h-48')} />
                  </Route>

                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </LanguageProvider>
        </PreferencesProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
