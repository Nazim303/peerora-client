import { io } from 'socket.io-client';

const LIVE_SERVER_URL = 'https://peerora-server.onrender.com';

// Tarayıcıdaki geliştirme ortamı (Port 5173 vb.) haricinde mobilde her zaman canlı sunucuya bağlan
const isLocalViteDev = typeof window !== 'undefined' && 
  (window.location.port === '5173' || window.location.port === '4173');

const SERVER_URL = isLocalViteDev ? 'http://localhost:4000' : LIVE_SERVER_URL;

export const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true
});