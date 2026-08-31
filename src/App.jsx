import React, { useState, useEffect, useRef } from 'react';
import { socket } from './services/socket';
import { 
  startScreenShare, 
  handleSignal, 
  stopScreenShare, 
  sendScreenOffer, 
  getLocalStream,
  startVoiceChat,
  sendVoiceOffer,
  toggleVoiceMute,
  stopVoiceChat
} from './services/webrtc';
import { attachAudioVolumeMonitor } from './services/audioVisualizer';
import VideoPlayer from './components/VideoPlayer';
import ChatOverlay from './components/ChatOverlay';
import PlaylistModal from './components/PlaylistModal';
import SettingsModal from './components/SettingsModal';
import PollModal from './components/PollModal';
import UserListModal from './components/UserListModal';
import AboutModal from './components/AboutModal';
import { THEMES } from './themeConfig';
import { 
  Radio, MonitorPlay, Square, Link2, Tv, Copy, Check, LogOut, 
  ListMusic, Crown, Settings, Users, BarChart2, Mic, MicOff, Dices, 
  History, Play, Compass, Sparkles, Globe, Lock, Film, Flame, Star, Shuffle, Info
} from 'lucide-react';
import './App.css';

const AVATAR_LIST = ['🐱', '🐶', '🦊', '🐼', '🦁', '🤖', '👾', '🦄', '🐲', '🧙‍♂️', '🥷', '🧑‍🚀', '🧛', '👑', '⭐'];

// Hazır Parti Şablonları
const PARTY_PRESETS = [
  {
    id: 'cinema',
    name: '🎬 Sinema Gecesi',
    theme: 'frutiger_aero',
    maxUsers: 6,
    media: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    title: '🍿 Sinema & Film Partisi'
  },
  {
    id: 'anime',
    name: '✨ Anime & Dizi',
    theme: 'cyberpunk',
    maxUsers: 10,
    media: 'https://www.youtube.com/watch?v=kXYiU_JCYtU',
    title: '🎌 Anime & Dizi Maratonu'
  },
  {
    id: 'lofi',
    name: '🎧 Lo-Fi & Chill',
    theme: 'vaporwave',
    maxUsers: 8,
    media: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    title: '☕ Chill Lo-Fi Dinleme Odası'
  }
];

// Günün Özel Medya Havuzu
const DAILY_SPECIAL_MEDIA = [
  {
    id: 'sp-1',
    title: 'Lofi Girl - Synthwave & Chill Beats',
    tag: 'Canlı Müzik / Odak',
    desc: 'Birlikte ders çalışmak veya arka planda rahatlatıcı müzik dinlemek için 7/24 kesintisiz Lo-Fi akışı.',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    theme: 'vaporwave',
    presetName: 'Lo-Fi Chill Gecesi'
  },
  {
    id: 'sp-2',
    title: 'Big Buck Bunny (4K Açık Kaynak Film)',
    tag: 'Animasyon / Komedi',
    desc: 'Blender Vakfı tarafından hazırlanan eğlenceli ve yüksek kaliteli kült 3D animasyon klasiği.',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    theme: 'frutiger_aero',
    presetName: 'Animasyon Sinema Saati'
  },
  {
    id: 'sp-3',
    title: 'Cyberpunk 2077 - Night City Ambience',
    tag: 'Oyun / Atmosfer',
    desc: 'Neon ışıkları altında yağmurlu Night City sokak manzaraları ve fütüristik atmosferik sesler.',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    cover: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    theme: 'cyberpunk',
    presetName: 'Cyberpunk Gece Seansı'
  },
  {
    id: 'sp-4',
    title: 'Tears of Steel (Sci-Fi Kısa Film)',
    tag: 'Bilim Kurgu / Aksiyon',
    desc: 'Geleceğin distopik dünyasında geçen görsel efekt ve hikaye dolu açık bilim kurgu başyapıtı.',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    theme: 'matrix',
    presetName: 'Sci-Fi Film Kulübü'
  }
];

export default function App() {
  const [username, setUsername] = useState(() => localStorage.getItem('p2p_username') || '');
  const [avatar, setAvatar] = useState(() => localStorage.getItem('p2p_avatar') || '🐱');
  const [userColor, setUserColor] = useState(() => localStorage.getItem('p2p_userColor') || '#3b82f6');
  const [selectedTheme, setSelectedTheme] = useState(() => localStorage.getItem('p2p_theme') || 'neo_brutalism');
  const [maxUsersInput, setMaxUsersInput] = useState(10);
  const [initialMediaUrl, setInitialMediaUrl] = useState('');
  const [isPublicRoom, setIsPublicRoom] = useState(true);
  const [roomTitleInput, setRoomTitleInput] = useState('');

  const [dailyIndex, setDailyIndex] = useState(() => new Date().getDate() % DAILY_SPECIAL_MEDIA.length);
  const [lobbyTab, setLobbyTab] = useState('create');
  const [publicRooms, setPublicRooms] = useState([]);

  const [recentRooms, setRecentRooms] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('p2p_recent_rooms') || '[]');
    } catch {
      return [];
    }
  });

  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [roomUsers, setRoomUsers] = useState([]);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [currentMedia, setCurrentMedia] = useState({ type: 'NONE', url: '' });
  const [playbackState, setPlaybackState] = useState(null);
  const [activeStream, setActiveStream] = useState(null);
  const [isLiveStreamActive, setIsLiveStreamActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [poll, setPoll] = useState(null);

  // Modallar
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPollOpen, setIsPollOpen] = useState(false);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Sesli Sohbet
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState({});

  const [typingUser, setTypingUser] = useState(null);
  const [danmakuEnabled, setDanmakuEnabled] = useState(true);
  const [danmakuList, setDanmakuList] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [copied, setCopied] = useState(false);

  const laserPointsRef = useRef([]);
  const roomDataRef = useRef(roomData);
  useEffect(() => { roomDataRef.current = roomData; }, [roomData]);

  const currentTheme = THEMES[selectedTheme] || THEMES.neo_brutalism;
  const currentUserObj = roomUsers.find((u) => u.id === socket.id);
  const isMuted = currentUserObj?.isMuted || false;

  const currentDailySpecial = DAILY_SPECIAL_MEDIA[dailyIndex];

  const saveRecentRoom = (id) => {
    const updated = [id, ...recentRooms.filter((r) => r !== id)].slice(0, 4);
    setRecentRooms(updated);
    localStorage.setItem('p2p_recent_rooms', JSON.stringify(updated));
  };

  const getRandomAvatar = () => {
    const next = AVATAR_LIST[Math.floor(Math.random() * AVATAR_LIST.length)];
    setAvatar(next);
    localStorage.setItem('p2p_avatar', next);
  };

  const handleShuffleDailySpecial = () => {
    setDailyIndex((prev) => (prev + 1) % DAILY_SPECIAL_MEDIA.length);
  };

  const handleLaunchWithSpecial = () => {
    setInitialMediaUrl(currentDailySpecial.url);
    setRoomTitleInput(currentDailySpecial.presetName);
    if (THEMES[currentDailySpecial.theme]) {
      setSelectedTheme(currentDailySpecial.theme);
      localStorage.setItem('p2p_theme', currentDailySpecial.theme);
    }
  };

  const handleApplyPreset = (preset) => {
    if (THEMES[preset.theme]) {
      setSelectedTheme(preset.theme);
      localStorage.setItem('p2p_theme', preset.theme);
    }
    setMaxUsersInput(preset.maxUsers);
    setInitialMediaUrl(preset.media);
    setRoomTitleInput(preset.title);
  };

  const resetRoomState = (alertMsg) => {
    stopScreenShare();
    stopVoiceChat();
    setActiveStream(null);
    setIsLiveStreamActive(false);
    setIsMicEnabled(false);
    setCurrentMedia({ type: 'NONE', url: '' });
    setPlaybackState(null);
    setMessages([]);
    setPlaylist([]);
    setPoll(null);
    setRoomUsers([]);
    setRoomData(null);
    if (alertMsg) alert(alertMsg);
  };

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      socket.emit('rooms:get_public', (list) => setPublicRooms(list));
    };
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socket.on('rooms:public_list', (list) => {
      setPublicRooms(list);
    });

    socket.on('room:closed', ({ message }) => resetRoomState(message));
    socket.on('room:kicked', () => resetRoomState('Oda yöneticisi tarafından çıkarıldınız.'));

    socket.on('room:user_joined', async ({ user, users }) => {
      setRoomUsers(users);
      if (roomDataRef.current?.isHost) {
        if (getLocalStream()) await sendScreenOffer(user.id);
        if (isMicEnabled) await sendVoiceOffer(user.id);
      }
    });

    socket.on('room:user_left', ({ users }) => {
      if (users) setRoomUsers(users);
    });

    socket.on('room:users_updated', (updatedUsers) => {
      setRoomUsers(updatedUsers);
    });

    socket.on('room:host_transferred', ({ newHostId, mediaState, users }) => {
      setRoomData((prev) => prev ? { ...prev, isHost: (socket.id === newHostId) } : null);
      if (users) setRoomUsers(users);
      if (mediaState) setPlaybackState(mediaState);
    });

    socket.on('webrtc:signal', async (signalData) => {
      await handleSignal(
        signalData,
        (remoteScreenStream) => {
          setIsLiveStreamActive(true);
          setActiveStream(remoteScreenStream);
        },
        (remoteSenderId, remoteVoiceStream) => {
          const audioEl = new Audio();
          audioEl.srcObject = remoteVoiceStream;
          audioEl.play().catch(() => {});

          attachAudioVolumeMonitor(remoteVoiceStream, (vol) => {
            setSpeakingUsers((prev) => ({ ...prev, [remoteSenderId]: vol }));
          });
        }
      );
    });

    socket.on('laser:point', (point) => {
      laserPointsRef.current.push(point);
    });

    socket.on('poll:updated', (updatedPoll) => {
      setPoll(updatedPoll);
      if (updatedPoll) setIsPollOpen(true);
    });

    socket.on('media:change_source', (payload) => {
      if (payload.type === 'LIVE_STREAM') {
        setIsLiveStreamActive(true);
      } else {
        setIsLiveStreamActive(false);
        setActiveStream(null);
        setCurrentMedia(payload);
      }
    });

    socket.on('media:sync_state', (payload) => setPlaybackState(payload));
    socket.on('playlist:updated', (newPlaylist) => setPlaylist(newPlaylist));

    socket.on('chat:message', (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      if (msg.type === 'TEXT') {
        const danmakuItem = {
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          color: msg.color,
          top: Math.floor(Math.random() * 60) + 15
        };
        setDanmakuList((prev) => [...prev, danmakuItem]);
        setTimeout(() => {
          setDanmakuList((prev) => prev.filter((d) => d.id !== danmakuItem.id));
        }, 6000);
      }
    });

    socket.on('chat:typing', ({ isTyping, username }) => {
      setTypingUser(isTyping ? username : null);
    });

    socket.on('chat:reaction', (reaction) => {
      const newReaction = { ...reaction, id: Math.random() };
      setReactions((prev) => [...prev, newReaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 2400);
    });

    if (!socket.connected) socket.connect();
    else socket.emit('rooms:get_public', (list) => setPublicRooms(list));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('rooms:public_list');
      socket.off('room:closed');
      socket.off('room:kicked');
      socket.off('room:user_joined');
      socket.off('room:user_left');
      socket.off('room:users_updated');
      socket.off('room:host_transferred');
      socket.off('webrtc:signal');
      socket.off('laser:point');
      socket.off('poll:updated');
      socket.off('media:change_source');
      socket.off('media:sync_state');
      socket.off('playlist:updated');
      socket.off('chat:message');
      socket.off('chat:typing');
      socket.off('chat:reaction');
    };
  }, [isMicEnabled]);

  const handleToggleVoice = async () => {
    if (!isMicEnabled) {
      try {
        await startVoiceChat(
          (localStream) => {
            setIsMicEnabled(true);
            setIsMicMuted(false);
            attachAudioVolumeMonitor(localStream, (vol) => {
              setSpeakingUsers((prev) => ({ ...prev, [socket.id]: vol }));
            });
            roomUsers.forEach((u) => { if (u.id !== socket.id) sendVoiceOffer(u.id); });
          },
          (remoteSenderId, remoteVoiceStream) => {
            const audioEl = new Audio();
            audioEl.srcObject = remoteVoiceStream;
            audioEl.play().catch(() => {});
            attachAudioVolumeMonitor(remoteVoiceStream, (vol) => {
              setSpeakingUsers((prev) => ({ ...prev, [remoteSenderId]: vol }));
            });
          }
        );
      } catch (e) {
        alert('Mikrofon erişimi bulunamadı.');
      }
    } else {
      stopVoiceChat();
      setIsMicEnabled(false);
      setSpeakingUsers((prev) => ({ ...prev, [socket.id]: 0 }));
    }
  };

  const handleCreateRoom = () => {
    if (!username.trim()) return alert('Lütfen bir isim girin.');
    localStorage.setItem('p2p_username', username.trim());
    localStorage.setItem('p2p_avatar', avatar);

    socket.emit('room:create', { 
      username: username.trim(), 
      avatar, 
      maxUsers: maxUsersInput,
      initialMediaUrl,
      isPublic: isPublicRoom,
      roomTitle: roomTitleInput.trim() || `${username}'in Partisi`,
      presetTheme: selectedTheme
    }, (res) => {
      if (res?.success) {
        setRoomData(res);
        saveRecentRoom(res.roomId);
        if (res.mediaState) {
          setCurrentMedia({ type: res.mediaState.sourceType, url: res.mediaState.sourceUrl });
          setPlaybackState(res.mediaState);
        }
      }
    });
  };

  const handleJoinRoom = (targetCode) => {
    const code = (targetCode || roomIdInput).trim();
    if (!username.trim() || !code) return alert('İsim ve Oda Kodu zorunludur.');
    localStorage.setItem('p2p_username', username.trim());
    localStorage.setItem('p2p_avatar', avatar);

    socket.emit('room:join', { roomId: code, username: username.trim(), avatar }, (res) => {
      if (res?.success) {
        setRoomData(res);
        saveRecentRoom(code);
        if (res.users) setRoomUsers(res.users);
        if (res.playlist) setPlaylist(res.playlist);
        if (res.poll) setPoll(res.poll);
        if (res.mediaState?.sourceType === 'LIVE_STREAM') {
          setIsLiveStreamActive(true);
        } else if (res.mediaState) {
          setCurrentMedia({ type: res.mediaState.sourceType, url: res.mediaState.sourceUrl });
          setPlaybackState(res.mediaState);
        }
      } else {
        alert(res?.message || 'Odaya girilemedi.');
      }
    });
  };

  const handleCopyCode = () => {
    if (!roomData?.roomId) return;
    navigator.clipboard.writeText(roomData.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = () => {
    if (window.confirm(roomData?.isHost ? 'Odayı kapatmak istediğinize emin misiniz?' : 'Odadan ayrılmak istediğinize emin misiniz?')) {
      socket.emit('room:leave');
      resetRoomState();
    }
  };

  const handleToggleStream = async () => {
    if (isLiveStreamActive) {
      stopScreenShare();
      setActiveStream(null);
      setIsLiveStreamActive(false);
      socket.emit('media:change_source', { type: 'NONE', url: '' });
    } else {
      try {
        await startScreenShare(
          (localStream) => {
            setActiveStream(localStream);
            setIsLiveStreamActive(true);
            socket.emit('media:change_source', { type: 'LIVE_STREAM' });
            roomUsers.forEach((u) => { if (u.id !== socket.id) sendScreenOffer(u.id); });
          },
          (remoteStream) => setActiveStream(remoteStream)
        );
      } catch (e) {
        alert('Ekran paylaşımı başlatılamadı.');
      }
    }
  };

  const handleLoadUrl = () => {
    if (!videoUrlInput.trim()) return;
    if (isLiveStreamActive) {
      stopScreenShare();
      setActiveStream(null);
      setIsLiveStreamActive(false);
    }
    const mediaPayload = { type: 'DIRECT', url: videoUrlInput.trim() };
    setCurrentMedia(mediaPayload);
    socket.emit('media:change_source', mediaPayload);
    setVideoUrlInput('');
  };

  const handleSendMessage = ({ text, type, color }) => {
    socket.emit('chat:send', {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender: `${avatar} ${username}`,
      text,
      type,
      color,
      time: Date.now()
    });
  };

  const myVoiceVolume = speakingUsers[socket.id] || 0;

  // 1. GİRİŞ & LOBİ EKRANI
  if (!roomData) {
    return (
      <div className={`w-screen min-h-screen ${currentTheme.bg} ${currentTheme.textColor} flex items-center justify-center p-3 md:p-6 transition-colors duration-300 relative overflow-y-auto`}>
        {/* Giriş Ekranı Sağ Üst Butonları */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={() => setIsAboutOpen(true)}
            className={`p-2.5 rounded-2xl cursor-pointer ${currentTheme.buttonSecondary} shadow-lg flex items-center gap-1.5 text-xs font-bold`}
            title="Geliştirici & Proje Hakkında"
          >
            <Info size={16} />
            <span className="hidden sm:inline">Hakkında</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`p-2.5 rounded-2xl cursor-pointer ${currentTheme.buttonSecondary} shadow-lg flex items-center gap-2 text-xs font-bold`}
            title="Ayarlar & Tema"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Tema & Ayarlar</span>
          </button>
        </div>

        <div className={`w-full max-w-lg ${currentTheme.panel} p-5 md:p-7 space-y-4 my-auto shadow-2xl`}>
          {/* Logo & Durum */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-wider flex items-center justify-center gap-2">
              <Radio size={28} /> Peerora
            </h1>
            <p className="text-xs opacity-70">Canlı Ekran & Senkronize Medya İzleme Platformu</p>
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-[10px] opacity-80">{isConnected ? 'Sunucuya Bağlı' : 'Bağlantı Yok'}</span>
            </div>
          </div>

          {/* Avatar & Takma Ad Girişi */}
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={getRandomAvatar}
              className="text-2xl p-2 rounded-2xl bg-black/10 border border-black/15 hover:scale-105 active:scale-95 transition-transform cursor-pointer relative"
              title="Rastgele Avatar"
            >
              {avatar}
              <Dices size={12} className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-0.5 rounded-full" />
            </button>
            <input
              type="text"
              placeholder="Takma Adınız..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`flex-1 ${currentTheme.input} px-3.5 py-2.5 text-sm outline-none`}
            />
          </div>

          {/* GÜNÜN ÖZEL MEDYASI (SPOTLIGHT KARTI) */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-black/15 bg-black/5 p-3 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-500">
                <Star size={14} fill="currentColor" />
                <span className="tracking-wide">GÜNÜN ÖZEL MEDYASI</span>
              </div>
              <button
                type="button"
                onClick={handleShuffleDailySpecial}
                className="text-[11px] font-bold opacity-75 hover:opacity-100 flex items-center gap-1 cursor-pointer hover:underline"
                title="Başka Öneri Getir"
              >
                <Shuffle size={12} /> Başka Öneri
              </button>
            </div>

            <div className="flex gap-3 items-center">
              <img
                src={currentDailySpecial.cover}
                alt="Thumbnail"
                className="w-20 h-14 object-cover rounded-xl border border-black/20 shadow-sm shrink-0"
              />
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black truncate">{currentDailySpecial.title}</span>
                </div>
                <span className="text-[10px] font-bold text-blue-500">{currentDailySpecial.tag}</span>
                <span className="text-[10px] opacity-70 line-clamp-1">{currentDailySpecial.desc}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLaunchWithSpecial}
              className={`w-full py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${currentTheme.buttonSecondary}`}
            >
              <Flame size={13} fill="currentColor" /> Bu Medyayı Odaya Yükle
            </button>
          </div>

          {/* Lobi Gezinme Sekmeleri: Oda Kur / Keşfet */}
          <div className="flex p-1 bg-black/10 rounded-2xl gap-1 text-xs font-bold">
            <button
              onClick={() => setLobbyTab('create')}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                lobbyTab === 'create' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-black/5 opacity-70'
              }`}
            >
              <Sparkles size={14} /> Oda Oluştur
            </button>
            <button
              onClick={() => {
                setLobbyTab('explore');
                socket.emit('rooms:get_public', (list) => setPublicRooms(list));
              }}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                lobbyTab === 'explore' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-black/5 opacity-70'
              }`}
            >
              <Compass size={14} /> Açık Odalar ({publicRooms.length})
            </button>
          </div>

          {/* SEKME 1: ODA OLUŞTUR & KODLA KATIL */}
          {lobbyTab === 'create' ? (
            <div className="space-y-3.5">
              {/* Hazır Parti Şablonları */}
              <div>
                <span className="text-[11px] font-bold opacity-75 mb-1.5 block">⚡ Hazır Parti Şablonları:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {PARTY_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="p-2 rounded-xl border border-black/10 bg-black/5 hover:bg-black/10 text-left transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <span className="text-xs font-bold truncate">{p.name}</span>
                      <span className="text-[9px] opacity-65 truncate">{p.maxUsers} Kişi</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Oda Başlığı & Gizlilik */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Oda Başlığı (Örn: Korku Filmi Gecesi)..."
                  value={roomTitleInput}
                  onChange={(e) => setRoomTitleInput(e.target.value)}
                  className={`flex-1 ${currentTheme.input} px-3 py-2 text-xs outline-none`}
                />
                <button
                  type="button"
                  onClick={() => setIsPublicRoom((p) => !p)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border border-black/10 flex items-center gap-1 cursor-pointer transition-colors ${
                    isPublicRoom ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40' : 'bg-black/10 opacity-70'
                  }`}
                  title={isPublicRoom ? 'Oda lobide herkese görünür' : 'Yalnızca kodla girilebilir'}
                >
                  {isPublicRoom ? <Globe size={13} /> : <Lock size={13} />}
                  <span>{isPublicRoom ? 'Herkese Açık' : 'Gizli'}</span>
                </button>
              </div>

              {/* Başlangıç Videosu Linki */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold opacity-80 flex items-center gap-1">
                  <Play size={12} /> Başlangıç Videosu (İsteğe Bağlı):
                </label>
                <input
                  type="text"
                  placeholder="YouTube, Twitch, Vimeo veya MP4 linki..."
                  value={initialMediaUrl}
                  onChange={(e) => setInitialMediaUrl(e.target.value)}
                  className={`w-full ${currentTheme.input} px-3 py-2 text-xs outline-none`}
                />
              </div>

              {/* Kişi Limiti */}
              <div className="flex items-center justify-between px-1 text-xs font-bold opacity-85">
                <span className="flex items-center gap-1.5"><Users size={14} /> Kişi Limiti:</span>
                <div className="flex items-center gap-1">
                  {[2, 4, 6, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxUsersInput(num)}
                      className={`w-7 h-7 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                        maxUsersInput === num ? 'bg-blue-600 text-white shadow-md scale-110' : 'bg-black/10 hover:bg-black/20'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                className={`w-full ${currentTheme.buttonPrimary} py-2.5 text-sm font-black cursor-pointer shadow-lg`}
              >
                Yeni Oda Oluştur ({maxUsersInput} Kişilik)
              </button>

              <div className="flex items-center gap-2 text-xs opacity-50 my-1">
                <div className="flex-1 h-px bg-current" />
                <span>VEYA KODLA KATIL</span>
                <div className="flex-1 h-px bg-current" />
              </div>

              {/* Kod ile Katılma */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="6 Haneli Oda Kodu..."
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  className={`flex-1 ${currentTheme.input} px-3 py-2 text-sm outline-none`}
                />
                <button
                  onClick={() => handleJoinRoom()}
                  className={`${currentTheme.buttonSecondary} px-4 py-2 text-sm font-black cursor-pointer`}
                >
                  Katıl
                </button>
              </div>

              {/* Son Katılınan Odalar */}
              {recentRooms.length > 0 && (
                <div className="pt-2 border-t border-black/10 space-y-1">
                  <span className="text-[11px] font-bold opacity-75 flex items-center gap-1">
                    <History size={12} /> Son Katıldığın Odalar:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {recentRooms.map((code) => (
                      <button
                        key={code}
                        onClick={() => handleJoinRoom(code)}
                        className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-black/10 hover:bg-black/20 transition-colors cursor-pointer"
                      >
                        #{code}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* SEKME 2: AÇIK ODALARI KEŞFET */
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {publicRooms.length === 0 ? (
                <div className="text-center text-xs opacity-60 py-10 flex flex-col items-center gap-2">
                  <Film size={24} />
                  <span>Şu anda açık oda bulunmuyor. İlk partiyi siz başlatın!</span>
                </div>
              ) : (
                publicRooms.map((r) => (
                  <div
                    key={r.roomId}
                    className="p-3 rounded-2xl border border-black/10 bg-black/5 flex items-center justify-between gap-2 hover:bg-black/10 transition-all"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-2xl p-1 bg-black/10 rounded-xl shrink-0">{r.hostAvatar}</span>
                      <div className="flex flex-col truncate">
                        <span className="text-xs font-bold truncate">{r.title}</span>
                        <span className="text-[10px] opacity-70 truncate">Host: {r.hostName} • {r.mediaType !== 'NONE' ? r.mediaType : 'Beklemede'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold opacity-80 px-2 py-0.5 rounded-lg bg-black/10">
                        {r.userCount}/{r.maxUsers}
                      </span>
                      <button
                        onClick={() => handleJoinRoom(r.roomId)}
                        className={`${currentTheme.buttonPrimary} px-3 py-1.5 text-xs font-black rounded-xl cursor-pointer`}
                      >
                        Katıl
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Lobi Modalları */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          userColor={userColor}
          onColorChange={(col) => { setUserColor(col); localStorage.setItem('p2p_userColor', col); }}
          selectedTheme={selectedTheme}
          onThemeChange={(th) => { setSelectedTheme(th); localStorage.setItem('p2p_theme', th); }}
        />

        <AboutModal
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
          theme={currentTheme}
        />
      </div>
    );
  }

  // 2. İZLEME VE ODA EKRANI
  return (
    <div className={`w-screen min-h-screen ${currentTheme.bg} ${currentTheme.textColor} flex flex-col justify-between overflow-hidden relative transition-colors duration-300`}>
      <div className="w-full max-w-7xl mx-auto h-screen flex flex-col p-2.5 md:p-5 justify-between gap-3">
        {/* Floating Emojiler */}
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {reactions.map((r) => (
            <span
              key={r.id}
              className="absolute text-4xl md:text-5xl animate-float filter drop-shadow-lg"
              style={{ left: `${r.x}%`, bottom: '15%' }}
            >
              {r.emoji}
            </span>
          ))}
        </div>

        {/* Üst Bilgi Barı */}
        <div className={`flex items-center justify-between ${currentTheme.headerPanel} px-3.5 py-2 md:px-5 md:py-2.5 shrink-0 shadow-md`}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
            <button
              onClick={handleCopyCode}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs md:text-sm font-mono cursor-pointer ${currentTheme.badge}`}
              title="Kodu Kopyala"
            >
              <span>Oda: {roomData.roomId}</span>
              {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
            </button>

            <button
              onClick={() => setIsUserListOpen(true)}
              className="flex items-center gap-1 text-xs font-bold opacity-85 hover:opacity-100 cursor-pointer px-2 py-1 rounded-lg bg-black/10 transition-all"
            >
              <Users size={14} /> {roomUsers.length}/{roomData.maxUsers || 10}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Mikrofon */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleVoice}
                style={{
                  transform: isMicEnabled && !isMicMuted ? `scale(${1 + myVoiceVolume * 0.35})` : 'scale(1)',
                  boxShadow: isMicEnabled && !isMicMuted && myVoiceVolume > 0.15 ? `0 0 ${myVoiceVolume * 22}px #10b981` : 'none'
                }}
                className={`p-2 rounded-xl cursor-pointer flex items-center gap-1.5 text-xs font-bold transition-all duration-100 ${
                  isMicEnabled ? 'bg-emerald-600 text-white' : currentTheme.buttonSecondary
                }`}
                title={isMicEnabled ? 'Sesli Sohbeti Kapat' : 'Sesli Sohbeti Başlat'}
              >
                <Mic size={16} />
                <span className="hidden md:inline">{isMicEnabled ? 'Mikrofon Açık' : 'Sese Katıl'}</span>
              </button>

              {isMicEnabled && (
                <button
                  onClick={() => { const next = !isMicMuted; setIsMicMuted(next); toggleVoiceMute(next); }}
                  className={`p-2 rounded-xl cursor-pointer transition-colors ${
                    isMicMuted ? 'bg-rose-600 text-white' : 'bg-black/20 text-gray-300'
                  }`}
                  title={isMicMuted ? 'Kendi Sesini Aç' : 'Kendi Sesini Sustur'}
                >
                  {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
            </div>

            {/* Anket */}
            <button
              onClick={() => setIsPollOpen(true)}
              className={`p-2 rounded-xl cursor-pointer flex items-center gap-1.5 text-xs font-bold ${currentTheme.buttonSecondary}`}
              title="Anket"
            >
              <BarChart2 size={16} />
              {poll && <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />}
            </button>

            {/* Playlist */}
            <button
              onClick={() => setIsPlaylistOpen(true)}
              className={`relative p-2 rounded-xl cursor-pointer flex items-center gap-1.5 text-xs font-bold ${currentTheme.buttonSecondary}`}
              title="Oynatma Sırası"
            >
              <ListMusic size={16} />
              {playlist.length > 0 && (
                <span className="bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">
                  {playlist.length}
                </span>
              )}
            </button>

            {/* Hakkında Butonu */}
            <button
              onClick={() => setIsAboutOpen(true)}
              className={`p-2 rounded-xl cursor-pointer flex items-center gap-1.5 text-xs font-bold ${currentTheme.buttonSecondary}`}
              title="Geliştirici & Proje Hakkında"
            >
              <Info size={16} />
            </button>

            {/* Ayarlar */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-xl cursor-pointer flex items-center gap-1.5 text-xs font-bold ${currentTheme.buttonSecondary}`}
              title="Ayarlar & Tema"
            >
              <Settings size={16} />
            </button>

            <span className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 ${currentTheme.badge}`}>
              {isLiveStreamActive && <Tv size={13} className="text-rose-400 animate-pulse" />}
              {roomData.isHost ? 'Host' : 'Guest'}
            </span>

            <button
              onClick={handleLeaveRoom}
              className="p-2 rounded-xl hover:bg-rose-500/20 text-rose-500 cursor-pointer transition-colors"
              title={roomData.isHost ? 'Odayı Kapat' : 'Odadan Ayrıl'}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>

        {/* Ana Sahne */}
        <div className="flex-1 flex flex-col md:grid md:grid-cols-12 gap-3 min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2.5 md:col-span-8 lg:col-span-9 min-h-0 justify-between">
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <VideoPlayer
                sourceUrl={currentMedia.url}
                isHost={roomData.isHost}
                playbackState={playbackState}
                onStateChange={(state) => socket.emit('media:sync_state', state)}
                peerStream={activeStream}
                isLiveStreamActive={isLiveStreamActive}
                danmakuList={danmakuList}
                danmakuEnabled={danmakuEnabled}
                onVideoEnded={() => socket.emit('playlist:play_next')}
                laserPoints={laserPointsRef}
                onLaserEmit={(point) => socket.emit('laser:point', point)}
                userColor={userColor}
                theme={currentTheme}
              />
            </div>

            {/* Host Kontrolleri */}
            {roomData.isHost && (
              <div className={`flex flex-col md:flex-row gap-2 shrink-0 ${currentTheme.panel} p-2 md:p-3`}>
                <button
                  onClick={handleToggleStream}
                  className={`w-full md:w-auto px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shrink-0 ${
                    isLiveStreamActive ? 'bg-rose-600 hover:bg-rose-500 text-white' : currentTheme.buttonPrimary
                  }`}
                >
                  {isLiveStreamActive ? (
                    <>
                      <Square size={14} fill="currentColor" /> Ekranı Durdur
                    </>
                  ) : (
                    <>
                      <MonitorPlay size={14} /> Ekran / Sekme Yayını
                    </>
                  )}
                </button>

                <div className="flex flex-1 gap-2">
                  <input
                    type="text"
                    placeholder="YouTube, Twitch, Vimeo, MP4 URL..."
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    className={`flex-1 ${currentTheme.input} text-xs px-3 py-2 outline-none`}
                  />
                  <button
                    onClick={handleLoadUrl}
                    className={`${currentTheme.buttonPrimary} px-4 py-2 text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0`}
                  >
                    <Link2 size={14} /> Yükle
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Çet */}
          <div className="flex-1 md:col-span-4 lg:col-span-3 min-h-0 h-full">
            <ChatOverlay
              messages={messages}
              onSendMessage={handleSendMessage}
              onSendReaction={(emoji) => socket.emit('chat:reaction', { emoji, sender: `${avatar} ${username}`, x: Math.floor(Math.random() * 70) + 15 })}
              onTyping={(isTyping) => socket.emit('chat:typing', { isTyping, username })}
              typingUser={typingUser}
              danmakuEnabled={danmakuEnabled}
              onToggleDanmaku={() => setDanmakuEnabled((p) => !p)}
              currentUsername={`${avatar} ${username}`}
              userColor={userColor}
              theme={currentTheme}
              isMuted={isMuted}
            />
          </div>
        </div>
      </div>

      {/* Oda Modalları */}
      <PlaylistModal
        isOpen={isPlaylistOpen}
        onClose={() => setIsPlaylistOpen(false)}
        playlist={playlist}
        onAddToPlaylist={(item) => { setPlaylist((prev) => [...prev, item]); socket.emit('playlist:add', item); }}
        onRemoveFromPlaylist={(itemId) => { setPlaylist((prev) => prev.filter((i) => i.id !== itemId)); socket.emit('playlist:remove', { itemId }); }}
        onPlayNext={() => socket.emit('playlist:play_next')}
        isHost={roomData.isHost}
        theme={currentTheme}
      />

      <PollModal
        isOpen={isPollOpen}
        onClose={() => setIsPollOpen(false)}
        poll={poll}
        onCreatePoll={(pollData) => socket.emit('poll:create', pollData)}
        onVote={(optionId) => socket.emit('poll:vote', { optionId })}
        onEndPoll={() => socket.emit('poll:end')}
        isHost={roomData.isHost}
        userId={socket.id}
        theme={currentTheme}
      />

      <UserListModal
        isOpen={isUserListOpen}
        onClose={() => setIsUserListOpen(false)}
        users={roomUsers}
        currentUserId={socket.id}
        isHost={roomData.isHost}
        onTransferHost={(newHostId) => socket.emit('room:transfer_host', { newHostId })}
        onToggleMute={(targetId) => socket.emit('room:toggle_mute', { targetId })}
        onKick={(targetId) => socket.emit('room:kick_user', { targetId })}
        theme={currentTheme}
        speakingUsers={speakingUsers}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userColor={userColor}
        onColorChange={(col) => { setUserColor(col); localStorage.setItem('p2p_userColor', col); }}
        selectedTheme={selectedTheme}
        onThemeChange={(th) => { setSelectedTheme(th); localStorage.setItem('p2p_theme', th); }}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        theme={currentTheme}
      />
    </div>
  );
}