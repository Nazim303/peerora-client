// Peerora v1.2 - Bildirim, İzin ve Ses Servisi

const isTurkishDevice = () => {
  if (typeof navigator === 'undefined') return true;
  const lang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  return lang.startsWith('tr');
};

// Bildirimin kullanıcı ayarlarından kapatılıp kapatılmadığını kontrol eder
export function areNotificationsEnabled() {
  if (typeof window === 'undefined') return true;
  const pref = localStorage.getItem('p2p_notifications_enabled');
  return pref !== 'false';
}

const NOTIFICATION_TEMPLATES = {
  tr: {
    nudgeTitle: "🛎️ Ekrana Çağrılıyorsun!",
    nudgeBody: (name) => `${name} seni video başına çağırıyor, parti devam ediyor!`,
    mediaStartedTitle: "🍿 Yeni Video Başladı!",
    mediaStartedBody: "Odadakiler yeni bir video başlattı, kaçırma!",
    // Kullanıcı uzun süre girmediğinde gönderilen hatırlatma bildirimleri
    comebackReminders: [
      { title: "🍿 Peerora'yı Özledin mi?", body: "Arkadaşlarınla birlikte video veya film izlemenin tam zamanı!" },
      { title: "🎬 Sinema Gecesi Zamanı!", body: "Yeni bir oda aç, patlamış mısırını al ve partiyi başlat." },
      { title: "🎮 Mini Oyunlar Seni Bekliyor!", body: "Kelime Bombası veya Casus Kim oynamak için arkadaşlarını topla!" },
      { title: "✨ Birlikte Zaman Geçirin", body: "Arkadaşlarınla senkronize dizi maratonu yapmak için Peerora'ya dön!" },
      { title: "🎧 Lo-Fi & Rahatlama", body: "Kulaklığını tak, birlikte dinleme odasında günün yorgunluğunu at." }
    ]
  },
  en: {
    nudgeTitle: "🛎️ You're Being Summoned!",
    nudgeBody: (name) => `${name} is calling you back to the screen!`,
    mediaStartedTitle: "🍿 New Media Started!",
    mediaStartedBody: "The room has started a new video, don't miss out!",
    comebackReminders: [
      { title: "🍿 Miss hanging out on Peerora?", body: "It's the perfect time to watch movies or videos with friends!" },
      { title: "🎬 Movie Night Awaits!", body: "Create a room, grab some popcorn, and start the party." },
      { title: "🎮 Mini-games are waiting!", body: "Gather your friends for a round of Word Bomb or Spyfall!" },
      { title: "✨ Chill with Friends", body: "Jump back on Peerora for a synchronized watch session!" },
      { title: "🎧 Lo-Fi & Chill Lounge", body: "Put on your headphones and unwind together in a sync room." }
    ]
  }
};

// Web Audio API ile Melodik Çan Sesi
export function playNudgeChime() {
  if (!areNotificationsEnabled()) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

      gain.gain.setValueAtTime(0.25, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    playTone(587.33, 0, 0.35);
    playTone(880.00, 0.18, 0.45);
  } catch (err) {
    console.warn('Audio chime hatası:', err);
  }
}

// Sistem Bildirim İzni İsteme
export async function requestNotificationPermission() {
  if (!areNotificationsEnabled()) return false;
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

// Medya Erişim İzni Kontrolü
export async function requestMediaAccessPermission() {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const status = await navigator.permissions.query({ name: 'persistent-storage' }).catch(() => null);
      if (status && status.state === 'denied') {
        console.warn('Depolama erişimi kısıtlı.');
      }
    }
    return true;
  } catch {
    return true;
  }
}

// Sistem Bildirimi Fırlatma
export function sendSystemNotification(type = 'NUDGE', senderName = 'Arkadaşın') {
  if (!areNotificationsEnabled()) return;
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const langKey = isTurkishDevice() ? 'tr' : 'en';
  const templates = NOTIFICATION_TEMPLATES[langKey];

  let title = '';
  let body = '';

  if (type === 'NUDGE') {
    title = templates.nudgeTitle;
    body = templates.nudgeBody(senderName);
  } else if (type === 'MEDIA_STARTED') {
    title = templates.mediaStartedTitle;
    body = templates.mediaStartedBody;
  } else if (type === 'COMEBACK') {
    const list = templates.comebackReminders;
    const randomItem = list[Math.floor(Math.random() * list.length)];
    title = randomItem.title;
    body = randomItem.body;
  }

  try {
    const notif = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'peerora-alert',
      silent: true
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    setTimeout(() => notif.close(), 7000);
  } catch (e) {
    console.warn('Notification gösterilemedi:', e);
  }
}

// Uzun süre girmeyen kullanıcıya hatırlatma zamanlayıcısı (Her ziyarette son giriş tarihini günceller)
export function scheduleInactivityCheck() {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  const lastActive = parseInt(localStorage.getItem('p2p_last_visit_time') || '0', 10);
  localStorage.setItem('p2p_last_visit_time', now.toString());

  // Eğer kullanıcı en az 24 saattir (86.400.000 ms) uygulamayı açmamışsa bir geri dönüş bildirimi gönder
  const ONE_DAY = 24 * 60 * 60 * 1000;
  if (lastActive > 0 && now - lastActive > ONE_DAY) {
    setTimeout(() => {
      sendSystemNotification('COMEBACK');
    }, 4000);
  }
}