// ============================================================
// game.js — Núcleo do jogo: estado, temporada, competições,
// economia, transferências, mercado, base, saves, ranking
// ============================================================
import { makeRng, clamp, uid, hashStr } from './util.js';
import { LEAGUES, COUNTRIES, FORMATIONS, SPONSORS } from './data.js';
import { marketValue, weeklyWage } from './gen.js';
import { quickSim, effOvr, penaltyShootout } from './engine.js';

export const SAVE_VERSION = 3;
export const LS_KEY = 'futmanager_saves_v3';

// -------------------- Helpers de elenco --------------------
export function clubPlayers(db, clubId) {
  return Object.values(db.players).filter((p) => p.clubId === clubId && !p.loan);
}
export function availablePlayers(db, clubId) {
  return clubPlayers(db, clubId).filter((p) => p.injuredWeeks <= 0 && p.suspended <= 0);
}

// Escala melhor time possível numa formação
export function pickBestLineup(players, formationId) {
  const f = FORMATIONS.find((x) => x.id === formationId) || FORMATIONS[0];
  const order = ['G', 'D', 'M', 'A'];
  const need = { G: 1, D: f.d, M: f.m, A: f.a };
  const byPos = { G: [], D: [], M: [], A: [] };
  players.forEach((p) => byPos[p.pos]?.push(p));
  for (const k of order) byPos[k].sort((a, b) => effOvr(b) - effOvr(a));
  const lineup = { G: [], D: [], M: [], A: [] };
  for (const k of order) lineup[k] = byPos[k].slice(0, need[k]);
  return lineup;
}

// Auto-escalação para clubes da IA
export function autoLineupFor(state, clubId) {
  const coach = state.db.coaches[clubId];
  const formation = coach?.formation || '4-3-3';
  const lineup = pickBestLineup(availablePlayers(state.db, clubId), formation);
  return { lineup, tactic: coach?.tactic || { mentality: 1, pressing: 1, line: 1, style: 0, tempo: 1 } };
}

export function userMatchSide(state, clubId) {
  if (clubId === state.clubId) {
    const t = state.tactics;
    const byId = state.db.players;
    const lineup = { G: [], D: [], M: [], A: [] };
    // remove lesionados/suspensos da escalação salva
    for (const k of ['G', 'D', 'M', 'A']) {
      lineup[k] = (t.lineup[k] || []).map((id) => byId[id]).filter((p) => p && p.injuredWeeks <= 0 && p.suspended <= 0);
    }
    // Completa com melhores disponíveis se faltar gente
    const chosen = new Set([...lineup.G, ...lineup.D, ...lineup.M, ...lineup.A].map((p) => p.id));
    const f = FORMATIONS.find((x) => x.id === t.formation) || FORMATIONS[0];
    const need = { G: 1, D: f.d, M: f.m, A: f.a };
    const avail = availablePlayers(state.db, state.clubId).filter((p) => !chosen.has(p.id));
    const byPos = { G: [], D: [], M: [], A: [] };
    avail.forEach((p) => byPos[p.pos].push(p));
    for (const k of ['G', 'D', 'M', 'A']) byPos[k].sort((a, b) => effOvr(b) - effOvr(a));
    // remove lesionados/suspensos da escalação salva
    for (const k of ['G', 'D', 'M', 'A']) {
      let i = 0;
      while (lineup[k].length < need[k] && i < byPos[k].length) { lineup[k].push(byPos[k][i]); chosen.add(byPos[k][i].id); i++; }
    }
    return { lineup, tactic: { mentality: t.mentality, pressing: t.pressing, line: t.line, style: t.style, tempo: t.tempo }, chemistry: state.chemistry ?? 70 };
  }
  const { lineup, tactic } = autoLineupFor(state, clubId);
  const rep = state.db.clubs[clubId].rep;
  return { lineup, tactic, chemistry: clamp(55 + (rep - 55) / 4, 50, 95) };
}

// -------------------- Fixtures: round-robin --------------------
function roundRobin(teams, doubleRound = true) {
  const t = teams.slice();
  if (t.length % 2 === 1) t.push(null);
  const n = t.length;
  const rounds = [];
  const arr = t.slice();
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      if (a && b) pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop());
  }
  if (doubleRound) {
    const second = rounds.map((rd) => rd.map(([a, b]) => [b, a]));
    return rounds.concat(second);
  }
  return rounds;
}

let fixtureSeq = 1;
function mkFixture(compId, week, home, away, round = 1) {
  return { id: `${compId}_f${fixtureSeq++}`, week, home, away, gh: null, ga: null, played: false, round, pen: null, motm: null };
}

function buildLeagueComp(id, name, short, teams, startWeek = 1, doubleRound = true) {
  const rounds = roundRobin(teams, doubleRound);
  const fixtures = [];
  rounds.forEach((pairs, r) => {
    pairs.forEach(([h, a]) => fixtures.push(mkFixture(id, startWeek + r, h, a, r + 1)));
  });
  return {
    id, name, short, type: 'league', teams: teams.slice(), fixtures,
    status: 'running', champion: null, totalRounds: rounds.length,
    scorers: {}, assists: {},
  };
}

function buildKnockoutComp(id, name, short, teams, startWeek, gapWeeks, { seeded = false } = {}) {
  // Potência de 2 mais próxima (para baixo)
  let n = 4; while (n * 2 <= teams.length) n *= 2; n = Math.min(n, teams.length);
  let selected = teams.slice(0, n);
  const comp = {
    id, name, short, type: 'cup', teams: selected, fixtures: [],
    status: 'running', champion: null, currentRound: 0, gapWeeks,
    roundNames: n >= 16 ? ['Oitavas', 'Quartas', 'Semifinal', 'Final'] : n === 8 ? ['Quartas', 'Semifinal', 'Final'] : ['Semifinal', 'Final'],
    startWeek, scorers: {}, assists: {},
  };
  if (seeded) {
    const top = selected.slice(0, n / 2), bottom = selected.slice(n / 2);
    let pairs = [];
    for (let i = 0; i < n / 2; i++) pairs.push([bottom[i], top[i]]); // mando do mais forte
    for (let i = 0; i < n / 2; i++) { const [h, a] = pairs[i]; comp.fixtures.push(mkFixture(id, startWeek, h, a, 1)); }
  } else {
    for (let i = 0; i < n / 2; i++) comp.fixtures.push(mkFixture(id, startWeek, selected[2 * i], selected[2 * i + 1], 1));
  }
  return comp;
}

function progressCup(state, comp, rng) {
  const round = comp.currentRound + 1;
  const roundFixtures = comp.fixtures.filter((f) => f.round === round);
  if (!roundFixtures.length || !roundFixtures.every((f) => f.played)) return;
  const winners = roundFixtures.map((f) => fixtureWinner(f));
  if (winners.length === 1) {
    comp.champion = winners[0];
    comp.status = 'finished';
    addNews(state, `🏆 ${state.db.clubs[winners[0]].name} é campeão: ${comp.name}!`, 'trophy');
    const c = state.db.clubs[winners[0]];
    c.titles.push({ comp: comp.short, season: state.season, year: state.year });
    if (winners[0] === state.clubId) {
      state.manager.titles.push({ comp: comp.name, season: state.season });
      gainXp(state, 150);
    }
    return;
  }
  comp.currentRound += 1;
  const nextRound = comp.currentRound + 1;
  const shuffled = rng.shuffle(winners);
  const week = comp.startWeek + comp.currentRound * comp.gapWeeks;
  for (let i = 0; i < shuffled.length / 2; i++) {
    comp.fixtures.push(mkFixture(comp.id, week, shuffled[2 * i + 1], shuffled[2 * i], nextRound));
  }
  addNews(state, `Definidos os confrontos de ${comp.roundNames[comp.currentRound] || 'próxima fase'} da ${comp.short}.`, 'cup');
}

function fixtureWinner(f) {
  if (f.gh > f.ga) return f.home;
  if (f.ga > f.gh) return f.away;
  return f.pen?.winner === 'h' ? f.home : f.away;
}

// -------------------- Tabela --------------------
export function leagueTable(state, comp) {
  const rows = {};
  comp.teams.forEach((t) => { rows[t] = { clubId: t, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, played: 0 }; });
  comp.fixtures.filter((f) => f.played).forEach((f) => {
    const h = rows[f.home], a = rows[f.away];
    if (!h || !a) return;
    h.played++; a.played++;
    h.gf += f.gh; h.ga += f.ga; a.gf += f.ga; a.ga += f.gh;
    if (f.gh > f.ga) { h.pts += 3; h.w++; a.l++; }
    else if (f.ga > f.gh) { a.pts += 3; a.w++; h.l++; }
    else { h.pts++; a.pts++; h.d++; a.d++; }
  });
  const table = Object.values(rows).map((r) => ({ ...r, gd: r.gf - r.ga }));
  table.sort((x, y) => y.pts - x.pts || y.w - x.w || y.gd - x.gd || y.gf - x.gf || state.db.clubs[x.clubId].name.localeCompare(state.db.clubs[y.clubId].name));
  return table;
}

// -------------------- Novo jogo --------------------
export function createNewGame(db, { clubId, managerName, managerCountry = 'br', settings }) {
  const state = {
    version: SAVE_VERSION,
    db,
    clubId,
    manager: { name: managerName, country: managerCountry, rep: db.clubs[clubId].rep - 8, xp: 0, level: 1, titles: [] },
    season: 1, year: 2026, week: 1,
    chemistry: 70,
    tactics: {
      formation: '4-3-3', mentality: 1, pressing: 1, line: 1, style: 0, tempo: 1,
      lineup: null, captain: null, penalties: null, corners: null,
    },
    finances: {
      balance: db.clubs[clubId].budget,
      ledger: [], prizePending: 0,
    },
    news: [], inbox: [],
    market: { offers: [], slots: {} },
    competitions: [],
    history: { champions: [], scorers: [], records: {} },
    friendlies: [],
    settings: settings || { lang: 'pt', accent: 'laranja', speed: 2, volume: 50, quality: 'alta' },
  };
  // Escalação inicial
  const lineup = pickBestLineup(availablePlayers(db, clubId), state.tactics.formation);
  state.tactics.lineup = {};
  for (const k of ['G', 'D', 'M', 'A']) state.tactics.lineup[k] = lineup[k].map((p) => p.id);
  const best = [...lineup.M, ...lineup.D].sort((a, b) => b.xp - a.xp)[0];
  state.tactics.captain = best?.id || lineup.G[0].id;
  state.tactics.penalties = [...lineup.A, ...lineup.M].sort((a, b) => b.ovr - a.ovr)[0]?.id || null;
  state.tactics.corners = [...lineup.M, ...lineup.D].sort((a, b) => b.ovr - a.ovr)[0]?.id || null;

  generateSeason(state);
  generateJobOffers(state);
  addNews(state, `Bem-vindo ao ${db.clubs[clubId].name}, ${managerName}! A temporada ${state.year} está começando.`, 'info');
  enforceInfiniteMoney(state);
  log(state, `Saldo inicial`, state.finances.balance);
  return state;
}

// -------------------- Geração da temporada --------------------
const BRAZIL_STATES = {
  br1_0: 'RJ', br1_3: 'SP', br1_1: 'SP', br1_2: 'SP', br1_4: 'RJ', br1_5: 'RJ', br1_13: 'SP', br1_14: 'RJ', br2_4: 'SP', br2_5: 'SP', br2_11: 'SP', br2_12: 'SP', br2_14: 'SP', br2_16: 'SP', br1_12: 'SP', br1_6: 'MG', br1_9: 'MG', br2_2: 'MG',
};

export function generateSeason(state) {
  fixtureSeq = 1;
  const rng = makeRng(hashStr(`season${state.season}_${state.db.seed}`) + state.season * 7);
  const comps = [];
  const db = state.db;

  // 1) Todas as ligas (rounds semanais)
  for (const league of LEAGUES) {
    const teams = Object.values(db.clubs).filter((c) => c.leagueId === league.id).map((c) => c.id);
    if (teams.length >= 4) {
      comps.push(buildLeagueComp(`L_${league.id}_s${state.season}`, league.name, league.name.split(' ').map((w) => w[0]).join(''), teams, 1, true));
    }
  }

  // 2) Copa nacional do país do usuário
  const userClub = db.clubs[state.clubId];
  const countryLeagues = LEAGUES.filter((l) => l.country === userClub.country);
  let cupTeams = [];
  countryLeagues.forEach((l) => {
    const inLeague = Object.values(db.clubs).filter((c) => c.leagueId === l.id)
      .sort((a, b) => b.rep - a.rep).map((c) => c.id);
    cupTeams = cupTeams.concat(inLeague);
  });
  cupTeams = cupTeams.slice(0, 32);
  const cupNames = { ar: ['Copa Argentina', 'CAr'], en: ['FA Cup', 'FAC'], es: ['Copa do Rei', 'CdR'], it: ['Coppa Italia', 'CoI'], de: ['Copa da Alemanha', 'CdA'], fr: ['Copa da França', 'CdF'], pt: ['Taça de Portugal', 'TdP'], nl: ['Copa da Holanda', 'CdH'] };
  if (userClub.country === 'br') {
    comps.push(buildCopaDoBrasil(state)); // formato oficial 2026
  } else {
    const [cn, cs] = cupNames[userClub.country] || ['Copa Nacional', 'CN'];
    comps.push(buildKnockoutComp(`C_${userClub.country}_s${state.season}`, cn, cs, cupTeams, 3, 4, { seeded: true }));
  }

  // 3) Copas continentais (por confederação)
  const amerTeams = leagueOrder(state, 'br1', 6).concat(leagueOrder(state, 'ar1', 6), leagueOrder(state, 'br2', 2), leagueOrder(state, 'ar1', 10).slice(6, 8));
  const lib = buildKnockoutComp(`CONT_AME_s${state.season}`, 'Copa Libertadores', 'LIB', amerTeams.slice(0, 16), 5, 4, { seeded: true });
  comps.push(lib);
  const sulTeams = leagueOrder(state, 'br1', 14).slice(6, 14).concat(leagueOrder(state, 'ar1', 14).slice(6, 14));
  comps.push(buildKnockoutComp(`CONT_SUL_s${state.season}`, 'Copa Sul-Americana', 'SUL', sulTeams.slice(0, 16), 6, 4, { seeded: true }));

  const eurTeams = leagueOrder(state, 'en1', 4).concat(leagueOrder(state, 'es1', 4), leagueOrder(state, 'it1', 3), leagueOrder(state, 'de1', 2), leagueOrder(state, 'fr1', 2), leagueOrder(state, 'pt1', 1));
  comps.push(buildKnockoutComp(`CONT_EUR_s${state.season}`, 'Champions League', 'UCL', eurTeams.slice(0, 16), 5, 4, { seeded: true }));
  const eur2 = leagueOrder(state, 'en1', 7).slice(4, 7).concat(leagueOrder(state, 'es1', 7).slice(4, 7), leagueOrder(state, 'it1', 6).slice(3, 6), leagueOrder(state, 'de1', 5).slice(2, 5), leagueOrder(state, 'fr1', 5).slice(2, 5), leagueOrder(state, 'pt1', 3).slice(1, 3));
  comps.push(buildKnockoutComp(`CONT_EOL_s${state.season}`, 'Europa League', 'UEL', eur2.slice(0, 16), 6, 4, { seeded: true }));
  const eur3 = leagueOrder(state, 'en1', 10).slice(7, 10).concat(leagueOrder(state, 'es1', 10).slice(7, 10), leagueOrder(state, 'it1', 9).slice(6, 9), leagueOrder(state, 'de1', 8).slice(5, 8), leagueOrder(state, 'fr1', 8).slice(5, 8), leagueOrder(state, 'nl1', 2), leagueOrder(state, 'pt1', 5).slice(3, 5));
  comps.push(buildKnockoutComp(`CONT_ECL_s${state.season}`, 'Conference League', 'ECL', eur3.slice(0, 16), 6, 4, { seeded: true }));

  // 4) Estaduais (apenas Brasil) — semanas 1..9
  if (userClub.country === 'br') {
    const sp = Object.values(db.clubs).filter((c) => BRAZIL_STATES[c.id] === 'SP').map((c) => c.id);
    const rj = Object.values(db.clubs).filter((c) => BRAZIL_STATES[c.id] === 'RJ').map((c) => c.id);
    if (BRAZIL_STATES[state.clubId] === 'SP' && sp.length >= 6) {
      const t = sp.slice(0, 8);
      comps.push(buildLeagueComp(`EST_SP_s${state.season}`, 'Campeonato Paulista', 'PAU', t, 1, false));
    } else if (BRAZIL_STATES[state.clubId] === 'RJ' && rj.length >= 4) {
      comps.push(buildLeagueComp(`EST_RJ_s${state.season}`, 'Campeonato Carioca', 'CAR', rj.slice(0, 6), 1, false));
    }
  }

  // 5) Supercopa — jogo único na semana 1 (melhores reputações do país)
  if (state.season > 1 || true) {
    const top2 = countryLeagues.length ? Object.values(db.clubs)
      .filter((c) => c.country === userClub.country && c.leagueId === countryLeagues[0].id)
      .sort((a, b) => b.rep - a.rep).slice(0, 2).map((c) => c.id) : [];
    const prevChamp = state.history.champions.find((x) => x.comp.startsWith(`L_${countryLeagues[0]?.id}`));
    const prevCup = state.history.champions.find((x) => x.comp.startsWith(`C_${userClub.country}`));
    let sh = prevChamp?.clubId || top2[0], sa = prevCup?.clubId || top2[1];
    if (sh !== sa && sh && sa) {
      const sup = { id: `SUP_${userClub.country}_s${state.season}`, name: 'Supercopa Nacional', short: 'SUP', type: 'cup', teams: [sh, sa], fixtures: [mkFixture(`SUP_${userClub.country}_s${state.season}`, 1, sh, sa, 1)], status: 'running', champion: null, currentRound: 0, gapWeeks: 99, roundNames: ['Final'], startWeek: 1, singleMatch: true, scorers: {}, assists: {} };
      comps.push(sup);
    }
  }

  state.competitions = comps;

  // Táticas dos treinadores de IA
  const formationsIds = FORMATIONS.map((f) => f.id);
  for (const club of Object.values(db.clubs)) {
    const coach = db.coaches[club.id];
    if (coach) {
      coach.formation = formationsIds[hashStr(club.id) % formationsIds.length];
      coach.tactic = {
        mentality: club.rep > 80 ? 2 : club.rep < 68 ? 0 : 1,
        pressing: hashStr(club.short) % 3,
        line: club.rep > 78 ? 2 : 1,
        style: club.rep < 70 ? 1 : 0,
        tempo: 1,
      };
    }
  }
}

function leagueOrder(state, leagueId, count) {
  // Ordena por tabela da temporada anterior; sem histórico usa reputação
  const prev = state.history.finalTables?.[leagueId];
  let ids;
  if (prev && prev.length) ids = prev.slice(0, count);
  else {
    ids = Object.values(state.db.clubs).filter((c) => c.leagueId === leagueId)
      .sort((a, b) => b.rep - a.rep).map((c) => c.id).slice(0, count);
  }
  return ids;
}

// ============================================================
// COPA DO BRASIL — formato oficial 2026 (CBF)
// Fases preliminares em jogo único (Série B) → 5ª fase com a
// entrada da Série A (32 clubes) → ida e volta até a semifinal
// → final única em campo neutro.
// ============================================================
function tiesOf(comp, round) {
  const map = {};
  for (const f of comp.fixtures.filter((x) => x.round === round && x.tieId)) {
    (map[f.tieId] = map[f.tieId] || []).push(f);
  }
  return Object.values(map);
}
function tieWinner(tie) {
  if (tie.length === 1) { const f = tie[0]; return f.played ? fixtureWinner(f) : null; }
  const l1 = tie.find((x) => x.leg === 1) || tie[0];
  const l2 = tie.find((x) => x.leg === 2);
  if (!l2 || !l1.played || !l2.played) return null;
  const agg1 = l1.gh + l2.ga;   // gols do time da casa na ida (visitante na volta)
  const agg2 = l1.ga + l2.gh;
  if (agg1 > agg2) return l1.home;
  if (agg2 > agg1) return l1.away;
  if (l2.pen) return l2.pen.winner === 'h' ? l2.home : l2.away;
  return null;
}
// Decide pênaltis no jogo de VOLTA se o agregado empatar (regra CBF: direto pros pênaltis)
export function leg2Decide(state, comp, f, res) {
  if (f.leg !== 2) return;
  const tie = comp.fixtures.filter((x) => x.tieId === f.tieId);
  const l1 = tie.find((x) => x.leg === 1);
  if (!l1 || !l1.played) return;
  const agg1 = l1.gh + res.away;
  const agg2 = l1.ga + res.home;
  if (agg1 === agg2) {
    const rh = state.db.clubs[f.home].rep, ra = state.db.clubs[f.away].rep;
    res.penalties = penaltyShootout((res.seed ^ 0x51f2a3) >>> 0, rh / (rh + ra));
    res.events.push({ min: 90, type: 'info', side: 'n', text: `Agregado empatado em ${agg1}–${agg2}! A decisão vai para os pênaltis!` });
    res.events.push({ min: 90, type: 'pen', side: res.penalties.winner, text: `🏆 ${state.db.clubs[res.penalties.winner === 'h' ? f.home : f.away].short} vence nos pênaltis por ${Math.max(res.penalties.h, res.penalties.a)} a ${Math.min(res.penalties.h, res.penalties.a)}!` });
  }
}
function cdbWeeks(phase) {
  return { 1: [3], 2: [6, 9], 3: [12, 15], 4: [18, 21], 5: [24, 27], 6: [30] }[phase];
}
function buildCopaDoBrasil(state) {
  const db = state.db;
  const serieA = Object.values(db.clubs).filter((c) => c.leagueId === 'br1').sort((x, y) => y.rep - x.rep).map((c) => c.id);
  const serieB = Object.values(db.clubs).filter((c) => c.leagueId === 'br2').sort((x, y) => y.rep - x.rep).map((c) => c.id);
  const rng = makeRng(hashStr(`cdb_${state.season}_${db.seed}`));
  const comp = {
    id: `C_br_s${state.season}`, name: 'Copa do Brasil', short: 'CdB', type: 'cup',
    teams: serieA.concat(serieB), fixtures: [], scorers: {}, assists: {}, status: 'running',
    champion: null, currentRound: 0, brazilFormat: true, twoLegged: true,
    roundNames: ['Fase preliminar (jogo único)', '5ª fase', 'Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'],
  };
  // Fases 1–4 simplificadas: 16 clubes da Série B em jogo único (mando sorteado);
  // os 4 melhores da Série B avançam direto (representando campeões regionais).
  const prelim = rng.shuffle(serieB.slice(4));
  for (let i = 0; i < 8; i++) {
    const f = mkFixture(comp.id, cdbWeeks(1)[0], prelim[i + 8], prelim[i], 1);
    f.tieId = `r1_${i}`; f.leg = 1; f.knockout = true;
    comp.fixtures.push(f);
  }
  comp._byes = serieB.slice(0, 4);
  comp._serieA = serieA;
  return comp;
}
function cdbFifthPhase(state, comp, winners) {
  const db = state.db;
  const twelve = winners.concat(comp._byes);
  const all = comp._serieA.concat(twelve).sort((x, y) => db.clubs[y].rep - db.clubs[x].rep);
  const rng = makeRng(hashStr(`cdb5_${state.season}_${db.seed}`));
  const b1 = rng.shuffle(all.slice(0, 16)), b2 = rng.shuffle(all.slice(16));
  const weeks = cdbWeeks(2);
  for (let i = 0; i < 16; i++) {
    const [tA, tB] = rng.chance(0.5) ? [b1[i], b2[i]] : [b2[i], b1[i]];
    const f1 = mkFixture(comp.id, weeks[0], tA, tB, 2); f1.tieId = `r2_${i}`; f1.leg = 1; f1.knockout = false;
    const f2 = mkFixture(comp.id, weeks[1], tB, tA, 2); f2.tieId = `r2_${i}`; f2.leg = 2; f2.knockout = false;
    comp.fixtures.push(f1, f2);
  }
  addNews(state, '🏆 Copa do Brasil: sorteada a 5ª fase, com a entrada dos 20 clubes da Série A!', 'cup');
}
function progressCdB(state, comp, rng) {
  const round = comp.currentRound + 1;
  if (round > 6) return;
  const rFixtures = comp.fixtures.filter((f) => f.round === round);
  if (rFixtures.length && !rFixtures.every((f) => f.played)) return;
  if (round === 1) {
    if (!rFixtures.length) return;
    const winners = tiesOf(comp, 1).map(tieWinner).filter(Boolean);
    if (winners.length < 8) return;
    comp.currentRound = 1;
    cdbFifthPhase(state, comp, winners);
    return;
  }
  const winners = tiesOf(comp, round).map(tieWinner);
  if (winners.some((w) => !w)) return;
  comp.currentRound = round;
  if (round === 6) {
    const w = winners[0];
    comp.champion = w; comp.status = 'finished';
    addNews(state, `🏆 ${state.db.clubs[w].name} é CAMPEÃO da Copa do Brasil ${state.year} numa final eletrizante em campo neutro!`, 'trophy');
    state.db.clubs[w].titles.push({ comp: comp.short, season: state.season, year: state.year });
    if (w === state.clubId) { state.manager.titles.push({ comp: comp.name, season: state.season }); gainXp(state, 150); }
    return;
  }
  const next = round + 1;
  const weeks = cdbWeeks(next);
  if (next === 6) {
    const [fa, fb] = rng.shuffle(winners);
    const f = mkFixture(comp.id, weeks[0], fa, fb, 6);
    f.tieId = 'final'; f.knockout = true; f.neutral = true;
    comp.fixtures.push(f);
    addNews(state, `🏟️ FINAL DA COPA DO BRASIL: ${state.db.clubs[fa].name} × ${state.db.clubs[fb].name} — jogo único em campo neutro!`, 'trophy');
  } else {
    const shuffled = rng.shuffle(winners);
    for (let i = 0; i < shuffled.length / 2; i++) {
      const [t1, t2] = [shuffled[2 * i], shuffled[2 * i + 1]];
      const f1 = mkFixture(comp.id, weeks[0], t1, t2, next); f1.tieId = `r${next}_${i}`; f1.leg = 1; f1.knockout = false;
      const f2 = mkFixture(comp.id, weeks[1], t2, t1, next); f2.tieId = `r${next}_${i}`; f2.leg = 2; f2.knockout = false;
      comp.fixtures.push(f1, f2);
    }
    addNews(state, `Definidos os confrontos de ${comp.roundNames[next - 1]} da Copa do Brasil (ida e volta).`, 'cup');
  }
}

// -------------------- Fluxo semanal --------------------
export function getUserFixtures(state) {
  const out = [];
  for (const comp of state.competitions) {
    for (const f of comp.fixtures) {
      if (f.week === state.week && !f.played && (f.home === state.clubId || f.away === state.clubId)) {
        out.push({ comp, fixture: f });
      }
    }
  }
  out.sort((a, b) => (a.comp.type === b.comp.type ? 0 : a.comp.type === 'league' ? 1 : -1));
  return out;
}

export function nextUserFixture(state) {
  // procura a próxima partida do usuário (em semanas futuras também)
  let best = null;
  for (const comp of state.competitions) {
    for (const f of comp.fixtures) {
      if (!f.played && (f.home === state.clubId || f.away === state.clubId)) {
        if (!best || f.week < best.fixture.week) best = { comp, fixture: f };
      }
    }
  }
  return best;
}

// Aplica resultado de partida do usuário (vinda da simulação ao vivo)
export function applyUserResult(state, compId, fixtureId, result) {
  const comp = state.competitions.find((c) => c.id === compId);
  const f = comp?.fixtures.find((x) => x.id === fixtureId);
  if (!f || f.played) return;
  finalizeFixture(state, comp, f, result);
  postMatchPlayerUpdates(state, f, result, true);
}

// Simula todas as outras partidas da semana + atualizações semanais
export function simWeek(state) {
  enforceInfiniteMoney(state);
  const rng = makeRng(hashStr(`week_${state.week}_${state.season}_${state.db.seed}`) ^ (Date.now() % 1e6));
  // 1) Partidas sem o usuário
  for (const comp of state.competitions) {
    for (const f of comp.fixtures) {
      if (f.week === state.week && !f.played && f.home !== state.clubId && f.away !== state.clubId) {
        const home = userMatchSide(state, f.home);
        const away = userMatchSide(state, f.away);
        home.name = state.db.clubs[f.home].name; home.short = state.db.clubs[f.home].short;
        away.name = state.db.clubs[f.away].name; away.short = state.db.clubs[f.away].short;
        const knockoutFlag = comp.type === 'cup' && (f.knockout !== undefined ? f.knockout : true);
        const res = quickSim(home, away, rng.int(1, 1e9), knockoutFlag, !!f.neutral);
        if (f.leg === 2) leg2Decide(state, comp, f, res);
        finalizeFixture(state, comp, f, res);
        postMatchPlayerUpdates(state, f, res, false);
      }
    }
  }
  // Garante que sobrou alguma partida do usuário por jogar? (exceção: quem jogou tudo já aplicou resultados)

  // 2) Progressão de copas
  for (const comp of state.competitions) {
    if (comp.type === 'cup' && comp.status === 'running' && !comp.friendly) {
      if (comp.brazilFormat) { progressCdB(state, comp, rng); }
      else if (comp.singleMatch) {
        const f = comp.fixtures[0];
        if (f.played) { comp.champion = fixtureWinner(f); comp.status = 'finished'; const c = state.db.clubs[comp.champion]; c.titles.push({ comp: comp.short, season: state.season, year: state.year }); addNews(state, `🏆 ${c.name} conquista a ${comp.name}!`, 'trophy'); if (comp.champion === state.clubId) { state.manager.titles.push({ comp: comp.name, season: state.season }); gainXp(state, 120); } }
      } else progressCup(state, comp, rng);
    }
  }

  // 3) Atualizações semanais dos jogadores do usuário
  const squad = clubPlayers(state.db, state.clubId);
  const wageBill = squad.reduce((s, p) => s + p.salary, 0);
  state.finances.balance -= wageBill;
  log(state, 'Folha salarial da semana', -wageBill);
  const sponsorWeekly = Math.round(state.db.clubs[state.clubId].sponsor.value / 44);
  state.finances.balance += sponsorWeekly;
  log(state, `Patrocínio ${state.db.clubs[state.clubId].sponsor.name}`, sponsorWeekly);

  // Recuperação física / lesões / suspensões (todos os jogadores)
  for (const p of Object.values(state.db.players)) {
    if (p.injuredWeeks > 0) p.injuredWeeks--;
    if (p.suspended > 0) p.suspended--;
    p.fitness = clamp(p.fitness + 12, 45, 100);
    p.morale = clamp(p.morale + (p.morale > 70 ? -0.6 : 0.6), 25, 99);
  }

  // Bilheteria da partida em casa da semana
  for (const comp of state.competitions) {
    for (const f of comp.fixtures) {
      if (f.week === state.week && f.played && f.home === state.clubId) {
        const club = state.db.clubs[state.clubId];
        const attend = Math.min(club.capacity, Math.round(club.capacity * (0.55 + club.rep / 400 + state.chemistry / 800)));
        const price = 40 + club.rep * 1.1;
        const income = Math.round(attend * price);
        state.finances.balance += income;
        log(state, `Bilheteria (${attend.toLocaleString('pt-BR')} torcedores) — ${comp.short}`, income);
      }
    }
  }

  // 4) Mercado: respostas e novas ofertas
  processMarket(state, rng);

  // 5) Avança semana
  state.week += 1;

  // Entrosamento evolui com estabilidade
  state.chemistry = clamp(state.chemistry + 0.5, 40, 98);

  // 6) Fim de temporada?
  const totalWeeks = Math.max(...state.competitions.filter((c) => c.type === 'league').map((c) => c.totalRounds), 20) + 2;
  if (state.week > totalWeeks) {
    endSeason(state, rng);
    enforceInfiniteMoney(state);
    return { seasonEnded: true };
  }
  // Aviso de renovações
  const expiring = clubPlayers(state.db, state.clubId).filter((p) => p.contractYears <= 1);
  if (expiring.length && state.week % 6 === 0) {
    addInbox(state, { type: 'contract', title: 'Contratos terminando', text: `${expiring.length} jogador(es) com contrato acabando: ${expiring.slice(0, 4).map((p) => p.name).join(', ')}${expiring.length > 4 ? '…' : ''}. Renove na tela do jogador.`, week: state.week });
  }
  enforceInfiniteMoney(state);
  return { seasonEnded: false };
}

function finalizeFixture(state, comp, f, res) {
  f.gh = res.home; f.ga = res.away; f.played = true; f.pen = res.penalties || null; f.motm = res.motm || null;
  f.stats = res.stats; f.weather = res.weather;
  if (res.narrative !== false) f.events = res.events;
  // Artilharia da competição
  for (const g of res.goalScorers || []) {
    if (g.playerId) comp.scorers[g.playerId] = (comp.scorers[g.playerId] || 0) + 1;
    if (g.assistId) comp.assists[g.assistId] = (comp.assists[g.playerId] || 0) + 1;
  }
}

function postMatchPlayerUpdates(state, f, res, isUser) {
  const db = state.db;
  // Atualiza estatísticas, forma, moral e cansaço dos envolvidos
  const sides = [
    { clubId: f.home, gf: f.gh, ga: f.ga, side: 'h' },
    { clubId: f.away, gf: f.ga, ga: f.gh, side: 'a' },
  ];
  const ratings = {};
  for (const s of sides) {
    const win = s.gf > s.ga, draw = s.gf === s.ga;
    const real = userMatchSideForUpdate(state, s.clubId);
    for (const p of real) {
      p.stats.games++; p.career.games++;
      p.fitness = clamp(p.fitness - (8 + (hashStr(p.id) % 8)), 30, 100);
      let rating = 6.0;
      const goals = (res.goalScorers || []).filter((g) => g.playerId === p.id).length;
      const assists = (res.goalScorers || []).filter((g) => g.assistId === p.id).length;
      p.stats.goals += goals; p.career.goals += goals;
      p.stats.assists += assists; p.career.assists += assists;
      rating += goals * 1.3 + assists * 0.9;
      if (p.pos === 'G' || p.pos === 'D') { if (s.ga === 0) { rating += 0.8; p.stats.cleanSheets++; } rating -= s.ga * 0.25; }
      if (win) rating += 0.5; else if (!draw) rating -= 0.3;
      const yel = (res.cards?.yellow || []).filter((c) => c.id === p.id).length;
      const red = (res.cards?.red || []).includes(p.id);
      if (yel) { p.stats.yellow += yel; p.yellow += yel; rating -= 0.3 * yel; }
      if (red) { p.stats.red += 1; rating -= 1.4; p.suspended = 1; }
      if (p.yellow >= 3) { p.suspended = Math.max(p.suspended, 1); p.yellow = 0; }
      if (res.motm === p.id) rating += 0.6;
      rating = clamp(rating, 3, 10);
      ratings[p.id] = rating;
      p.stats.ratingSum += rating;
      p.formHistory.push(rating); if (p.formHistory.length > 5) p.formHistory.shift();
      p.form = clamp(Math.round((p.formHistory.reduce((a, b) => a + b, 0) / p.formHistory.length) * 10), 20, 99);
      p.morale = clamp(p.morale + (win ? 3 : draw ? 0.5 : -3) + (goals ? 2 : 0), 25, 99);
      p.xp += 1;
    }
    // Lesões
    for (const inj of res.injuries || []) {
      const p = db.players[inj.id];
      if (p && p.clubId === s.clubId) {
        p.injuredWeeks = inj.weeks;
        if (s.clubId === state.clubId) addNews(state, `🤕 ${p.name} ficará ${inj.weeks} semana(s) fora por lesão.`, 'injury');
      }
    }
  }
  f.ratings = ratings;
  // Ganho de XP do técnico (usuário)
  if (isUser) {
    const win = (f.home === state.clubId && f.gh > f.ga) || (f.away === state.clubId && f.ga > f.gh);
    const draw = f.gh === f.ga;
    gainXp(state, win ? 30 : draw ? 12 : 6);
    const myRep = state.manager.rep;
    state.manager.rep = clamp(myRep + (win ? 0.6 : draw ? 0.1 : -0.5), 30, 99);
  }
}

function userMatchSideForUpdate(state, clubId) {
  const side = userMatchSide(state, clubId);
  return [...side.lineup.G, ...side.lineup.D, ...side.lineup.M, ...side.lineup.A].filter(Boolean);
}

function gainXp(state, xp) {
  state.manager.xp += xp;
  const newLevel = Math.floor(state.manager.xp / 300) + 1;
  if (newLevel > state.manager.level) {
    state.manager.level = newLevel;
    addNews(state, `⭐ Evolução! Você alcançou o nível ${newLevel} como treinador. O grupo respeita mais suas ideias (+moral).`, 'star');
    clubPlayers(state.db, state.clubId).forEach((p) => { p.morale = clamp(p.morale + 4, 25, 99); });
  }
}

// -------------------- Fim de temporada --------------------
function endSeason(state, rng) {
  const db = state.db;
  const year = state.year;
  const finalTables = {};
  const prizes = [];

  for (const comp of state.competitions) {
    if (comp.type === 'league') {
      const table = leagueTable(state, comp);
      comp.champion = table[0].clubId;
      comp.status = 'finished';
      const champ = db.clubs[comp.champion];
      champ.titles.push({ comp: comp.short, season: state.season, year });
      state.history.champions.push({ comp: comp.id, name: comp.name, season: state.season, year, clubId: comp.champion });
      if (comp.id.startsWith('L_')) finalTables[comp.id.replace(/^L_/, '').replace(/_s\d+$/, '')] = table.map((r) => r.clubId);
      // Artilheiro
      const scorers = Object.entries(comp.scorers).sort((a, b) => b[1] - a[1]);
      if (scorers.length) {
        const [pid, goals] = scorers[0];
        state.history.scorers.push({ comp: comp.id, name: comp.name, season: state.season, year, playerId: pid, goals, clubId: db.players[pid]?.clubId });
        const recKey = comp.id.replace(/_s\d+$/, '');
        const rec = state.history.records[recKey];
        if (!rec || goals > rec.goals) state.history.records[recKey] = { playerId: pid, goals, year };
      }
      // Premiação se for a liga do usuário
      const userRow = table.findIndex((r) => r.clubId === state.clubId);
      const leagueMeta = LEAGUES.find((l) => comp.id.includes(l.id));
      if (userRow >= 0) {
        const pos = userRow + 1;
        const prize = Math.round(Math.pow(92 - Math.min(pos - 1, 40), 2.1) * 9000);
        state.finances.balance += prize;
        log(state, `Premiação ${comp.name} (${pos}º lugar)`, prize);
        prizes.push(`${comp.short}: ${pos}º lugar — ${prize}`);
        if (pos === 1) { addNews(state, `🏆 CAMPEÃO! ${db.clubs[state.clubId].name} conquista a ${comp.name}!`, 'trophy'); state.manager.titles.push({ comp: comp.name, season: state.season }); gainXp(state, 200); }
        else addNews(state, `Fim da ${comp.name}: terminamos em ${pos}º lugar.`, 'info');
      }
      void leagueMeta;
    } else if (comp.type === 'cup' && comp.status === 'running') {
      // copa em andamento: força conclusão nas semanas finais (não deve acontecer com gaps configurados)
      progressCup(state, comp, rng);
    }
    // Guarda título de copa no histórico
    if (comp.type === 'cup' && comp.champion) {
      if (!state.history.champions.some((x) => x.comp === comp.id)) {
        state.history.champions.push({ comp: comp.id, name: comp.name, season: state.season, year, clubId: comp.champion });
      }
      const involvedUser = comp.teams.includes(state.clubId);
      if (involvedUser && comp.champion !== state.clubId) {
        const prize = Math.round(Math.pow(comp.teams.length, 1.6) * 12000);
        state.finances.balance += prize;
        log(state, `Premiação ${comp.name}`, prize);
      } else if (comp.champion === state.clubId) {
        const prize = Math.round(Math.pow(comp.teams.length, 1.7) * 40000);
        state.finances.balance += prize;
        log(state, `Premiação de campeão — ${comp.name}`, prize);
      }
    }
  }

  // Mundial de Clubes: campeões da Libertadores x Champions
  const libChamp = state.competitions.find((c) => c.id.startsWith('CONT_AME'))?.champion;
  const uclChamp = state.competitions.find((c) => c.id.startsWith('CONT_EUR'))?.champion;
  if (libChamp && uclChamp) {
    const home = userMatchSide(state, libChamp); home.short = db.clubs[libChamp].short; home.name = db.clubs[libChamp].name;
    const away = userMatchSide(state, uclChamp); away.short = db.clubs[uclChamp].short; away.name = db.clubs[uclChamp].name;
    const res = quickSim(home, away, rng.int(1, 1e9), true, true);
    const winner = res.home > res.away || res.penalties?.winner === 'h' ? libChamp : uclChamp;
    db.clubs[winner].titles.push({ comp: 'MUN', season: state.season, year });
    state.history.champions.push({ comp: `MUN_s${state.season}`, name: 'Mundial de Clubes', season: state.season, year, clubId: winner });
    addNews(state, `🌍 ${db.clubs[winner].name} vence o Mundial de Clubes!`, 'trophy');
    if (winner === state.clubId) { state.manager.titles.push({ comp: 'Mundial de Clubes', season: state.season }); gainXp(state, 250); state.finances.balance += 120e6; log(state, 'Premiação Mundial de Clubes', 120e6); }
  }

  state.history.finalTables = finalTables;

  // ----- Acesso e rebaixamento (países com 2 divisões) -----
  for (const topLeague of LEAGUES.filter((l) => l.tier === 1)) {
    const second = LEAGUES.find((l) => l.country === topLeague.country && l.tier === 2);
    if (!second) continue;
    const t1 = finalTables[topLeague.id] || [], t2 = finalTables[second.id] || [];
    const down = t1.slice(-(topLeague.relegation || 0));
    const up = t2.slice(0, (topLeague.relegation || 0));
    down.forEach((id) => { db.clubs[id].leagueId = second.id; db.clubs[id].tier = 2; });
    up.forEach((id) => { db.clubs[id].leagueId = topLeague.id; db.clubs[id].tier = 1; });
    if (down.includes(state.clubId)) addNews(state, `⬇️ Rebaixamento… seu clube caiu para a ${second.name}.`, 'warn');
    if (up.includes(state.clubId)) addNews(state, `⬆️ ACESSO! Seu clube subiu para a ${topLeague.name}!`, 'trophy');
  }

  // ----- Evolução / envelhecimento dos jogadores -----
  const retired = [];
  for (const p of Object.values(db.players)) {
    p.age++;
    p.contractYears--;
    // Evolução
    let delta = 0;
    if (p.age <= 20) delta = rng.int(0, 3);
    else if (p.age <= 23) delta = rng.int(0, 2);
    else if (p.age <= 26) delta = rng.int(-1, 1);
    else if (p.age <= 28) delta = rng.int(-1, 0);
    else if (p.age <= 31) delta = rng.int(-2, 0);
    else delta = rng.int(-3, -1);
    p.ovr = clamp(p.ovr + delta, 40, Math.max(p.pot, p.ovr));
    if (p.age > p.pot) p.pot = p.ovr;
    p.pot = Math.max(p.pot, p.ovr);
    // Aposentadoria
    if ((p.age >= 36 && rng.chance(0.4)) || (p.age >= 38)) {
      retired.push(p.id);
      delete db.players[p.id];
      continue;
    }
    // Reset estatísticas de temporada
    p.history.push({ season: state.season, year, clubId: p.clubId, games: p.stats.games, goals: p.stats.goals, assists: p.stats.assists });
    if (p.history.length > 12) p.history.shift();
    p.stats = { games: 0, goals: 0, assists: 0, yellow: 0, red: 0, ratingSum: 0, cleanSheets: 0 };
    p.injuredWeeks = 0; p.suspended = 0; p.yellow = 0;
    p.fitness = clamp(80 + rng.int(0, 15), 70, 100);
    p.form = clamp(p.form + rng.int(-6, 6), 40, 90);
    // Valor de mercado
    p.value = marketValue(p.ovr, p.age, p.pot);
    p.salary = weeklyWage(p.value, p.ovr);
  }

  // Devolução de empréstimos
  for (const p of Object.values(db.players)) {
    if (p.loan) { p.clubId = p.loan.from; p.loan = null; }
  }

  // Contratos encerrados: viram agentes livres
  for (const p of Object.values(db.players)) {
    if (p.contractYears < 0) {
      p.freeAgent = true; p.clubId = null; p.salary = Math.round(p.salary * 0.85);
    }
  }

  // Base: revelações (olheiros/youth level) para cada clube
  for (const club of Object.values(db.clubs)) {
    const count = rng.int(2, 3);
    for (let i = 0; i < count; i++) {
      const prng = makeRng(rng.int(1, 1e9));
      const pool = { f: prng.f, int: prng.int, pick: prng.pick, chance: prng.chance, shuffle: prng.shuffle };
      const ovr = clamp(Math.round(club.youthLevel - 22 + prng.f() * 14), 45, 86);
      const pot = clamp(ovr + prng.int(6, 26), ovr, 99);
      const pos = prng.pick(['G', 'D', 'D', 'M', 'M', 'M', 'A', 'A']);
      const value = marketValue(ovr, 17, pot);
      const np = {
        id: `py_${Date.now().toString(36)}_${Math.abs(rng.int(1, 1e9)).toString(36)}_${i}`,
        name: youthName(rng, club.country), clubId: club.id,
        age: prng.int(16, 18), height: pos === 'G' ? prng.int(186, 196) : prng.int(170, 192),
        weight: 70 + prng.int(0, 15), country: prng.chance(0.9) ? club.country : 'br',
        pos, ovr, pot, salary: weeklyWage(value, ovr), contractYears: 3, value,
        personality: prng.pick(['Profissional', 'Ambicioso', 'Humilde']),
        fitness: 95, injuredWeeks: 0, suspended: 0, yellow: 0, number: 0,
        foot: prng.chance(0.72) ? 'D' : 'E', morale: 70, xp: 2, form: 55, photo: null,
        stats: { games: 0, goals: 0, assists: 0, yellow: 0, red: 0, ratingSum: 0, cleanSheets: 0 },
        career: { games: 0, goals: 0, assists: 0 }, history: [], listed: false, loan: null, formHistory: [],
      };
      // número livre
      const used = new Set(clubPlayers(db, club.id).map((x) => x.number));
      let n = 30; while (used.has(n)) n++; np.number = n;
      db.players[np.id] = np;
      if (club.id === state.clubId && pot >= 82) addNews(state, `💎 Joia da base! ${np.name} (${pos}, ${pot} de potencial) foi promovido ao profissional.`, 'star');
    }
  }
  void retired;

  // Nova temporada
  state.season += 1;
  state.year += 1;
  state.week = 1;
  for (const p of Object.values(db.players)) if (p.contractYears <= 0 && p.clubId) p.contractYears = 1; // segurança
  generateSeason(state);
  generateJobOffers(state);
  addNews(state, `📅 A temporada ${state.year} começou! Boa sorte, ${state.manager.name}.`, 'info');
}

function youthName(rng, country) {
  void country;
  const first = ['Gabriel', 'Enzo', 'Pedro', 'Lucas', 'Matheus', 'Arthur', 'Rafael', 'Thiago', 'Miguel', 'Davi', 'Heitor', 'Theo', 'Noah', 'Gael', 'Ian', 'Kaique', 'Lorenzo', 'Samuel', 'Benício', 'Otto', 'Ravi', 'Levi', 'Bento', 'Caio'];
  const last = ['Silva', 'Santos', 'Costa', 'Lima', 'Alves', 'Rocha', 'Nunes', 'Pires', 'Barros', 'Teles', 'Souto', 'Rezende', 'Prado', 'Sales', 'Fontes', 'Vidal', 'Amaral', 'Quadros', 'Peixoto', 'Galvão'];
  return `${first[rng.int(0, first.length - 1)]} ${last[rng.int(0, last.length - 1)]}`;
}

// -------------------- Mercado / Transferências --------------------
export function transferWindowOpen(state) {
  return state.week <= 6 || (state.week >= 20 && state.week <= 24);
}

export function marketList(state, { maxWage = Infinity, pos = null, maxValue = Infinity, search = '' } = {}) {
  const out = [];
  for (const p of Object.values(state.db.players)) {
    if (!p.clubId || p.clubId === state.clubId || p.loan) continue;
    if (pos && p.pos !== pos) continue;
    if (p.value > maxValue) continue;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) continue;
    out.push(p);
  }
  out.sort((a, b) => b.ovr - a.ovr);
  return out.slice(0, 250);
}

export function freeAgents(state) {
  return Object.values(state.db.players).filter((p) => p.freeAgent).sort((a, b) => b.ovr - a.ovr).slice(0, 60);
}

// Preço pedido pelo clube vendedor
export function askingPrice(state, player) {
  const club = state.db.clubs[player.clubId];
  const factor = 1.1 + (player.pot - player.ovr) * 0.02 + (club.rep > 82 ? 0.25 : 0) + (player.ovr > 84 ? 0.2 : 0);
  return Math.round(player.value * clamp(factor, 1.05, 1.9) / 10000) * 10000;
}

export function makeOffer(state, playerId, fee, wage) {
  const p = state.db.players[playerId];
  if (!p || !transferWindowOpen(state)) return { ok: false, msg: 'Janela fechada ou jogador indisponível.' };
  const ask = askingPrice(state, p);
  state.market.pending = state.market.pending || [];
  state.market.pending.push({ id: uid('of'), playerId, fee, wage: wage || Math.round(p.salary * 1.1), responseWeek: state.week + 1, type: 'buy', asking: ask });
  addNews(state, `📨 Proposta de ${money(state, fee)} enviada por ${p.name}. Aguardando resposta do ${state.db.clubs[p.clubId].name}.`, 'market');
  return { ok: true };
}

export function renewContract(state, playerId) {
  const p = state.db.players[playerId];
  if (!p || p.clubId !== state.clubId) return { ok: false };
  enforceInfiniteMoney(state);
  const raise = Math.round(p.salary * 1.12 / 100) * 100;
  const cost = raise * 26; // luva
  if (state.finances.balance < cost) return { ok: false, msg: 'Caixa insuficiente para a luva de renovação.' };
  state.finances.balance -= cost;
  log(state, `Renovação de ${p.name} (luva)`, -cost);
  p.salary = raise;
  p.contractYears = 3;
  p.morale = clamp(p.morale + 5, 25, 99);
  addNews(state, `✍️ ${p.name} renovou contrato por 3 temporadas.`, 'market');
  enforceInfiniteMoney(state);
  return { ok: true };
}

export function listPlayerForSale(state, playerId, list) {
  const p = state.db.players[playerId];
  if (p && p.clubId === state.clubId) { p.listed = list; }
}

function processMarket(state, rng) {
  state.market.pending = state.market.pending || [];
  // Respostas de compra
  for (const offer of state.market.pending.slice()) {
    if (state.week >= offer.responseWeek) {
      const p = state.db.players[offer.playerId];
      if (!p || !p.clubId) { offer.done = true; continue; }
      const ask = askingPrice(state, p);
      if (offer.fee >= ask) {
        // Aceito!
        addInbox(state, { type: 'offerAccepted', title: `Proposta ACEITA por ${p.name}`, text: `${state.db.clubs[p.clubId].name} aceitou ${money(state, offer.fee)}. Confirme a contratação.`, week: state.week, offerId: offer.id, playerId: p.id });
        offer.status = 'accepted';
      } else if (offer.fee >= ask * 0.8 && rng.chance(0.5)) {
        offer.asking = ask;
        addInbox(state, { type: 'offerCounter', title: `Contraproposta por ${p.name}`, text: `O clube pede ${money(state, ask)} (você ofereceu ${money(state, offer.fee)}).`, week: state.week, offerId: offer.id, playerId: p.id, counter: ask });
        offer.status = 'counter';
      } else {
        addInbox(state, { type: 'offerRejected', title: `Proposta recusada por ${p.name}`, text: `O ${state.db.clubs[p.clubId].name} considerou o valor baixo.`, week: state.week, playerId: p.id });
        offer.done = true;
      }
    }
  }
  state.market.pending = state.market.pending.filter((o) => !o.done);

  // Ofertas por jogadores listados do usuário (leilão)
  const listed = clubPlayers(state.db, state.clubId).filter((p) => p.listed);
  for (const p of listed) {
    if (!rng.chance(0.4)) continue;
    const interested = Object.values(state.db.clubs).filter((c) => c.id !== state.clubId && c.rep >= p.ovr - 18 && rng.chance(0.12));
    for (const club of interested.slice(0, 2)) {
      const bid = Math.round(p.value * (0.85 + rng.f() * 0.35) / 10000) * 10000;
      state.market.offers.push({ id: uid('bid'), playerId: p.id, fromClubId: club.id, fee: bid, week: state.week, expires: state.week + 2 });
      addInbox(state, { type: 'bid', title: `Oferta por ${p.name}`, text: `${club.name} oferece ${money(state, bid)}. Aceitar, recusar ou negociar?`, week: state.week, offerId: state.market.offers[state.market.offers.length - 1].id, playerId: p.id });
    }
  }
  // Interesse aleatório em craques não listados
  const stars = clubPlayers(state.db, state.clubId).filter((p) => !p.listed && p.ovr >= 82);
  for (const p of stars) {
    if (!rng.chance(0.03)) continue;
    const club = Object.values(state.db.clubs).filter((c) => c.rep >= p.ovr && c.id !== state.clubId)[rng.int(0, 5)];
    if (!club) continue;
    const bid = Math.round(p.value * (1.0 + rng.f() * 0.3) / 10000) * 10000;
    state.market.offers.push({ id: uid('bid'), playerId: p.id, fromClubId: club.id, fee: bid, week: state.week, expires: state.week + 2 });
    addInbox(state, { type: 'bid', title: `Sondagem por ${p.name}`, text: `${club.name} quer tirar ${p.name} por ${money(state, bid)}.`, week: state.week, offerId: state.market.offers[state.market.offers.length - 1].id, playerId: p.id });
  }
  // Expiração de ofertas
  state.market.offers = state.market.offers.filter((o) => o.expires >= state.week);
}

export function confirmBuy(state, offerId) {
  const offer = (state.market.pending || []).find((o) => o.id === offerId);
  if (!offer || offer.status !== 'accepted') return { ok: false };
  const p = state.db.players[offer.playerId];
  if (!p) return { ok: false };
  enforceInfiniteMoney(state);
  if (state.finances.balance < offer.fee) return { ok: false, msg: 'Caixa insuficiente.' };
  const agentFee = Math.round(offer.fee * 0.06); // empresário
  state.finances.balance -= offer.fee + agentFee;
  const from = state.db.clubs[p.clubId];
  from.budget = (from.budget || 0) + offer.fee;
  log(state, `Contratação de ${p.name}`, -offer.fee);
  log(state, `Comissão de empresário`, -agentFee);
  p.clubId = state.clubId; p.salary = offer.wage; p.contractYears = 3;
  p.morale = 80; p.listed = false;
  const used = new Set(clubPlayers(state.db, state.clubId).map((x) => x.number));
  let n = 1; while (used.has(n)) n < 99 ? n++ : n = 77; p.number = n;
  offer.done = true;
  state.market.pending = state.market.pending.filter((o) => !o.done);
  state.chemistry = clamp(state.chemistry - 1.5, 40, 98);
  addNews(state, `✅ CONTRATADO! ${p.name} é o novo reforço do ${state.db.clubs[state.clubId].name}!`, 'market');
  enforceInfiniteMoney(state);
  return { ok: true };
}

export function respondBid(state, offerId, action) {
  const o = state.market.offers.find((x) => x.id === offerId);
  if (!o) return { ok: false };
  const p = state.db.players[o.playerId];
  const buyer = state.db.clubs[o.fromClubId];
  if (!p || !buyer) { state.market.offers = state.market.offers.filter((x) => x.id !== offerId); return { ok: false }; }
  if (action === 'accept') {
    state.finances.balance += o.fee;
    log(state, `Venda de ${p.name} para ${buyer.short}`, o.fee);
    buyer.budget = (buyer.budget || 0) - o.fee;
    p.clubId = buyer.id; p.contractYears = 3; p.listed = false;
    state.market.offers = state.market.offers.filter((x) => x.id !== offerId && x.playerId !== p.id);
    state.chemistry = clamp(state.chemistry - 1, 40, 98);
    addNews(state, `💰 VENDIDO: ${p.name} acertou com o ${buyer.name} por ${money(state, o.fee)}.`, 'market');
    return { ok: true };
  }
  if (action === 'counter') {
    const newFee = Math.round(o.fee * 1.15 / 10000) * 10000;
    if (newFee <= p.value * 1.45) { o.fee = newFee; o.expires = state.week + 1; addInbox(state, { type: 'info', title: 'Contraproposta enviada', text: `Você pediu ${money(state, newFee)} por ${p.name}.`, week: state.week }); return { ok: true }; }
    addInbox(state, { type: 'info', title: 'Negociação encerrada', text: `${buyer.name} desistiu de ${p.name}.`, week: state.week });
    state.market.offers = state.market.offers.filter((x) => x.id !== offerId);
    return { ok: true };
  }
  // reject
  state.market.offers = state.market.offers.filter((x) => x.id !== offerId);
  return { ok: true };
}

export function signFreeAgent(state, playerId) {
  const p = state.db.players[playerId];
  if (!p || !p.freeAgent) return { ok: false };
  enforceInfiniteMoney(state);
  const signingBonus = Math.round(p.value * 0.05);
  if (state.finances.balance < signingBonus) return { ok: false, msg: 'Caixa insuficiente.' };
  state.finances.balance -= signingBonus;
  log(state, `Contratação sem custos de ${p.name} (luva)`, -signingBonus);
  p.freeAgent = false; p.clubId = state.clubId; p.contractYears = 2; p.morale = 75;
  addNews(state, `✅ ${p.name} assinou de graça com o ${state.db.clubs[state.clubId].name}.`, 'market');
  enforceInfiniteMoney(state);
  return { ok: true };
}

// Empréstimo simples: cede jogador da sua base por 1 temporada
export function loanOut(state, playerId) {
  const p = state.db.players[playerId];
  if (!p || p.clubId !== state.clubId || p.age > 23) return { ok: false, msg: 'Apenas jogadores de até 23 anos podem ser emprestados.' };
  const suitors = Object.values(state.db.clubs).filter((c) => c.id !== state.clubId && c.rep < p.ovr + 8 && c.rep > p.ovr - 22);
  if (!suitors.length) return { ok: false, msg: 'Nenhum clube interessado no momento.' };
  const rng = makeRng(Date.now() % 1e9);
  const dest = rng.pick(suitors);
  p.loan = { from: state.clubId, seasons: 1 };
  p.clubId = dest.id;
  addNews(state, `🔁 ${p.name} emprestado ao ${dest.name} por uma temporada.`, 'market');
  return { ok: true, to: dest.name };
}

// -------------------- Amistosos e campeonatos personalizados --------------------
export function scheduleFriendly(state, opponentId, week) {
  if (week < state.week) week = state.week;
  const comp = {
    id: `FRI_${Date.now().toString(36)}`, name: 'Amistoso', short: 'AMI', type: 'cup',
    teams: [state.clubId, opponentId], fixtures: [mkFixture(`FRI${Date.now().toString(36)}`, week, state.clubId, opponentId, 1)],
    status: 'running', champion: null, currentRound: 0, gapWeeks: 99, roundNames: ['Jogo único'], startWeek: week, singleMatch: false, friendly: true, scorers: {}, assists: {},
  };
  state.competitions.push(comp);
  addNews(state, `🤝 Amistoso marcado contra ${state.db.clubs[opponentId].name} na semana ${week}.`, 'info');
  return comp;
}

export function createCustomCompetition(state, { name, teamIds, format }) {
  if (!name || teamIds.length < 4) return { ok: false, msg: 'Informe nome e pelo menos 4 times.' };
  const id = `CUS_${Date.now().toString(36)}`;
  let comp;
  if (format === 'league') {
    comp = buildLeagueComp(id, name, name.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase(), teamIds, state.week + 1, false);
  } else {
    comp = buildKnockoutComp(id, name, name.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase(), teamIds, state.week + 1, 2, { seeded: false });
  }
  comp.custom = true;
  state.competitions.push(comp);
  addNews(state, `🏟️ Campeonato "${name}" criado com ${teamIds.length} equipes (${format === 'league' ? 'pontos corridos' : 'mata-mata'}).`, 'trophy');
  return { ok: true, comp };
}

// -------------------- Ranking mundial --------------------
export function worldRanking(state) {
  const titleWeight = { LIB: 60, UCL: 60, UEL: 40, SUL: 35, ECL: 25, MUN: 80, CdB: 25 };
  const arr = Object.values(state.db.clubs).map((c) => {
    let score = c.rep * 10;
    for (const t of c.titles) score += titleWeight[t.comp] || 20;
    return { clubId: c.id, score: Math.round(score) };
  });
  arr.sort((a, b) => b.score - a.score);
  return arr;
}

// -------------------- Utilidades de estado --------------------
export function addNews(state, text, icon = 'info') {
  state.news.unshift({ id: uid('n'), week: state.week, season: state.season, text, icon });
  if (state.news.length > 60) state.news.pop();
}
export function addInbox(state, item) {
  state.inbox.unshift({ id: uid('i'), read: false, ...item });
  if (state.inbox.length > 60) state.inbox.pop();
}
export function log(state, desc, value) {
  state.finances.ledger.unshift({ week: state.week, season: state.season, desc, value });
  if (state.finances.ledger.length > 120) state.finances.ledger.pop();
}
export function enforceInfiniteMoney(state) {
  if (state && state.settings) {
    const isInfinite = state.settings.infiniteMoney === true || state.settings.infiniteMoney === 'true';
    if (isInfinite) {
      state.finances.balance = (state.settings.infiniteMoneyValue !== undefined) ? Number(state.settings.infiniteMoneyValue) : 999999999;
    }
  }
}

function money(state, v) {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `R$ ${(abs / 1e6).toFixed(2).replace('.', ',')} mi`;
  return `R$ ${Math.round(abs / 1000)} mil`;
}

// -------------------- Saves (com compressão gzip) --------------------
import { compressText, decompressText } from './saveio.js';

export function serialize(state) {
  return JSON.stringify(state);
}
export function deserialize(json) {
  const s = JSON.parse(json);
  if (!s.version || s.version > SAVE_VERSION) throw new Error('Save incompatível.');
  return s;
}
export function saveSlots(storage) {
  try { return JSON.parse(storage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
export async function writeSlot(storage, slotId, state) {
  const slots = saveSlots(storage);
  const data = await compressText(serialize(state));
  slots[slotId] = { savedAt: new Date().toISOString(), clubId: state.clubId, clubName: state.db.clubs[state.clubId].name, season: state.season, week: state.week, manager: state.manager.name, data };
  try {
    storage.setItem(LS_KEY, JSON.stringify(slots));
    return { ok: true, size: data.length };
  } catch (e) {
    return { ok: false, msg: 'Espaço de armazenamento cheio. Exporte seus saves em arquivo.' };
  }
}
export async function readSlot(storage, slotId) {
  const slots = saveSlots(storage);
  if (!slots[slotId]) return null;
  return deserialize(await decompressText(slots[slotId].data));
}
export function deleteSlot(storage, slotId) {
  const slots = saveSlots(storage);
  delete slots[slotId];
  storage.setItem(LS_KEY, JSON.stringify(slots));
}
// Memória para testes em Node (sem localStorage)
export const memoryStorage = (() => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
})();

// -------------------- Propostas de emprego (manager job offers) --------------------
export function generateJobOffers(state) {
  if (!state.jobOffers) state.jobOffers = [];
  if (state.week % 8 !== 0) return;
  const myRep = state.manager.rep || 50;
  Object.values(state.db.clubs).forEach(club => {
    if (club.id === state.clubId) return;
    if (state.jobOffers.some(o => o.clubId === club.id)) return;
    const repDiff = club.rep - myRep;
    if (repDiff <= 12 && Math.random() < 0.35) {
      state.jobOffers.push({
        id: uid(),
        clubId: club.id,
        week: state.week,
        salary: Math.round(club.rep * 1800),
        accepted: false
      });
      addInbox(state, {
        type: 'jobOffer',
        title: `Oferta de emprego`,
        text: `${club.name} quer que você assuma o comando! Salário semanal: ${money(state, Math.round(club.rep * 1800))}.`,
        week: state.week,
        clubId: club.id
      });
    }
  });
}
