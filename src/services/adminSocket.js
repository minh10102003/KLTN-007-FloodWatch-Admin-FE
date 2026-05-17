import { io } from 'socket.io-client';
import { API_CONFIG } from '../config/apiConfig';
import { getToken } from '../utils/auth';

/**
 * Bật socket khi:
 * - VITE_SOCKET_ENABLED=true, hoặc
 * - có VITE_SOCKET_URL / VITE_API_BASE_URL (production build), hoặc
 * - đang chạy `npm run dev` (trừ khi VITE_SOCKET_ENABLED=false)
 */
export function isAdminSocketEnabled() {
  const flag = import.meta.env.VITE_SOCKET_ENABLED;
  if (flag === 'false') return false;
  if (flag === 'true') return true;
  if (Boolean(import.meta.env.VITE_SOCKET_URL?.trim())) return true;
  if (Boolean(import.meta.env.VITE_API_BASE_URL?.trim())) return true;
  if (import.meta.env.DEV) return true;
  return false;
}

/** URL gốc (không namespace). Dev: cùng origin → Vite proxy /socket.io. */
export function getSocketBaseUrl() {
  if (!isAdminSocketEnabled()) return '';

  const fromEnv = import.meta.env.VITE_SOCKET_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return window.location.origin;
  }

  const api =
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    API_CONFIG.BASE_URL ||
    API_CONFIG.FALLBACK_BASE_URL ||
    '';
  if (!api) return '';
  try {
    const u = new URL(api.startsWith('http') ? api : `https://${api}`);
    return u.origin;
  } catch {
    return String(api).replace(/\/+$/, '');
  }
}

function getSocketNamespace() {
  const ns = import.meta.env.VITE_SOCKET_NAMESPACE?.trim();
  if (ns === '' || ns === '/') return '';
  if (ns?.startsWith('/')) return ns;
  return '/admin';
}

let socket = null;

function attachListeners(sock, onNotification) {
  sock.off('admin:notification');
  sock.on('admin:notification', (payload) => {
    onNotification(payload);
  });
}

function createSocket(url, token, onNotification) {
  const sock = io(url, {
    path: import.meta.env.VITE_SOCKET_PATH || '/socket.io',
    auth: { token },
    transports: ['polling', 'websocket'],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 10000,
    timeout: 15000,
    autoConnect: true,
  });

  attachListeners(sock, onNotification);
  return sock;
}

/**
 * @param {(payload: object) => void} onNotification
 * @returns {import('socket.io-client').Socket | null}
 */
export function connectAdminSocket(onNotification) {
  if (!isAdminSocketEnabled()) return null;

  const base = getSocketBaseUrl();
  const token = getToken();
  if (!base || !token) return null;

  const namespace = getSocketNamespace();
  const url = namespace ? `${base}${namespace}` : base;

  if (socket?.connected) {
    attachListeners(socket, onNotification);
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = createSocket(url, token, onNotification);
  return socket;
}

export function disconnectAdminSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/** Gọi sau login thành công hoặc khi token mới có. */
export function refreshAdminSocketConnection(onNotification) {
  disconnectAdminSocket();
  if (typeof onNotification === 'function') {
    return connectAdminSocket(onNotification);
  }
  return null;
}
