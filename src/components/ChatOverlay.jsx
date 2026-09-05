import React, { useState, useEffect, useRef } from 'react';
import { Send, Image, MessageSquare, Search, X, Loader2, MicOff } from 'lucide-react';
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
  currentUserId, // <-- Eklendi
  userColor,
  theme,
  isMuted,
  lang = 'tr'
}) {
  const [text, setText] = useState('');
  const [showGifModal, setShowGifModal] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const t = translations[lang] || translations.tr;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  const handleInputChange = (e) => {
    if (isMuted) return;
    setText(e.target.value);
    onTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 1500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || isMuted) return;
    onSendMessage({ text: text.trim(), type: 'TEXT', color: userColor });
    setText('');
    onTyping(false);
  };

  const searchGifs = async (query = 'trending') => {
    setIsSearchingGifs(true);
    try {
      const endpoint = query && query !== 'trending'
        ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=16&media_filter=minimal`
        : `https://g.tenor.com/v1/trending?key=LIVDSRZULELA&limit=16&media_filter=minimal`;

      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.results) {
        const urls = data.results.map((item) => item.media[0]?.tinygif?.url || item.media[0]?.gif?.url).filter(Boolean);
        setGifResults(urls);
      }
    } catch (e) {
      console.error('GIF fetch failed:', e);
    } finally {
      setIsSearchingGifs(false);
    }
  };

  const handleSelectGif = (url) => {
    if (isMuted) return;
    onSendMessage({ text: url, type: 'GIF', color: userColor });
    setShowGifModal(false);
    setGifQuery('');
  };

  return (
    <div className={`flex flex-col h-full ${theme.panel} p-3 relative shadow-xl`}>
      {/* Danmaku Barı */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/10 text-[11px]">
        <span className="font-bold opacity-80">{t.liveChat}</span>
        <button
          onClick={onToggleDanmaku}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${theme.badge}`}
        >
          <MessageSquare size={12} />
          <span>{danmakuEnabled ? t.danmakuOn : t.danmakuOff}</span>
        </button>
      </div>

      {/* Mesaj Akışı */}
      <div className="flex-1 overflow-y-auto space-y-2.5 mb-2 pr-1">
       {messages.length === 0 ? (
          <div className="text-xs opacity-60 text-center mt-6">{t.chatEmpty}</div>
        ) : (
          messages.map((m) => {
            const isBot = m.senderId === 'system' || m.sender.includes('Bot');
            // Soket ID'sine göre kesin kıyaslama (Aynı isimli test sekmeleri karışmaz)
            const isMe = !isBot && (m.senderId ? m.senderId === currentUserId : m.sender === currentUsername);

            return (
              <div key={m.id} className={`flex flex-col ${isBot ? 'items-center my-1' : isMe ? 'items-end' : 'items-start'}`}>
                <span 
                  className={`text-[10px] font-bold mb-0.5 px-1 ${isBot ? 'text-emerald-500' : ''}`}
                  style={{ color: !isBot ? (m.color || (isMe ? '#3b82f6' : '#8b5cf6')) : undefined }}
                >
                  {isBot ? m.sender : isMe ? t.you : m.sender}
                </span>

                {m.type === 'GIF' ? (
                  <img src={m.text} alt="GIF" className="rounded-xl max-w-35 max-h-25 object-cover shadow-md border-2 border-black/20" />
                ) : (
                  <div className={`max-w-[85%] px-3 py-1.5 text-xs leading-relaxed wrap-break-word ${
                    isBot ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 text-center font-bold' : isMe ? theme.chatMe : theme.chatOther
                  }`}>
                    {m.text}
                  </div>
                )}
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
      <div className="flex gap-2 mb-2 justify-around py-1.5 bg-black/5 rounded-xl">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="text-lg hover:scale-125 active:scale-95 transition-transform cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Giriş Formu */}
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <button
          type="button"
          disabled={isMuted}
          onClick={() => { setShowGifModal(true); if (!gifResults.length) searchGifs('trending'); }}
          className={`${theme.buttonSecondary} p-2 rounded-xl cursor-pointer disabled:opacity-40`}
          title={t.sendGif}
        >
          <Image size={15} />
        </button>
        <input
          type="text"
          disabled={isMuted}
          value={text}
          onChange={handleInputChange}
          placeholder={isMuted ? t.mutedNotice : t.chatPlaceholder}
          className={`flex-1 ${theme.input} text-xs px-3 py-2 outline-none disabled:opacity-50`}
        />
        <button
          type="submit"
          disabled={isMuted}
          className={`${theme.buttonPrimary} p-2 rounded-xl cursor-pointer disabled:opacity-40`}
        >
          <Send size={15} />
        </button>
      </form>

      {/* Susturuldu Bildirimi */}
      {isMuted && (
        <div className="mt-1 text-[10px] text-rose-500 font-bold flex items-center justify-center gap-1">
          <MicOff size={11} /> {t.mutedStatus}
        </div>
      )}

      {/* GIF Modalı */}
      {showGifModal && !isMuted && (
        <div className={`absolute inset-0 z-50 ${theme.panel} p-3 flex flex-col`}>
          <div className="flex items-center justify-between pb-2 border-b border-black/10">
            <span className="text-xs font-bold">{t.gifSearchTitle}</span>
            <button onClick={() => setShowGifModal(false)} className="cursor-pointer opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-1.5 my-2">
            <input
              type="text"
              placeholder={t.gifSearchPlaceholder}
              value={gifQuery}
              onChange={(e) => setGifQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchGifs(gifQuery))}
              className={`flex-1 ${theme.input} text-xs px-2.5 py-1.5 outline-none`}
            />
            <button
              onClick={() => searchGifs(gifQuery)}
              className={`${theme.buttonPrimary} px-2.5 py-1.5 text-xs cursor-pointer`}
            >
              <Search size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 p-1">
            {isSearchingGifs ? (
              <div className="col-span-2 text-center text-xs opacity-70 py-6 flex items-center justify-center gap-1.5">
                <Loader2 size={14} className="animate-spin" /> {t.gifLoading}
              </div>
            ) : gifResults.length > 0 ? (
              gifResults.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="gif"
                  onClick={() => handleSelectGif(url)}
                  className="rounded-lg w-full h-20 object-cover cursor-pointer hover:opacity-80 active:scale-95 transition-all border border-black/20"
                />
              ))
            ) : (
              <div className="col-span-2 text-center text-xs opacity-60 py-6">{t.gifNotFound}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}