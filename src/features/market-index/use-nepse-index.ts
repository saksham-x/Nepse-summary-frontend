import { useEffect, useState } from 'react';
import { getSocket, type SocketAck } from '@/lib/socket';
import { applyIndexUpdate, type IndexState, type IndexUpdate } from './lib';

export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'error';

/**
 * Live NEPSE Index over Socket.IO: the session so far on subscribe, then one
 * pushed update per server poll (every 10 s while the market is open).
 * Re-subscribes after every reconnect and unsubscribes on unmount.
 */
export function useNepseIndex() {
  const [state, setState] = useState<IndexState>({ snapshot: null, points: [] });
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    let active = true;

    const subscribe = async () => {
      try {
        const res = (await socket.timeout(10_000).emitWithAck('index:subscribe', {})) as SocketAck<IndexState>;
        if (!active) return;
        if (res.ok) {
          // Keep what we have if the server restarted and has nothing yet.
          setState((prev) => (res.data.snapshot || prev.snapshot === null ? res.data : prev));
          setStatus('live');
          setError(null);
        } else {
          setStatus('error');
          setError(res.error.message);
        }
      } catch {
        if (!active) return;
        setStatus(socket.connected ? 'error' : 'reconnecting');
        setError('The server did not answer the live subscription. Is nepse-api up to date?');
      }
    };
    const onUpdate = (update: IndexUpdate) => setState((prev) => applyIndexUpdate(prev, update));
    const onDisconnect = () => setStatus('reconnecting');
    const onConnectError = () => setStatus((s) => (s === 'connecting' ? 'connecting' : 'reconnecting'));

    socket.on('connect', subscribe);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('index', onUpdate);
    if (socket.connected) void subscribe();

    return () => {
      active = false;
      socket.off('connect', subscribe);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('index', onUpdate);
      socket.emit('index:unsubscribe', {}, () => undefined);
    };
  }, []);

  return { ...state, status, error };
}
