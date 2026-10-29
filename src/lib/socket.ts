import { io, type Socket } from 'socket.io-client';
import { config } from '@/config/env';

let socket: Socket | undefined;

/**
 * The app's single Socket.IO connection to nepse-api, created on first use.
 * It reconnects on its own; features re-subscribe on every `connect` event.
 */
export function getSocket(): Socket {
  socket ??= io(config.socketUrl || undefined, { transports: ['websocket', 'polling'] });
  return socket;
}

/** Acknowledgement shape of every nepse-api socket request. */
export type SocketAck<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
