import { io } from 'socket.io-client';

// Canlıya aldığınızda backend URL'nizi buraya yazacaksınız:
const LIVE_SERVER_URL = 'https://peerora-server.onrender.com'; // Örnek Render/Railway backend linki

const SERVER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:4000'
  : LIVE_SERVER_URL;

export const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true
});