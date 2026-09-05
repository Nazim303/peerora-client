import { io } from 'socket.io-client';

const LIVE_SERVER_URL = 'https://peerora-server.onrender.com';

const isLocalViteDev = typeof window !== 'undefined' && 
  (window.location.port === '5173' || window.location.port === '4173');

export const SERVER_URL = isLocalViteDev ? 'http://localhost:4000' : LIVE_SERVER_URL;

// Sayfa açılır açılmaz Render'ı uyku modundan çıkarmak için arka planda hızlı ping at
if (typeof window !== 'undefined') {
  fetch(`${SERVER_URL}/ping`).catch(() => {});
}

export const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 3000,
  timeout: 10000
});