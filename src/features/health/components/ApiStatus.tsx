import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatAge, ageSince, formatInstantNpt } from '@/lib/format';
import { useHealth } from '../api';

/** Compact backend status for the header: API reachable, database up, last sync age. */
export function ApiStatus() {
  const { data, isLoading, isError } = useHealth();

  if (isLoading) return <StatusBadge status="neutral">Checking API…</StatusBadge>;
  if (isError || !data) {
    return <StatusBadge status="critical" title="Could not reach nepse-api">API offline</StatusBadge>;
  }
  if (data.database === 'down') {
    return <StatusBadge status="serious" title="nepse-api is running but cannot reach MySQL">Database down</StatusBadge>;
  }
  const lastSync = data.lastSuccessfulSyncAt;
  if (!lastSync) {
    return <StatusBadge status="warning" title="No successful sync yet. Run npm run sync in nepse-api.">Never synced</StatusBadge>;
  }
  const age = ageSince(lastSync);
  return (
    <StatusBadge status={age > 36 * 3600 ? 'warning' : 'good'} title={`Last successful sync: ${formatInstantNpt(lastSync)}`}>
      Synced {formatAge(age)}
    </StatusBadge>
  );
}
