import React from 'react';
import { Star, Heart, X, ExternalLink } from 'lucide-react';
import { translations } from '../locales/translations';

export default function RatingModal({ isOpen, onClose, theme, lang = 'tr' }) {
  if (!isOpen) return null;
  const t = translations[lang] || translations.tr;

  const APKPURE_URL = 'https://apkpure.com/p/com.theosdev.peerora'; // APKPure sayfanız

  const handleRateNow = () => {
    localStorage.setItem('p2p_rate_status', 'rated');
    window.open(APKPURE_URL, '_blank');
    onClose();
  };

  const handleRateLater = () => {
    onClose();
  };

  const handleNeverAsk = () => {
    localStorage.setItem('p2p_rate_status', 'never');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in">
      <div className={`${theme.panel} w-full max-w-sm p-6 flex flex-col items-center text-center shadow-2xl relative space-y-4`}>
        {/* Kapat Butonu */}
        <button 
          onClick={handleRateLater}
          className="absolute top-3 right-3 p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* İkon */}
        <div className="w-14 h-14 rounded-2xl bg-amber-400 text-black border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_#000] animate-bounce">
          <Star size={28} fill="currentColor" />
        </div>

        {/* Başlık & Açıklama */}
        <div className="space-y-1">
          <h3 className="text-base font-black tracking-wide">
            {t.rateAppTitle || "Peerora'yı Beğendiniz mi?"}
          </h3>
          <p className="text-xs opacity-75 leading-relaxed">
            {t.rateAppDesc || "Deneyiminizi geliştirmemize yardımcı olmak için APKPure'da değerlendirme bırakmak ister misiniz?"}
          </p>
        </div>

        {/* Yıldız Görseli */}
        <div className="flex items-center gap-1.5 text-amber-400">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} size={20} fill="currentColor" />
          ))}
        </div>

        {/* Butonlar */}
        <div className="w-full space-y-2 pt-1">
          {/* Evet */}
          <button
            type="button"
            onClick={handleRateNow}
            className={`w-full py-2.5 rounded-xl text-xs font-black cursor-pointer shadow-md flex items-center justify-center gap-1.5 ${theme.buttonPrimary}`}
          >
            <Heart size={14} fill="currentColor" className="text-rose-500" />
            <span>{t.rateYes || "Evet, Değerlendir"}</span>
            <ExternalLink size={12} />
          </button>

          {/* Belki Sonra */}
          <button
            type="button"
            onClick={handleRateLater}
            className={`w-full py-2 rounded-xl text-xs font-bold cursor-pointer opacity-80 hover:opacity-100 ${theme.buttonSecondary}`}
          >
            {t.rateLater || "Belki Sonra"}
          </button>

          {/* Tekrar Sorma */}
          <button
            type="button"
            onClick={handleNeverAsk}
            className="text-[11px] opacity-50 hover:opacity-80 underline cursor-pointer pt-1 block mx-auto"
          >
            {t.rateNever || "Bir daha sorma"}
          </button>
        </div>
      </div>
    </div>
  );
}