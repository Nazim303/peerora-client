import React from 'react';
import { X, Palette, User, Settings as SettingsIcon, Languages } from 'lucide-react';
import { THEMES } from '../themeConfig';
import { translations } from '../locales/translations';

export const COLOR_PALETTE = [
  '#3b82f6', '#ec4899', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#111827'
];

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  userColor, 
  onColorChange, 
  selectedTheme, 
  onThemeChange,
  lang,
  onLangChange
}) {
  if (!isOpen) return null;

  const currentTheme = THEMES[selectedTheme] || THEMES.neo_brutalism;
  const t = translations[lang] || translations.tr;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${currentTheme.panel} w-full max-w-md p-5 flex flex-col shadow-2xl max-h-[90vh]`}>
        {/* Başlık */}
        <div className="flex items-center justify-between pb-3 border-b border-black/10">
          <div className="flex items-center gap-2 font-black text-sm">
            <SettingsIcon size={18} /> {t.settingsTitle}
          </div>
          <button onClick={onClose} className="p-1 cursor-pointer opacity-70 hover:opacity-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 my-3 overflow-y-auto pr-1">
          {/* Dil Seçici */}
          <div>
            <label className="text-xs font-bold flex items-center gap-1.5 mb-2">
              <Languages size={14} /> {t.languageSelect}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onLangChange('tr')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  lang === 'tr'
                    ? 'border-2 border-black bg-black/15 font-black shadow-sm'
                    : 'border-black/10 hover:bg-black/5 opacity-70'
                }`}
              >
                🇹🇷 Türkçe
              </button>
              <button
                type="button"
                onClick={() => onLangChange('en')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  lang === 'en'
                    ? 'border-2 border-black bg-black/15 font-black shadow-sm'
                    : 'border-black/10 hover:bg-black/5 opacity-70'
                }`}
              >
                🇬🇧 English
              </button>
            </div>
          </div>

          {/* İsim Rengi */}
          <div>
            <label className="text-xs font-bold flex items-center gap-1.5 mb-2">
              <User size={14} /> {t.nameColor}
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  className={`w-7 h-7 rounded-full cursor-pointer transition-transform ${
                    userColor === color ? 'scale-125 ring-2 ring-black shadow-md' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Tema Seçici */}
          <div>
            <label className="text-xs font-bold flex items-center gap-1.5 mb-2">
              <Palette size={14} /> {t.themeSelect}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {Object.values(THEMES).map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => onThemeChange(theme.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedTheme === theme.id
                      ? 'border-2 border-black bg-black/10 shadow-sm font-bold'
                      : 'border border-black/10 hover:bg-black/5 opacity-80'
                  }`}
                >
                  <div className="flex flex-col pr-2">
                    <span className="text-xs font-bold">{theme.name}</span>
                    <span className="text-[10px] opacity-75">{theme.desc}</span>
                  </div>
                  <span className={`w-4 h-4 rounded-full shrink-0 ${theme.previewAccent}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}