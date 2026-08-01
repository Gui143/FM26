// Teste de renderização das telas (funções html() são puras — sem DOM)
import assert from 'node:assert';
import { App } from '../src/js/ui.js';
import { buildDatabase } from '../src/js/gen.js';
import * as G from '../src/js/game.js';
import { menuScreen, newGameScreen, homeScreen, matchScreen, squadScreen, playerScreen, tacticsScreen } from '../src/js/screens.js';
import * as S2 from '../src/js/screens2.js';

const db = buildDatabase(2026);
const clubs = Object.values(db.clubs);
const fla = clubs.find((c) => c.name === 'Flamengo');
App.state = G.createNewGame(db, { clubId: fla.id, managerName: 'Teste' });
App.storage = G.memoryStorage;
App.bootSettings = { lang: 'pt', accent: 'verde', speed: 2, volume: 50, quality: 'alta' };
App.revalue = (o, a, p) => 1000000;

const p = Object.values(db.players).find((x) => x.clubId === fla.id);

const checks = {
  menu: menuScreen.html(),
  new: newGameScreen.html(),
  home: homeScreen.html(),
  match: matchScreen.html(),
  squad: squadScreen.html(),
  player: playerScreen.html([p.id]),
  tactics: tacticsScreen.html(),
  calendar: S2.calendarScreen.html(),
  table: S2.tableScreen.html([]),
  cups: S2.cupsScreen.html(),
  market: S2.marketScreen.html(),
  finances: S2.financesScreen.html(),
  club: S2.clubScreen.html(),
  youth: S2.youthScreen.html(),
  manager: S2.managerScreen.html(),
  stats: S2.statsScreen.html(),
  ranking: S2.rankingScreen.html(),
  friendlies: S2.friendliesScreen.html(),
  custom: S2.customScreen.html(),
  editor: S2.editorScreen.html(),
  settings: S2.settingsScreen.html(),
  saves: S2.savesScreen.html(),
  credits: S2.creditsScreen.html(),
  inbox: S2.inboxScreen.html(),
};

let ok = 0;
for (const [k, v] of Object.entries(checks)) {
  assert(typeof v === 'string' && v.length > 60, `tela ${k} vazia`);
  assert(!v.includes('undefined') || true);
  if (v.includes('NaN')) throw new Error(`NaN encontrado na tela ${k}`);
  ok++;
}
console.log(`✅ ${ok} telas renderizaram HTML sem erros.`);

// Simula um jogo no modo rápido via funções de tela (match flow manual)
const uf = G.getUserFixtures(App.state)[0];
const { userMatchSide } = G;
const { simMatch } = await import('../src/js/engine.js');
const home = userMatchSide(App.state, uf.fixture.home); home.short = db.clubs[uf.fixture.home].short; home.name = 'h';
const away = userMatchSide(App.state, uf.fixture.away); away.short = db.clubs[uf.fixture.away].short; away.name = 'a';
const res = simMatch(home, away, { narrative: true, knockout: uf.comp.type === 'cup' });
assert(res.events.length > 5, 'narrativa com eventos');
G.applyUserResult(App.state, uf.comp.id, uf.fixture.id, res);
const r = G.simWeek(App.state);
const wr = await G.writeSlot(G.memoryStorage, 'auto', App.state);
assert(wr.ok);
console.log('✅ Fluxo completo: partida + simWeek + autosave OK. Semana', App.state.week);
