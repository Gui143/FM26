// Teste de fumaça (Node): valida toda a lógica central sem navegador.
import assert from 'node:assert';
import { buildDatabase } from '../src/js/gen.js';
import * as G from '../src/js/game.js';

console.log('1) Gerando banco de dados…');
const t0 = Date.now();
const db = buildDatabase(2026);
const clubs = Object.values(db.clubs);
const players = Object.values(db.players);
console.log(`   ${clubs.length} clubes, ${players.length} jogadores em ${Date.now() - t0}ms`);
assert(clubs.length >= 190, 'esperava 190+ clubes');
assert(players.length >= 4500, 'esperava 4500+ jogadores');

console.log('2) Novo jogo como Craque Profissional (18 anos)…');
let state = G.createNewGame({ name: 'Douglas Telles', startAge: 18, position: 'ATA', country: 'br' }, { lang: 'pt', accent: 'laranja' }, db);
assert(state.player.name === 'Douglas Telles', 'nome correto');
assert(state.player.phase === 'pro', 'iniciou como profissional');
assert(state.career.clubId, 'deve assinar contrato pro aos 18');
console.log('   clube inicial:', state.db.clubs[state.career.clubId].name, 'OVR:', state.player.ovr);

console.log('3) Testando Treino Técnico…');
const oldOvr = state.player.ovr;
const oldForm = state.player.form;
const trRes = G.doTraining(state, 'sho', 1);
assert(trRes.ok, 'treino deve ser realizado');
console.log('   após treino -> forma:', state.player.form);

console.log('4) Simulando 6 meses de carreira…');
let months = 0;
for (let i = 0; i < 6; i++) {
  if (state.pending) G.decidePending(state, 0);
  const r = G.advanceMonth(state);
  assert(r.ok !== false || state.pending, 'mês avançado ou pendência gerada');
  if (state.pending) G.decidePending(state, 0);
  months++;
}
console.log(`   ${months} meses simulados; ano atual: ${state.calendar.year}, mês: ${state.calendar.month}`);

console.log('5) Simulando partida rápida (quickSimMatch)…');
const upcoming = state.matches.filter(f => !f.played);
if (upcoming.length > 0) {
  const fx = upcoming[0];
  const qres = G.quickSimMatch(state, fx.id);
  assert(qres.ok, 'simulação de partida bem-sucedida');
  console.log(`   placar simulado: ${qres.fx.gh}×${qres.fx.ga} (nota do jogador: ${qres.fx.rating})`);
} else {
  console.log('   (sem partidas abertas no momento)');
}

console.log('6) Saves (roundtrip no G.memoryStorage)…');
const mem = G.memoryStorage;
const wr = await G.writeSlot(mem, 'auto', state);
assert(wr.ok, 'salvamento em memória');
const meta = G.saveSlots(mem).auto;
console.log('   save gerado:', (meta.data.length / 1024).toFixed(1), 'KB');
assert(meta.playerName === 'Douglas Telles');
const restored = await G.readSlot(mem, 'auto');
assert(restored.player.name === state.player.name && restored.calendar.month === state.calendar.month);
console.log('   save lido OK:', meta.playerName, 'Mês', meta.month);

console.log('\n✅ Todos os testes de fumaça passaram!');
