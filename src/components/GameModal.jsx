import React from 'react';
import { X, Gamepad2, Palette, ShieldAlert } from 'lucide-react';
import { translations } from '../locales/translations';

export default function GameModal({ isOpen, onClose, onStartGame, isHost, theme, lang = 'tr' }) {
  if (!isOpen) return null;
  const t = translations[lang] || translations.tr;

const handleSelect = (type) => {
    if (!isHost) return;
    if (type === 'DOODLE') {
      const words = t.doodleWords || ['Kedi', 'Gitar', 'Pizza'];
      const word = words[Math.floor(Math.random() * words.length)];
      onStartGame('DOODLE', { word, wordList: words });
    } else if (type === 'SPYFALL') {
      const locs = t.spyfallLocations || ['Sinema', 'Uçak'];
      const location = locs[Math.floor(Math.random() * locs.length)];
      onStartGame('SPYFALL', { location });
    }
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${theme.panel} w-full max-w-sm p-4 flex flex-col shadow-2xl`}>
        <div className="flex items-center justify-between pb-3 border-b border-black/10">
          <div className="flex items-center gap-2 font-black text-sm">
            <Gamepad2 size={18} /> {t.gamesTitle}
          </div>
          <button onClick={onClose} className="cursor-pointer opacity-70 hover:opacity-100">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs opacity-75 my-2.5">{t.selectGame}</p>

        <div className="space-y-2.5">
          {/* Çiz & Bil */}
          <button
            onClick={() => handleSelect('DOODLE')}
            disabled={!isHost}
            className="w-full p-3 rounded-xl border border-black/15 bg-black/5 hover:bg-black/10 text-left transition-all cursor-pointer flex items-start gap-3 disabled:opacity-50"
          >
            <div className="p-2 rounded-lg bg-blue-500 text-white shrink-0">
              <Palette size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black">{t.doodleGameTitle}</h4>
              <p className="text-[11px] opacity-70 leading-tight mt-0.5">{t.doodleGameDesc}</p>
            </div>
          </button>

          {/* Casus Kim? */}
          <button
            onClick={() => handleSelect('SPYFALL')}
            disabled={!isHost}
            className="w-full p-3 rounded-xl border border-black/15 bg-black/5 hover:bg-black/10 text-left transition-all cursor-pointer flex items-start gap-3 disabled:opacity-50"
          >
            <div className="p-2 rounded-lg bg-amber-500 text-black shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black">{t.spyfallGameTitle}</h4>
              <p className="text-[11px] opacity-70 leading-tight mt-0.5">{t.spyfallGameDesc}</p>
            </div>
          </button>
        </div>

        {!isHost && (
          <p className="text-[10px] text-amber-600 font-bold text-center mt-3">
            * Sadece oda lideri oyun başlatabilir.
          </p>
        )}
      </div>
    </div>
  );
}