import React from 'react';
import { X, Users, Crown, MicOff, Mic, UserMinus, ShieldCheck } from 'lucide-react';

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
  speakingUsers 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${theme.panel} w-full max-w-sm p-4 flex flex-col max-h-[85vh] shadow-2xl`}>
        {/* Başlık */}
        <div className="flex items-center justify-between pb-3 border-b border-black/10">
          <div className="flex items-center gap-2 font-black text-sm">
            <Users size={18} /> Odadaki Kullanıcılar ({users.length})
          </div>
          <button onClick={onClose} className="cursor-pointer opacity-70 hover:opacity-100">
            <X size={18} />
          </button>
        </div>

        {/* Kullanıcı Listesi */}
        <div className="space-y-2 my-3 overflow-y-auto pr-1">
          {users.map((u) => {
            const isMe = u.id === currentUserId;
            const isSpeaking = speakingUsers[u.id] > 0.15;

            return (
              <div
                key={u.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-black/10 bg-black/5"
              >
                <div className="flex items-center gap-2.5 truncate">
                  {/* Konuşma Ses Halkası */}
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-150 ${
                      isSpeaking ? 'bg-emerald-400 scale-125 shadow-[0_0_8px_#34d399]' : 'bg-gray-400'
                    }`}
                  />
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-bold truncate flex items-center gap-1.5">
                      {u.username} {isMe && <span className="opacity-60">(Sen)</span>}
                      {u.isHost && <Crown size={13} className="text-amber-400 shrink-0" />}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {u.isHost ? 'Oda Lideri' : u.isMuted ? 'Sohbeti Susturuldu' : 'İzleyici'}
                    </span>
                  </div>
                </div>

                {/* Host Moderasyon Butonları */}
                {isHost && !isMe && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onTransferHost(u.id)}
                      className="p-1.5 hover:bg-amber-500/20 text-amber-500 rounded-lg cursor-pointer transition-colors"
                      title="Liderliği Devret"
                    >
                      <Crown size={15} />
                    </button>

                    <button
                      onClick={() => onToggleMute(u.id)}
                      className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                        u.isMuted ? 'bg-rose-500/20 text-rose-500' : 'hover:bg-black/10 text-gray-400'
                      }`}
                      title={u.isMuted ? 'Susturmayı Kaldır' : 'Sohbeti Sustur'}
                    >
                      {u.isMuted ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>

                    <button
                      onClick={() => onKick(u.id)}
                      className="p-1.5 hover:bg-rose-500/20 text-rose-500 rounded-lg cursor-pointer transition-colors"
                      title="Odadan At"
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