// ============================================================
// music.js — trilha opcional do jogo
//
// O arquivo da música licenciada é instalado fora do Git em
// public/audio/sorry-licensed.mp3. Sem ele, o jogo segue silencioso.
// O navegador só inicia áudio depois de uma interação do usuário.
// ============================================================
const MUSIC_SRC = 'public/audio/sorry-licensed.mp3';
let audio = null;
let unlocked = false;
let lastSettings = {};

function ensureAudio() {
  if (audio || typeof window === 'undefined' || typeof Audio === 'undefined') return audio;
  audio = new Audio(MUSIC_SRC);
  audio.loop = true;
  audio.preload = 'metadata';
  audio.addEventListener('error', () => { /* asset opcional/licenciado ainda não instalado */ });
  return audio;
}

export function setMusicSettings(settings = {}) {
  lastSettings = settings;
  const player = ensureAudio();
  if (!player) return;
  player.volume = Math.max(0, Math.min(1, Number(settings.musicVolume ?? 35) / 100));
  player.muted = settings.musicMuted === true;
  if (settings.musicMuted === true || player.volume <= 0) {
    player.pause();
    return;
  }
  if (unlocked) player.play().catch(() => {});
}

export function unlockMusic(settings = lastSettings) {
  unlocked = true;
  setMusicSettings(settings);
}

export function stopMusic() {
  if (audio) audio.pause();
}

export function musicAssetPath() { return MUSIC_SRC; }
