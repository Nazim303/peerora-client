import React from 'react';
import { X, Mail, Globe, Heart, ShieldCheck, Code2 } from 'lucide-react';

export default function AboutModal({ isOpen, onClose, theme }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${theme.panel} w-full max-w-sm p-6 flex flex-col shadow-2xl space-y-4`}>
        {/* Başlık */}
        <div className="flex items-center justify-between pb-3 border-b border-black/10">
          <div className="flex items-center gap-2 font-black text-sm">
            <Code2 size={18} /> Geliştirici & Proje Hakkında
          </div>
          <button onClick={onClose} className="cursor-pointer opacity-70 hover:opacity-100">
            <X size={18} />
          </button>
        </div>

        {/* Profil Kartı */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md border-2 border-black">
            NB
          </div>
          <div>
            <h3 className="text-sm font-black">Nazım Beyaz</h3>
            <p className="text-[11px] opacity-75">Full-Stack & Game Developer</p>
          </div>
        </div>

        {/* Açıklama */}
        <p className="text-xs opacity-85 text-center leading-relaxed">
          <strong>Peerora</strong>, WebRTC Mesh ve Socket.io altyapısı kullanılarak eş zamanlı video izleme, sesli sohbet ve ortak ekran paylaşımı amacıyla geliştirilmiş açık kaynaklı P2P platformudur.
        </p>

        {/* Güvenlik & Gizlilik Notu */}
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-[11px] text-emerald-700 font-bold">
          <ShieldCheck size={16} className="shrink-0 text-emerald-600" />
          <span>Uçtan uca doğrudan eşler arası (P2P) şifreli veri aktarımı.</span>
        </div>

        {/* Linkler */}
        <div className="space-y-1.5 pt-1">
          <a
            href="https://github.com/Nazim303"
            target="_blank"
            rel="noreferrer"
            className="w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-black/10 bg-black/5 hover:bg-black/10 transition-colors"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub Profilim
          </a>
          <a
            href="mailto: nazimbeyaz11@gmail.com"
            className="w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-black/10 bg-black/5 hover:bg-black/10 transition-colors"
          >
            <Mail size={15} /> İletişim / E-Posta
          </a>
        </div>

        <div className="text-center text-[10px] opacity-50 flex items-center justify-center gap-1">
          Made with <Heart size={11} className="text-rose-500 fill-rose-500" /> by Nazım Beyaz
        </div>
      </div>
    </div>
  );
}