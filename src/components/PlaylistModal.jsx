import React, { useState } from 'react';
import { X, Plus, Trash2, Play, ListMusic, Loader2 } from 'lucide-react';

function extractTitleFromUrl(url) {
  if (!url) return '';
  const isYt = url.includes('youtube.com') || url.includes('youtu.be');
  if (isYt) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const id = match && match[2].length === 11 ? match[2] : '';
    return id ? `YouTube Videosu (${id})` : 'YouTube Videosu';
  }
  const cleanName = url.split('/').pop().split('#')[0].split('?')[0];
  return cleanName ? decodeURIComponent(cleanName) : 'Web Video Akışı';
}

export default function PlaylistModal({ 
  isOpen, 
  onClose, 
  playlist, 
  onAddToPlaylist, 
  onRemoveFromPlaylist, 
  onPlayNext, 
  isHost,
  theme
}) {
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [isLoadingTitle, setIsLoadingTitle] = useState(false);

  if (!isOpen) return null;

  const handleUrlChange = async (url) => {
    setUrlInput(url);
    if (!url.trim()) return setTitleInput('');

    setTitleInput(extractTitleFromUrl(url));

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      setIsLoadingTitle(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      try {
        const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url.trim())}`, { signal: controller.signal });
        const data = await res.json();
        if (data.title) setTitleInput(data.title);
      } catch (err) {}
      finally {
        clearTimeout(timeoutId);
        setIsLoadingTitle(false);
      }
    }
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const isYt = urlInput.includes('youtube.com') || urlInput.includes('youtu.be');
    onAddToPlaylist({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: titleInput.trim() || extractTitleFromUrl(urlInput),
      url: urlInput.trim(),
      type: isYt ? 'YOUTUBE' : 'DIRECT'
    });

    setUrlInput('');
    setTitleInput('');
    setIsLoadingTitle(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${theme.panel} w-full max-w-sm p-4 flex flex-col max-h-[85vh] shadow-2xl`}>
        {/* Başlık */}
        <div className="flex items-center justify-between pb-3 border-b border-black/10">
          <div className="flex items-center gap-2 font-black text-sm">
            <ListMusic size={18} /> Oynatma Sırası ({playlist.length})
          </div>
          <button onClick={onClose} className="cursor-pointer opacity-70 hover:opacity-100">
            <X size={18} />
          </button>
        </div>

        {/* Ekleme Formu */}
        <form onSubmit={handleAdd} className="flex flex-col gap-2 my-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="YouTube veya MP4 URL..."
              value={urlInput}
              onChange={(e) => handleUrlChange(e.target.value)}
              className={`flex-1 ${theme.input} text-xs px-3 py-2 outline-none`}
            />
            <button
              type="submit"
              className={`${theme.buttonPrimary} px-3 py-2 text-xs font-bold flex items-center gap-1 cursor-pointer`}
            >
              <Plus size={14} /> Ekle
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Video Başlığı (Otomatik algılanır)..."
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className={`w-full ${theme.input} text-xs px-3 py-2 outline-none pr-8`}
            />
            {isLoadingTitle && <Loader2 size={14} className="absolute right-2.5 top-2.5 animate-spin opacity-70" />}
          </div>
        </form>

        {/* Sıradakine Geç */}
        {isHost && playlist.length > 0 && (
          <button
            onClick={onPlayNext}
            className={`w-full mb-3 ${theme.buttonPrimary} py-2 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-lg`}
          >
            <Play size={14} fill="currentColor" /> Sıradaki Videoyu Başlat
          </button>
        )}

        {/* Liste */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {playlist.length === 0 ? (
            <div className="text-center text-xs opacity-60 py-8">
              Sırada video yok. İstediğiniz bir videoyu yukarıdan ekleyin!
            </div>
          ) : (
            playlist.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 bg-black/5 rounded-xl border border-black/10"
              >
                <div className="flex items-center gap-2 overflow-hidden pr-2">
                  <span className="text-xs font-black">#{idx + 1}</span>
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-bold truncate">{item.title}</span>
                    <span className="text-[10px] opacity-70 truncate">{item.type}</span>
                  </div>
                </div>

                {isHost && (
                  <button
                    onClick={() => onRemoveFromPlaylist(item.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-500 cursor-pointer"
                    title="Sıradan Kaldır"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}