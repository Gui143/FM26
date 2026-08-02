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
  savesScreen, creditsScreen, howtoScreen,
} from './screens2.js';
import { createNewGame, writeSlot, readSlot } from './game.js';
import { buildDatabase } from './gen.js';

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
});

// Configurações fora de partida (menu)
try {
  App.bootSettings = JSON.parse(App.storage.getItem('fm_boot_settings') || 'null') || { lang: 'pt', accent: 'laranja', speed: 2, volume: 50, quality: 'alta' };
} catch { App.bootSettings = { lang: 'pt', accent: 'laranja', speed: 2, volume: 50, quality: 'alta' }; }

function startGame(state) {
  App.state = state;
  applySettingsToBody();
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
window.addEventListener('hashchange', () => {
  const h = location.hash.replace(/^#\/?/, '').split('/')[0];
  if (h === 'menu' && App.state) autosave();
});
window.addEventListener('hashchange', _origRender);

// Salva ao fechar a aba
window.addEventListener('pagehide', () => { if (App.state) autosave(); });

// Primeira renderização
applySettingsToBody();
if (!location.hash) location.hash = '#/menu';
renderRoute();
