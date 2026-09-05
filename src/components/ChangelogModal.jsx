import React from 'react';
import { X, Sparkles, FileVideo, Gamepad2, Zap, Smartphone } from 'lucide-react';
import { translations } from '../locales/translations';

export default function ChangelogModal({ isOpen, onClose, theme, lang = 'tr' }) {
  if (!isOpen) return null;
  const t = translations[lang] || translations.tr;

  const features = [
    {
      icon: <FileVideo size={18} className="text-blue-500" />,
      title: t.featureLocalVideoTitle,
      desc: t.featureLocalVideoDesc
    },
    {
      icon: <Gamepad2 size={18} className="text-amber-500" />,
      title: t.featureMiniGamesTitle,
      desc: t.featureMiniGamesDesc
    },
    {
      icon: <Zap size={18} className="text-emerald-500" />,
      title: t.featureConnectionTitle,
      desc: t.featureConnectionDesc
    },
    {
      icon: <Smartphone size={18} className="text-purple-500" />,
      title: t.featureMobileOptTitle,
      desc: t.featureMobileOptDesc
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className={`${theme.panel} w-full max-w-md p-5 flex flex-col shadow-2xl max-h-[90vh] space-y-3`}>
        {/* Başlık */}
        <div className="flex items-center justify-between pb-2 border-b border-black/10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-400 text-black border border-black shadow-[2px_2px_0px_#000]">
              <Sparkles size={16} />
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-black tracking-wide">{t.changelogTitle}</h3>
              <p className="text-[10px] opacity-70">{t.changelogSubtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 cursor-pointer opacity-70 hover:opacity-100">
            <X size={18} />
          </button>
        </div>

        {/* Özellik Listesi */}
        <div className="space-y-2.5 overflow-y-auto pr-1 py-1">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-black/10 bg-black/5 flex items-start gap-2.5 transition-all hover:bg-black/10"
            >
              <div className="p-2 rounded-lg bg-black/10 shrink-0 mt-0.5">
                {item.icon}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-black">{item.title}</span>
                <span className="text-[11px] opacity-80 leading-relaxed">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Kapat Butonu */}
        <button
          type="button"
          onClick={onClose}
          className={`w-full py-2 rounded-xl text-xs font-black cursor-pointer shadow-md ${theme.buttonPrimary}`}
        >
          {t.closeBtn || 'Kapat'}
        </button>
      </div>
    </div>
  );
}