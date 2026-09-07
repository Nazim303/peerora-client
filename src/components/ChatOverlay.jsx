import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { translations } from '../locales/translations';

const EMOJIS = ['❤️', '🔥', '😂', '👍', '🎉', '😮'];

export default function ChatOverlay({ 
  messages, 
  onSendMessage, 
  onSendReaction, 
  onTyping, 
  typingUser, 
  danmakuEnabled, 
  onToggleDanmaku,
  currentUsername,
  currentUserId,
  userColor,
  theme,
  isMuted,
  lang = 'tr'
}) {
  const [text, setText] = useState('');
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const t = translations[lang] || translations.tr;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  const handleInputChange = (e) => {
    setText(e.target.value);
    onTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 1500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage({ text: text.trim(), type: 'TEXT', color: userColor });
    setText('');
    onTyping(false);
  };

  return (
    <div className={`flex flex-col h-full ${theme.panel} p-3 relative shadow-xl select-none`}>
      {/* Danmaku Barı */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/10 text-[11px] shrink-0">
        <span className="font-bold opacity-80">{t.liveChat}</span>
        <button
          type="button"
          onClick={onToggleDanmaku}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${theme.badge}`}
        >
          <MessageSquare size={12} />
          <span>{danmakuEnabled ? t.danmakuOn : t.danmakuOff}</span>
        </button>
      </div>

      {/* Mesaj Akışı */}
      <div className="flex-1 overflow-y-auto space-y-2.5 mb-2 pr-1 min-h-0">
        {messages.length === 0 ? (
          <div className="text-xs opacity-60 text-center mt-6">{t.chatEmpty}</div>
        ) : (
          messages.map((m) => {
            const isBot = m.senderId === 'system' || m.sender.includes('Bot');
            const isMe = !isBot && (m.senderId ? m.senderId === currentUserId : m.sender === currentUsername);

            return (
              <div key={m.id} className={`flex flex-col ${isBot ? 'items-center my-1' : isMe ? 'items-end' : 'items-start'}`}>
                <span 
                  className={`text-[10px] font-bold mb-0.5 px-1 ${isBot ? 'text-emerald-500' : ''}`}
                  style={{ color: !isBot ? (m.color || (isMe ? '#3b82f6' : '#8b5cf6')) : undefined }}
                >
                  {isBot ? m.sender : isMe ? t.you : m.sender}
                </span>

                <div className={`max-w-[85%] px-3 py-1.5 text-xs leading-relaxed break-words ${
                  isBot ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 text-center font-bold' : isMe ? theme.chatMe : theme.chatOther
                }`}>
                  {m.text}
                </div>
              </div>
            );
          })
        )}
        {typingUser && (
          <div className="text-[11px] opacity-70 italic flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {typingUser} {t.typing}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Emojiler */}
      <div className="flex gap-2 mb-2 justify-around py-1.5 bg-black/5 rounded-xl shrink-0">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSendReaction(emoji)}
            className="text-lg hover:scale-125 active:scale-95 transition-transform cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Giriş Formu (Muted olsa bile misafir yazabilir) */}
      <form onSubmit={handleSubmit} className="flex gap-1.5 shrink-0">
        <input
          type="text"
          value={text}
          onChange={handleInputChange}
          placeholder={t.chatPlaceholder}
          className={`flex-1 ${theme.input} text-xs px-3 py-2 outline-none`}
        />
        <button
          type="submit"
          className={`${theme.buttonPrimary} p-2 rounded-xl cursor-pointer shrink-0 flex items-center justify-center`}
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}