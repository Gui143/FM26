// ============================================================
// app.js — Bootstrap do jogo: registra telas, liga o roteador,
// define callbacks de novo jogo / continuar / carregar
// ============================================================
import { App, registerScreens, renderRoute, go, applySettingsToBody, toast, autosave } from './ui.js';
import { menuScreen, newGameScreen, homeScreen, matchScreen, squadScreen, playerScreen, tacticsScreen } from './screens.js';
import {
  calendarScreen, tableScreen, cupsScreen, marketScreen, financesScreen,
  clubScreen, youthScreen, managerScreen, statsScreen, rankingScreen,
  friendliesScreen, customScreen, editorScreen, settingsScreen, savesScreen,
  creditsScreen, inboxScreen,
} from './screens2.js';
import { buildDatabase, marketValue } from './gen.js';
import * as G from './game.js';

// Registro de rotas
registerScreens({
  menu: menuScreen,
  new: newGameScreen,
  home: homeScreen,
  match: matchScreen,
  squad: squadScreen,
  player: playerScreen,
  tactics: tacticsScreen,
  calendar: calendarScreen,
  table: tableScreen,
  cups: cupsScreen,
  market: marketScreen,
  finances: financesScreen,
  club: clubScreen,
  youth: youthScreen,
  manager: managerScreen,
  stats: statsScreen,
  ranking: rankingScreen,
  friendlies: friendliesScreen,
  custom: customScreen,
  editor: editorScreen,
  settings: settingsScreen,
  saves: savesScreen,
  credits: creditsScreen,
  inbox: inboxScreen,
});

// Configurações fora de partida (menu)
try {
  App.bootSettings = JSON.parse(App.storage.getItem('fm_boot_settings') || 'null') || { lang: 'pt', accent: 'verde', speed: 2, volume: 50, quality: 'alta' };
} catch { App.bootSettings = { lang: 'pt', accent: 'verde', speed: 2, volume: 50, quality: 'alta' }; }

// Recalcula valor de mercado (usado pelo editor)
App.revalue = marketValue;

function startGame(state) {
  App.state = state;
  applySettingsToBody();
  go('home');
  renderRoute();
}

// Novo jogo: gera o banco (determinístico) e cria o estado
App.onNewGame = (clubId, managerName) => {
  const menuRoot = document.getElementById('menu-root');
  menuRoot.innerHTML = `<div class="menu-wrap"><div class="sim-loading"><div class="spinner"></div><div class="muted">Gerando o mundo do futebol…<br>192 clubes, 4.600+ jogadores</div></div></div>`;
  setTimeout(() => {
    const db = buildDatabase(2026);
    const state = G.createNewGame(db, { clubId, managerName, settings: { ...App.bootSettings } });
    G.writeSlot(App.storage, 'auto', state);
    startGame(state);
    toast(`⚽ Bem-vindo ao ${state.db.clubs[clubId].name}!`);
  }, 40);
};

App.onContinue = async () => {
  try {
    const st = await G.readSlot(App.storage, 'auto');
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
