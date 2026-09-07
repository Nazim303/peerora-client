import React from 'react';
import { X, Users, Crown, MicOff, Mic, UserMinus } from 'lucide-react';
import { translations } from '../locales/translations';

export default function UserListModal({ 
  isOpen, 
  onClose, 
  users, 
  currentUserId, 
  isHost, 
  onTransferHost, 
  onToggleMute, 
  onKick, 
  theme,
  speakingUsers = {},
  canTransferHost = true,
  lang = 'tr'
}) {
  if (!isOpen) return null;
  const t = translations[lang] || translations.tr;

  const handleTransferClick = (targetId) => {
    if (!canTransferHost) {
      alert(t.cannotTransferHostMediaNotice || 'Ekranda aktif bir video varken liderlik devredilemez. Önce videoyu kapatın veya bir oyun başlatın.');
      return;
    }
    onTransferHost(targetId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className={`${theme.panel} w-full max-w-sm p-4 flex flex-col max-h-[85vh] shadow-2xl`}>
        {/* Başlık */}
        <div className="flex items-center justify-between pb-3 border-b border-black/10 shrink-0">
          <div className="flex items-center gap-2 font-black text-sm">
            <Users size={18} /> {t.usersInRoom} ({users.length})
          </div>
          <button onClick={onClose} className="cursor-pointer opacity-70 hover:opacity-100 p-1">
            <X size={18} />
          </button>
        </div>

        {/* Kullanıcı Listesi */}
        <div className="space-y-2 my-3 overflow-y-auto pr-1 min-h-0">
          {users.map((u) => {
            const isMe = u.id === currentUserId;
            const isSpeaking = speakingUsers[u.id] > 0.15;

            return (
              <div
                key={u.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-black/10 bg-black/5"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-150 shrink-0 ${
                      isSpeaking ? 'bg-emerald-400 scale-125 shadow-[0_0_8px_#34d399]' : 'bg-gray-400'
                    }`}
                  />
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-bold truncate flex items-center gap-1.5">
                      {u.username} {isMe && <span className="opacity-60">({t.you})</span>}
                      {u.isHost && <Crown size={13} className="text-amber-400 shrink-0" />}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {u.isHost ? t.roomHostBadge : u.isMuted ? (t.voiceMutedBadge || t.mutedBadge) : t.viewerBadge}
                    </span>
                  </div>
                </div>

                {/* Host Moderasyon Butonları */}
                {isHost && !isMe && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTransferClick(u.id)}
                      className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                        canTransferHost 
                          ? 'hover:bg-amber-500/20 text-amber-500 active:scale-95' 
                          : 'opacity-40 text-gray-400 hover:bg-black/5'
                      }`}
                      title={canTransferHost ? t.transferHostTitle : (t.cannotTransferHostMediaNotice || t.transferHostTitle)}
                    >
                      <Crown size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleMute(u.id)}
                      className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                        u.isMuted ? 'bg-rose-500/20 text-rose-500' : 'hover:bg-black/10 text-gray-400'
                      }`}
                      title={u.isMuted ? t.unmuteUserTitle : t.muteUserTitle}
                    >
                      {u.isMuted ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onKick(u.id)}
                      className="p-1.5 hover:bg-rose-500/20 text-rose-500 rounded-lg cursor-pointer transition-colors"
                      title={t.kickUserTitle}
                    >
                      <UserMinus size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}