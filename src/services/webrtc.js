import { socket } from './socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const screenPeers = new Map();
const voicePeers = new Map();

let localScreenStream = null;
let localVoiceStream = null;

let onRemoteScreenCallback = null;
let onRemoteVoiceCallback = null;

export function getLocalStream() {
  return localScreenStream;
}

// 1. EKRAN / SEKME YAYINI PEER BAĞLANTISI
function createScreenPeer(targetId) {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc:signal', {
        targetId,
        payload: { type: 'screen-candidate', candidate: event.candidate }
      });
    }
  };

  pc.ontrack = (event) => {
    if (event.streams && event.streams[0] && onRemoteScreenCallback) {
      onRemoteScreenCallback(event.streams[0]);
    }
  };

  if (localScreenStream) {
    localScreenStream.getTracks().forEach((track) => pc.addTrack(track, localScreenStream));
  }

  screenPeers.set(targetId, pc);
  return pc;
}

export async function startScreenShare(onLocalStream, onRemoteStream) {
  localScreenStream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { max: 30 } },
    audio: true
  });

  onLocalStream(localScreenStream);
  onRemoteScreenCallback = onRemoteStream;

  localScreenStream.getVideoTracks()[0].onended = () => {
    stopScreenShare();
  };

  return localScreenStream;
}

export async function sendScreenOffer(targetId) {
  const pc = createScreenPeer(targetId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit('webrtc:signal', {
    targetId,
    payload: { type: 'screen-offer', sdp: offer }
  });
}

export function stopScreenShare() {
  if (localScreenStream) {
    localScreenStream.getTracks().forEach((t) => t.stop());
    localScreenStream = null;
  }
  screenPeers.forEach((pc) => pc.close());
  screenPeers.clear();
}

// 2. CANLI SESLİ SOHBET (VOICE CHAT) PEER BAĞLANTISI
function createVoicePeer(targetId) {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc:signal', {
        targetId,
        payload: { type: 'voice-candidate', candidate: event.candidate }
      });
    }
  };

  pc.ontrack = (event) => {
    if (event.streams && event.streams[0] && onRemoteVoiceCallback) {
      onRemoteVoiceCallback(targetId, event.streams[0]);
    }
  };

  if (localVoiceStream) {
    localVoiceStream.getTracks().forEach((track) => pc.addTrack(track, localVoiceStream));
  }

  voicePeers.set(targetId, pc);
  return pc;
}

export async function startVoiceChat(onLocalVoiceStream, onRemoteVoice) {
  localVoiceStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  onLocalVoiceStream(localVoiceStream);
  onRemoteVoiceCallback = onRemoteVoice;
  return localVoiceStream;
}

export async function sendVoiceOffer(targetId) {
  const pc = createVoicePeer(targetId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit('webrtc:signal', {
    targetId,
    payload: { type: 'voice-offer', sdp: offer }
  });
}

export function toggleVoiceMute(isMuted) {
  if (localVoiceStream) {
    localVoiceStream.getAudioTracks().forEach((t) => { t.enabled = !isMuted; });
  }
}

export function stopVoiceChat() {
  if (localVoiceStream) {
    localVoiceStream.getTracks().forEach((t) => t.stop());
    localVoiceStream = null;
  }
  voicePeers.forEach((pc) => pc.close());
  voicePeers.clear();
}

// 3. GELEN WEBRTC SİNYALLERİNİ YÖNLENDİRME
export async function handleSignal({ sender, payload }, onRemoteScreen, onRemoteVoice) {
  onRemoteScreenCallback = onRemoteScreen;
  onRemoteVoiceCallback = onRemoteVoice;

  // Ekran Sinyalleri
  if (payload.type === 'screen-offer') {
    let pc = screenPeers.get(sender);
    if (pc) pc.close();
    pc = createScreenPeer(sender);
    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('webrtc:signal', { targetId: sender, payload: { type: 'screen-answer', sdp: answer } });
  } else if (payload.type === 'screen-answer') {
    const pc = screenPeers.get(sender);
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
  } else if (payload.type === 'screen-candidate') {
    const pc = screenPeers.get(sender);
    if (pc && pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
  }

  // Ses Sinyalleri
  if (payload.type === 'voice-offer') {
    let pc = voicePeers.get(sender);
    if (pc) pc.close();
    pc = createVoicePeer(sender);
    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('webrtc:signal', { targetId: sender, payload: { type: 'voice-answer', sdp: answer } });
  } else if (payload.type === 'voice-answer') {
    const pc = voicePeers.get(sender);
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
  } else if (payload.type === 'voice-candidate') {
    const pc = voicePeers.get(sender);
    if (pc && pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
  }
}
// Yerel video dosyasının (MP4/MKV) akışını WebRTC üzerinden yayına bağlar
// Yerel video dosyasının (MP4/MKV) akışını WebRTC üzerinden yayına bağlar
export async function startLocalFileShare(fileStream, onLocalStream) {
  stopScreenShare();
  localScreenStream = fileStream;
  if (onLocalStream) onLocalStream(localScreenStream);
  return localScreenStream;
}
