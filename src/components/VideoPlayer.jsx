import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { 
  Volume2, VolumeX, Maximize2, Minimize2, Wand2, 
  Subtitles, Zap, Gauge, Settings as SettingsIcon, Check 
} from 'lucide-react';
import { translations } from '../locales/translations';

export function parseVideoUrl(url) {
  if (!url) return { type: 'NONE', id: null, embedUrl: null };
  const cleanUrl = url.trim();

  const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return { type: 'YOUTUBE', id: ytMatch[1] };
  }

  const twitchVod = cleanUrl.match(/twitch\.tv\/videos\/(\d+)/);
  if (twitchVod) {
    const parentHost = window.location.hostname || 'localhost';
    return { 
      type: 'TWITCH_VOD', 
      embedUrl: `https://player.twitch.tv/?video=${twitchVod[1]}&parent=${parentHost}&autoplay=true&muted=false` 
    };
  }

  const twitchLive = cleanUrl.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (twitchLive && !cleanUrl.includes('/videos/')) {
    const parentHost = window.location.hostname || 'localhost';
    return { 
      type: 'TWITCH_LIVE', 
      embedUrl: `https://player.twitch.tv/?channel=${twitchLive[1]}&parent=${parentHost}&autoplay=true&muted=false` 
    };
  }

  const vimeo = cleanUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/);
  if (vimeo && vimeo[3]) {
    return { 
      type: 'VIMEO', 
      embedUrl: `https://player.vimeo.com/video/${vimeo[3]}?autoplay=1` 
    };
  }

  return { type: 'DIRECT', url: cleanUrl };
}

function loadYouTubeIframeAPI(callback) {
  if (window.YT && window.YT.Player) {
    callback();
    return;
  }
  if (!document.getElementById('yt-script-tag')) {
    const tag = document.createElement('script');
    tag.id = 'yt-script-tag';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
  }
  const prevCallback = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    if (prevCallback) prevCallback();
    callback();
  };
}

export default function VideoPlayer({ 
  sourceUrl, 
  isHost, 
  playbackState, 
  onStateChange, 
  peerStream, 
  isLiveStreamActive, 
  localVideoUrl,
  onLocalStreamReady,
  danmakuList, 
  danmakuEnabled, 
  onVideoEnded,
  laserPoints,
  onLaserEmit,
  userColor,
  lang = 'tr'
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const streamVideoRef = useRef(null);
  const localHostVideoRef = useRef(null);
  const ytIframeRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const hlsRef = useRef(null);
  const isSyncingRef = useRef(false);

  const t = translations[lang] || translations.tr;

  const [isLaserMode, setIsLaserMode] = useState(false);
  const isMouseDownRef = useRef(false);

  const [localVolume, setLocalVolume] = useState(100);
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [isCcActive, setIsCcActive] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [syncToast, setSyncToast] = useState(false);

  const [needsUserUnmute, setNeedsUserUnmute] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1.0);

  const parsedMedia = parseVideoUrl(sourceUrl);

  const sendYtCommand = (func, args = []) => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current[func] === 'function') {
      try {
        ytPlayerRef.current[func](...args);
      } catch (e) {}
    }
    if (ytIframeRef.current?.contentWindow) {
      try {
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch (e) {}
    }
  };

  // Host'un yerel videosundan WebRTC akışını yakalayıp odaya dağıtma
  useEffect(() => {
    if (!localVideoUrl || !isHost || !localHostVideoRef.current) return;
    const videoEl = localHostVideoRef.current;

    const emitStream = () => {
      try {
        const stream = videoEl.captureStream ? videoEl.captureStream() : videoEl.mozCaptureStream();
        if (stream && onLocalStreamReady) {
          onLocalStreamReady(stream);
        }
      } catch (err) {
        console.error('captureStream hatası:', err);
      }
    };

    if (videoEl.readyState >= 1) {
      emitStream();
    } else {
      videoEl.onloadedmetadata = emitStream;
    }
  }, [localVideoUrl, isHost]);

  // YouTube IFrame API
  useEffect(() => {
    if (parsedMedia.type !== 'YOUTUBE' || isLiveStreamActive) return;
    const ytId = parsedMedia.id;
    if (!ytId) return;

    let isCancelled = false;

    loadYouTubeIframeAPI(() => {
      if (isCancelled) return;

      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        try {
          ytPlayerRef.current.loadVideoById({
            videoId: ytId,
            startSeconds: playbackState?.currentTime || 0
          });
          if (playbackState?.state === 'PAUSED') {
            ytPlayerRef.current.pauseVideo();
          }
        } catch (e) {}
        return;
      }

      try {
        ytPlayerRef.current = new window.YT.Player('yt-player-target', {
          videoId: ytId,
          host: 'https://www.youtube.com',
          playerVars: {
            autoplay: playbackState?.state === 'PLAYING' ? 1 : 0,
            controls: isHost ? 1 : 0,
            disablekb: isHost ? 0 : 1,
            enablejsapi: 1,
            rel: 0,
            playsinline: 1
          },
          events: {
            onReady: (e) => {
              if (isCancelled) return;
              const targetTime = playbackState?.currentTime || 0;
              e.target.seekTo(targetTime, true);
              if (playbackState?.state === 'PLAYING') {
                e.target.playVideo();
              } else {
                e.target.pauseVideo();
              }
            },
            onStateChange: (e) => {
              if (isSyncingRef.current || !isHost) return;
              const time = e.target.getCurrentTime ? e.target.getCurrentTime() : 0;

              if (e.data === window.YT.PlayerState.ENDED) {
                onVideoEnded();
              } else if (e.data === window.YT.PlayerState.PLAYING) {
                onStateChange({ state: 'PLAYING', currentTime: time, playbackRate: currentSpeed });
              } else if (e.data === window.YT.PlayerState.PAUSED) {
                onStateChange({ state: 'PAUSED', currentTime: time, playbackRate: currentSpeed });
              }
            }
          }
        });
      } catch (err) {}
    });

    return () => {
      isCancelled = true;
    };
  }, [parsedMedia.id, parsedMedia.type, isHost, isLiveStreamActive]);

  // MP4 / HLS Video
  useEffect(() => {
    if (isLiveStreamActive || parsedMedia.type !== 'DIRECT' || !sourceUrl || !videoRef.current) return;
    const video = videoRef.current;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (sourceUrl.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(sourceUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else {
      video.src = sourceUrl;
    }

    const targetTime = playbackState?.currentTime || 0;
    video.currentTime = targetTime;
    video.volume = isLocalMuted ? 0 : localVolume / 100;
    video.muted = isLocalMuted;

    if (playbackState?.state === 'PLAYING') {
      video.play().catch(() => {});
    } else {
      video.pause();
    }

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [sourceUrl, isLiveStreamActive, parsedMedia.type]);

  // Misafir Senkronizasyonu
  useEffect(() => {
    if (!playbackState || isLiveStreamActive || isHost) return;
    isSyncingRef.current = true;

    let targetTime = playbackState.currentTime || 0;

    if (playbackState.state === 'PLAYING' && playbackState.timestamp) {
      const elapsed = (Date.now() - playbackState.timestamp) / 1000;
      if (elapsed > 0 && elapsed < 4) {
        targetTime += elapsed;
      }
    }

    const isTargetPlaying = playbackState.state === 'PLAYING';

    if (playbackState.playbackRate && playbackState.playbackRate !== currentSpeed) {
      setCurrentSpeed(playbackState.playbackRate);
      sendYtCommand('setPlaybackRate', [playbackState.playbackRate]);
      if (videoRef.current) videoRef.current.playbackRate = playbackState.playbackRate;
    }

    if (parsedMedia.type === 'YOUTUBE' && ytPlayerRef.current?.getPlayerState) {
      try {
        const pState = ytPlayerRef.current.getPlayerState();
        const localTime = ytPlayerRef.current.getCurrentTime() || 0;

        if (isTargetPlaying && pState !== window.YT.PlayerState.PLAYING && pState !== window.YT.PlayerState.BUFFERING) {
          ytPlayerRef.current.playVideo();
        } else if (!isTargetPlaying && pState === window.YT.PlayerState.PLAYING) {
          ytPlayerRef.current.pauseVideo();
        }

        if (Math.abs(localTime - targetTime) > 1.5) {
          ytPlayerRef.current.seekTo(targetTime, true);
        }
      } catch (e) {}
    }

    if (parsedMedia.type === 'DIRECT' && videoRef.current && sourceUrl) {
      const video = videoRef.current;
      if (isTargetPlaying && video.paused) video.play().catch(() => {});
      else if (!isTargetPlaying && !video.paused) video.pause();

      if (Math.abs(video.currentTime - targetTime) > 0.8) {
        video.currentTime = targetTime;
      }
    }

    setTimeout(() => { isSyncingRef.current = false; }, 200);
  }, [playbackState, isHost, parsedMedia.type, isLiveStreamActive, currentSpeed]);

  const handleSpeedChange = (speed) => {
    if (!isHost) return;
    setCurrentSpeed(speed);
    sendYtCommand('setPlaybackRate', [speed]);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    if (localHostVideoRef.current) localHostVideoRef.current.playbackRate = speed;

    const currentTime = ytPlayerRef.current?.getCurrentTime 
      ? ytPlayerRef.current.getCurrentTime() 
      : (videoRef.current?.currentTime || localHostVideoRef.current?.currentTime || 0);

    onStateChange({
      state: playbackState?.state || 'PAUSED',
      currentTime,
      playbackRate: speed,
      timestamp: Date.now()
    });
    setShowSpeedMenu(false);
  };

  // Ses ayarını hem normal oynatıcıya hem de canlı yayın/misafir oynatıcısına uygula
  const handleVolumeChange = (newVol) => {
    setLocalVolume(newVol);
    setIsLocalMuted(newVol === 0);

    sendYtCommand('unMute');
    sendYtCommand('setVolume', [newVol]);

    if (videoRef.current) {
      videoRef.current.volume = newVol / 100;
      videoRef.current.muted = (newVol === 0);
    }
    if (streamVideoRef.current) {
      streamVideoRef.current.volume = newVol / 100;
      streamVideoRef.current.muted = (newVol === 0);
    }
    if (localHostVideoRef.current) {
      localHostVideoRef.current.volume = newVol / 100;
      localHostVideoRef.current.muted = (newVol === 0);
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isLocalMuted;
    setIsLocalMuted(nextMute);

    if (nextMute) {
      sendYtCommand('mute');
      if (videoRef.current) videoRef.current.muted = true;
      if (streamVideoRef.current) streamVideoRef.current.muted = true;
      if (localHostVideoRef.current) localHostVideoRef.current.muted = true;
    } else {
      sendYtCommand('unMute');
      sendYtCommand('setVolume', [localVolume || 50]);
      const targetVol = (localVolume || 50) / 100;

      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.volume = targetVol;
      }
      if (streamVideoRef.current) {
        streamVideoRef.current.muted = false;
        streamVideoRef.current.volume = targetVol;
      }
      if (localHostVideoRef.current) {
        localHostVideoRef.current.muted = false;
        localHostVideoRef.current.volume = targetVol;
      }
    }
  };

  const handleToggleCc = () => {
    const nextCc = !isCcActive;
    setIsCcActive(nextCc);

    if (nextCc) {
      sendYtCommand('loadModule', ['captions']);
      sendYtCommand('setOption', ['captions', 'track', { languageCode: lang === 'tr' ? 'tr' : 'en' }]);
      sendYtCommand('setOption', ['captions', 'reload', true]);
    } else {
      sendYtCommand('unloadModule', ['captions']);
    }

    if (videoRef.current?.textTracks) {
      for (let i = 0; i < videoRef.current.textTracks.length; i++) {
        videoRef.current.textTracks[i].mode = nextCc ? 'showing' : 'hidden';
      }
    }
  };

  const handleQualityChange = (quality) => {
    setSelectedQuality(quality);
    sendYtCommand('setPlaybackQuality', [quality]);
    sendYtCommand('setPlaybackQualityRange', [quality, quality]);

    if (hlsRef.current) {
      if (quality === 'auto') {
        hlsRef.current.currentLevel = -1;
      } else {
        const levelMap = { 'hd1080': 0, 'hd720': 1, 'large': 2, 'medium': 3 };
        if (levelMap[quality] !== undefined && hlsRef.current.levels.length > levelMap[quality]) {
          hlsRef.current.currentLevel = levelMap[quality];
        }
      }
    }
    setShowQualityMenu(false);
  };

  const handleJumpToHost = () => {
    let targetTime = playbackState?.currentTime || 0;
    if (playbackState?.state === 'PLAYING' && playbackState?.timestamp) {
      const elapsed = (Date.now() - playbackState.timestamp) / 1000;
      if (elapsed > 0 && elapsed < 4) targetTime += elapsed;
    }

    if (parsedMedia.type === 'YOUTUBE' && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(targetTime, true);
      if (playbackState?.state === 'PLAYING') {
        ytPlayerRef.current.playVideo();
      }
    } else if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      if (playbackState?.state === 'PLAYING') videoRef.current.play().catch(() => {});
    }

    setSyncToast(true);
    setTimeout(() => setSyncToast(false), 2000);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId = null;

    const renderLaser = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();

      if (laserPoints.current.length > 0) {
        laserPoints.current = laserPoints.current.filter((p) => now - p.time < 600);

        laserPoints.current.forEach((p) => {
          const age = now - p.time;
          const opacity = Math.max(1 - age / 600, 0);
          const x = p.x * canvas.width;
          const y = p.y * canvas.height;

          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, 6 * opacity, 0, Math.PI * 2);
          ctx.fillStyle = p.color || '#ef4444';
          ctx.globalAlpha = opacity;
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color || '#ef4444';
          ctx.fill();
          ctx.restore();
        });
      }

      animId = requestAnimationFrame(renderLaser);
    };

    renderLaser();
    return () => { if (animId) cancelAnimationFrame(animId); };
  }, [laserPoints]);

  const handlePointerDown = (e) => {
    if (!isLaserMode) return;
    isMouseDownRef.current = true;
    handlePointerMove(e);
  };

  const handlePointerUp = () => {
    isMouseDownRef.current = false;
  };

  const handlePointerMove = (e) => {
    if (!isLaserMode || !isMouseDownRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const point = { x, y, color: userColor || '#ef4444', time: Date.now() };
    laserPoints.current.push(point);
    onLaserEmit(point);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    if (streamVideoRef.current && peerStream) {
      streamVideoRef.current.srcObject = peerStream;
      streamVideoRef.current.play().catch(() => setNeedsUserUnmute(true));
    }
  }, [peerStream]);

  useEffect(() => {
    if (!isHost || isLiveStreamActive) return;

    const interval = setInterval(() => {
      let time = 0;
      let state = 'PAUSED';

      if (parsedMedia.type === 'YOUTUBE' && ytPlayerRef.current?.getCurrentTime) {
        try {
          time = ytPlayerRef.current.getCurrentTime() || 0;
          const pState = ytPlayerRef.current.getPlayerState();
          state = pState === window.YT.PlayerState.PLAYING ? 'PLAYING' : 'PAUSED';
        } catch (e) {}
      } else if (parsedMedia.type === 'DIRECT' && videoRef.current && sourceUrl) {
        time = videoRef.current.currentTime || 0;
        state = videoRef.current.paused ? 'PAUSED' : 'PLAYING';
      }

      onStateChange({ 
        state, 
        currentTime: time, 
        playbackRate: currentSpeed, 
        timestamp: Date.now() 
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isHost, parsedMedia.type, sourceUrl, isLiveStreamActive, currentSpeed, onStateChange]);

  return (
    <div 
      ref={containerRef}
      className={`group relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 ${
        isFullscreen ? 'rounded-none border-0' : ''
      }`}
    >
      {/* 1. YEREL DOSYA YAYINI (HOST İÇİN TÜM VİDEO KONTROLLERİ AKTİF) */}
      {localVideoUrl && isHost ? (
        <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
          <video
            ref={localHostVideoRef}
            src={localVideoUrl}
            controls
            playsInline
            autoPlay
            className="w-full h-full object-contain pointer-events-auto"
          />
        </div>
      ) : isLiveStreamActive ? (
        /* 2. CANLI EKRAN VEYA MİSAFİR İÇİN YEREL VİDEO AKIŞI */
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
          <video ref={streamVideoRef} autoPlay playsInline muted={isHost} className="w-full h-full object-contain" />
          {needsUserUnmute && (
            <button
              onClick={() => {
                if (streamVideoRef.current) {
                  streamVideoRef.current.muted = false;
                  streamVideoRef.current.play();
                  setNeedsUserUnmute(false);
                }
              }}
              className="absolute z-40 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xl animate-bounce cursor-pointer"
            >
              <Volume2 size={16} /> {t.unmuteBtn}
            </button>
          )}
        </div>
     ) : parsedMedia.type === 'YOUTUBE' ? (
        /* 3. YOUTUBE OYNATICI */
        <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
          <div id="yt-player-target" className="w-full h-full pointer-events-auto" />
          {!isHost && <div className="absolute inset-0 z-20 bg-transparent pointer-events-auto cursor-default" />}
        </div>
      ) : parsedMedia.embedUrl ? (
        /* 4. TWITCH / VIMEO */
        <div className="absolute inset-0 w-full h-full bg-black">
          <iframe
            key={parsedMedia.embedUrl}
            src={parsedMedia.embedUrl}
            title={parsedMedia.type}
            className="w-full h-full border-0 pointer-events-auto"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
          {!isHost && <div className="absolute inset-0 z-20 bg-transparent pointer-events-auto cursor-default" />}
        </div>
      ) : parsedMedia.type === 'DIRECT' && sourceUrl ? (
        /* 5. DOĞRUDAN MP4 / HLS */
        <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            controls={isHost}
            playsInline
            onEnded={() => isHost && onVideoEnded()}
            onPlay={() => !isSyncingRef.current && onStateChange({ state: 'PLAYING', currentTime: videoRef.current?.currentTime || 0, playbackRate: currentSpeed, timestamp: Date.now() })}
            onPause={() => !isSyncingRef.current && onStateChange({ state: 'PAUSED', currentTime: videoRef.current?.currentTime || 0, playbackRate: currentSpeed, timestamp: Date.now() })}
            onSeeked={() => !isSyncingRef.current && onStateChange({ state: videoRef.current?.paused ? 'PAUSED' : 'PLAYING', currentTime: videoRef.current?.currentTime || 0, playbackRate: currentSpeed, timestamp: Date.now() })}
            className="w-full h-full object-contain pointer-events-auto"
          />
          {!isHost && <div className="absolute inset-0 z-20 bg-transparent pointer-events-auto cursor-default" />}
        </div>
      ) : (
        /* 6. BOŞ DURUM */
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-1.5 text-center p-4 text-gray-500 text-xs">
          <span className="font-semibold text-gray-400">{t.noMediaTitle}</span>
          <span className="text-[11px] text-gray-600">{t.noMediaDesc}</span>
        </div>
      )}

      {/* DANMAKU */}
      {danmakuEnabled && (
        <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
          {danmakuList.map((d) => (
            <div
              key={d.id}
              className="absolute text-sm font-bold text-white whitespace-nowrap animate-danmaku drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
              style={{ top: `${d.top}%` }}
            >
              <span className="font-semibold mr-1" style={{ color: d.color || '#93c5fd' }}>[{d.sender}]:</span> {d.text}
            </div>
          ))}
        </div>
      )}

      {/* LAZER TUVALİ */}
      <canvas
        ref={canvasRef}
        width={800}
        height={450}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`absolute inset-0 z-35 w-full h-full touch-none ${
          isLaserMode ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
        }`}
      />

      {/* EŞİTLENDİ BİLDİRİMİ */}
      {syncToast && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-emerald-600/90 text-white font-bold text-xs px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md animate-bounce flex items-center gap-1.5 border border-emerald-400">
          <Zap size={14} fill="currentColor" /> {t.syncedToast}
        </div>
      )}

      {/* ÜST KONTROL ÇUBUKLARI */}
      <div className="absolute top-3 inset-x-3 z-40 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setIsLaserMode((prev) => !prev)}
            className={`p-2 rounded-xl backdrop-blur-md border text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-lg ${
              isLaserMode
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                : 'bg-black/75 hover:bg-black/90 text-gray-300 border-white/10'
            }`}
            title={isLaserMode ? t.laserOn : t.laser}
          >
            <Wand2 size={15} />
            <span className="hidden sm:inline">{isLaserMode ? t.laserOn : t.laser}</span>
          </button>

          {isHost && (sourceUrl || isLiveStreamActive) && (
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu((p) => !p)}
                className="bg-black/75 hover:bg-black/90 text-white p-2 rounded-xl backdrop-blur-md border border-white/10 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-lg"
                title={t.playbackSpeed}
              >
                <Gauge size={14} />
                <span>{currentSpeed}x</span>
              </button>

              {showSpeedMenu && (
                <div className="absolute top-full left-0 mt-1 bg-slate-900/95 backdrop-blur-md border border-white/15 rounded-xl p-1 shadow-2xl flex flex-col gap-1 z-50 text-[11px] min-w-17.5">
                  {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`px-2 py-1 rounded-lg font-bold flex items-center justify-between cursor-pointer transition-colors ${
                        currentSpeed === s ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <span>{s}x</span>
                      {currentSpeed === s && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isHost && (sourceUrl || isLiveStreamActive) && (
            <button
              onClick={handleJumpToHost}
              className="bg-amber-500/90 hover:bg-amber-400 text-black font-black px-2.5 py-1.5 rounded-xl backdrop-blur-md border border-amber-300 text-xs flex items-center gap-1 cursor-pointer shadow-lg transition-transform active:scale-95"
              title={t.syncHostTitle}
            >
              <Zap size={14} fill="currentColor" />
              <span>{t.syncHost}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
          <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md border border-white/10 px-2 py-1.5 rounded-xl shadow-lg">
            <button
              onClick={handleToggleMute}
              className="text-gray-300 hover:text-white cursor-pointer"
              title={isLocalMuted ? t.unmuteBtn : 'Mute'}
            >
              {isLocalMuted || localVolume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={isLocalMuted ? 0 : localVolume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
              className="w-10 sm:w-16 accent-blue-500 cursor-pointer h-1 bg-white/20 rounded-lg"
            />
          </div>

          <button
            onClick={handleToggleCc}
            className={`p-2 rounded-xl backdrop-blur-md border text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-lg ${
              isCcActive
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-black/75 hover:bg-black/90 text-gray-300 border-white/10'
            }`}
            title={t.captionsTitle}
          >
            <Subtitles size={15} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowQualityMenu((p) => !p)}
              className="bg-black/75 hover:bg-black/90 text-white p-2 rounded-xl backdrop-blur-md border border-white/10 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-lg"
              title={t.qualityTitle}
            >
              <SettingsIcon size={14} />
              <span className="uppercase text-[10px]">{selectedQuality === 'auto' ? t.autoQuality : selectedQuality.replace('hd', '') + 'p'}</span>
            </button>

            {showQualityMenu && (
              <div className="absolute top-full right-0 mt-1 bg-slate-900/95 backdrop-blur-md border border-white/15 rounded-xl p-1 shadow-2xl flex flex-col gap-1 z-50 text-[11px] min-w-21.25">
                {[
                  { id: 'auto', label: t.autoQuality },
                  { id: 'hd1080', label: '1080p' },
                  { id: 'hd720', label: '720p' },
                  { id: 'large', label: '480p' },
                  { id: 'medium', label: '360p' }
                ].map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleQualityChange(q.id)}
                    className={`px-2 py-1 rounded-lg font-bold flex items-center justify-between cursor-pointer transition-colors ${
                      selectedQuality === q.id ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    <span>{q.label}</span>
                    {selectedQuality === q.id && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(sourceUrl || isLiveStreamActive || localVideoUrl) && (
            <button
              onClick={toggleFullscreen}
              className="bg-black/75 hover:bg-black/90 text-white p-2 rounded-xl backdrop-blur-md border border-white/10 transition-all cursor-pointer shadow-lg active:scale-95"
              title={t.fullscreenTitle}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}