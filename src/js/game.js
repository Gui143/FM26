// ============================================================
// game.js — Núcleo do jogo: Vida de Craque 26
// Modo Carreira de Jogador (BitLife × FIFA)
// Estado, tempo, treino, partidas, transferências, seleção,
// prêmios, vida pessoal, família, fama, dinheiro, eventos,
// aposentadoria e saves.
// ============================================================
import { makeRng, clamp, uid, hashStr } from './util.js';
import { compressText, decompressText } from './saveio.js';
import {
  COUNTRIES, CITIES, NAME_POOLS, POOL_BY_COUNTRY, POSITIONS, positionById,
  SKILLS, TECH_SKILLS, PHYS_SKILLS, MENTAL_SKILLS, TRAITS, TRAININGS,
  CLUBS, clubById, clubsByLeague, AWARDS, BRANDS, LIFESTYLES, PURCHASES,
  NARRATIVE,
} from './data.js';

export const SAVE_VERSION = 4;
export const LS_KEY = 'vidacraque_saves_v1';

export const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const PHASES = {
  child: 'Infância',
  teen: 'Adolescência',
  base: 'Base (juvenil)',
  pro: 'Profissional',
  vet: 'Veterano',
  retired: 'Aposentado',
  dead: 'Falecido(a)',
};
export const phaseLabel = (s) => PHASES[s.player.phase] || s.player.phase;
export const fmtMonth = (m) => MONTHS[m - 1];

// -------------------- Utilidades do jogo --------------------
export function lifeBar(v, max = 100) { return clamp(Math.round(v), 0, max); }

function genName(rng, countryId, gender, used) {
  const pool = NAME_POOLS[POOL_BY_COUNTRY[countryId] || 'br'];
  const first = gender === 'F' ? (pool.firstF || pool.first) : pool.first;
  for (let i = 0; i < 40; i++) {
    const n = `${rng.pick(first)} ${rng.pick(pool.last)}`;
    if (!used.has(n)) { used.add(n); return n; }
  }
  return `${rng.pick(first)} ${rng.pick(pool.last)} ${rng.pick(pool.last)}`;
}

// -------------------- Valor de mercado --------------------
export function marketValue(p) {
  const ovr = p.ovr, age = p.age;
  const base = Math.pow(Math.max(ovr - 45, 1), 3.2) * 2000;
  const ageFactor = age <= 20 ? 1.55 : age <= 23 ? 1.35 : age <= 26 ? 1.2 : age <= 29 ? 1.0 : age <= 31 ? 0.75 : age <= 33 ? 0.5 : age <= 35 ? 0.3 : 0.12;
  const potBonus = Math.max(p.pot - ovr, 0) * 0.05 + 1;
  const formFactor = 0.8 + (p.form / 100) * 0.4;
  const fameFactor = 1 + (p.fame || 0) / 90;
  return Math.round(base * ageFactor * potBonus * formFactor * fameFactor / 1000) * 1000;
}

// -------------------- Overall --------------------
export function calcOvr(p) {
  const pos = positionById(p.position);
  let sum = 0, total = 0;
  for (const k in pos.w) {
    if (p.skills[k] === undefined) continue;
    sum += p.skills[k] * pos.w[k];
    total += pos.w[k];
  }
  if (!total) return p.ovr || 50;
  const mental = (p.skills.COM || 50) * 0.5 + (p.skills.DET || 50) * 0.3 + (p.skills.VIS || 50) * 0.2;
  const ovr = Math.round((sum / total) * 0.9 + mental * 0.1);
  return clamp(ovr, 30, 99);
}

export function refreshPlayer(s) {
  const p = s && s.player ? s.player : s;
  p.ovr = calcOvr(p);
  p.pot = clamp(p.pot, p.ovr, 99);
  p.value = marketValue(p);
}

// -------------------- Criação de jogador --------------------
function baseSkillsFor(pos, age, rng) {
  const sk = {};
  const all = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY', 'VIS', 'LID', 'COM', 'DET', 'GOL'];
  const main = positionById(pos).main;
  for (const k of all) {
    let v;
    if (k === main) v = rng.int(45, 65);
    else if (k === 'GOL') v = rng.int(15, 40);
    else if (k === 'PHY' || k === 'PAC') v = rng.int(38, 60);
    else if (k === 'LID') v = rng.int(25, 50);
    else if (k === 'COM') v = rng.int(30, 55);
    else v = rng.int(30, 55);
    sk[k] = v;
  }
  // idade menor => base menor
  const youth = age < 16 ? 0.75 : age < 18 ? 0.85 : 1;
  for (const k of all) sk[k] = Math.round(sk[k] * youth);
  return sk;
}

function makeFamily(s, rng, used) {
  const fam = [];
  const ctry = s.player.country;
  const dad = { id: uid('fam'), role: 'pai', name: genName(rng, ctry, 'M', used), age: s.player.age + rng.int(24, 34), love: rng.int(62, 88), alive: true, job: 'Trabalhador' };
  const mom = { id: uid('fam'), role: 'mãe', name: genName(rng, ctry, 'F', used), age: s.player.age + rng.int(21, 30), love: rng.int(65, 92), alive: true, job: 'Dona de casa' };
  fam.push(dad, mom);
  const siblings = rng.int(0, 3);
  for (let i = 0; i < siblings; i++) {
    const g = rng.chance(0.5) ? 'M' : 'F';
    const ageDiff = rng.int(1, 9) * (rng.chance(0.5) ? 1 : -1);
    const age = Math.max(1, s.player.age - ageDiff);
    fam.push({ id: uid('fam'), role: g === 'M' ? 'irmão' : 'irmã', name: genName(rng, ctry, g, used), age, love: rng.int(55, 85), alive: true });
  }
  return fam;
}

function makePartner(s, rng, used) {
  const ctry = s.player.country;
  const g = s.player.gender === 'M' ? 'F' : 'M';
  const pool = NAME_POOLS[POOL_BY_COUNTRY[ctry] || 'br'];
  const first = g === 'F' ? (pool.firstF || pool.first) : pool.first;
  const name = `${rng.pick(first)} ${rng.pick(pool.last)}`;
  return { id: uid('par'), name, gender: g, age: s.player.age + rng.int(-2, 2), love: rng.int(55, 80), together: false, married: false, pregnant: false, since: null };
}

export function createNewGame(cfg, settings) {
  const rng = makeRng(hashStr(`vc_${Date.now()}_${Math.random()}`));
  const used = new Set();
  const gender = cfg.gender || 'M';
  const country = cfg.country || 'br';
  const birthMonth = rng.int(1, 12);
  const startAge = cfg.startAge || 5;
  const birthYear = 2026 - startAge;

  const player = {
    name: (cfg.name || genName(rng, country, gender, used)).trim(),
    gender,
    country,
    city: cfg.city || (CITIES[country] ? rng.pick(CITIES[country]) : 'Sua cidade'),
    birthMonth,
    birthYear,
    age: startAge,
    height: cfg.height || rng.int(165, 188),
    weight: cfg.weight || 0,
    foot: rng.chance(0.72) ? 'D' : 'E',
    position: cfg.position || 'ATA',
    traits: cfg.traits && cfg.traits.length ? cfg.traits : [rng.pick(TRAITS).id],
    skills: baseSkillsFor(cfg.position || 'ATA', startAge, rng),
    ovr: 0, pot: 0, form: 72, fitness: 85, morale: 70, energy: 80,
    health: rng.int(78, 95), happiness: 80, social: rng.int(40, 70), intelligence: rng.int(30, 70),
    fame: 0, followers: 0,
    value: 0,
    phase: startAge < 12 ? 'child' : startAge < 16 ? 'teen' : startAge < 18 ? 'base' : 'pro',
    academy: startAge >= 12, // quem começa com 12+ já está na escolinha
    injured: 0, // meses de lesão restantes
    totalEarnings: 0,
    possessions: [],
    legacy: null,
  };
  player.weight = player.weight || Math.round(player.height * (player.position === 'GOL' ? 0.44 : 0.42) + rng.int(-6, 6));
  refreshPlayer(player);
  player.pot = clamp(player.ovr + rng.int(12, 28), player.ovr, 99);

  const state = {
    version: SAVE_VERSION,
    player,
    life: { bank: 0, lifestyle: 0, investments: [], endorsements: [], usedActions: {} },
    career: {
      clubId: null, contract: null, history: [], timeline: [], league: null,
      season: { apps: 0, goals: 0, assists: 0, ratingSum: 0, pts: 0, titles: [], awards: [], cupWins: 0, contWins: 0 },
      total: { apps: 0, goals: 0, assists: 0 },
      cupRound: 0, contRound: 0, ntTournament: null,
    },
    family: makeFamily({ player }, rng, used),
    partner: null,
    friends: [],
    nt: { called: false, caps: 0, goals: 0, monthsOut: 0, lastCall: null },
    calendar: { month: startAge >= 18 ? 8 : 1, year: birthYear + startAge },
    matches: [],
    training: { done: false, focus: null, intensity: 1, history: [] },
    transfers: { offers: [], asking: 0, windowOpen: false },
    inbox: [],
    pending: null,
    meta: { createdAt: Date.now(), savedAt: Date.now() },
    settings: settings || { lang: 'pt', accent: 'laranja', speed: 2, volume: 50, quality: 'alta' },
  };

  // famílias começam com mesada pra criança
  if (startAge < 16) state.life.bank = 0;

  // amigos para quem começa com 12+
  if (startAge >= 12) {
    const pool = NAME_POOLS[POOL_BY_COUNTRY[country] || 'br'];
    for (let i = 0; i < 2; i++) {
      const g = rng.chance(0.5) ? 'M' : 'F';
      const first = g === 'F' ? (pool.firstF || pool.first) : pool.first;
      state.friends.push({ id: uid('ami'), name: `${rng.pick(first)} ${rng.pick(pool.last)}`, love: rng.int(50, 80), gender: g });
    }
  }

  refreshPlayer(state);
  addNews(state, `👶 ${player.name} nasceu em ${player.city} (${countryName(player.country)})! Uma nova história começa.`, 'info', 'vida');
  addNews(state, `⚽ ${player.name} (${player.age} anos, posição ${positionById(player.position).name}) começou a chutar bola por aí.`, 'info', 'vida');

  if (startAge >= 18) {
    startProContract(state, rng);
    addNews(state, `✍️ ${player.name} assinou contrato profissional com ${clubById(state.career.clubId).name}!`, 'club', 'clube');
    buildLeague(state);
  } else if (startAge >= 16) {
    // começa na base de um clube compatível
    startYouthContract(state, rng);
    addNews(state, `📝 Assinou contrato juvenil com ${clubById(state.career.clubId).name}!`, 'club', 'clube');
    buildLeague(state);
  }
  return state;
}

function startProContract(state, rng) {
  const p = state.player;
  refreshPlayer(state);
  let tier = p.ovr >= 75 ? 5 : p.ovr >= 62 ? 4 : 3;
  const candidates = CLUBS.filter((c) => c.tier === tier || c.tier === tier + 1);
  const club = rng.pick(candidates);
  state.career.clubId = club.id;
  const offer = makeOffer(state, club, 'transfer');
  state.career.contract = {
    salary: offer.salary, years: 3, until: state.calendar.year + 3,
    releaseClause: offer.releaseClause, bonus: offer.bonus, signedYear: state.calendar.year, youth: false,
  };
  state.life.bank += offer.bonus;
  p.totalEarnings += offer.bonus;
  p.phase = 'pro';
  state.career.timeline.push({ year: state.calendar.year, text: `✍️ Contrato profissional com ${club.name}`, type: 'transfer' });
}

function startYouthContract(state, rng) {
  const p = state.player;
  refreshPlayer(state);
  const ovr = p.ovr;
  let tier = ovr >= 62 ? 4 : ovr >= 50 ? 3 : 2;
  const candidates = CLUBS.filter((c) => c.tier === tier || c.tier === tier + 1 || c.tier === tier - 1);
  const club = rng ? rng.pick(candidates) : candidates[Math.floor(Math.random() * candidates.length)];
  state.career.clubId = club.id;
  const base = 1500 + ovr * 120;
  state.career.contract = {
    salary: Math.round(base / 100) * 100,
    years: 2, until: state.calendar.year + 2,
    releaseClause: marketValue(p) * 1.5,
    bonus: 10000, signedYear: state.calendar.year, youth: true,
  };
  state.player.phase = 'base';
  addNews(state, `🏠 Você foi morar longe da família para treinar na base do ${club.name}.`, 'info', 'vida');
}

// -------------------- News / inbox --------------------
export function addNews(state, text, type = 'info', source = 'geral') {
  state.inbox.unshift({ id: uid('msg'), text, type, source, read: false, date: `${MONTHS[state.calendar.month - 1]} ${state.calendar.year}` });
  if (state.inbox.length > 120) state.inbox.pop();
  return state.inbox[0];
}
export const unreadCount = (s) => s.inbox.filter((i) => !i.read).length;
export const markRead = (s, id) => { const m = s.inbox.find((i) => i.id === id); if (m) m.read = true; };
export const markAllRead = (s) => s.inbox.forEach((i) => i.read = true);

// -------------------- Fases / datas --------------------
export function currentDate(s) { return `${MONTHS_FULL[s.calendar.month - 1]} de ${s.calendar.year}`; }
export function countryName(id) { return COUNTRIES.find((c) => c.id === id)?.name || String(id).toUpperCase(); }
export function countryFlag(id) { return COUNTRIES.find((c) => c.id === id)?.flag || '🌍'; }
export function ageNext(s) {
  let age = s.player.age;
  if (s.calendar.month > s.player.birthMonth) age += 1;
  return age;
}
export function inClub(s) { return !!s.career.clubId; }
export function isPro(s) { return ['pro', 'vet'].includes(s.player.phase); }
export function inFootball(s) { return ['base', 'pro', 'vet'].includes(s.player.phase); }

// -------------------- Liga / calendário de jogos --------------------
function poisson(rng, lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng.f(); } while (p > L);
  return k - 1;
}

function simTeamMatch(rng, homeStr, awayStr, homeAdv = 1.12) {
  const ratio = Math.max(homeStr, 20) / Math.max(awayStr, 20);
  const expH = 1.28 * Math.pow(ratio, 0.85) * homeAdv;
  const expA = 1.28 / Math.pow(ratio, 0.85);
  return { gh: poisson(rng, expH), ga: poisson(rng, expA) };
}

function fillerClubs(leagueName, country, tier, need, rng) {
  const out = [];
  const cityPool = CITIES[country] || ['Cidade A', 'Cidade B', 'Cidade C', 'Cidade D', 'Cidade E', 'Cidade F', 'Cidade G', 'Cidade H'];
  let i = 0;
  while (out.length < need) {
    const city = cityPool[i % cityPool.length];
    const suffix = Math.floor(i / cityPool.length);
    out.push({
      id: `filler_${leagueName.replace(/\W+/g, '').toLowerCase()}_${i}`,
      name: `${city}${suffix ? ` ${String.fromCharCode(65 + suffix)}` : ''} FC`,
      short: city.slice(0, 3).toUpperCase() + (suffix ? String.fromCharCode(65 + suffix) : ''),
      country, city,
      rep: clamp(tier * 11 + (rng ? rng.int(-8, 8) : 0) + (i % 5) * 3, 35, 85),
      tier, league: leagueName, filler: true,
    });
    i++;
  }
  return out;
}

export function buildLeague(state) {
  const club = clubById(state.career.clubId);
  if (!club) return;
  const rng = makeRng(hashStr(`lg_${state.calendar.year}_${club.league}_${club.id}`));
  const realTeams = clubsByLeague(club.league);
  let teams = realTeams.slice();
  const target = realTeams.length >= 12 ? realTeams.length : 12;
  if (teams.length < target) {
    teams = teams.concat(fillerClubs(club.league, club.country, club.tier, target - teams.length, rng));
  }
  teams = teams.slice(0, 20);
  // round robin duplo
  const list = teams.map((c) => c.id);
  const n = list.length;
  const rounds = [];
  const arr = list.slice();
  if (n % 2 === 1) arr.push(null);
  const nn = arr.length;
  for (let r = 0; r < nn - 1; r++) {
    const pairs = [];
    for (let i = 0; i < nn / 2; i++) {
      const a = arr[i], b = arr[nn - 1 - i];
      if (a && b) pairs.push([a, b]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop());
  }
  const fixtures = [];
  rounds.forEach((pairs, r) => {
    pairs.forEach(([h, a]) => {
      fixtures.push({ r: r + 1, home: h, away: a, gh: null, ga: null, played: false, round: r + 1 });
    });
  });
  // segundo turno
  const count = rounds.length;
  rounds.forEach((pairs, r) => {
    pairs.forEach(([h, a]) => {
      fixtures.push({ r: count + r + 1, home: a, away: h, gh: null, ga: null, played: false, round: count + r + 1 });
    });
  });
  // simula tudo; jogos do time do jogador ficam pendentes
  const myId = state.career.clubId;
  const table = {};
  teams.forEach((c) => table[c.id] = { clubId: c.id, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, played: 0 });
  const myStr = teamStrength(state);
  for (const f of fixtures) {
    const hc = teams.find((c) => c.id === f.home), ac = teams.find((c) => c.id === f.away);
    if (f.home === myId || f.away === myId) {
      f.pending = true;
      // resultado será definido quando o jogador atuar (ou simulando)
      continue;
    }
    const res = simTeamMatch(rng, hc.rep + rng.int(-2, 2), ac.rep + rng.int(-2, 2));
    f.gh = res.gh; f.ga = res.ga; f.played = true;
    applyResult(table[f.home], f.gh, f.ga);
    applyResult(table[f.away], f.ga, f.gh);
  }
  state.career.league = { teams: teams.map((c) => c.id), table, fixtures, round: 1, monthByRound: {} };
  // distribui rodadas pelos meses 1-11
  const totalRounds = count * 2;
  const perMonth = Math.ceil(totalRounds / 11);
  for (let m = 1; m <= 11; m++) {
    const roundsThisMonth = [];
    for (let r = 0; r < perMonth; r++) {
      const round = (m - 1) * perMonth + r + 1;
      if (round <= totalRounds) roundsThisMonth.push(round);
    }
    state.career.league.monthByRound[m] = roundsThisMonth;
  }
}

function applyResult(row, gf, ga) {
  row.played++; row.gf += gf; row.ga += ga;
  if (gf > ga) { row.pts += 3; row.w++; } else if (ga > gf) { row.l++; } else { row.pts++; row.d++; }
}

export function teamStrength(state) {
  const club = clubById(state.career.clubId);
  if (!club) return 50;
  const p = state.player;
  let boost = 0;
  if (inFootball(state)) {
    boost = (p.ovr - 55) * 0.7 + (p.form - 50) * 0.12;
    if (p.injured > 0) boost *= 0.4;
    if (state.player.phase === 'base') boost *= 0.6;
  }
  return clamp(club.rep + boost, 30, 130);
}

function pickOpponent(state, minTier, maxTier, excludeLeague, rng) {
  let pool = CLUBS.filter((c) => c.tier >= minTier && c.tier <= maxTier);
  if (excludeLeague) pool = pool.filter((c) => c.league !== excludeLeague || c.id !== state.career.clubId);
  pool = pool.filter((c) => c.id !== state.career.clubId);
  if (!pool.length) pool = CLUBS.filter((c) => c.id !== state.career.clubId);
  return rng.pick(pool);
}

function pickCountryOpponent(state, rng) {
  const my = COUNTRIES.find((c) => c.id === state.player.country);
  const pool = COUNTRIES.filter((c) => c.id !== my.id);
  const sorted = pool.sort((a, b) => Math.abs(a.ntRep - my.ntRep) - Math.abs(b.ntRep - my.ntRep));
  const close = sorted.slice(0, Math.max(4, Math.floor(sorted.length / 3)));
  return rng.pick(close);
}

export function generateMonthFixtures(state) {
  const rng = makeRng(hashStr(`fix_${state.calendar.year}_${state.calendar.month}_${state.career.clubId}_${state.player.name}`));
  const m = state.calendar.month;
  const club = clubById(state.career.clubId);
  const out = [];
  if (inFootball(state) && club) {
    // Liga
    const lg = state.career.league;
    const rounds = lg?.monthByRound[m] || [];
    for (const r of rounds) {
      const fs = lg.fixtures.filter((f) => f.round === r && (f.home === club.id || f.away === club.id));
      for (const f of fs) {
        const oppId = f.home === club.id ? f.away : f.home;
        const opp = clubById(oppId) || lg.teams.includes(oppId) && { id: oppId, name: oppId, rep: 60 };
        out.push(mkFixture(state, 'league', club.league, opp, f.home === club.id, { lgFixture: f }));
      }
    }
    // Copa nacional (mata-mata abstrato)
    if ([3, 4, 6, 8, 10].includes(m) && club.tier >= 3 && rng.chance(0.75)) {
      const rnd = state.career.cupRound + 1;
      const oppTier = clamp(club.tier + Math.floor((rnd - 1) / 2), 2, 6);
      const opp = pickOpponent(state, oppTier, oppTier + 1, club.league, rng);
      out.push(mkFixture(state, 'cup', 'Copa Nacional', opp, rng.chance(0.5)));
    }
    // Continental
    if ([2, 4, 7, 9, 11].includes(m) && club.tier >= 5 && rng.chance(0.7)) {
      const rnd = state.career.contRound + 1;
      const oppTier = clamp(5 + Math.floor((rnd - 1) / 2), 5, 6);
      const opp = pickOpponent(state, oppTier, 6, null, rng);
      out.push(mkFixture(state, 'cont', 'Competição Continental', opp, rng.chance(0.5)));
    }
  }
  // Seleção
  if (isPro(state) && state.nt.called) {
    const intlMonths = [3, 6, 9, 10, 11];
    const tny = tournamentFor(state.calendar.year);
    const isTournament = tny && [6, 7, 8].includes(m);
    if (isTournament) {
      const aliveStage = state.career.ntTournament?.stage || 1;
      const nMatches = m === 8 ? 1 : 2;
      for (let i = 0; i < nMatches; i++) {
        const stage = aliveStage + i;
        if (stage > 5) break;
        const opp = pickCountryOpponent(state, rng);
        out.push(mkFixture(state, 'nt', `${tny.name} — ${['Grupos', 'Oitavas', 'Quartas', 'Semifinal', 'Final'][stage - 1] || 'Fase'}`, opp, false));
      }
    } else if (intlMonths.includes(m)) {
      const opp = pickCountryOpponent(state, rng);
      out.push(mkFixture(state, 'nt', m === 6 ? 'Amistoso internacional' : 'Eliminatórias', opp, false));
    }
  }
  state.matches = out;
}

function mkFixture(state, type, compName, opp, home, extra = {}) {
  return {
    id: uid('fix'),
    type, compName,
    oppId: opp.id,
    oppName: opp.name,
    oppRep: opp.rep,
    oppCountry: opp.country || null,
    home: !!home,
    played: false,
    result: null,
    rating: null,
    goals: 0, assists: 0, motm: false,
    narrative: [],
    extra,
  };
}

export function oppInfo(fx) {
  if (fx.type === 'nt') return { name: `${countryFlag(fx.oppCountry)} ${fx.oppName}`, short: fx.oppName, rep: fx.oppRep };
  const c = clubById(fx.oppId);
  return { name: c ? c.name : fx.oppName, short: c ? c.short : fx.oppName, rep: fx.oppRep, city: c?.city, country: c?.country };
}

export function myClubName(s) {
  const c = clubById(s.career.clubId);
  return c ? c.name : 'Sem clube';
}
export function myClub(s) { return clubById(s.career.clubId); }

// -------------------- Partida do jogador --------------------
const R = NARRATIVE;

function addPlayerEvent(narrative, min, text) {
  narrative.push({ min, text, who: 'you' });
}
function addTeamEvent(narrative, min, text, team) {
  narrative.push({ min, text, who: team });
}

function playerGoalChance(p, fx) {
  const pos = p.position;
  const base = pos === 'ATA' ? 0.42 : pos === 'PON' ? 0.34 : pos === 'MEI' ? 0.2 : pos === 'MC' ? 0.12 : pos === 'VOL' ? 0.07 : pos === 'LAT' ? 0.06 : pos === 'ZAG' ? 0.05 : 0.01;
  const skill = (p.skills.SHO + p.skills.COM) / 2;
  const formF = p.form / 100;
  const oppF = clamp(1.25 - fx.oppRep / 100, 0.5, 1.3);
  return base * (skill / 55) * (0.6 + formF * 0.6) * oppF;
}
function playerAssistChance(p) {
  const pos = p.position;
  const base = pos === 'MEI' ? 0.22 : pos === 'PON' ? 0.2 : pos === 'MC' ? 0.18 : pos === 'ATA' ? 0.12 : pos === 'LAT' ? 0.12 : pos === 'VOL' ? 0.08 : pos === 'ZAG' ? 0.05 : 0.01;
  return base * (p.skills.PAS / 55) * (0.6 + p.form / 140);
}

export function playMatch(state, fixtureId, { live = false } = {}) {
  const fx = state.matches.find((f) => f.id === fixtureId);
  if (!fx) return { ok: false, msg: 'Partida não encontrada.' };
  if (fx.played) return { ok: false, msg: 'Esta partida já foi disputada.' };
  const p = state.player;
  const rng = makeRng(hashStr(`pm_${fixtureId}_${Date.now()}`) + Math.floor(Math.random() * 1e6));
  const narrative = [];
  const opp = oppInfo(fx);

  const myStr = teamStrength(state);
  const oppStr = fx.oppRep + rng.int(-3, 3);
  const res = simTeamMatch(rng, myStr, oppStr, fx.home ? 1.12 : 0.95);
  let gf = res.gh, ga = res.ga;
  if (!fx.home) { gf = res.ga; ga = res.gh; }

  // participação do jogador
  const canPlay = p.injured <= 0 && p.energy > 15 && ['base', 'pro', 'vet'].includes(p.phase);
  let goals = 0, assists = 0, saves = 0, keyActions = 0, cards = 0, rating = 5;
  const shots = rng.int(0, p.position === 'GOL' ? 0 : 3);

  if (canPlay) {
    const goalP = playerGoalChance(p, fx);
    const assistP = playerAssistChance(p);
    const fogo = p.traits.includes('fog');
    // eventos narrativos
    const nEvents = rng.int(5, 9);
    const minutePool = [2, 8, 15, 23, 31, 38, 44, 52, 58, 66, 73, 79, 85, 90];
    for (let i = 0; i < nEvents; i++) {
      const min = minutePool[Math.floor(rng.f() * minutePool.length)];
      if (p.position === 'GOL') {
        if (rng.chance(0.5)) {
          saves += 1;
          addPlayerEvent(narrative, min, `Defesa do goleiro: ${rng.pick(R.save)}`);
        } else if (ga > 0 && rng.chance(0.3)) {
          addPlayerEvent(narrative, min, `Gol sofrido: ${rng.pick(R.own)}`);
        } else {
          addPlayerEvent(narrative, min, `Distribuição de jogo: ${rng.pick(R.pass)}`);
        }
        continue;
      }
      const roll = rng.f();
      if (roll < goalP * 0.55) {
        // gol!
        const isGoal = rng.chance(0.8);
        if (isGoal) {
          goals += 1;
          addPlayerEvent(narrative, min, `${rng.pick(R.goal)} ${p.name.split(' ')[0]} balançou as redes!`);
          gf += 1;
        } else {
          keyActions += 1;
          addPlayerEvent(narrative, min, `${rng.pick(R.shot)}`);
        }
      } else if (roll < goalP * 0.55 + assistP * 0.5) {
        const isAssist = rng.chance(0.75);
        if (isAssist) {
          assists += 1;
          addPlayerEvent(narrative, min, `${rng.pick(R.assist)}`);
          gf += 1;
        } else {
          keyActions += 1;
          addPlayerEvent(narrative, min, `${rng.pick(R.chance)}`);
        }
      } else if (roll < 0.82) {
        if (rng.chance(0.4)) { keyActions += 1; addPlayerEvent(narrative, min, `${rng.pick(R.dribble)}`); }
        else { keyActions += 1; addPlayerEvent(narrative, min, `${rng.pick(R.pass)}`); }
      } else if (roll < 0.92) {
        if (rng.chance(0.55)) { keyActions += 1; addPlayerEvent(narrative, min, `${rng.pick(R.tackle)}`); }
        else if (fogo || rng.chance(0.25)) { cards += 1; addPlayerEvent(narrative, min, `${rng.pick(R.card)}`); }
        else { addPlayerEvent(narrative, min, `${rng.pick(R.own)}`); }
      } else {
        addPlayerEvent(narrative, min, `${rng.pick(R.own)}`);
      }
    }
    // gols de outros jogadores do time (eventos de equipe)
    const teamGoalP = 0.34;
    if (rng.chance(teamGoalP)) {
      const min = minutePool[Math.floor(rng.f() * minutePool.length)];
      addTeamEvent(narrative, min, `⚽ Gol do ${myClub(state).short}: ${rng.pick(R.goal)}`, 'team');
      gf += 1;
    }
    if (rng.chance(0.22)) {
      const min = minutePool[Math.floor(rng.f() * minutePool.length)];
      addTeamEvent(narrative, min, `⚽ Gol do ${myClub(state).short}: ${rng.pick(R.goal)}`, 'team');
      gf += 1;
    }
    // rating
    const perf = goals * 2.4 + assists * 1.6 + saves * 0.3 + keyActions * 0.12 + shots * 0.1 - cards * 0.5 - (ga * (p.position === 'GOL' ? 0.45 : 0.08));
    const formF = (p.form - 50) / 50;
    const ovrF = (p.ovr - 60) / 30;
    rating = clamp(Math.round((5.1 + perf * 0.55 + formF * 0.5 + ovrF * 0.6 + rng.f() * 1.6 - 0.8) * 10) / 10, 1, 10);
    if (rating >= 8.5 && (goals > 0 || assists > 0 || saves >= 4)) { fx.motm = true; }
  } else {
    narrative.push({ min: 0, text: p.injured > 0 ? `Você está lesionado(a) e não entrou em campo. 😞` : `Você ficou no banco sem energia para jogar.`, who: 'you' });
  }

  // resultado final (o gol adversário pode ter vindo depois... simples)
  fx.gh = fx.home ? gf : ga;
  fx.ga = fx.home ? ga : gf;
  fx.result = fx.gh > fx.ga ? 'W' : fx.gh < fx.ga ? 'L' : 'D';
  fx.played = true;
  fx.rating = rating;
  fx.goals = goals; fx.assists = assists;
  fx.narrative = narrative.sort((a, b) => a.min - b.min);

  // registra na liga
  if (fx.type === 'league' && fx.extra?.lgFixture && state.career.league) {
    const f = fx.extra.lgFixture;
    f.gh = fx.gh; f.ga = fx.ga; f.played = true;
    const table = state.career.league.table;
    const h = table[f.home], a = table[f.away];
    if (h && a) { applyResult(h, f.gh, f.ga); applyResult(a, f.ga, f.gh); }
  }
  // copa / continental / seleção
  applyCompOutcome(state, fx);

  // efeitos no jogador
  const energyCost = canPlay ? (4 + Math.round(rating * 0.7)) : 2;
  p.energy = clamp(p.energy - energyCost, 0, 100);
  p.fitness = clamp(p.fitness - (canPlay ? 3 : 1), 20, 100);
  const formDelta = rating >= 8 ? 6 : rating >= 7 ? 3 : rating >= 6 ? 0 : rating >= 5 ? -3 : -6;
  p.form = clamp(p.form + formDelta, 10, 99);
  p.morale = clamp(p.morale + (fx.result === 'W' ? 4 : fx.result === 'L' ? -4 : 0) + (rating >= 8 ? 3 : 0), 10, 99);
  if (fx.motm) { p.morale = clamp(p.morale + 4, 10, 99); addNews(state, `⭐ ${p.name} foi eleito o melhor em campo contra ${opp.name}!`, 'star', 'clube'); }

  // estatísticas
  if (canPlay) {
    state.career.season.apps++;
    state.career.total.apps++;
    state.career.season.goals += goals;
    state.career.total.goals += goals;
    state.career.season.assists += assists;
    state.career.total.assists += assists;
    state.career.season.ratingSum += rating;
    state.career.season.pts += (rating - 5) * 12 + goals * 30 + assists * 20 + (fx.motm ? 25 : 0);
    // experiência de jogo (jovens evoluem jogando)
    if (p.age <= 23 && rating >= 6) {
      const rng2 = makeRng(hashStr(`xp_${fixtureId}_${goals}_${assists}`) + Math.floor(Math.random() * 1e3));
      if (rng2.chance(0.5)) {
        const sk = rng2.pick([...TECH_SKILLS, ...PHYS_SKILLS]);
        p.skills[sk] = clamp(p.skills[sk] + 1, 1, 99);
      }
    }
    if (fx.type === 'nt') { state.nt.caps++; state.nt.goals += goals; }
    // fama
    if (rating >= 8) {
      p.fame = clamp(p.fame + 1 + (fx.motm ? 1 : 0) + (fx.type === 'nt' ? 1 : 0), 0, 100);
      p.followers += Math.round((3000 + p.fame * 2000) * (0.5 + rng.f()));
    }
    // lesão por partida
    const injP = 0.02 + (p.energy < 25 ? 0.04 : 0) + (p.fitness < 35 ? 0.04 : 0) + (p.traits.includes('fog') ? 0.01 : 0);
    if (rng.chance(injP)) {
      const months = p.traits.includes('res') ? rng.int(1, 2) : rng.int(1, 3);
      p.injured = months;
      p.health = clamp(p.health - rng.int(4, 10), 5, 100);
      addNews(state, `🤕 Lesão! ${p.name} fica ${months} mes(es) no departamento médico.`, 'injury', 'clube');
    }
  }
  // prêmio de jogo (bicho)
  const bonus = (goals + assists) > 0 ? (goals + assists) * 8000 : 0;
  if (bonus > 0) {
    p.totalEarnings += bonus;
    state.life.bank += bonus;
  }
  refreshPlayer(state);
  return { ok: true, fx, result: fx.result, rating, goals, assists };
}

export function quickSimMatch(state, fixtureId) {
  const fx = state.matches.find((f) => f.id === fixtureId);
  if (!fx || fx.played) return { ok: false, msg: 'Indisponível.' };
  const p = state.player;
  const rng = makeRng(hashStr(`qs_${fixtureId}`));
  const myStr = teamStrength(state) * 0.92;
  const res = simTeamMatch(rng, myStr, fx.oppRep + rng.int(-2, 2), fx.home ? 1.1 : 0.95);
  let gf = fx.home ? res.gh : res.ga, ga = fx.home ? res.ga : res.gh;
  fx.gh = gf; fx.ga = ga;
  fx.result = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
  fx.played = true;
  fx.rating = p.injured > 0 ? 0 : clamp(Math.round((4.6 + p.form / 25 + rng.f() * 2 - 0.5) * 10) / 10, 1, 10);
  fx.quick = true;
  fx.narrative = [];
  if (fx.type === 'league' && fx.extra?.lgFixture && state.career.league) {
    const f = fx.extra.lgFixture;
    f.gh = gf; f.ga = ga; f.played = true;
    const table = state.career.league.table;
    const h = table[f.home], a = table[f.away];
    if (h && a) { applyResult(h, f.gh, f.ga); applyResult(a, f.ga, f.gh); }
  }
  applyCompOutcome(state, fx);
  p.energy = clamp(p.energy - 3, 0, 100);
  if (fx.rating > 0 && p.injured <= 0) {
    state.career.season.apps++;
    state.career.total.apps++;
    state.career.season.ratingSum += fx.rating;
    state.career.season.pts += (fx.rating - 5) * 8;
  }
  return { ok: true, fx };
}

function applyCompOutcome(state, fx) {
  const p = state.player;
  const won = fx.result === 'W';
  if (fx.type === 'cup') {
    if (won) {
      state.career.cupRound += 1;
      if (state.career.cupRound >= 5) {
        state.career.season.titles.push('Copa Nacional');
        state.career.season.cupWins += 1;
        addNews(state, `🏆 CAMPEÃO DA COPA NACIONAL! ${myClubName(state)} levantou a taça com ${p.name} em campo!`, 'trophy', 'clube');
        p.fame = clamp(p.fame + 6, 0, 100);
        p.followers += Math.round(20000 + p.fame * 8000);
        state.career.timeline.push({ year: state.calendar.year, text: `🏆 Campeão da Copa Nacional`, type: 'title' });
      } else {
        addNews(state, `✅ Vitória na Copa! ${myClubName(state)} avança para a próxima fase.`, 'trophy', 'clube');
      }
    } else {
      addNews(state, `😔 Eliminado na Copa Nacional. Foi uma boa campanha.`, 'info', 'clube');
      state.career.cupRound = 0;
    }
  } else if (fx.type === 'cont') {
    if (won) {
      state.career.contRound += 1;
      if (state.career.contRound >= 5) {
        state.career.season.titles.push('Continental');
        addNews(state, `🌎 CAMPEÃO CONTINENTAL! ${myClubName(state)} é o maior da América/Europa!`, 'trophy', 'clube');
        p.fame = clamp(p.fame + 8, 0, 100);
        p.followers += Math.round(50000 + p.fame * 12000);
        state.career.timeline.push({ year: state.calendar.year, text: `🌎 Campeão Continental`, type: 'title' });
      } else {
        addNews(state, `✅ ${myClubName(state)} venceu na competição continental e avança!`, 'trophy', 'clube');
      }
    } else {
      addNews(state, `😔 Eliminado da competição continental.`, 'info', 'clube');
      state.career.contRound = 0;
    }
  } else if (fx.type === 'nt') {
    const tny = tournamentFor(state.calendar.year);
    const stage = state.career.ntTournament?.stage || 1;
    if (won) {
      if (tny) {
        state.career.ntTournament = { name: tny.name, stage: stage + 1 };
        if (stage >= 5) {
          state.career.season.titles.push(tny.name);
          addNews(state, `🌍 ${countryName(p.country)} é CAMPEÃ ${tny.name.toUpperCase()}! ${p.name} fez história pela seleção!`, 'trophy', 'selecao');
          p.fame = clamp(p.fame + 12, 0, 100);
          p.followers += Math.round(150000 + p.fame * 20000);
          state.career.timeline.push({ year: state.calendar.year, text: `🌍 Campeão ${tny.name} pela seleção`, type: 'title' });
          state.career.ntTournament = null;
        } else {
          addNews(state, `✅ ${countryName(p.country)} venceu no ${tny.name} e avançou! ${p.name} foi bem.`, 'info', 'selecao');
        }
      } else {
        addNews(state, `✅ Vitória pela seleção de ${countryName(p.country)}!`, 'info', 'selecao');
      }
    } else {
      if (tny) {
        if (stage <= 2) {
          addNews(state, `😔 ${countryName(p.country)} foi eliminada na fase de grupos do ${tny.name}.`, 'info', 'selecao');
        } else if (stage === 3) {
          addNews(state, `🥉 ${countryName(p.country)} caiu nas quartas do ${tny.name}.`, 'info', 'selecao');
        } else if (stage === 4) {
          addNews(state, `🥈 ${countryName(p.country)} perdeu a SEMIFINAL do ${tny.name}! Caiu de pé.`, 'info', 'selecao');
        } else {
          addNews(state, `🥈 ${countryName(p.country)} perdeu a FINAL do ${tny.name}! Sofreu.`, 'info', 'selecao');
        }
        state.career.ntTournament = null;
      } else {
        addNews(state, `😔 Derrota pela seleção. A torcida cobra.`, 'info', 'selecao');
      }
    }
    // desempenho na seleção gera fama
    if (fx.rating >= 7.5) p.fame = clamp(p.fame + 1, 0, 100);
  }
}

export function tournamentFor(year) {
  if (year % 4 === 2) return { name: 'Copa do Mundo', id: 'mundial' };
  if (year % 4 === 3) return { name: 'Copa Continental', id: 'continental' };
  return null;
}

// -------------------- Treino --------------------
export function doTraining(state, focus, intensity) {
  const tr = state.training;
  if (tr.done) return { ok: false, msg: 'Você já treinou este mês.' };
  const p = state.player;
  const def = TRAININGS.find((t) => t.id === focus) || TRAININGS[0];
  const rng = makeRng(hashStr(`tr_${state.calendar.year}_${state.calendar.month}_${p.name}`) + Math.floor(Math.random() * 1e6));
  const gains = {};
  const mult = intensity === 2 ? 1.4 : intensity === 0 ? 0.65 : 1;
  const ageF = p.age <= 20 ? 1.25 : p.age <= 24 ? 1.1 : p.age <= 28 ? 0.85 : p.age <= 31 ? 0.55 : 0.3;

  if (def.id === 'desc') {
    p.energy = clamp(p.energy + 40, 0, 100);
    p.fitness = clamp(p.fitness + 12, 20, 100);
    p.form = clamp(p.form + 4, 10, 99);
    p.morale = clamp(p.morale + 2, 10, 99);
    gains.energy = +40;
    gains.form = +4;
  } else {
    const cost = intensity === 2 ? 15 : intensity === 1 ? 8 : 4;
    p.energy = clamp(p.energy - cost, 0, 100);
    gains.energy = -cost;
    let up = 0;
    for (const sk of def.skills) {
      const chance = (0.55 + (p.skills[sk] < 80 ? 0.25 : 0)) * mult * (p.pot - p.ovr > 5 ? 1.2 : 1);
      if (rng.chance(clamp(chance, 0.05, 0.95))) {
        p.skills[sk] = clamp(p.skills[sk] + Math.round(1 * ageF + (rng.f() < 0.2 ? 1 : 0)), 1, 99);
        up++;
        gains[sk] = (gains[sk] || 0) + 1;
      }
    }
    // crescimento aleatório
    if (rng.chance(0.35 * ageF)) {
      const sk = rng.pick([...TECH_SKILLS, ...PHYS_SKILLS]);
      p.skills[sk] = clamp(p.skills[sk] + 1, 1, 99);
      gains[sk] = (gains[sk] || 0) + 1;
    }
    if (up === 0) gains.form = +1; else p.form = clamp(p.form + 1, 10, 99);
    p.form = clamp(p.form + (up > 0 ? 2 : 0), 10, 99);
    // risco de lesão
    const injP = (intensity === 2 ? 0.05 : 0.02) + (p.energy < 25 ? 0.05 : 0);
    if (rng.chance(injP)) {
      const months = rng.int(1, 3);
      p.injured = Math.max(p.injured, months);
      p.health = clamp(p.health - rng.int(3, 8), 5, 100);
      addNews(state, `🤕 ${p.name} se machucou no treino de ${def.name}: ${months} mes(es) fora.`, 'injury', 'clube');
      gains.injury = months;
    }
  }
  tr.done = true;
  tr.focus = def.id;
  tr.intensity = intensity;
  refreshPlayer(state);
  const hist = tr.history = Array.isArray(tr.history) ? tr.history : [];
  hist.unshift({ month: state.calendar.month, year: state.calendar.year, focus: def.id, intensity, gains: Object.entries(gains).filter(([, v]) => v).map(([k, v]) => `${SKILLS[k]?.label || k} ${v > 0 ? '+' : ''}${v}`).join(', ') || '—' });
  if (hist.length > 12) hist.pop();
  return { ok: true, focus: def.id, gains };
}

// -------------------- Vida pessoal / interações --------------------
export function familyAct(state, famId, act) {
  const m = state.family.find((f) => f.id === famId);
  if (!m) return { ok: false, msg: 'Pessoa não encontrada.' };
  const key = `fam_${famId}`;
  const last = state.life.usedActions[key];
  if (last === state.calendar.month && state.calendar.year === lastYear(state)) return { ok: false, msg: 'Você já passou tempo com essa pessoa este mês.' };
  state.life.usedActions[key] = state.calendar.month;
  if (act === 'tempo') {
    m.love = clamp(m.love + 4, 0, 100);
    state.player.happiness = clamp(state.player.happiness + 3, 0, 100);
    addNews(state, `💬 Você passou tempo com ${m.name} (${m.role}).`, 'info', 'vida');
  } else if (act === 'presente') {
    const price = 5000;
    if (state.life.bank < price) return { ok: false, msg: 'Sem dinheiro para um presente.' };
    state.life.bank -= price;
    m.love = clamp(m.love + 9, 0, 100);
    state.player.happiness = clamp(state.player.happiness + 4, 0, 100);
    addNews(state, `🎁 Você deu um presente de R$ 5 mil para ${m.name}. ${m.name} ficou emocionado(a)!`, 'info', 'vida');
  } else if (act === 'ajuda') {
    state.player.happiness = clamp(state.player.happiness + 2, 0, 100);
    m.love = clamp(m.love + 3, 0, 100);
    addNews(state, `🤝 Você ajudou ${m.name} com uma tarefa. Laços fortalecidos.`, 'info', 'vida');
  }
  return { ok: true };
}
function lastYear(state) { return state.calendar.month === 1 ? state.calendar.year - 1 : state.calendar.year; }

export function partnerAct(state, act) {
  const par = state.partner;
  if (!par) return { ok: false, msg: 'Você não está namorando.' };
  const key = 'par';
  if (state.life.usedActions[key] === state.calendar.month) return { ok: false, msg: 'Já fez algo com seu par este mês.' };
  state.life.usedActions[key] = state.calendar.month;
  if (act === 'tempo') {
    par.love = clamp(par.love + 5, 0, 100);
    state.player.happiness = clamp(state.player.happiness + 6, 0, 100);
    addNews(state, `💞 Encontro romântico com ${par.name}. Felicidade lá em cima!`, 'info', 'vida');
  } else if (act === 'presente') {
    const price = 10000;
    if (state.life.bank < price) return { ok: false, msg: 'Sem grana para um presente bom.' };
    state.life.bank -= price;
    par.love = clamp(par.love + 10, 0, 100);
    state.player.happiness = clamp(state.player.happiness + 5, 0, 100);
    addNews(state, `💍 Presente caro para ${par.name}. Amor em alta!`, 'info', 'vida');
  } else if (act === 'termine') {
    state.partner = null;
    state.player.happiness = clamp(state.player.happiness - 12, 0, 100);
    addNews(state, `💔 Você terminou o namoro. É vida que segue…`, 'info', 'vida');
    return { ok: true };
  }
  return { ok: true };
}

export function friendAct(state, fid, act) {
  const f = state.friends.find((x) => x.id === fid);
  if (!f) return { ok: false };
  const key = `fr_${fid}`;
  if (state.life.usedActions[key] === state.calendar.month) return { ok: false, msg: 'Já rolou com esse amigo este mês.' };
  state.life.usedActions[key] = state.calendar.month;
  if (act === 'rolê') {
    f.love = clamp(f.love + 5, 0, 100);
    state.player.happiness = clamp(state.player.happiness + 5, 0, 100);
    state.player.energy = clamp(state.player.energy - 5, 0, 100);
    addNews(state, `🎮 Rolê com ${f.name}. Boa recarga de energia mental!`, 'info', 'vida');
  } else if (act === 'conselho') {
    f.love = clamp(f.love + 3, 0, 100);
    state.player.social = clamp(state.player.social + 2, 0, 100);
    addNews(state, `🗣️ Conversa séria com ${f.name}.`, 'info', 'vida');
  }
  return { ok: true };
}

// -------------------- Dinheiro --------------------
export function monthlyFinance(state, r) {
  const p = state.player;
  const life = state.life;
  let income = 0;
  const breakdown = [];
  const con = state.career.contract;
  if (con) {
    income += con.salary;
    breakdown.push(['Salário', con.salary]);
  }
  for (const e of life.endorsements) {
    if (e.monthsLeft > 0) {
      income += e.income;
      e.monthsLeft--;
      breakdown.push([`Patrocínio ${e.brand}`, e.income]);
    }
  }
  life.endorsements = life.endorsements.filter((e) => e.monthsLeft > 0);
  for (const inv of life.investments) {
    const gain = Math.round(inv.amount * inv.rate);
    inv.amount += gain;
    income += gain;
    breakdown.push([inv.name, gain]);
  }
  // mesada quando criança/jovem sem contrato
  if (!con && p.age < 16) {
    income += 80;
    breakdown.push(['Mesada', 80]);
  }
  if (p.phase === 'retired') {
    const pens = Math.round(p.totalEarnings * 0.0012);
    income += pens;
    breakdown.push(['Aposentadoria', pens]);
  }
  const style = LIFESTYLES[life.lifestyle];
  const expense = style.cost;
  life.bank += income - expense;
  p.totalEarnings += Math.max(income, 0);
  life.lastMonth = { income, expense, breakdown };
}

export function setLifestyle(state, lvl) {
  if (!LIFESTYLES[lvl]) return { ok: false };
  state.life.lifestyle = lvl;
  state.player.happiness = clamp(state.player.happiness + LIFESTYLES[lvl].happ - LIFESTYLES[state.life.lifestylePrev ?? 0].happ * 0, 0, 100);
  state.player.fame = clamp(state.player.fame + LIFESTYLES[lvl].fame, 0, 100);
  addNews(state, `${LIFESTYLES[lvl].icon} Você agora vive de forma ${LIFESTYLES[lvl].name}.`, 'info', 'vida');
  return { ok: true };
}

export function buyItem(state, itemId) {
  const item = PURCHASES.find((x) => x.id === itemId);
  if (!item) return { ok: false };
  if (state.life.bank < item.price) return { ok: false, msg: 'Dinheiro insuficiente.' };
  if (state.player.fame < item.needFame) return { ok: false, msg: `Requer ${item.needFame} de fama.` };
  state.life.bank -= item.price;
  state.player.possessions.push({ id: item.id, name: item.name, icon: item.icon, bought: currentDate(state) });
  state.player.happiness = clamp(state.player.happiness + item.happ, 0, 100);
  state.player.fame = clamp(state.player.fame + item.fame, 0, 100);
  addNews(state, `${item.icon} Você comprou: ${item.name}!`, 'info', 'vida');
  return { ok: true };
}

export function invest(state, type, amount) {
  const min = 10000;
  if (amount < min) return { ok: false, msg: `Valor mínimo: R$ ${min.toLocaleString('pt-BR')}.` };
  if (state.life.bank < amount) return { ok: false, msg: 'Dinheiro insuficiente.' };
  const defs = {
    cdb: { name: 'CDB', rate: 0.008, risk: 'Baixo' },
    imoveis: { name: 'Fundos Imobiliários', rate: 0.014, risk: 'Médio' },
    risco: { name: 'Startup/Crypto', rate: 0.04, risk: 'Alto' },
  };
  const d = defs[type];
  if (!d) return { ok: false };
  state.life.bank -= amount;
  state.life.investments.push({ id: uid('inv'), name: d.name, amount, rate: d.rate, risk: d.risk, start: currentDate(state) });
  addNews(state, `📈 Investiu R$ ${amount.toLocaleString('pt-BR')} em ${d.name}.`, 'info', 'vida');
  return { ok: true };
}
export function withdrawInvest(state, invId) {
  const inv = state.life.investments.find((i) => i.id === invId);
  if (!inv) return { ok: false };
  state.life.bank += Math.round(inv.amount);
  addNews(state, `🏦 Resgatou R$ ${Math.round(inv.amount).toLocaleString('pt-BR')} de ${inv.name}.`, 'info', 'vida');
  state.life.investments = state.life.investments.filter((i) => i.id !== invId);
  return { ok: true };
}

// -------------------- Fama / redes --------------------
export function postSocial(state) {
  if (state.life.usedActions.social === state.calendar.month) return { ok: false, msg: 'Você já postou este mês.' };
  state.life.usedActions.social = state.calendar.month;
  const p = state.player;
  p.energy = clamp(p.energy - 4, 0, 100);
  const gain = 1 + Math.round(p.fame / 25);
  p.fame = clamp(p.fame + gain, 0, 100);
  const followers = Math.round((2000 + p.fame * 1500) * (0.5 + Math.random()));
  p.followers += followers;
  addNews(state, `📱 Post nos stories: +${followers.toLocaleString('pt-BR')} seguidores! Fama +${gain}.`, 'star', 'fama');
  return { ok: true };
}

export function acceptEndorsement(state, offerId) {
  const o = state.transfers.offers.find((x) => x.type === 'endorse' && x.id === offerId);
  if (!o) return { ok: false };
  state.life.endorsements.push({ brand: o.brand, income: o.income, monthsLeft: o.months, id: uid('end') });
  state.transfers.offers = state.transfers.offers.filter((x) => x !== o);
  addNews(state, `🤝 Fechou patrocínio com ${o.brand}: R$ ${o.income.toLocaleString('pt-BR')}/mês por ${o.months} meses!`, 'money', 'fama');
  return { ok: true };
}
export function rejectOffer(state, offerId) {
  state.transfers.offers = state.transfers.offers.filter((x) => x.id !== offerId);
  return { ok: true };
}

// -------------------- Transferências / contratos --------------------
function salaryForClub(state, club, type) {
  const p = state.player;
  const v = p.value;
  const tierFactor = [0.55, 0.7, 0.85, 1.0, 1.3, 1.7][club.tier - 1] || 1;
  let base = v / 150 + tierFactor * 60000;
  if (type === 'youth') base = 1500 + p.ovr * 120;
  if (type === 'free') base *= 0.85;
  return Math.round(base / 100) * 100;
}

function makeOffer(state, club, type = 'transfer') {
  const p = state.player;
  const salary = salaryForClub(state, club, type);
  const years = 2 + Math.floor(Math.random() * 4);
  const value = p.value;
  return {
    id: uid('ofr'),
    clubId: club.id,
    type,
    salary,
    years,
    until: state.calendar.year + years,
    releaseClause: Math.round((value * (1.2 + Math.random() * 1.3)) / 1000) * 1000,
    bonus: Math.round((value * 0.1 + salary * 2) / 1000) * 1000,
  };
}

export function generateOffers(state) {
  const p = state.player;
  if (!inFootball(state) && p.phase !== 'pro') return;
  const rng = makeRng(hashStr(`ofr_${state.calendar.year}_${state.calendar.month}_${p.name}`) + Math.floor(Math.random() * 1e4));
  const current = state.career.clubId;
  const v = p.value;
  // faixa de reputação compatível com o valor/overall
  let minRep = clamp(Math.round((p.ovr - 62) * 1.6 + 30), 30, 90);
  let maxRep = clamp(minRep + 25, 40, 99);
  if (p.ovr >= 85) { minRep = 80; maxRep = 99; }
  if (p.ovr <= 50) { minRep = 30; maxRep = 65; }
  let pool = CLUBS.filter((c) => c.rep >= minRep && c.rep <= maxRep && c.id !== current);
  if (p.phase === 'base' || p.phase === 'teen') {
    pool = CLUBS.filter((c) => c.tier >= 2 && c.tier <= 4 && c.id !== current);
  }
  const freeAgent = !state.career.clubId && inFootball(state);
  if (freeAgent) {
    pool = CLUBS.filter((c) => c.rep >= Math.min(minRep, 50) && c.rep <= Math.max(maxRep, 80) && c.id !== current);
  }
  if (!pool.length) return;
  // quantidade de ofertas
  const baseN = p.phase === 'pro' ? (freeAgent ? 3 : 2) : 1;
  let n = baseN + (state.transfers.asking > 0 ? 2 : 0);
  if (p.traits.includes('amb')) n += 1;
  n = Math.min(n, 4);
  const offers = [];
  for (let i = 0; i < n; i++) {
    if (!pool.length) break;
    const club = rng.pick(pool);
    pool = pool.filter((c) => c.id !== club.id);
    // oferta proporcional ao "interesse" (valor vs. rep do clube)
    const interest = clamp(1 - Math.abs(club.rep - (p.ovr * 1.0 + 10)) / 60, freeAgent ? 0.5 : 0.25, 1);
    if (rng.f() > interest) continue;
    offers.push(makeOffer(state, club, p.phase === 'base' ? 'youth' : (state.career.contract?.until <= state.calendar.year || freeAgent) ? 'free' : 'transfer'));
  }
  state.transfers.offers.push(...offers);
  return offers;
}

export function acceptClubOffer(state, offerId) {
  const o = state.transfers.offers.find((x) => x.id === offerId && x.type !== 'endorse');
  if (!o) return { ok: false, msg: 'Oferta não encontrada.' };
  const club = clubById(o.clubId);
  const old = state.career.clubId ? clubById(state.career.clubId) : null;
  state.career.clubId = o.clubId;
  state.career.contract = {
    salary: o.salary, years: o.years, until: o.until,
    releaseClause: o.releaseClause, bonus: o.bonus, signedYear: state.calendar.year, youth: o.type === 'youth',
  };
  state.life.bank += o.bonus;
  state.player.totalEarnings += o.bonus;
  state.player.phase = 'pro';
  state.player.morale = clamp(state.player.morale + 10, 10, 99);
  state.transfers.offers = state.transfers.offers.filter((x) => x.id !== offerId);
  if (o.renewal) {
    addNews(state, `🖋️ ${state.player.name} renovou com ${club.name}! Salário de R$ ${o.salary.toLocaleString('pt-BR')}/mês.`, 'club', 'clube');
    state.career.timeline.push({ year: state.calendar.year, text: `🖋️ Renovação com ${club.name}`, type: 'transfer' });
  } else {
    addNews(state, `✍️ ${state.player.name} assinou com ${club.name}! Salário de R$ ${o.salary.toLocaleString('pt-BR')}/mês + luvas de R$ ${o.bonus.toLocaleString('pt-BR')}.`, 'club', 'clube');
    state.career.timeline.push({ year: state.calendar.year, text: `✍️ Transferência para ${club.name}`, type: 'transfer' });
  }
  if (old && old.league !== club.league) {
    addNews(state, `✈️ Nova cidade: ${club.city}, ${club.country ? 'no exterior' : 'no Brasil'}. Adaptação é a chave!`, 'info', 'vida');
  }
  buildLeague(state);
  state.matches = [];
  state.career.cupRound = 0;
  state.career.contRound = 0;
  refreshPlayer(state);
  return { ok: true, club };
}

export function renewContract(state) {
  const con = state.career.contract;
  const club = clubById(state.career.clubId);
  if (!con || !club) return { ok: false, msg: 'Sem contrato vigente.' };
  const o = makeOffer(state, club, 'transfer');
  state.career.contract = {
    salary: Math.round(o.salary * 1.15 / 100) * 100,
    years: 3, until: state.calendar.year + 3,
    releaseClause: o.releaseClause, bonus: Math.round(o.bonus * 1.3), signedYear: state.calendar.year, youth: false,
  };
  state.player.morale = clamp(state.player.morale + 8, 10, 99);
  addNews(state, `🖋️ Renovou com ${club.name} até ${state.career.contract.until}! Salário reajustado.`, 'club', 'clube');
  return { ok: true };
}

export function askForTransfer(state) {
  state.transfers.asking = 3;
  addNews(state, `📢 Você pediu para ser negociado. A diretoria vai ouvir propostas.`, 'info', 'clube');
  return { ok: true };
}

// -------------------- Seleção --------------------
export function ntTick(state, r) {
  const p = state.player;
  if (!isPro(state)) return;
  if (p.injured > 0) { state.nt.called = false; return; }
  const my = COUNTRIES.find((c) => c.id === p.country);
  if (!my) return;
  const threshold = clamp(my.ntRep - 12, 55, 85);
  const shouldCall = p.ovr + p.form * 0.1 >= threshold && p.ovr >= 58 && state.career.season.apps >= 2;
  const wasCalled = state.nt.called;
  if (shouldCall && !wasCalled) {
    state.nt.called = true;
    state.nt.monthsOut = 0;
    state.nt.lastCall = state.calendar.year;
    addNews(state, `🦅 CONVOCADO! ${p.name} foi chamado para a seleção de ${countryName(p.country)}!`, 'star', 'selecao');
    p.morale = clamp(p.morale + 8, 10, 99);
    p.fame = clamp(p.fame + 2, 0, 100);
  } else if (wasCalled && !shouldCall) {
    state.nt.called = false;
    state.nt.monthsOut = 0;
    addNews(state, `😔 Cortado da seleção. O técnico quer ver mais regularidade.`, 'info', 'selecao');
    p.morale = clamp(p.morale - 5, 10, 99);
  } else if (wasCalled) {
    state.nt.monthsOut = 0;
  } else {
    state.nt.monthsOut++;
    if (state.nt.monthsOut % 6 === 0 && p.ovr >= 70) {
      addNews(state, `⏳ Novamente fora da lista da seleção. A imprensa questiona.`, 'info', 'selecao');
    }
  }
}

// -------------------- Fim de temporada / prêmios --------------------
export function seasonEnd(state, r) {
  const p = state.player;
  const season = state.career.season;
  const club = clubById(state.career.clubId);
  const league = state.career.league;

  // título da liga
  let champion = null, myPos = null;
  if (league && club) {
    const rows = Object.values(league.table).sort((a, b) => b.pts - a.pts || b.gf - a.gf || a.ga - b.ga);
    champion = rows[0]?.clubId;
    myPos = rows.findIndex((x) => x.clubId === club.id) + 1;
    if (champion === club.id) {
      season.titles.push(`Campeão: ${club.league}`);
      addNews(state, `🏆 ${club.name} É CAMPEÃO ${club.league.toUpperCase()}! ${p.name} brilhou na campanha!`, 'trophy', 'clube');
      p.fame = clamp(p.fame + 8, 0, 100);
      p.followers += Math.round(60000 + p.fame * 10000);
      state.career.timeline.push({ year: state.calendar.year, text: `🏆 Campeão ${club.league}`, type: 'title' });
    }
  }
  const apps = season.apps;
  const goals = season.goals;
  const assists = season.assists;
  const avg = apps ? Math.round((season.ratingSum / apps) * 10) / 10 : 0;
  const tier = club ? club.tier : 4;

  // prêmios
  const goalThreshold = { 6: 14, 5: 11, 4: 8, 3: 6, 2: 4 }[tier] || 4;
  if (goals >= goalThreshold && apps >= 8) {
    season.awards.push('artilheiro');
    addNews(state, `⚽ ${p.name} foi o ARTILHEIRO do campeonato (${goals} gols)!`, 'star', 'clube');
    state.career.timeline.push({ year: state.calendar.year, text: `⚽ Artilheiro (${goals} gols)`, type: 'award' });
  }
  if (season.pts >= 600 && (myPos <= 4 || !club)) {
    season.awards.push('melhor_jogador');
    addNews(state, `🏅 ${p.name} foi eleito o MELHOR JOGADOR do campeonato!`, 'star', 'clube');
    state.career.timeline.push({ year: state.calendar.year, text: `🏅 Melhor Jogador do campeonato`, type: 'award' });
  }
  if (p.age <= 20 && (goals >= 6 || season.pts >= 350) && apps >= 8) {
    season.awards.push('revelacao');
    addNews(state, `🌟 ${p.name} é a REVELAÇÃO do ano!`, 'star', 'clube');
    state.career.timeline.push({ year: state.calendar.year, text: `🌟 Revelação do ano`, type: 'award' });
  }
  // bola de ouro (chance com base no desempenho + fama)
  const ballonScore = season.pts + goals * 80 + p.fame * 6 + (season.titles.length ? 300 : 0);
  if (ballonScore >= 900 && p.age >= 19) {
    season.awards.push('bola_ouro');
    addNews(state, `🏆 BOLA DE OURO! ${p.name} é o melhor jogador do mundo!`, 'star', 'fama');
    p.fame = clamp(p.fame + 15, 0, 100);
    p.followers += Math.round(500000 + p.fame * 30000);
    state.career.timeline.push({ year: state.calendar.year, text: `🏆 Bola de Ouro`, type: 'award' });
  }
  if (goals >= 24) {
    season.awards.push('chuteira');
    addNews(state, `👟 CHUTEIRA DE OURO: ${goals} gols no ano, o maior artilheiro do planeta!`, 'star', 'fama');
    state.career.timeline.push({ year: state.calendar.year, text: `👟 Chuteira de Ouro (${goals} gols)`, type: 'award' });
  }
  if (state.nt.called && (apps >= 3 || goals >= 2)) {
    season.awards.push('melhor_nt');
  }

  // histórico
  if (club && apps > 0) {
    state.career.history.push({
      year: state.calendar.year, club: club.name, clubShort: club.short, league: club.league,
      apps, goals, assists, avg, titles: season.titles, awards: season.awards,
    });
  }
  if (season.titles.length || season.awards.length) {
    state.career.timeline.push({ year: state.calendar.year, text: `📊 Temporada ${state.calendar.year}: ${season.titles.join(' · ') || ''}${season.titles.length && season.awards.length ? ' · ' : ''}${season.awards.join(' · ') || ''}`, type: 'season' });
  }
  // reset
  Object.assign(season, { apps: 0, goals: 0, assists: 0, ratingSum: 0, pts: 0, titles: [], awards: [], cupWins: 0, contWins: 0 });
  state.career.cupRound = 0;
  state.career.contRound = 0;
  r.seasonEnded = true;
}

// -------------------- Envelhecer / aniversário --------------------
function birthday(state, r) {
  const p = state.player;
  p.age += 1;
  const rng = makeRng(hashStr(`bd_${p.name}_${state.calendar.year}_${state.calendar.month}`) + Math.floor(Math.random() * 1e3));
  // crescimento físico
  if (p.age >= 12 && p.age <= 17 && rng.chance(0.6)) {
    const grow = rng.int(2, 6);
    p.height += grow;
    p.skills.PAC = clamp(p.skills.PAC + 1, 1, 99);
    p.skills.PHY = clamp(p.skills.PHY + 1, 1, 99);
    addNews(state, `📏 Estirão! ${p.name} cresceu ${grow} cm (agora ${p.height} cm).`, 'info', 'vida');
  }
  // evolução natural
  const ageF = p.age <= 20 ? 1.4 : p.age <= 24 ? 1.1 : p.age <= 28 ? 0.7 : p.age <= 31 ? 0.3 : 0;
  if (ageF > 0) {
    const nGains = p.age <= 17 ? 2 : p.age <= 24 ? 1 : 0;
    for (let i = 0; i < nGains; i++) {
      const sk = rng.pick([...TECH_SKILLS, ...PHYS_SKILLS, ...MENTAL_SKILLS]);
      if (p.skills[sk] < 99 && rng.chance(0.85)) {
        p.skills[sk] = clamp(p.skills[sk] + 1, 1, 99);
      }
    }
  }
  // declínio físico após 30
  if (p.age >= 30) {
    const dec = p.age >= 34 ? 2 : 1;
    p.skills.PAC = clamp(p.skills.PAC - dec, 1, 99);
    if (p.age >= 33) p.skills.PHY = clamp(p.skills.PHY - (p.age >= 36 ? 2 : 1), 1, 99);
    if (p.age >= 35) p.skills.DRI = clamp(p.skills.DRI - 1, 1, 99);
    addNews(state, `⏳ O corpo cobra: Ritmo -${dec}. A idade chega para todos…`, 'info', 'vida');
  }
  if (p.age >= 32) p.phase = p.phase === 'pro' ? 'vet' : p.phase;
  // transições de fase
  if (p.age === 12 && p.phase === 'child') {
    p.phase = 'teen';
    if (!p.academy) pendingEvent(state, eventById('escolinha'));
    addNews(state, `🎒 ${p.name} agora é adolescente. Novos desafios na escola e no futebol.`, 'info', 'vida');
    // amigos
    if (!state.friends.length) {
      const pool = NAME_POOLS[POOL_BY_COUNTRY[p.country] || 'br'];
      for (let i = 0; i < 2; i++) {
        const g = rng.chance(0.5) ? 'M' : 'F';
        const first = g === 'F' ? (pool.firstF || pool.first) : pool.first;
        state.friends.push({ id: uid('ami'), name: `${rng.pick(first)}`, love: rng.int(50, 80), gender: g });
      }
    }
  }
  if (p.age === 15 && p.phase === 'teen') {
    if (p.academy) pendingEvent(state, eventById('peneira'));
    else pendingEvent(state, eventById('peneira_tarde'));
  }
  if (p.age === 16 && p.phase === 'teen') {
    if (!p.academy) pendingEvent(state, eventById('peneira_tarde'));
  }
  if (p.age === 17 && p.phase === 'base') {
    // promovido ao profissional se for bom
    const club = clubById(state.career.clubId);
    refreshPlayer(state);
    if (p.ovr >= 58 && club) {
      p.phase = 'pro';
      state.career.contract = {
        salary: 8000 + p.ovr * 400, years: 3, until: state.calendar.year + 3,
        releaseClause: p.value * 1.4, bonus: 50000, signedYear: state.calendar.year, youth: false,
      };
      addNews(state, `🎉 ${p.name} foi PROMOVIDO ao profissional do ${club.name}! Contrato de verdade, salário de R$ ${state.career.contract.salary.toLocaleString('pt-BR')}/mês.`, 'club', 'clube');
      buildLeague(state);
      state.career.timeline.push({ year: state.calendar.year, text: `🚀 Promovido ao profissional`, type: 'transfer' });
    } else {
      p.phase = 'pro';
      state.career.contract = null;
      state.career.clubId = null;
      state.career.league = null;
      state.matches = [];
      addNews(state, `😕 O ${club ? club.name : 'clube'} não ofereceu contrato profissional. Você está sem clube.`, 'info', 'clube');
      pendingEvent(state, eventById('sem_clube'));
    }
  }
  if (p.age === 18 && p.phase === 'base') {
    p.phase = 'pro';
  }
  if (p.age === 18 && p.phase === 'teen') {
    p.phase = 'pro';
    pendingEvent(state, eventById('sem_clube'));
  }
  // idade da família e do parceiro
  for (const f of state.family) if (f.age !== undefined) f.age += 1;
  if (state.partner) state.partner.age += 1;
  refreshPlayer(state);
  if (p.age >= 5 && p.age <= 11) {
    addNews(state, `🎂 ${p.name} completou ${p.age} anos! A família comemorou com bolo.`, 'info', 'vida');
  }
}

// -------------------- Eventos de vida --------------------
function pendingEvent(state, ev) {
  if (!ev) return;
  state.pending = {
    id: ev.id,
    title: ev.title(state),
    text: ev.text(state),
    hint: ev.hint ? ev.hint(state) : '',
    choices: ev.choices.map((c) => ({ label: c.label(state), hint: c.hint || '' })),
  };
}
export function currentPending(state) { return state.pending; }
export function decidePending(state, choiceIdx) {
  if (!state.pending) return { ok: false, msg: 'Nada pendente.' };
  const ev = eventById(state.pending.id);
  if (!ev) { state.pending = null; return { ok: false, msg: 'Evento não encontrado.' }; }
  const choice = ev.choices[choiceIdx];
  if (!choice) return { ok: false, msg: 'Escolha inválida.' };
  const result = choice.run(state);
  state.pending = null;
  if (result?.news) addNews(state, result.news, result.type || 'info', 'vida');
  refreshPlayer(state);
  return { ok: true, result };
}

function ev(opt) { return { ...opt }; }

function eventById(id) { return EVENTS.find((e) => e.id === id); }

const N = (s) => s.player.name.split(' ')[0];

const EVENTS = [
  // ================= INFÂNCIA =================
  ev({
    id: 'escolinha', phase: ['child'], min: 6, max: 10, w: 3,
    title: (s) => '⚽ Escolinha de futebol?',
    text: (s) => `${N(s)} viu os amigos da rua jogando bola no campinho. Um olheiro de uma escolinha local viu ${N(s)} jogar e chamou os pais para conversar. E agora?`,
    hint: (s) => 'Essa decisão muda o rumo da sua vida.',
    choices: [
      { label: (s) => 'Entrar na escolinha 🎯', hint: 'Começa sua jornada no futebol', run: (s) => { s.player.academy = true; s.player.happiness = clamp(s.player.happiness + 6, 0, 100); s.player.skills.PAC = clamp(s.player.skills.PAC + 1, 1, 99); s.player.skills.SHO = clamp(s.player.skills.SHO + 1, 1, 99); return { news: '🎯 A partir de agora, a bola é sua vida. Treinos todas as tardes!' }; } },
      { label: (s) => 'Só na escola 📚', hint: 'Foca nos estudos por enquanto', run: (s) => { s.player.intelligence = clamp(s.player.intelligence + 4, 0, 100); s.player.academy = false; return { news: '📚 Você decidiu priorizar os estudos. Mas a bola continua rolando no recreio…' }; } },
    ],
  }),
  ev({
    id: 'boletim_child', phase: ['child'], min: 5, max: 11, w: 2,
    title: (s) => '📝 Boletim escolar',
    text: (s) => `Chegou o boletim de ${N(s)}. As notas estão medianas. O que fazer?`,
    choices: [
      { label: (s) => 'Estudar pesado ✏️', hint: 'Inteligência +, felicidade −', run: (s) => { s.player.intelligence = clamp(s.player.intelligence + 5, 0, 100); s.player.happiness = clamp(s.player.happiness - 2, 0, 100); return { news: '✏️ Notas subiram! Os pais ficaram orgulhosos.' }; } },
      { label: (s) => 'Tanto faz 😎', hint: 'Felicidade +', run: (s) => { s.player.happiness = clamp(s.player.happiness + 3, 0, 100); return { news: '😎 Sem estresse! Criança tem que brincar.' }; } },
      { label: (s) => 'Pedir ajuda à mãe 🤗', run: (s) => { const mom = s.family.find((f) => f.role === 'mãe'); if (mom) mom.love = clamp(mom.love + 5, 0, 100); s.player.intelligence = clamp(s.player.intelligence + 3, 0, 100); return { news: '🤗 Sua mãe te ajudou com a lição de casa.' }; } },
    ],
  }),
  ev({
    id: 'pelada', phase: ['child'], min: 6, max: 11, w: 2,
    title: (s) => '🏟️ Pelada da rua',
    text: (s) => `Os amigos chamaram ${N(s)} para uma pelada valendo camisa no campinho. Choveu mais cedo e o campo está uma lama só.`,
    choices: [
      { label: (s) => 'Jogar na lama 💪', hint: 'Felicidade +, habilidade +', run: (s) => { s.player.happiness = clamp(s.player.happiness + 5, 0, 100); const r = Math.random(); if (r < 0.5) s.player.skills.DRI = clamp(s.player.skills.DRI + 1, 1, 99); s.player.skills.PHY = clamp(s.player.skills.PHY + 1, 1, 99); return { news: '💪 Foi um jogaço na lama! Todo mundo rindo até o fim.' }; } },
      { label: (s) => 'Ficar em casa 🛋️', run: (s) => { s.player.energy = clamp(s.player.energy + 5, 0, 100); return { news: '🛋️ Dia de descanso. A televisão estava boa.' }; } },
    ],
  }),
  ev({
    id: 'doenca_child', phase: ['child'], min: 5, max: 11, w: 1,
    title: (s) => '🤒 Febre alta',
    text: (s) => `${N(s)} acordou com febre e dor de garganta. A mãe está preocupada.`,
    choices: [
      { label: (s) => 'Ir ao médico 🏥', run: (s) => { s.player.health = clamp(s.player.health + 8, 0, 100); return { news: '🏥 Antibiótico e repouso. Saúde recuperada!' }; } },
      { label: (s) => 'Aguentar firme 💪', run: (s) => { s.player.health = clamp(s.player.health - 3, 0, 100); s.player.happiness = clamp(s.player.happiness - 2, 0, 100); return { news: '💪 Diziam que chá com limão cura tudo…' }; } },
    ],
  }),
  ev({
    id: 'aniversario', phase: ['child'], min: 5, max: 11, w: 1,
    title: (s) => '🎂 Pedido de aniversário',
    text: (s) => `Os pais perguntaram o que ${N(s)} quer de presente.`,
    choices: [
      { label: (s) => 'Bola nova ⚽', run: (s) => { s.player.skills.SHO = clamp(s.player.skills.SHO + 1, 1, 99); s.player.happiness = clamp(s.player.happiness + 4, 0, 100); return { news: '⚽ Bola nova! Ela não sai mais do seu pé.' }; } },
      { label: (s) => 'Videogame 🎮', run: (s) => { s.player.happiness = clamp(s.player.happiness + 5, 0, 100); s.player.energy = clamp(s.player.energy - 3, 0, 100); return { news: '🎮 Horas de diversão. A mãe reclama do tempo de tela.' }; } },
      { label: (s) => 'Dinheiro 💰', run: (s) => { s.life.bank += 100; return { news: '💰 R$ 100 guardados no cofrinho.' }; } },
    ],
  }),
  ev({
    id: 'pai_treino', phase: ['child'], min: 7, max: 11, w: 1,
    title: (s) => '👨 Treinar com o pai',
    text: (s) => `Seu pai (ou um tio) te chamou para treinar finalização no campinho no domingo.`,
    choices: [
      { label: (s) => 'Treinar 🎯', run: (s) => { s.player.skills.SHO = clamp(s.player.skills.SHO + 1, 1, 99); s.player.skills.PAC = clamp(s.player.skills.PAC + 1, 1, 99); const dad = s.family.find((f) => f.role === 'pai'); if (dad) dad.love = clamp(dad.love + 4, 0, 100); return { news: '🎯 Olha o pai batendo palma! Você fez 5 gols no gol de chinelo.' }; } },
      { label: (s) => 'Dormir até tarde 😴', run: (s) => { s.player.energy = clamp(s.player.energy + 6, 0, 100); return { news: '😴 Domingo é sagrado. Você descansou.' }; } },
    ],
  }),
  ev({
    id: 'crescer_child', phase: ['child'], min: 8, max: 11, w: 1,
    title: (s) => '👖 Calça curta',
    text: (s) => `${N(s)} percebeu que a calça favorita está curta. Crescimento chegando!`,
    choices: [
      { label: (s) => 'Se empolgar 🤸', run: (s) => { s.player.height += 1; s.player.skills.PAC = clamp(s.player.skills.PAC + 1, 1, 99); s.player.happiness = clamp(s.player.happiness + 2, 0, 100); return { news: '🤸 Você mediu na parede: cresceu! Faltam uns centímetros para o gol.' }; } },
      { label: (s) => 'Tanto faz 😑', run: (s) => { return { news: '😑 Roupas são roupas.' }; } },
    ],
  }),

  // ================= ADOLESCÊNCIA =================
  ev({
    id: 'prova_teen', phase: ['teen'], min: 12, max: 15, w: 2,
    title: (s) => '📚 Semana de provas',
    text: (s) => `Semana de provas na escola, mas tem jogo decisivo da escolinha no sábado.`,
    choices: [
      { label: (s) => 'Estudar muito ✏️', hint: 'Inteligência +, energia −', run: (s) => { s.player.intelligence = clamp(s.player.intelligence + 6, 0, 100); s.player.energy = clamp(s.player.energy - 5, 0, 100); return { news: '✏️ Notas excelentes! Diretor te elogiou.' }; } },
      { label: (s) => 'Equilibrar ⚖️', run: (s) => { s.player.intelligence = clamp(s.player.intelligence + 3, 0, 100); s.player.happiness = clamp(s.player.happiness + 2, 0, 100); return { news: '⚖️ Deu para levar as duas coisas.' }; } },
      { label: (s) => 'Futebol primeiro ⚽', run: (s) => { s.player.skills.DRI = clamp(s.player.skills.DRI + 1, 1, 99); s.player.intelligence = clamp(s.player.intelligence - 3, 0, 100); return { news: '⚽ Foi mal na prova, mas fez gol de placa no sábado.' }; } },
    ],
  }),
  ev({
    id: 'primeiro_amor', phase: ['teen'], min: 13, max: 15, w: 2,
    title: (s) => '💘 Crush na escola',
    text: (s) => `Tem alguém especial na escola que sempre senta perto de ${N(s)} no refeitório. Os amigos dizem que é recíproco.`,
    choices: [
      { label: (s) => 'Se declarar 💘', run: (s) => { if (!s.partner) { s.partner = makePartner(s, makeRng(Date.now()), new Set()); s.partner.together = true; s.partner.since = currentDate(s); s.player.happiness = clamp(s.player.happiness + 10, 0, 100); } return { news: `💘 ${s.partner ? s.partner.name : 'Ela'} disse SIM! Primeiro namoro de ${N(s)}!` }; } },
      { label: (s) => 'Deixar para lá 🫣', run: (s) => { s.player.social = clamp(s.player.social - 2, 0, 100); return { news: '🫣 Timidez venceu. Quem sabe um dia…' }; } },
    ],
  }),
  ev({
    id: 'peneira', phase: ['teen'], min: 15, max: 15, w: 99,
    title: (s) => '🔍 Peneira no clube',
    text: (s) => `O técnico da escolinha indicou ${N(s)} para uma peneira de um clube profissional! É a chance de entrar na base.`,
    hint: (s) => 'Momento decisivo da carreira.',
    choices: [
      { label: (s) => 'Ir com tudo 🔥', hint: 'Entra na base de um clube', run: (s) => { const rng = makeRng(hashStr(`pen_${s.player.name}_${s.calendar.year}`)); const ok = s.player.ovr + rng.int(-6, 12) >= 50; if (ok) { s.player.academy = true; s.player.phase = 'base'; startYouthContract(s, rng); s.player.happiness = clamp(s.player.happiness + 10, 0, 100); buildLeague(s); return { news: `🎉 PASSOU NA PENEIRA! ${s.player.name} é o novo talento da base do ${myClubName(s)}!` }; } s.player.happiness = clamp(s.player.happiness - 6, 0, 100); return { news: '😔 Não passou desta vez. O técnico disse para treinar mais.' }; } },
      { label: (s) => 'Ainda não 🫣', hint: 'Esperar mais um pouco', run: (s) => { s.player.happiness = clamp(s.player.happiness - 3, 0, 100); return { news: '🫣 Medo de não passar. A escola ainda domina sua rotina.' }; } },
    ],
  }),
  ev({
    id: 'peneira_tarde', phase: ['teen'], min: 15, max: 16, w: 99,
    title: (s) => '🔍 Convite para peneira',
    text: (s) => `Um professor de educação física insistiu que ${N(s)} fosse a uma peneira. Ele vê potencial mesmo sem você treinar em escolinha.`,
    choices: [
      { label: (s) => 'Aceitar o desafio 🔥', run: (s) => { const rng = makeRng(hashStr(`pent_${s.player.name}_${s.calendar.year}`)); const ok = s.player.ovr + rng.int(-6, 12) >= 50; if (ok) { s.player.academy = true; s.player.phase = 'base'; startYouthContract(s, rng); s.player.happiness = clamp(s.player.happiness + 10, 0, 100); buildLeague(s); return { news: `🎉 INACREDITÁVEL! Passou na peneira de primeira! Bem-vindo à base do ${myClubName(s)}!` }; } s.player.happiness = clamp(s.player.happiness - 6, 0, 100); return { news: '😔 Não rolou. O professor disse que talento existe, mas falta ritmo.' }; } },
      { label: (s) => 'Ficar nos estudos 📚', run: (s) => { s.player.intelligence = clamp(s.player.intelligence + 3, 0, 100); return { news: '📚 A escola é o caminho por enquanto.' }; } },
    ],
  }),
  ev({
    id: 'primeira_balada', phase: ['teen'], min: 14, max: 15, w: 1,
    title: (s) => '🎉 Festa de 15 anos',
    text: (s) => `Uma prima vai fazer 15 anos e a família toda estará lá. Mas amanhã tem jogo da escolinha.`,
    choices: [
      { label: (s) => 'Ir à festa 🎉', hint: 'Felicidade +, energia −', run: (s) => { s.player.happiness = clamp(s.player.happiness + 6, 0, 100); s.player.energy = clamp(s.player.energy - 6, 0, 100); s.player.form = clamp(s.player.form - 3, 10, 99); return { news: '🎉 Dançou até o chão! O jogo amanhã vai ser no sacrifício.' }; } },
      { label: (s) => 'Descansar para o jogo 😴', run: (s) => { s.player.form = clamp(s.player.form + 2, 10, 99); s.player.social = clamp(s.player.social - 2, 0, 100); return { news: '😴 Cama cedo, jogo bom. Profissional desde cedo!' }; } },
    ],
  }),
  ev({
    id: 'joelho_teen', phase: ['teen'], min: 12, max: 15, w: 1,
    title: (s) => '🦵 Dor no joelho',
    text: (s) => `${N(s)} sentiu uma dor no joelho depois do treino de sprints.`,
    choices: [
      { label: (s) => 'Contar para o técnico 🏥', run: (s) => { s.player.health = clamp(s.player.health + 2, 0, 100); return { news: '🏥 Gelo e repouso. Prevenção é tudo.' }; } },
      { label: (s) => 'Ignorar e treinar 😤', run: (s) => { if (Math.random() < 0.5) { s.player.injured = 1; s.player.health = clamp(s.player.health - 4, 0, 100); return { news: '🤕 Forçou e lesionou! Um mês fora.' }; } s.player.skills.PHY = clamp(s.player.skills.PHY + 1, 1, 99); return { news: '😤 Aguentou a dor. O corpo agradeceu o esforço… por enquanto.' }; } },
    ],
  }),

  // ================= BASE =================
  ev({
    id: 'titular_base', phase: ['base'], min: 16, max: 17, w: 2,
    title: (s) => '📋 Titular ou banco?',
    text: (s) => `O técnico da base chamou ${N(s)}: "Você pode ser titular do time juvenil. Mas vou precisar de mais dedicação nos treinos."`,
    choices: [
      { label: (s) => 'Aceitar o desafio 💪', run: (s) => { s.player.morale = clamp(s.player.morale + 6, 10, 99); s.player.form = clamp(s.player.form + 4, 10, 99); return { news: '💪 Titular garantido! Agora é mostrar serviço.' }; } },
      { label: (s) => 'Continuar como está 😐', run: (s) => { return { news: '😐 Você ficou no banco mais um tempo.' }; } },
    ],
  }),
  ev({
    id: 'empresario', phase: ['base', 'pro'], min: 16, max: 24, w: 1,
    title: (s) => '🤵 Empresário quer te representar',
    text: (s) => `Um empresário famoso viu ${N(s)} jogar e quer fechar contrato de representação (10% dos seus ganhos).`,
    choices: [
      { label: (s) => 'Aceitar 🤝', hint: 'Mais propostas no futuro', run: (s) => { s.career.agent = true; return { news: '🤝 Agora você tem um empresário para abrir portas.' }; } },
      { label: (s) => 'Recusar 🙅', run: (s) => { s.player.social = clamp(s.player.social - 1, 0, 100); return { news: '🙅 A família cuida dos seus assuntos por enquanto.' }; } },
    ],
  }),
  ev({
    id: 'escola_base', phase: ['base'], min: 16, max: 17, w: 2,
    title: (s) => '🎒 Escola ou só futebol?',
    text: (s) => `Os treinos da base estão pesados e a escola está sofrendo. Os pais querem conversar.`,
    choices: [
      { label: (s) => 'Trancar a escola ⚽', hint: 'Foco total no futebol', run: (s) => { s.player.intelligence = clamp(s.player.intelligence - 4, 0, 100); s.player.energy = clamp(s.player.energy + 8, 0, 100); return { news: '⚽ Só bola agora. A aposta é alta.' }; } },
      { label: (s) => 'Conciliar os dois ⚖️', run: (s) => { s.player.energy = clamp(s.player.energy - 4, 0, 100); s.player.intelligence = clamp(s.player.intelligence + 1, 0, 100); return { news: '⚖️ Puxado, mas dá para levar.' }; } },
    ],
  }),
  ev({
    id: 'carro_base', phase: ['base', 'pro'], min: 17, max: 22, w: 1,
    title: (s) => '🚗 Primeiro carro?',
    text: (s) => `Com o salário chegando, dá para pensar em um carro. ${N(s)} tem R$ ${s.life.bank.toLocaleString('pt-BR')} na conta.`,
    choices: [
      { label: (s) => 'Comprar um usado 🚗', run: (s) => { if (s.life.bank >= 25000) { s.life.bank -= 25000; s.player.possessions.push({ id: 'carro', name: 'Carro usado', icon: '🚗', bought: currentDate(s) }); s.player.happiness = clamp(s.player.happiness + 6, 0, 100); s.player.fame = clamp(s.player.fame + 1, 0, 100); return { news: '🚗 Primeiro carro! Liberdade! (ou estresse no trânsito)' }; } return { news: '🚗 Sem grana ainda. Continuando de ônibus…' }; } },
      { label: (s) => 'Guardar o dinheiro 🏦', run: (s) => { s.player.intelligence = clamp(s.player.intelligence + 1, 0, 100); return { news: '🏦 Poupar é o primeiro passo para a riqueza.' }; } },
    ],
  }),

  // ================= PROFISSIONAL =================
  ev({
    id: 'festa_pro', phase: ['pro', 'vet'], min: 18, max: 99, w: 2,
    title: (s) => '🍾 Festa do elenco',
    text: (s) => `Os veteranos do time chamaram ${N(s)} para uma festa no camarote na sexta-feira. Tem jogo domingo.`,
    choices: [
      { label: (s) => 'Ir, claro! 🎉', hint: 'Social +, forma −', run: (s) => { s.player.social = clamp(s.player.social + 4, 0, 100); s.player.energy = clamp(s.player.energy - 8, 0, 100); s.player.form = clamp(s.player.form - 4, 10, 99); const scandal = !s.player.traits.includes('prof') && Math.random() < 0.2; if (scandal) { s.player.fame = clamp(s.player.fame - 3, 0, 100); s.player.morale = clamp(s.player.morale - 3, 10, 99); return { news: '🎉 Foto sua dançando em cima da mesa vazou! A diretoria não gostou.' }; } return { news: '🎉 Noite épica com o elenco. Domingo vai doer.' }; } },
      { label: (s) => 'Ir, mas cedo 🕙', run: (s) => { s.player.social = clamp(s.player.social + 2, 0, 100); s.player.energy = clamp(s.player.energy - 3, 0, 100); return { news: '🕙 Passou para dar o ar da graça e foi embora cedo. Equilíbrio.' }; } },
      { label: (s) => 'Ficar em casa 😴', hint: 'Forma preservada', run: (s) => { s.player.form = clamp(s.player.form + 2, 10, 99); s.player.social = clamp(s.player.social - 2, 0, 100); return { news: '😴 Profissionalismo em primeiro lugar.' }; } },
    ],
  }),
  ev({
    id: 'patrocinio', phase: ['pro', 'vet'], min: 18, max: 99, w: 2, needFame: 25,
    title: (s) => '📺 Proposta de patrocínio',
    text: (s) => `Uma marca quer pagar R$ ${((s.player.fame * 4000 + 12000) / 1000).toFixed(0)} mil por mês para ${N(s)} postar conteúdos.`,
    choices: [
      { label: (s) => 'Aceitar 💰', run: (s) => { const brand = BRANDS[Math.floor(Math.random() * BRANDS.length)]; const income = s.player.fame * 4000 + 12000; s.life.endorsements.push({ brand: brand.name, income, monthsLeft: 12, id: uid('end') }); return { news: `💰 Patrocínio fechado com ${brand.name}: R$ ${income.toLocaleString('pt-BR')}/mês!` }; } },
      { label: (s) => 'Recusar 🙅', hint: 'Marca pode ficar chateada', run: (s) => { return { news: '🙅 Você preferiu não se comprometer com a marca.' }; } },
    ],
  }),
  ev({
    id: 'namoro_serio', phase: ['pro', 'vet'], min: 19, max: 99, w: 2,
    title: (s) => '💞 Namoro sério?',
    text: (s) => `${N(s)} conheceu alguém em um evento e a química foi imediata. Eles querem exclusividade.`,
    choices: [
      { label: (s) => 'Namorar sério 💞', run: (s) => { if (!s.partner) { s.partner = makePartner(s, makeRng(Date.now()), new Set()); s.partner.together = true; s.partner.since = currentDate(s); s.player.happiness = clamp(s.player.happiness + 8, 0, 100); return { news: `💞 Você e ${s.partner.name} agora são um casal!` }; } return { news: '💞 Você já tem alguém especial.' }; } },
      { label: (s) => 'Ficar de boa 😎', run: (s) => { return { news: '😎 Futebol primeiro. Coração blindado.' }; } },
    ],
  }),
  ev({
    id: 'casamento', phase: ['pro', 'vet'], min: 21, max: 99, w: 1, needPartner: 70,
    title: (s) => '💍 Pedido de casamento',
    text: (s) => `${s.partner?.name} está pronta(o) para dar o próximo passo. Casamento agora?`,
    choices: [
      { label: (s) => 'Pedir em casamento 💍', run: (s) => { if (s.partner) { s.partner.married = true; s.player.happiness = clamp(s.player.happiness + 12, 0, 100); s.life.bank -= 50000; s.player.fame = clamp(s.player.fame + 2, 0, 100); s.career.timeline.push({ year: s.calendar.year, text: `💍 Casamento com ${s.partner.name}`, type: 'life' }); return { news: `💍 VOCÊS CASARAM! A festa foi épica e rendeu capa de revista!` }; } return { news: '💍 Algo deu errado…' }; } },
      { label: (s) => 'Esperar mais ⏳', run: (s) => { s.partner.love = clamp(s.partner.love - 5, 0, 100); return { news: '⏳ Não era o momento. O assunto ficou em aberto.' }; } },
    ],
  }),
  ev({
    id: 'gravidez', phase: ['pro', 'vet'], min: 22, max: 45, w: 1, needPartner: 75,
    title: (s) => '👶 Notícia da gravidez',
    text: (s) => `${s.partner?.name} anunciou: VOCÊS VÃO TER UM FILHO! A felicidade é imensa.`,
    choices: [
      { label: (s) => 'Comemorar 🎊', run: (s) => { if (s.partner) { s.partner.pregnant = true; s.player.happiness = clamp(s.player.happiness + 10, 0, 100); return { news: '🎊 Um(a) filho(a) a caminho! A vida muda para sempre.' }; } return { news: '…' }; } },
      { label: (s) => 'Ficar em choque 😨', run: (s) => { s.player.happiness = clamp(s.player.happiness - 3, 0, 100); return { news: '😨 Você vai precisar de um tempo para processar… mas vai dar tudo certo.' }; } },
    ],
  }),
  ev({
    id: 'nascimento', phase: ['pro', 'vet'], min: 22, max: 46, w: 99, needPregnant: true,
    title: (s) => '🍼 Chegou o bebê!',
    text: (s) => `${s.partner?.name} deu à luz! Um(a) lindo(a) bebê nasceu.`,
    choices: [
      { label: (s) => 'Segurar o bebê 🥹', run: (s) => { const rng = makeRng(Date.now()); const g = rng.chance(0.5) ? 'M' : 'F'; const ctry = s.player.country; const pool = NAME_POOLS[POOL_BY_COUNTRY[ctry] || 'br']; const first = g === 'F' ? (pool.firstF || pool.first) : pool.first; const name = `${rng.pick(first)} ${rng.pick(pool.last)}`; s.family.push({ id: uid('fam'), role: g === 'M' ? 'filho' : 'filha', name, age: 0, love: 100, alive: true }); if (s.partner) s.partner.pregnant = false; s.player.happiness = clamp(s.player.happiness + 15, 0, 100); s.player.energy = clamp(s.player.energy - 10, 0, 100); return { news: `🍼 ${name} nasceu! Você é pai/mãe agora!` }; } },
    ],
  }),
  ev({
    id: 'lesao_pro', phase: ['pro', 'vet'], min: 18, max: 99, w: 2,
    title: (s) => '🤕 Entrada dura no treino',
    text: (s) => `Durante o treino, um zagueiro mais velho chegou forte e ${N(s)} sentiu um estalo no tornozelo.`,
    choices: [
      { label: (s) => 'Sair de campo 🏥', run: (s) => { const months = 1 + Math.floor(Math.random() * 3); s.player.injured = months; s.player.health = clamp(s.player.health - 4, 0, 100); return { news: `🏥 Tornozelo torcido: ${months} mes(es) fora. Fazer o quê…` }; } },
      { label: (s) => 'Aguentar e continuar 💪', run: (s) => { if (Math.random() < 0.5) { s.player.injured = 2; s.player.health = clamp(s.player.health - 6, 0, 100); return { news: '🤕 Agravou! Agora são 2 meses fora. Imprudência.' }; } s.player.morale = clamp(s.player.morale + 5, 10, 99); s.player.skills.PHY = clamp(s.player.skills.PHY + 1, 1, 99); return { news: '💪 Aguçou o dente e seguiu. O elenco respeita sua raça!' }; } },
    ],
  }),
  ev({
    id: 'investimento', phase: ['pro', 'vet'], min: 19, max: 99, w: 1, needMoney: 100000,
    title: (s) => '📈 Conselho de investimento',
    text: (s) => `Seu contador sugeriu aplicar parte do dinheiro em investimentos.`,
    choices: [
      { label: (s) => 'CDB seguro 🏦', run: (s) => { const amt = Math.min(s.life.bank * 0.3, 200000); if (amt < 10000) return { news: 'Sem grana para investir ainda.' }; s.life.bank -= amt; s.life.investments.push({ id: uid('inv'), name: 'CDB', amount: amt, rate: 0.008, risk: 'Baixo', start: currentDate(s) }); return { news: `🏦 Aplicou R$ ${amt.toLocaleString('pt-BR')} em CDB.` }; } },
      { label: (s) => 'Algo mais arriscado 🚀', run: (s) => { const amt = Math.min(s.life.bank * 0.2, 100000); if (amt < 10000) return { news: 'Sem grana para investir ainda.' }; s.life.bank -= amt; s.life.investments.push({ id: uid('inv'), name: 'Startup/Crypto', amount: amt, rate: 0.04, risk: 'Alto', start: currentDate(s) }); return { news: `🚀 Apostou R$ ${amt.toLocaleString('pt-BR')} em uma startup de tecnologia.` }; } },
      { label: (s) => 'Não investir agora 🙅', run: (s) => { return { news: '🙅 Dinheiro na conta é mais seguro na sua cabeça.' }; } },
    ],
  }),
  ev({
    id: 'escandalo', phase: ['pro', 'vet'], min: 18, max: 99, w: 1, needFame: 40,
    title: (s) => '📸 Polêmica na madrugada',
    text: (s) => `Fotos de ${N(s)} saindo de uma balada na madrugada vazaram. A imprensa está chamando de "noitada polêmica".`,
    choices: [
      { label: (s) => 'Explicar com calma 🗣️', run: (s) => { s.player.morale = clamp(s.player.morale - 2, 10, 99); return { news: '🗣️ Entrevista coletiva: "Era folga, estava com a família". A torcida engoliu.' }; } },
      { label: (s) => 'Ignorar 😤', run: (s) => { s.player.fame = clamp(s.player.fame - 4, 0, 100); s.player.morale = clamp(s.player.morale - 4, 10, 99); return { news: '😤 Silêncio. A imprensa adora quando você ignora…' }; } },
      { label: (s) => 'Bater o pé e processar ⚖️', run: (s) => { s.player.fame = clamp(s.player.fame + 1, 0, 100); s.life.bank -= 30000; return { news: '⚖️ Processou o jornal. Vitória em primeira instância! Defendeu sua imagem.' }; } },
    ],
  }),
  ev({
    id: 'podcast', phase: ['pro', 'vet'], min: 18, max: 99, w: 1, needFame: 30,
    title: (s) => '🎙️ Podcast famoso',
    text: (s) => `O maior podcast de futebol do país chamou ${N(s)} para uma entrevista. Audiência garantida.`,
    choices: [
      { label: (s) => 'Aceitar 🎙️', hint: 'Fama +, risco de gafe', run: (s) => { const gain = 3 + Math.floor(Math.random() * 4); s.player.fame = clamp(s.player.fame + gain, 0, 100); s.player.followers += Math.round(15000 + s.player.fame * 4000); if (Math.random() < 0.15) { s.player.morale = clamp(s.player.morale - 3, 10, 99); return { news: `🎙️ Entrevista bombou! (+${gain} fama) Mas uma frase fora de contexto virou polêmica.` }; } return { news: `🎙️ Entrevista memorável! +${gain} de fama e milhares de seguidores novos.` }; } },
      { label: (s) => 'Recusar 🙅', run: (s) => { return { news: '🙅 Você preferiu manter o foco no campo.' }; } },
    ],
  }),
  ev({
    id: 'saudita', phase: ['pro', 'vet'], min: 25, max: 99, w: 1,
    title: (s) => '🤑 Proposta da Arábia',
    text: (s) => `Um clube da Arábia Saudita ofereceu um salário astronômico para ${N(s)} jogar lá. Seria um dinheiro que muda a vida da família.`,
    choices: [
      { label: (s) => 'Aceitar 🤑', hint: 'Muito dinheiro, menos visibilidade', run: (s) => { const club = clubById('hil'); const offer = makeOffer(stateForRun(s), club, 'transfer'); offer.salary = Math.round(offer.salary * 3 / 100) * 100; s.transfers.offers.push(offer); return { news: `🤑 Proposta de R$ ${offer.salary.toLocaleString('pt-BR')}/mês do Al-Hilal recebida! Ela está no mercado para você aceitar.` }; } },
      { label: (s) => 'Recusar 🏟️', hint: 'Prefere a Europa/América', run: (s) => { s.player.morale = clamp(s.player.morale + 1, 10, 99); return { news: '🏟️ "Quero disputar os maiores campeonatos", você disse. Respeitado.' }; } },
    ],
  }),
  ev({
    id: 'tecnico_novo', phase: ['pro', 'vet'], min: 18, max: 99, w: 1,
    title: (s) => '👔 Técnico novo no clube',
    text: (s) => `O clube contratou um técnico novo. Ele convocou ${N(s)} para conversar e disse que todos começam do zero.`,
    choices: [
      { label: (s) => 'Se dedicar nos treinos 💪', run: (s) => { s.player.form = clamp(s.player.form + 4, 10, 99); s.player.morale = clamp(s.player.morale + 3, 10, 99); return { news: '💪 Mostrou serviço. O novo técnico gostou da atitude.' }; } },
      { label: (s) => 'Ficar na sua 😐', run: (s) => { s.player.morale = clamp(s.player.morale - 2, 10, 99); return { news: '😐 Você esperou para ver como o técnico trabalha.' }; } },
    ],
  }),
  ev({
    id: 'mudar_posicao', phase: ['pro'], min: 18, max: 26, w: 1,
    title: (s) => '🔄 Mudança de posição?',
    text: (s) => `O técnico acha que ${N(s)} renderia mais jogando em outra posição.`,
    choices: [
      { label: (s) => 'Aceitar 🔄', run: (s) => { const pos = s.player.position; const options = POSITIONS.filter((p) => p.id !== pos); const novo = options[Math.floor(Math.random() * options.length)]; s.player.position = novo.id; s.player.form = clamp(s.player.form - 3, 10, 99); return { news: `🔄 Agora você joga como ${novo.name}! Tempo de adaptação.` }; } },
      { label: (s) => 'Recusar ✋', run: (s) => { s.player.morale = clamp(s.player.morale - 2, 10, 99); return { news: '✋ Você quer seguir na sua posição. O técnico respeitou.' }; } },
    ],
  }),

  // ================= VETERANO / FIM DE CARREIRA =================
  ev({
    id: 'decadencia', phase: ['vet'], min: 31, max: 99, w: 2,
    title: (s) => '⏳ A idade chega',
    text: (s) => `A imprensa começou a questionar se ${N(s)} ainda tem ritmo de jogo. Os jovens da base estão chegando forte.`,
    choices: [
      { label: (s) => 'Provar que ainda pode 🔥', run: (s) => { s.player.skills.DET = clamp(s.player.skills.DET + 2, 1, 99); s.player.form = clamp(s.player.form + 2, 10, 99); return { news: '🔥 "Ainda tenho lenha para queimar", você respondeu em campo.' }; } },
      { label: (s) => 'Aceitar o declínio 🍂', run: (s) => { s.player.morale = clamp(s.player.morale - 4, 10, 99); return { news: '🍂 Você sente que o fim está se aproximando…' }; } },
    ],
  }),
  ev({
    id: 'ligas_menores', phase: ['vet'], min: 32, max: 99, w: 1,
    title: (s) => '🌴 Liga menor e muito dinheiro?',
    text: (s) => `Um clube da MLS e outro do Catar ofereceram contratos gordos para uma última aventura.`,
    choices: [
      { label: (s) => 'Ir para o exterior 🌴', run: (s) => { const candidates = CLUBS.filter((c) => c.id === 'mia' || c.id === 'laf' || c.id === 'mon2' || c.id === 'ame' || c.id === 'hil' || c.id === 'nass'); const club = candidates[Math.floor(Math.random() * candidates.length)]; const offer = makeOffer(stateForRun(s), club, 'transfer'); s.transfers.offers.push(offer); return { news: `🌴 Oferta de R$ ${offer.salary.toLocaleString('pt-BR')}/mês do ${club.name} está no mercado!` }; } },
      { label: (s) => 'Ficar 🇧🇷', run: (s) => { return { news: '🇧🇷 Sua história termina aqui, onde começou.' }; } },
    ],
  }),
  ev({
    id: 'aposentar', phase: ['vet', 'pro'], min: 32, max: 99, w: 3,
    title: (s) => '🧓 Aposentadoria?',
    text: (s) => `O corpo dói mais, os treinos pesam mais. ${N(s)} pensa em pendurar as chuteiras no fim da temporada.`,
    choices: [
      { label: (s) => 'Continuar mais um ano 💪', hint: 'Risco de queda de rendimento', run: (s) => { s.player.morale = clamp(s.player.morale + 3, 10, 99); s.player.energy = clamp(s.player.energy - 8, 0, 100); return { news: '💪 "Enquanto o corpo aguentar, eu jogo!"' }; } },
      { label: (s) => 'Se aposentar 🧓', hint: 'Encerra a carreira com honra', run: (s) => { retireNow(s); return { news: '🧓 Aposentadoria anunciada! A torcida te aplaudiu de pé no último jogo.' }; } },
    ],
  }),
  ev({
    id: 'sem_clube', phase: ['pro'], min: 17, max: 99, w: 99,
    title: (s) => '📋 Sem clube',
    text: (s) => `Sem contrato, ${N(s)} precisa encontrar um time. O empresário listou as opções.`,
    choices: [
      { label: (s) => 'Procurar clube menor 🔍', run: (s) => { generateOffers(s); const offers = s.transfers.offers.filter((o) => o.type !== 'endorse'); if (offers.length) return { news: `🔍 ${offers.length} proposta(s) chegaram! Confira no Mercado.` }; s.player.morale = clamp(s.player.morale - 4, 10, 99); return { news: '🔍 Nada ainda. Treinar e esperar é o caminho.' }; } },
      { label: (s) => 'Fazer testes 🧪', run: (s) => { const rng = makeRng(Date.now()); const ok = s.player.ovr + rng.int(-6, 10) >= 58; if (ok) { const candidates = CLUBS.filter((c) => c.tier >= 2 && c.tier <= 4); const club = rng.pick(candidates); const offer = makeOffer(stateForRun(s), club, 'free'); s.transfers.offers.push(offer); return { news: `🧪 Passou nos testes do ${club.name}! Proposta de contrato no mercado.` }; } s.player.morale = clamp(s.player.morale - 5, 10, 99); return { news: '🧪 Não vingou. A caminhada continua.' }; } },
    ],
  }),

  // ================= APOSENTADO =================
  ev({
    id: 'trabalho_pos', phase: ['retired'], min: 32, max: 70, w: 2,
    title: (s) => '💼 Vida depois do futebol',
    text: (s) => `Com a carreira encerrada, ${N(s)} recebeu convites para novos projetos.`,
    choices: [
      { label: (s) => 'Comentarista 🎙️', run: (s) => { if (s.player.fame >= 40 || s.player.social >= 50) { s.life.posJob = 'comentarista'; s.player.happiness = clamp(s.player.happiness + 6, 0, 100); return { news: '🎙️ Você virou comentarista de TV! A torcida adora suas análises.' }; } s.player.happiness = clamp(s.player.happiness - 2, 0, 100); return { news: '🎙️ Tentou, mas as emissoras preferem nomes mais famosos.' }; } },
      { label: (s) => 'Técnico 👔', run: (s) => { if (s.player.intelligence >= 55 && s.player.skills.LID >= 55) { s.life.posJob = 'tecnico'; s.player.happiness = clamp(s.player.happiness + 8, 0, 100); return { news: '👔 Cursou licença de técnico e já tem proposta de um clube da Série C!' }; } s.player.happiness = clamp(s.player.happiness - 2, 0, 100); return { news: '👔 Sem base tática suficiente, a carreira de treinador não decolou.' }; } },
      { label: (s) => 'Empreender 🏢', run: (s) => { if (s.life.bank >= 2000000) { s.life.posJob = 'empresario'; s.player.happiness = clamp(s.player.happiness + 5, 0, 100); return { news: '🏢 Abriu uma rede de escolinhas de futebol. Negócio bombando!' }; } s.player.happiness = clamp(s.player.happiness - 2, 0, 100); return { news: '🏢 Sem capital suficiente para empreender. Talvez mais tarde.' }; } },
      { label: (s) => 'Viver tranquilo 🏖️', run: (s) => { s.player.happiness = clamp(s.player.happiness + 3, 0, 100); return { news: '🏖️ Aposentadoria é para isso: viver bem.' }; } },
    ],
  }),
  ev({
    id: 'hobby_apos', phase: ['retired'], min: 40, max: 99, w: 2,
    title: (s) => '🧶 Novo hobby',
    text: (s) => `Com mais tempo livre, ${N(s)} pensou em ocupar as horas com algo novo.`,
    choices: [
      { label: (s) => 'Jogar golfe ⛳', run: (s) => { s.player.happiness = clamp(s.player.happiness + 5, 0, 100); s.player.social = clamp(s.player.social + 3, 0, 100); return { news: '⛳ Bola branca, campo verde e paz de espírito.' }; } },
      { label: (s) => 'Cozinhar 👨‍🍳', run: (s) => { s.player.happiness = clamp(s.player.happiness + 4, 0, 100); s.player.intelligence = clamp(s.player.intelligence + 1, 0, 100); return { news: '👨‍🍳 A família aprovou a nova receita de feijoada!' }; } },
      { label: (s) => 'Colecionar camisas 👕', run: (s) => { s.player.happiness = clamp(s.player.happiness + 3, 0, 100); return { news: '👕 A coleção de camisas históricas está um museu.' }; } },
    ],
  }),
  ev({
    id: 'viagem_apos', phase: ['retired'], min: 55, max: 99, w: 1, needMoney: 50000,
    title: (s) => '✈️ Viagem dos sonhos',
    text: (s) => `Sempre sonhou em conhecer o mundo. A passagem está cara, mas a vida é curta.`,
    choices: [
      { label: (s) => 'Viajar ✈️', run: (s) => { if (s.life.bank >= 30000) { s.life.bank -= 30000; s.player.happiness = clamp(s.player.happiness + 12, 0, 100); return { news: '✈️ Viagem inesquecível! Fotos para a vida toda.' }; } return { news: '✈️ Sem orçamento para a viagem agora.' }; } },
      { label: (s) => 'Guardar para os filhos 🏦', run: (s) => { s.player.happiness = clamp(s.player.happiness + 2, 0, 100); return { news: '🏦 Prioridade é deixar algo para a família.' }; } },
    ],
  }),
  ev({
    id: 'netos', phase: ['retired'], min: 55, max: 99, w: 2, needKid: true,
    title: (s) => '👶 Visita dos filhos',
    text: (s) => `Seus filhos passaram o fim de semana em casa. A casa ficou cheia de novo!`,
    choices: [
      { label: (s) => 'Fazer churrasco 🍖', run: (s) => { s.player.happiness = clamp(s.player.happiness + 8, 0, 100); s.life.bank -= 2000; for (const f of s.family.filter((x) => x.role === 'filho' || x.role === 'filha')) f.love = clamp(f.love + 4, 0, 100); return { news: '🍖 Churrasco em família! Momento perfeito.' }; } },
      { label: (s) => 'Contar histórias da carreira 🎙️', run: (s) => { s.player.happiness = clamp(s.player.happiness + 6, 0, 100); return { news: '🎙️ As crianças adoraram ouvir sobre os gols e títulos.' }; } },
    ],
  }),
  ev({
    id: 'saude_vet', phase: ['retired'], min: 40, max: 99, w: 2, needHealthBelow: 70,
    title: (s) => '🩺 Check-up médico',
    text: (s) => `Os joelhos doem mais que o normal. O médico recomendou um check-up completo.`,
    choices: [
      { label: (s) => 'Fazer o check-up 🏥', run: (s) => { s.life.bank -= 5000; s.player.health = clamp(s.player.health + 6, 0, 100); return { news: '🏥 Tudo sob controle, só desgaste natural. Saúde +6.' }; } },
      { label: (s) => 'Deixar para depois 🙅', run: (s) => { s.player.health = clamp(s.player.health - 4, 0, 100); return { news: '🙅 "É só o tempo passando", você pensou.' }; } },
    ],
  }),
];

function stateForRun(s) { return s; }

export function pickEvent(state, rng) {
  const p = state.player;
  const pool = EVENTS.filter((e) => {
    if (e.phase && !e.phase.includes(p.phase)) return false;
    if (e.min !== undefined && p.age < e.min) return false;
    if (e.max !== undefined && p.age > e.max) return false;
    if (e.needFame && p.fame < e.needFame) return false;
    if (e.needMoney && state.life.bank < e.needMoney) return false;
    if (e.needPartner && (!state.partner || state.partner.love < e.needPartner)) return false;
    if (e.needMarried === true && !state.partner?.married) return false;
    if (e.needPregnant && !state.partner?.pregnant) return false;
    if (e.needHealthBelow && state.player.health >= e.needHealthBelow) return false;
    if (e.needKid && !state.family.some((f) => f.role === 'filho' || f.role === 'filha')) return false;
    return true;
  });
  if (!pool.length) return null;
  const weights = pool.map((e) => e.w || 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.f() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// -------------------- Mês inteiro --------------------
export function advanceMonth(state) {
  const r = { news: [], seasonEnded: false };
  if (state.pending) return { ok: false, msg: 'Há uma decisão pendente. Abra Mensagens e responda antes de avançar.' };
  const p = state.player;

  // 1. tempo
  state.calendar.month += 1;
  if (state.calendar.month > 12) {
    state.calendar.month = 1;
    state.calendar.year += 1;
    if (inFootball(state) && state.career.clubId) buildLeague(state); // nova temporada
  }

  // 2. aniversário
  if (state.calendar.month === p.birthMonth) {
    birthday(state, r);
  }

  // 3. partidas do mês anterior não jogadas (simulação rápida)
  autoSimRemaining(state, r);

  // 4. novo mês: partidas
  state.matches = [];
  if (inFootball(state)) generateMonthFixtures(state);

  // 5. finanças
  monthlyFinance(state, r);

  // 6. recuperação / decaimento
  monthlyRecovery(state, r);

  // 7. treino liberado
  state.training.done = false;

  // 8. seleção
  ntTick(state, r);

  // 9. transferências
  transferTick(state, r);

  // 10. fim de temporada
  if (state.calendar.month === 12 && inFootball(state)) seasonEnd(state, r);

  // 11. evento aleatório
  if (!state.pending && !p.dead) {
    const chance = p.phase === 'child' ? 0.85 : p.phase === 'teen' ? 0.75 : p.phase === 'retired' ? 0.6 : 0.5;
    const ev = pickEvent(state, makeRng(hashStr(`ev_${state.calendar.year}_${state.calendar.month}_${p.name}`) + Math.floor(Math.random() * 1e6)));
    if (ev && Math.random() < chance * (p.traits.includes('sor') ? 1.25 : 1)) {
      pendingEvent(state, ev);
    }
  }

  // 12. aposentadoria forçada
  if (p.age >= 41 && inFootball(state) && !state.pending) {
    addNews(state, `🧓 Aos ${p.age} anos, o corpo não aguenta mais. ${p.name} pendurou as chuteiras definitivamente.`, 'star', 'clube');
    retireNow(state);
  } else if (p.age >= 38 && inFootball(state) && !state.pending && Math.random() < 0.6) {
    pendingEvent(state, eventById('aposentar'));
  }

  // 13. morte na aposentadoria
  if (p.phase === 'retired') {
    p.health = clamp(p.health - (p.age >= 75 ? 2.5 : p.age >= 60 ? 1.2 : p.age >= 45 ? 0.5 : 0.2), 0, 100);
    if (p.health <= 0) {
      p.phase = 'dead';
      p.dead = true;
      r.death = true;
      addNews(state, `🕊️ ${p.name} faleceu aos ${p.age} anos, rodeado pela família. Sua história ficará para sempre no futebol.`, 'info', 'vida');
    }
  }

  refreshPlayer(state);
  return { ok: true, ...r };
}

function autoSimRemaining(state, r) {
  const pendingMatches = state.matches.filter((f) => !f.played);
  for (const f of pendingMatches) {
    quickSimMatch(state, f.id);
  }
  if (pendingMatches.length) r.autoSim = pendingMatches.length;
}

function monthlyRecovery(state, r) {
  const p = state.player;
  // energia
  p.energy = clamp(p.energy + 35, 0, 100);
  // forma tende ao overall base
  if (p.injured > 0) {
    p.form = clamp(p.form - 3, 10, 99);
    p.fitness = clamp(p.fitness - 4, 10, 100);
    p.injured -= 1;
    if (p.injured === 0) addNews(state, `✅ ${p.name} voltou de lesão e está à disposição!`, 'info', 'clube');
  } else {
    p.fitness = clamp(p.fitness + 12, 20, 100);
    p.form = clamp(p.form + (p.form < 50 ? 3 : 1), 10, 99);
  }
  // moral se aproxima da felicidade
  const targetMorale = Math.round(p.happiness * 0.5 + 35);
  p.morale = clamp(p.morale + Math.sign(targetMorale - p.morale) * 2, 10, 99);
  // felicidade afetada por fatores
  let happ = p.happiness;
  const club = clubById(state.career.clubId);
  if (club && isPro(state)) {
    const ambition = p.traits.includes('amb') ? 1 : 0.5;
    const repGap = club.rep - (p.ovr * 1.05);
    happ -= clamp(repGap * 0.15 * ambition, -2, 4);
    if (state.career.season.apps >= 2 && p.form >= 60) happ += 1;
    if (state.nt.called) happ += 1;
  }
  if (state.partner?.love >= 60) happ += 1;
  p.happiness = clamp(happ, 0, 100);
  // saúde: lesão piora, clube médico ajuda
  if (p.injured > 0) p.health = clamp(p.health + 3, 0, 100);
  // fama decai lentamente se não joga bem
  if (p.fame > 0 && p.form < 50 && Math.random() < 0.3) {
    p.fame = clamp(p.fame - 1, 0, 100);
  }
  p.followers = Math.max(p.followers, Math.round(p.fame * 1500));
  if (p.fame > 20) {
    const growth = Math.round((p.fame / 10) * (800 + Math.random() * 1200));
    p.followers += growth;
  }
}

function transferTick(state, r) {
  const p = state.player;
  const m = state.calendar.month;
  const windows = m === 1 || m === 7 || m === 8;
  const freeAgent = !state.career.clubId && inFootball(state);
  if (windows || freeAgent || state.transfers.asking > 0 || p.age >= 32) {
    generateOffers(state);
  }
  if (state.transfers.asking > 0) state.transfers.asking -= 1;
  // renovação automática se contrato acaba no fim do ano
  const con = state.career.contract;
  if (con && con.until === state.calendar.year && m === 11 && !state.transfers.renewalShown) {
    state.transfers.renewalShown = true;
    const club = clubById(state.career.clubId);
    if (club) {
      const offer = makeOffer(state, club, 'transfer');
      state.transfers.offers.push({ ...offer, renewal: true });
      addNews(state, `📄 O ${club.name} quer renovar seu contrato que termina este ano. Proposta no Mercado!`, 'club', 'clube');
    }
  }
  if (m === 1) state.transfers.renewalShown = false;
  // fim de contrato
  if (con && con.until < state.calendar.year && state.career.clubId) {
    addNews(state, `📭 Seu contrato com ${clubById(state.career.clubId)?.name} terminou. Você está livre no mercado!`, 'info', 'clube');
    state.career.contract = null;
    state.career.clubId = null;
    state.career.league = null;
    state.matches = [];
  }
  // ofertas de patrocínio (fama)
  if (p.fame >= 25 && Math.random() < 0.25 && !state.transfers.offers.some((o) => o.type === 'endorse')) {
    const brand = BRANDS[Math.floor(Math.random() * BRANDS.length)];
    state.transfers.offers.push({
      id: uid('ofr'), type: 'endorse', brand: brand.name, icon: brand.icon,
      income: Math.round((p.fame * 3500 + 10000) / 100) * 100,
      months: 12,
    });
    addNews(state, `📺 ${brand.name} quer fechar patrocínio com você! Confira no Mercado.`, 'money', 'fama');
  }
}

// -------------------- Aposentadoria --------------------
export function retireNow(state) {
  const p = state.player;
  const career = state.career;
  const legacy = calcLegacy(state);
  p.phase = 'retired';
  p.legacy = legacy;
  career.clubId = null;
  career.contract = null;
  career.league = null;
  state.matches = [];
  state.transfers.offers = [];
  addNews(state, `🧓 ${p.name} anunciou a aposentadoria aos ${p.age} anos! Uma carreira lendária: ${career.total.goals} gols em ${career.total.apps} jogos.`, 'star', 'clube');
  state.career.timeline.push({ year: state.calendar.year, text: `🧓 Aposentadoria`, type: 'life' });
  return legacy;
}

export function calcLegacy(state) {
  const p = state.player;
  const c = state.career;
  let score = 30;
  score += c.total.goals * 2.5;
  score += c.total.apps * 0.5;
  score += c.total.assists * 1.2;
  const titles = c.history.reduce((a, h) => a + h.titles.length, 0);
  score += titles * 15;
  const awards = c.history.reduce((a, h) => a + h.awards.length, 0);
  score += awards * 20;
  score += state.nt.caps * 1.5;
  score += state.nt.goals * 3;
  score += p.fame * 0.4;
  score += p.totalEarnings / 5e6;
  const peak = Math.max(p.ovr, ...c.history.map((h) => h.avg * 10 || 0));
  score += peak * 0.8;
  const ntTitles = c.timeline.filter((t) => t.text.includes('Campeão') && (t.text.includes('Copa') || t.text.includes('Mundial'))).length;
  score += ntTitles * 8;
  return clamp(Math.round(score), 20, 100);
}

// -------------------- Saves --------------------
export function serialize(state) { return JSON.stringify(state); }
export function deserialize(json) {
  const st = JSON.parse(json);
  if (!st || st.version !== SAVE_VERSION) throw new Error('Versão de save incompatível');
  return st;
}
export function saveSlots(storage) {
  try {
    const raw = storage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
export async function writeSlot(storage, slotId, state) {
  try {
    state.meta.savedAt = Date.now();
    const text = serialize(state);
    const { compressText } = await import('./saveio.js');
    const packed = await compressText(text);
    const slots = saveSlots(storage);
    slots[slotId] = {
      savedAt: Date.now(),
      playerName: state.player.name,
      age: state.player.age,
      ovr: state.player.ovr,
      club: state.career.clubId ? clubById(state.career.clubId)?.short : null,
      phase: state.player.phase,
      data: packed,
    };
    storage.setItem(LS_KEY, JSON.stringify(slots));
    return { ok: true };
  } catch (e) { return { ok: false, msg: String(e) }; }
}
export async function readSlot(storage, slotId) {
  const slots = saveSlots(storage);
  const slot = slots[slotId];
  if (!slot) return null;
  const { decompressText } = await import('./saveio.js');
  const text = await decompressText(slot.data);
  return deserialize(text);
}
export function deleteSlot(storage, slotId) {
  const slots = saveSlots(storage);
  delete slots[slotId];
  storage.setItem(LS_KEY, JSON.stringify(slots));
}
export const memoryStorage = (() => {
  let m = {};
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } };
})();
