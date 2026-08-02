// ============================================================
// app.js — Bootstrap do jogo: registra telas, liga o roteador,
// define callbacks de novo jogo / continuar / carregar
// Vida de Craque 26 — Modo Carreira de Jogador (BitLife × FIFA)
// ============================================================
import { App, registerScreens, renderRoute, go, applySettingsToBody, toast, autosave } from './ui.js';
import { menuScreen, newGameScreen, homeScreen } from './screens.js';
import {
  trainingScreen, matchScreen, careerScreen, marketScreen, familyScreen,
  moneyScreen, fameScreen, inboxScreen, hallScreen, settingsScreen,
  savesScreen, creditsScreen, howtoScreen, socialScreen, immersionScreen
} from './screens2.js';
import { createNewGame, writeSlot, readSlot } from './game.js';
import { buildDatabase } from './gen.js';
import { initSupabase, autoSaveToCloud, getCurrentUser, upsertPresence } from './supabase.js';
import { unlockMusic, setMusicSettings } from './music.js';

// Registro de rotas
registerScreens({
  menu: menuScreen,
  new: newGameScreen,
  home: homeScreen,
  training: trainingScreen,
  match: matchScreen,
  career: careerScreen,
  market: marketScreen,
  family: familyScreen,
  money: moneyScreen,
  fame: fameScreen,
  inbox: inboxScreen,
  hall: hallScreen,
  settings: settingsScreen,
  saves: savesScreen,
  credits: creditsScreen,
  howto: howtoScreen,
  social: socialScreen,
  immersion: immersionScreen,
});

// Configurações fora de partida (menu)
try {
  App.bootSettings = JSON.parse(App.storage.getItem('fm_boot_settings') || 'null') || { lang: 'pt', accent: 'laranja', speed: 2, volume: 50, musicVolume: 35, musicMuted: false, quality: 'alta' };
} catch { App.bootSettings = { lang: 'pt', accent: 'laranja', speed: 2, volume: 50, musicVolume: 35, musicMuted: false, quality: 'alta' }; }
App.bootSettings = { lang: 'pt', accent: 'laranja', speed: 2, volume: 50, musicVolume: 35, musicMuted: false, quality: 'alta', ...App.bootSettings };

function startGame(state) {
  App.state = state;
  applySettingsToBody();
  setMusicSettings(state.settings || App.bootSettings);
  go('home');
  renderRoute();
}

// Novo jogo: cria o personagem e o mundo da vida
App.onNewGame = (cfg) => {
  const menuRoot = document.getElementById('menu-root');
  menuRoot.innerHTML = `<div class="menu-wrap"><div class="sim-loading"><div class="spinner"></div><div class="muted">Gerando o mundo do futebol…<br>232 clubes • 5.000+ jogadores reais</div></div></div>`;
  setTimeout(() => {
    const db = buildDatabase(2026);
    const state = createNewGame(cfg, { ...App.bootSettings }, db);
    writeSlot(App.storage, 'auto', state);
    startGame(state);
    toast(`👶 Bem-vindo ao mundo, ${state.player.name}!`);
  }, 60);
};

App.onContinue = async () => {
  try {
    const st = await readSlot(App.storage, 'auto');
    if (st) startGame(st);
    else toast('Nenhum save automático encontrado.', 'error');
  } catch { toast('Save automático corrompido.', 'error'); }
};

App.onLoadState = (st) => startGame(st);

// Sair para o menu salva automaticamente
const _origRender = renderRoute;
if (typeof window !== 'undefined' && typeof location !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const h = location.hash.replace(/^#\/?/, '').split('/')[0];
    if (h === 'menu' && App.state) autosave();
  });
  window.addEventListener('hashchange', _origRender);

  // Salva ao fechar a aba
  window.addEventListener('pagehide', () => { if (App.state) autosave(); });

  // Primeira renderização
  applySettingsToBody();
  setMusicSettings(App.bootSettings);
  const unlock = () => unlockMusic(App.state?.settings || App.bootSettings);
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true, passive: true });
  if (!location.hash) location.hash = '#/menu';
  renderRoute();
}

// ============================================================
// SUPABASE INIT + AUTO CLOUD SAVE HOOK
// ============================================================
(async () => {
  try {
    await initSupabase();
    console.log('%c[FM26] Supabase conectado', 'color:#22c55e');
  } catch (e) {
    console.warn('[FM26] Supabase offline mode');
  }
})();

// Presença continua enquanto a carreira está aberta, não só quando a tela
// Rede Social está visível. O Supabase recebe apenas nome de jogo/contexto.
if (typeof window !== 'undefined') {
  window.setInterval(async () => {
    try {
      if (!App.state?.player?.hasCellphone) return;
      const user = await getCurrentUser();
      if (!user) return;
      const club = App.state.db?.clubs?.[App.state.career?.clubId];
      await upsertPresence(user.id, App.state.player.name, { club: club?.name, phase: App.state.player.phase });
    } catch {}
  }, 30000);
}

// Hook autosave na nuvem depois de ações importantes
const _origAutosave = autosave;
if (typeof window !== 'undefined') {
  window.autosave = function() {
    _origAutosave();
    if (App.state?.player?.hasCellphone) {
      import('./supabase.js').then(m => m.autoSaveToCloud(App.state));
    }
  };
}

// Tenta carregar save da nuvem no início (se logado)
(async () => {
  try {
    const { getCurrentUser, loadGameFromSupabase } = await import('./supabase.js');
    const user = await getCurrentUser();
    if (user && !App.state) {
      const cloudState = await loadGameFromSupabase();
      if (cloudState) {
        console.log('%c[Supabase] Save da nuvem encontrado', 'color:#3b82f6');
        // Não sobrescreve automaticamente para não confundir o usuário
        // Ele pode usar o botão "Carregar da Nuvem" no futuro
      }
    }
  } catch(e) {}
})();
