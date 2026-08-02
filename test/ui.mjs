// Teste de renderização das telas (funções html() são puras — sem DOM)
import assert from 'node:assert';
import { App } from '../src/js/ui.js';
import { buildDatabase } from '../src/js/gen.js';
import * as G from '../src/js/game.js';
import { menuScreen, newGameScreen, homeScreen } from '../src/js/screens.js';
import * as S2 from '../src/js/screens2.js';

const db = buildDatabase(2026);
App.bootSettings = { lang: 'pt', accent: 'laranja', speed: 2, volume: 50, quality: 'alta' };
App.state = G.createNewGame({ name: 'Craque Teste', startAge: 18, position: 'ATA' }, App.bootSettings, db);
App.storage = G.memoryStorage;

const checks = {
  menu: menuScreen.html(),
  new: newGameScreen.html(),
  home: homeScreen.html(),
  training: S2.trainingScreen.html(),
  match: S2.matchScreen.html(),
  career: S2.careerScreen.html(),
  market: S2.marketScreen.html(),
  family: S2.familyScreen.html(),
  money: S2.moneyScreen.html(),
  fame: S2.fameScreen.html(),
  inbox: S2.inboxScreen.html(),
  hall: S2.hallScreen.html(),
  settings: S2.settingsScreen.html(),
  saves: S2.savesScreen.html(),
  credits: S2.creditsScreen.html(),
  howto: S2.howtoScreen.html(),
  social: S2.socialScreen.html(),
  immersion: S2.immersionScreen.html(),
};

let ok = 0;
for (const [k, v] of Object.entries(checks)) {
  assert(typeof v === 'string' && v.length > 40, `tela ${k} vazia ou curta demais`);
  if (v.includes('NaN')) throw new Error(`NaN encontrado na tela ${k}`);
  ok++;
}
console.log(`✅ ${ok} telas do Vida de Craque 26 renderizaram HTML sem erros.`);

// Simula avançar 1 mês e autosave
const r = G.advanceMonth(App.state);
const wr = await G.writeSlot(G.memoryStorage, 'auto', App.state);
assert(wr.ok);
console.log('✅ Fluxo completo: advanceMonth + autosave OK. Mês atual:', App.state.calendar.month, 'Ano:', App.state.calendar.year);
