import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/Spinner';
import { PreferencesProvider } from '@/features/preferences/preferences-context';
import { createQueryClient } from '@/lib/query-client';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ErrorBoundary } from './ErrorBoundary';

// The instrument page carries the charting library; load it only when needed.
const InstrumentPage = lazy(() => import('@/pages/InstrumentPage').then((m) => ({ default: m.InstrumentPage })));

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PreferencesProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                {/* Splat route: symbols may contain '/' (e.g. NICD83/84). */}
                <Route
                  path="instrument/*"
                  element={
                    <Suspense fallback={<Skeleton className="h-[600px]" />}>
                      <InstrumentPage />
                    </Suspense>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </PreferencesProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
