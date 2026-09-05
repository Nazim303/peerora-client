import React, { useRef, useState, useEffect } from 'react';
import { Trash2, StopCircle, Clock, Eye, EyeOff, Hourglass, Vote, Trophy, RefreshCw, CheckCircle2 } from 'lucide-react';
import { translations } from '../locales/translations';

export default function GameStage({ game, socket, isHost, userColor, onEndGame, lang = 'tr' }) {
  const t = translations[lang] || translations.tr;
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [showRole, setShowRole] = useState(true);

  const [spyPhase, setSpyPhase] = useState(game?.phase || 'PLAYING');
  const [timeLeft, setTimeLeft] = useState(300);
  const [playerList, setPlayerList] = useState(game?.users || []);
  const [selectedVoteId, setSelectedVoteId] = useState(null);
  const [voteProgress, setVoteProgress] = useState({ votedCount: 0, totalCount: game?.users?.length || 0 });
  const [gameResult, setGameResult] = useState(null);

  const isMyTurnToDraw = game?.type === 'DOODLE' && game.drawerId === socket.id;

  // Yeni Tur Başladığında State'leri Otomatik Sıfırla
  useEffect(() => {
    if (game?.type === 'SPYFALL') {
      setSpyPhase(game.phase || 'PLAYING');
      if (game.phase === 'PLAYING') {
        setGameResult(null);
        setSelectedVoteId(null);
        setShowRole(true);
      }
      if (game.users) setPlayerList(game.users);
    }
  }, [game]);

  // Çiz & Bil Tuval Dinleyicileri (drawerId değiştikçe taze dinleyici bağlar)
  useEffect(() => {
    if (game?.type !== 'DOODLE' || game.isSpectator) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const handleRemoteStroke = (stroke) => {
      ctx.strokeStyle = stroke.color || '#000';
      ctx.lineWidth = stroke.width || 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.fromX * canvas.width, stroke.fromY * canvas.height);
      ctx.lineTo(stroke.toX * canvas.width, stroke.toY * canvas.height);
      ctx.stroke();
    };

    const handleClear = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    socket.on('game:draw_stroke', handleRemoteStroke);
    socket.on('game:clear_canvas', handleClear);

    return () => {
      socket.off('game:draw_stroke', handleRemoteStroke);
      socket.off('game:clear_canvas', handleClear);
    };
  }, [game?.type, game?.isSpectator, game?.drawerId, socket]);

  // Spyfall Soket Dinleyicileri
  useEffect(() => {
    if (game?.type !== 'SPYFALL') return;

    const onPhaseChange = ({ phase, endTime, users }) => {
      setSpyPhase(phase);
      if (users) setPlayerList(users);
      setSelectedVoteId(null);
    };

    const onVoteProgress = (data) => setVoteProgress(data);
    const onResult = (resultData) => {
      setSpyPhase('RESULT');
      setGameResult(resultData);
    };

    socket.on('game:spyfall_phase_change', onPhaseChange);
    socket.on('game:spyfall_vote_progress', onVoteProgress);
    socket.on('game:spyfall_result', onResult);

    return () => {
      socket.off('game:spyfall_phase_change', onPhaseChange);
      socket.off('game:spyfall_vote_progress', onVoteProgress);
      socket.off('game:spyfall_result', onResult);
    };
  }, [game?.type, socket]);

  // Geri Sayım Sayacı
  useEffect(() => {
    if (game?.type !== 'SPYFALL' || spyPhase === 'RESULT' || !game.endTime) return;

    const timer = setInterval(() => {
      const rem = Math.max(Math.round((game.endTime - Date.now()) / 1000), 0);
      setTimeLeft(rem);

      if (rem <= 0) {
        clearInterval(timer);
        if (isHost) socket.emit('game:spyfall_time_up');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [game?.type, game?.endTime, spyPhase, isHost, socket]);

  const lastPosRef = useRef({ x: 0, y: 0 });

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    };
  };

  const handleStartDraw = (e) => {
    if (!isMyTurnToDraw) return;
    isDrawingRef.current = true;
    lastPosRef.current = getCanvasCoords(e);
  };

  const handleMoveDraw = (e) => {
    if (!isDrawingRef.current || !isMyTurnToDraw || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const newPos = getCanvasCoords(e);

    ctx.strokeStyle = userColor || '#000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x * canvas.width, lastPosRef.current.y * canvas.height);
    ctx.lineTo(newPos.x * canvas.width, newPos.y * canvas.height);
    ctx.stroke();

    socket.emit('game:draw_stroke', {
      fromX: lastPosRef.current.x,
      fromY: lastPosRef.current.y,
      toX: newPos.x,
      toY: newPos.y,
      color: userColor || '#000',
      width: 3
    });

    lastPosRef.current = newPos;
  };

  const handleStopDraw = () => {
    isDrawingRef.current = false;
  };

  const clearMyCanvas = () => {
    if (!isMyTurnToDraw || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    socket.emit('game:clear_canvas');
  };

  const handleCastVote = (targetId) => {
    if (selectedVoteId || targetId === socket.id) return;
    setSelectedVoteId(targetId);
    socket.emit('game:spyfall_vote', { targetId });
  };

  if (game.isSpectator) {
    return (
      <div className="relative w-full min-h-[260px] md:aspect-video bg-white rounded-2xl overflow-hidden shadow-2xl border-2 border-black flex flex-col items-center justify-center p-6 text-center gap-3 select-none">
        <div className="p-3 bg-amber-500/20 text-amber-700 rounded-2xl animate-bounce">
          <Hourglass size={32} />
        </div>
        <h3 className="text-sm font-black text-black uppercase tracking-wider">{t.waitingForRound}</h3>
        <p className="text-xs text-black/70 max-w-xs">{t.spectatorNotice}</p>
        {isHost && (
          <button
            type="button"
            onClick={onEndGame}
            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer hover:bg-rose-700 shadow-md mt-2"
          >
            <StopCircle size={14} /> {t.endGameBtn}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[260px] md:aspect-video bg-white rounded-2xl overflow-hidden shadow-2xl border-2 border-black flex flex-col items-center justify-between p-2.5 sm:p-3 select-none">
      {/* Üst Bar (Her Aşamada ve İki Oyunda da Görünür) */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-black/10 z-20 shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden pr-1">
          <span className="font-black text-xs text-black shrink-0">
            {game.type === 'DOODLE' ? t.doodleGameTitle : t.spyfallGameTitle}
          </span>
          {game.type === 'DOODLE' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/10 text-black shrink-0">
              {isMyTurnToDraw ? `🎨 ${t.drawerRole}` : `👀 ${game.drawerName}`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {game.type === 'DOODLE' && isMyTurnToDraw && (
            <button
              type="button"
              onClick={clearMyCanvas}
              className="p-1.5 rounded-lg bg-black/10 hover:bg-rose-500/20 text-black hover:text-rose-600 cursor-pointer transition-colors"
              title={t.clearCanvas}
            >
              <Trash2 size={15} />
            </button>
          )}

          {game.type === 'SPYFALL' && spyPhase === 'PLAYING' && isHost && (
            <button
              type="button"
              onClick={() => socket.emit('game:spyfall_start_voting')}
              className="px-2 py-1 rounded-lg bg-amber-500 text-black font-black text-[11px] flex items-center gap-1 cursor-pointer hover:bg-amber-400 shadow-sm"
              title={t.startVotingBtn}
            >
              <Vote size={13} /> {t.startVotingBtn}
            </button>
          )}

          {isHost && (
            <button
              type="button"
              onClick={onEndGame}
              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer hover:bg-rose-700 shadow-sm"
            >
              <StopCircle size={13} /> {t.endGameBtn}
            </button>
          )}
        </div>
      </div>

      {/* 1. ÇİZ & BİL */}
      {game.type === 'DOODLE' ? (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {isMyTurnToDraw && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-emerald-600 text-white font-black text-xs px-3 py-1 rounded-full shadow-lg border border-emerald-400 flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
              <span className="opacity-90">{t.secretWord}</span>
              <span className="text-amber-200 underline uppercase tracking-wider text-xs font-black">{game.word}</span>
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            onMouseDown={handleStartDraw}
            onMouseMove={handleMoveDraw}
            onMouseUp={handleStopDraw}
            onMouseLeave={handleStopDraw}
            onTouchStart={handleStartDraw}
            onTouchMove={(e) => { if (e.cancelable) e.preventDefault(); handleMoveDraw(e); }}
            onTouchEnd={handleStopDraw}
            className={`w-full h-full object-contain ${isMyTurnToDraw ? 'cursor-crosshair touch-none' : 'cursor-default pointer-events-none'}`}
          />
        </div>
      ) : spyPhase === 'PLAYING' ? (
        /* 2. SPYFALL: TARTIŞMA */
        <div className="flex-1 flex flex-col items-center justify-center gap-2.5 sm:gap-4 text-center p-2 sm:p-4 my-auto w-full">
          <div className="flex items-center gap-1 text-sm sm:text-base font-mono font-black text-black">
            <Clock size={16} /> {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>

          <div className={`p-3.5 sm:p-5 rounded-2xl border-2 border-black max-w-xs w-full shadow-[3px_3px_0px_#000] ${game.isSpy ? 'bg-rose-400' : 'bg-amber-300'}`}>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase opacity-75 block mb-1 text-black">{t.yourRole}</span>
            {showRole ? (
              <div className="text-sm sm:text-lg font-black text-black">
                {game.isSpy ? t.spyRole : `${t.locationRole} ${game.location}`}
              </div>
            ) : (
              <div className="text-sm font-bold opacity-60 text-black">•••••••••••••••••</div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowRole((p) => !p)}
            className="flex items-center gap-1 text-xs font-bold text-black opacity-80 hover:opacity-100 cursor-pointer pt-1"
          >
            {showRole ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showRole ? t.hideCard : t.showCard}</span>
          </button>
        </div>
      ) : spyPhase === 'VOTING' ? (
        /* 3. SPYFALL: OYLAMA */
        <div className="flex-1 flex flex-col items-center justify-between p-3 w-full max-w-md my-auto gap-2">
          <div className="text-center space-y-0.5">
            <h3 className="text-xs sm:text-sm font-black text-black flex items-center justify-center gap-1.5">
              <Vote size={16} className="text-blue-600" /> {t.votingTitle}
            </h3>
            <p className="text-[11px] text-black/75">{t.votingDesc}</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="text-xs font-mono font-black text-rose-600 flex items-center gap-1">
                <Clock size={13} /> {timeLeft}s
              </span>
              <span className="text-[11px] font-bold text-black/60">
                • {t.votesCountText} {voteProgress.votedCount}/{voteProgress.totalCount}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full max-h-48 overflow-y-auto p-1">
            {playerList.map((player) => {
              const isSelf = player.id === socket.id;
              const isSelected = selectedVoteId === player.id;

              return (
                <button
                  key={player.id}
                  type="button"
                  disabled={isSelf || !!selectedVoteId}
                  onClick={() => handleCastVote(player.id)}
                  className={`p-2.5 rounded-xl border-2 border-black flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-400 shadow-[2px_2px_0px_#000] scale-102 font-black'
                      : isSelf
                      ? 'bg-black/5 opacity-50 cursor-not-allowed border-dashed'
                      : 'bg-white hover:bg-amber-100 shadow-[2px_2px_0px_#000]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-base">{player.avatar || '🐱'}</span>
                    <span className="text-xs font-bold text-black truncate">{player.username}</span>
                  </div>
                  {isSelected && <CheckCircle2 size={14} className="text-black shrink-0" />}
                </button>
              );
            })}
          </div>

          {selectedVoteId && (
            <p className="text-[11px] text-emerald-700 font-bold animate-pulse text-center">
              {t.voteCastNotice}
            </p>
          )}
        </div>
      ) : (
        /* 4. SPYFALL: SONUÇ / KAZANAN EKRANI */
        <div className="flex-1 flex flex-col items-center justify-center p-3 text-center my-auto w-full max-w-sm gap-2.5">
          <div className="flex items-center justify-center p-2.5 rounded-2xl bg-black text-amber-400 border-2 border-black shadow-[4px_4px_0px_#000]">
            <Trophy size={26} />
          </div>

          <div className="space-y-0.5">
            <h3 className={`text-base font-black ${gameResult?.winner === 'INNOCENTS' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {gameResult?.winner === 'INNOCENTS' ? t.innocentsWonTitle : t.spyWonTitle}
            </h3>
            <p className="text-[11px] text-black/80 font-medium">
              {gameResult?.winner === 'INNOCENTS' ? t.innocentsWonDesc : t.spyWonDesc}
            </p>
          </div>

          <div className="p-2.5 bg-amber-100 border-2 border-black rounded-xl shadow-[3px_3px_0px_#000] w-full text-left space-y-1 text-xs text-black">
            {gameResult?.isTie ? (
              <div className="font-bold text-rose-600">⚠️ {t.tieNotice}</div>
            ) : (
              <div>
                <span className="font-bold opacity-75">{t.eliminatedPlayerText} </span>
                <strong className="underline font-black">{gameResult?.eliminatedName}</strong>
              </div>
            )}
            <div>
              <span className="font-bold opacity-75">{t.actualSpyText} </span>
              <strong className="text-rose-600 font-black">{gameResult?.spyName}</strong>
            </div>
            <div>
              <span className="font-bold opacity-75">{t.locationRole} </span>
              <strong className="text-blue-700 font-black">{gameResult?.location}</strong>
            </div>
          </div>

          {isHost && (
            <button
              type="button"
              onClick={() => {
                const locs = t.spyfallLocations || ['Sinema', 'Uçak'];
                const newLocation = locs[Math.floor(Math.random() * locs.length)];
                socket.emit('game:start', { gameType: 'SPYFALL', lang, customConfig: { location: newLocation } });
              }}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000] border-2 border-black"
            >
              <RefreshCw size={14} /> {t.newRoundBtn}
            </button>
          )}
        </div>
      )}
    </div>
  );
}