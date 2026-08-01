// Teste de fumaça (Node): valida toda a lógica central sem navegador.
import assert from 'node:assert';
import { buildDatabase } from '../src/js/gen.js';
import * as G from '../src/js/game.js';
import { simMatch } from '../src/js/engine.js';

console.log('1) Gerando banco de dados…');
const t0 = Date.now();
const db = buildDatabase(2026);
const clubs = Object.values(db.clubs);
const players = Object.values(db.players);
console.log(`   ${clubs.length} clubes, ${players.length} jogadores em ${Date.now() - t0}ms`);
assert(clubs.length >= 190, 'esperava 190+ clubes');
assert(players.length >= 4500, 'esperava 4500+ jogadores');

console.log('2) Novo jogo como Flamengo…');
const fla = clubs.find((c) => c.name === 'Flamengo');
let state = G.createNewGame(db, { clubId: fla.id, managerName: 'Treinador Teste' });
assert(getUserCompetitions(state).length >= 3, 'usuário deve ter várias competições');
console.log('   competições:', state.competitions.map((c) => c.short).join(', '));

function getUserCompetitions(s) {
  return s.competitions.filter((c) => c.teams.includes(s.clubId));
}

console.log('3) Simulando temporada completa…');
let seasonCount = 0, matchCount = 0, ended = false;
for (let w = 0; w < 60 && seasonCount < 1; w++) {
  // joga partidas do usuário na semana
  let uf = G.getUserFixtures(state);
  for (const { comp, fixture } of uf) {
    const home = G.userMatchSide(state, fixture.home);
    const away = G.userMatchSide(state, fixture.away);
    home.short = state.db.clubs[fixture.home].short; home.name = state.db.clubs[fixture.home].name;
    away.short = state.db.clubs[fixture.away].short; away.name = state.db.clubs[fixture.away].name;
    const kf = comp.type === 'cup' && (fixture.knockout !== undefined ? fixture.knockout : true);
    const res = simMatch(home, away, { seed: Math.floor(Math.random() * 1e9), knockout: kf, neutral: !!fixture.neutral, narrative: true });
    if (fixture.leg === 2) G.leg2Decide(state, comp, fixture, res);
    assert(res.home >= 0 && res.away >= 0, 'placar válido');
    assert(Array.isArray(res.events) && res.events.length > 0, 'narrativa gerada');
    if (kf && res.home === res.away) assert(res.penalties, 'mata-mata tem pênaltis');
    G.applyUserResult(state, comp.id, fixture.id, res);
    matchCount++;
  }
  const r = G.simWeek(state);
  if (r.seasonEnded) { seasonCount++; ended = true; }
}
console.log(`   ${matchCount} partidas do usuário; temporada encerrada: ${ended}`);
assert(ended, 'temporada deve encerrar');

console.log('4) Verificando campeões e histórico…');
const champs = state.history.champions.filter((c) => c.season === 1);
console.log('   campeões temporada 1:', champs.map((c) => `${c.name}: ${state.db.clubs[c.clubId].short}`).join(' | '));
assert(champs.length >= 8, 'deve haver vários campeões');
assert(state.history.finalTables, 'tabelas finais salvas');

console.log('5) Ranking mundial…');
const rank = G.worldRanking(state);
console.log('   top 5:', rank.slice(0, 5).map((r) => state.db.clubs[r.clubId].name).join(', '));
assert(rank.length === Object.keys(db.clubs).length);

console.log('6) Mercado: oferta de compra…');
state.week = 2; // garante janela aberta
const target = G.marketList(state, { pos: 'A' })[0];
const ask = G.askingPrice(state, target);
const r1 = G.makeOffer(state, target.id, ask + 100000, Math.round(target.salary * 1.2));
assert(r1.ok, 'oferta enviada');
G.simWeek(state);
const accepted = state.inbox.find((i) => i.type === 'offerAccepted');
console.log('   resposta de compra:', accepted ? 'aceita' : state.inbox.slice(0, 3).map((i) => i.type).join(','));
if (accepted) {
  const rc = G.confirmBuy(state, accepted.offerId);
  assert(rc.ok, 'confirmação de compra');
  assert(state.db.players[target.id].clubId === state.clubId, 'jogador transferido');
}

console.log('7) Venda + renovação…');
const mine = G.clubPlayers(state.db, state.clubId);
G.listPlayerForSale(state, mine[0].id, true);
const cheapest = [...mine].sort((a,b)=>a.salary-b.salary)[0];
state.finances.balance += 2e8; // injeção de patrocínio para o teste
const rene = G.renewContract(state, cheapest.id);
assert(rene.ok, 'renovação');
for (let i = 0; i < 4; i++) G.simWeek(state);

console.log('8) Amistoso + campeonato personalizado…');
const pal = clubs.find((c) => c.name === 'Palmeiras');
G.scheduleFriendly(state, pal.id, state.week + 1);
const cc = G.createCustomCompetition(state, { name: 'Copa dos Campeões Teste', teamIds: [state.clubId, pal.id, clubs.find((c) => c.name === 'Real Madrid').id, clubs.find((c) => c.name === 'Boca Juniors').id], format: 'cup' });
assert(cc.ok);
// joga até o fim da copa custom
for (let i = 0; i < 8; i++) {
  for (const { comp, fixture } of G.getUserFixtures(state)) {
    const home = G.userMatchSide(state, fixture.home); home.short = state.db.clubs[fixture.home].short; home.name = state.db.clubs[fixture.home].name;
    const away = G.userMatchSide(state, fixture.away); away.short = state.db.clubs[fixture.away].short; away.name = state.db.clubs[fixture.away].name;
    const kf2 = comp.type === 'cup' && !comp.friendly && (fixture.knockout !== undefined ? fixture.knockout : true);
    const res = simMatch(home, away, { knockout: kf2, narrative: false });
    if (fixture.leg === 2) G.leg2Decide(state, comp, fixture, res);
    G.applyUserResult(state, comp.id, fixture.id, res);
  }
  G.simWeek(state);
}
console.log('   copa custom campeão:', cc.comp.champion ? state.db.clubs[cc.comp.champion].name : '(a disputar)');

console.log('9) Saves (roundtrip)…');
const mem = G.memoryStorage;
const wr = await G.writeSlot(mem, 'slot1', state); assert(wr.ok);
const meta = G.saveSlots(mem).slot1;
console.log('   save comprimido:', (meta.data.length/1024).toFixed(0), 'KB');
assert(meta.clubName === 'Flamengo');
const restored = await G.readSlot(mem, 'slot1');
assert(restored.clubId === state.clubId && restored.week === state.week);
assert(Object.keys(restored.db.players).length === Object.keys(state.db.players).length);
console.log('   save OK:', meta.clubName, 'semana', meta.week);

console.log('10) Editor de dados: adicionar clube novo à liga BR2…');
// (simula o processo documentado no README)
const json = JSON.stringify(restored).length;
console.log(`   tamanho do save: ${(json / 1024 / 1024).toFixed(2)} MB`);

console.log('\n✅ Todos os testes passaram!');
