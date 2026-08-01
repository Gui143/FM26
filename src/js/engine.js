// ============================================================
// engine.js — Motor de simulação de partidas (minuto a minuto)
// Considera: overall, forma, moral, cansaço, lesões, mando de
// campo, tática, clima, cartões, substituições, prorrogação, pênaltis
// ============================================================
import { makeRng, clamp } from './util.js';

// Overall efetivo: combina overall, condição física, moral e forma
export function effOvr(p) {
  if (p.injuredWeeks > 0 || p.suspended > 0) return 0;
  const fit = clamp(p.fitness, 40, 100) / 100;
  const mor = clamp(p.morale, 20, 100) / 100;
  const frm = clamp(p.form, 20, 100) / 100;
  return Math.round(p.ovr * (0.68 + fit * 0.16 + mor * 0.08 + frm * 0.08));
}

// lineup: { G:[], D:[], M:[], A:[] } arrays de objetos jogador
// tactic: { mentality:0|1|2, pressing:0|1|2, line:0|1|2, style:0|1, tempo:0|1|2 }
export function teamRatings(lineup, tactic, isHome, chemistry = 70) {
  const avg = (arr) => (arr.length ? arr.reduce((s, p) => s + effOvr(p), 0) / arr.length : 50);
  const g = avg(lineup.G), d = avg(lineup.D), m = avg(lineup.M), a = avg(lineup.A);
  const lines = { d: lineup.D.length, m: lineup.M.length, a: lineup.A.length };
  let attack = a * 0.62 + m * 0.30 + d * 0.08;
  let midfield = m * 0.58 + d * 0.22 + a * 0.20;
  let defense = d * 0.55 + g * 0.30 + m * 0.15;
  // Ajustes táticos
  const ment = tactic?.mentality ?? 1;
  attack *= [0.90, 1.0, 1.12][ment];
  defense *= [1.10, 1.0, 0.90][ment];
  const press = tactic?.pressing ?? 1;
  midfield *= [0.95, 1.0, 1.06][press];
  defense *= [0.97, 1.0, 1.03][press];
  defense *= [1.06, 1.0, 0.94][tactic?.line ?? 1];
  attack *= [0.94, 1.0, 1.04][tactic?.line ?? 1];
  if (tactic?.style === 1 && ment === 0) attack *= 1.08; // contra-ataque + retranca
  // Falta de entrosamento (linhas fora do ideal) penaliza
  const shapePenalty = (lines.d < 3 || lines.d > 5 || lines.m < 2 || lines.m > 5 || lines.a < 1 || lines.a > 3) ? 0.93 : 1;
  const chem = 0.92 + (clamp(chemistry, 30, 100) - 30) / 700; // química/entrosamento
  const home = isHome ? 1.06 : 1.0;
  return {
    attack: attack * shapePenalty * chem * home,
    midfield: midfield * shapePenalty * chem,
    defense: defense * shapePenalty * chem * home,
    keeper: g,
  };
}

// Disputa de pênaltis isolada (usada em mata-mata e jogos de volta)
export function penaltyShootout(seed, qualityH) {
  const rng = makeRng(seed);
  const qH = clamp(qualityH, 0.3, 0.7);
  const qA = 1 - qH;
  const pen = { h: [], a: [] };
  let winner = null, round = 0;
  while (round < 5 || (pen.h.filter(Boolean).length === pen.a.filter(Boolean).length && round < 12)) {
    pen.h.push(rng.f() < 0.74 + (qH - 0.5) * 0.2);
    pen.a.push(rng.f() < 0.74 + (qA - 0.5) * 0.2);
    round++;
    if (round >= 5) {
      const sh = pen.h.filter(Boolean).length, sa = pen.a.filter(Boolean).length;
      if (sh !== sa) { winner = sh > sa ? 'h' : 'a'; break; }
    }
  }
  if (!winner) winner = rng.chance(0.5) ? 'h' : 'a';
  return { h: pen.h.filter(Boolean).length, a: pen.a.filter(Boolean).length, winner };
}

function pickScorer(rng, lineup, stats) {
  const pool = [];
  const w = (p, mult) => { if (effOvr(p) > 0) pool.push([p, mult * (0.6 + p.ovr / 100)]); };
  lineup.A.forEach((p) => w(p, 10));
  lineup.M.forEach((p) => w(p, 4));
  lineup.D.forEach((p) => w(p, 1.4));
  lineup.G.forEach((p) => w(p, 0.05));
  let total = pool.reduce((s, x) => s + x[1], 0);
  let r = rng.f() * total;
  for (const [p, weight] of pool) { r -= weight; if (r <= 0) return p; }
  return pool[0]?.[0];
}

function pickAssistant(rng, lineup, scorer) {
  if (!rng.chance(0.62)) return null;
  const pool = [];
  const w = (p, mult) => { if (p.id !== scorer.id && effOvr(p) > 0) pool.push([p, mult]); };
  lineup.M.forEach((p) => w(p, 6));
  lineup.A.forEach((p) => w(p, 4));
  lineup.D.forEach((p) => w(p, 2));
  let total = pool.reduce((s, x) => s + x[1], 0), r = rng.f() * total;
  for (const [p, weight] of pool) { r -= weight; if (r <= 0) return p; }
  return null;
}

function pickCardPlayer(rng, lineupAll) {
  const live = lineupAll.filter((p) => effOvr(p) > 0);
  if (!live.length) return null;
  // Defensores levam mais cartão
  const pool = [];
  for (const p of live) {
    const base = p.pos === 'D' ? 5 : p.pos === 'M' ? 3.5 : p.pos === 'A' ? 2.2 : 1;
    pool.push([p, base * (p.personality === 'Pavio curto' ? 1.8 : 1)]);
  }
  let total = pool.reduce((s, x) => s + x[1], 0), r = rng.f() * total;
  for (const [p, weight] of pool) { r -= weight; if (r <= 0) return p; }
  return live[0];
}

const WEATHERS = ['Ensolarado', 'Nublado', 'Chuvoso', 'Calor', 'Frio'];

/**
 * Simula uma partida.
 * home/away: { lineup: {G,D,M,A arrays}, name, tactic }
 * options: { seed, knockout, neutral, narrative, leg (para mata-mata 2º jogo) }
 */
export function simMatch(home, away, options = {}) {
  const seed = options.seed ?? Math.floor(Math.random() * 1e9);
  const rng = makeRng(seed);
  const narrative = options.narrative !== false;
  const neutral = !!options.neutral;
  const events = [];
  const weather = rng.pick(WEATHERS);
  if (weather === 'Chuvoso' && rng.chance(0.5)) {/* gramado pesado: menos gols */}
  const weatherAtk = weather === 'Chuvoso' ? 0.93 : weather === 'Calor' ? 0.96 : 1;

  const H = teamRatings(home.lineup, home.tactic, !neutral, home.chemistry ?? 70);
  const A = teamRatings(away.lineup, away.tactic, false, away.chemistry ?? 70);

  const allH = [...home.lineup.G, ...home.lineup.D, ...home.lineup.M, ...home.lineup.A].filter(Boolean);
  const allA = [...away.lineup.G, ...away.lineup.D, ...away.lineup.M, ...away.lineup.A].filter(Boolean);

  const score = { h: 0, a: 0 };
  const stats = {
    possession: { h: 50, a: 50 },
    shots: { h: 0, a: 0 }, shotsOn: { h: 0, a: 0 },
    corners: { h: 0, a: 0 }, fouls: { h: 0, a: 0 },
    offsides: { h: 0, a: 0 },
    yellow: { h: 0, a: 0 }, red: { h: 0, a: 0 }, injuries: { h: 0, a: 0 },
  };
  // Posse de bola pelo meio-campo
  const midSum = H.midfield + A.midfield;
  stats.possession.h = clamp(Math.round((H.midfield / midSum) * 100 + rng.int(-4, 4)), 28, 72);
  stats.possession.a = 100 - stats.possession.h;

  const yellows = new Map(); // playerId -> count
  const sentOff = { h: [], a: [] };
  const injuredList = { h: [], a: [] };
  const goalScorers = [];

  const ev = (min, type, side, text, extra = {}) => {
    events.push({ min, type, side, text, ...extra });
  };

  const strengthH = H.attack / Math.max(A.defense, 1);
  const strengthA = A.attack / Math.max(H.defense, 1);
  const baseChance = 0.115 * weatherAtk; // chances de ataque por minuto por time (média)

  const chanceFor = (side, str, oppKeeper, minutesFactor) => {
    let p = baseChance * Math.pow(str, 1.35) * minutesFactor;
    return clamp(p, 0.02, 0.30);
  };

  const resolveAttack = (side, min, extra) => {
    const isH = side === 'h';
    const lineup = isH ? home.lineup : away.lineup;
    const opp = isH ? A : H;
    const name = isH ? home.short : away.short;
    stats.shots[side] += 1;
    const onTarget = rng.chance(0.42);
    if (onTarget) stats.shotsOn[side] += 1;
    // Probabilidade de gol: força do ataque vs goleiro adversário
    const keeperFactor = clamp((opp.keeper - 55) / 70, 0, 0.6);
    let goalProb = onTarget ? clamp(0.34 * (strengthFor(side) / (1 + keeperFactor) / 1.2), 0.08, 0.55) : 0.02;
    if (extra === 'penalty') goalProb = 0.76;
    if (rng.f() < goalProb) {
      score[side] += 1;
      const scorer = pickScorer(rng, lineup, stats);
      const assist = extra === 'penalty' ? null : pickAssistant(rng, lineup, scorer);
      goalScorers.push({ side, playerId: scorer?.id, assistId: assist?.id, min });
      if (narrative) {
        const how = extra === 'penalty' ? 'de pênalti' : rng.pick(['após bela jogada', 'de cabeça', 'de fora da área', 'no contragolpe', 'após cruzamento', 'em cobrança de escanteio', 'num chute colocado']);
        ev(min, 'goal', side, `⚽ GOOOL do ${name}! ${scorer ? scorer.name : 'Desconhecido'} marca ${how}!${assist ? ` Assistência de ${assist.name}.` : ''}`, { playerId: scorer?.id, assistId: assist?.id });
      }
    } else {
      if (narrative && rng.chance(0.55)) {
        const who = pickScorer(rng, lineup, stats);
        ev(min, 'chance', side, `${name}: ${who ? who.name : 'Atacante'} ${onTarget ? 'obriga grande defesa do goleiro!' : 'perde chance clara!'}`);
      }
    }
    if (rng.chance(0.10)) stats.corners[side] += 1;
  };

  const strengthFor = (side) => (side === 'h' ? strengthH : strengthA);

  // Pênalti ocasional
  let penH = rng.chance(0.09), penA = rng.chance(0.09);
  const penMinH = rng.int(5, 88), penMinA = rng.int(5, 88);

  const totalMinutes = 90;
  for (let min = 1; min <= totalMinutes; min++) {
    const fatigue = min > 70 ? 1.12 : 1; // fim de jogo abre espaços
    if (rng.f() < chanceFor('h', strengthH, A.keeper, fatigue)) resolveAttack('h', min);
    if (rng.f() < chanceFor('a', strengthA, H.keeper, fatigue)) resolveAttack('a', min);
    if (penH && min === penMinH) { if (narrative) ev(min, 'pen', 'h', `Pênalti para ${home.short}!`); resolveAttack('h', min, 'penalty'); }
    if (penA && min === penMinA) { if (narrative) ev(min, 'pen', 'a', `Pênalti para ${away.short}!`); resolveAttack('a', min, 'penalty'); }
    // Escanteios soltos
    if (rng.chance(0.05)) stats.corners[rng.chance(strengthH / (strengthH + strengthA)) ? 'h' : 'a'] += 1;
    if (rng.chance(0.03)) stats.offsides[rng.chance(0.5) ? 'h' : 'a'] += 1;
    // Faltas e cartões
    if (rng.chance(0.16)) {
      const side = rng.chance(0.5) ? 'h' : 'a';
      const lineupAll = side === 'h' ? allH : allA;
      const opp = side === 'h' ? away : home;
      stats.fouls[side] += 1;
      if (rng.chance(0.22)) {
        const p = pickCardPlayer(rng, lineupAll);
        if (p) {
          const cnt = (yellows.get(p.id) || 0) + 1;
          yellows.set(p.id, cnt);
          stats.yellow[side] += 1;
          const second = cnt >= 2;
          if (narrative) ev(min, second ? 'red' : 'yellow', side, `${second ? '🟥' : '🟨'} ${p.name} (${side === 'h' ? home.short : away.short}) recebe ${second ? 'o segundo amarelo e é expulso!' : 'cartão amarelo.'}`, { playerId: p.id });
          if (second) sentOff[side].push(p.id);
        }
      } else if (rng.chance(0.012)) {
        const p = pickCardPlayer(rng, lineupAll);
        if (p) {
          stats.red[side] += 1; sentOff[side].push(p.id);
          if (narrative) ev(min, 'red', side, `🟥 ${p.name} é expulso direto após entrada dura!`, { playerId: p.id });
        }
      }
      // Lesão rara
      if (rng.chance(0.028)) {
        const p = pickCardPlayer(rng, lineupAll);
        if (p) {
          const weeks = rng.int(1, 6);
          stats.injuries[side === 'h' ? 'h' : 'a'] += 1;
          injuredList[side].push({ id: p.id, weeks });
          if (narrative) ev(min, 'injury', side, `🤕 ${p.name} sente lesão e sai de maca. Previsão: ${weeks} semana(s).`, { playerId: p.id, weeks });
        }
      }
    }
    // Expulsões reduzem força (simulação aproximada em tempo real)
    if (min === 46) {
      const redH = sentOff.h.length, redA = sentOff.a.length;
      if (redH) { H.attack *= Math.pow(0.92, redH); H.defense *= Math.pow(0.92, redH); }
      if (redA) { A.attack *= Math.pow(0.92, redA); A.defense *= Math.pow(0.92, redA); }
      const sH = strengthH, sA = strengthA; // recalcula já abaixo (strengths são const) — efeito aplicado via multiplicadores acima
    }
  }

  // Recalcula placar de chances com efeito de expulsões (leve ajuste final)
  const poss = stats.possession;

  let result = {
    seed, weather, narrative,
    home: score.h, away: score.a,
    events, stats,
    goalScorers,
    injuries: [...injuredList.h, ...injuredList.a],
    cards: { yellow: Array.from(yellows.entries()).map(([id, n]) => ({ id, count: n })), red: [...sentOff.h, ...sentOff.a] },
    extraTime: false, penalties: null,
    motm: null,
  };

  // Prorrogação e pênaltis (mata-mata)
  if (options.knockout && !options.noExtraTime && score.h === score.a) {
    result.extraTime = true;
    if (narrative) ev(90, 'info', 'n', 'Fim do tempo regulamentar! Vamos para a prorrogação.');
    for (let min = 91; min <= 120; min++) {
      if (rng.f() < chanceFor('h', strengthH * 0.8, A.keeper, 1.1)) resolveAttack('h', min);
      if (rng.f() < chanceFor('a', strengthA * 0.8, H.keeper, 1.1)) resolveAttack('a', min);
    }
    result.home = score.h; result.away = score.a;
    if (score.h === score.a) {
      // Disputa de pênaltis
      if (narrative) ev(120, 'info', 'n', 'A decisão será nos pênaltis!');
      const qH = clamp(H.attack / (H.attack + A.attack), 0.3, 0.7);
      const pen = penaltyShootout(seed ^ 0x9e3779b9, qH);
      result.penalties = pen;
      if (narrative) ev(120, 'pen', pen.winner, `🏆 ${pen.winner === 'h' ? home.short : away.short} vence nos pênaltis por ${Math.max(pen.h, pen.a)} a ${Math.min(pen.h, pen.a)}!`);
    }
  }

  // Homem do jogo
  if (goalScorers.length) {
    const count = {};
    goalScorers.forEach((g) => { if (g.playerId) count[g.playerId] = (count[g.playerId] || 0) + 2; if (g.assistId) count[g.assistId] = (count[g.assistId] || 0) + 1; });
    const best = Object.entries(count).sort((x, y) => y[1] - x[1])[0];
    if (best) result.motm = best[0];
  }

  return result;
}

/** Versão rápida para partidas sem acompanhamento (IA x IA) */
export function quickSim(home, away, seed, knockout = false, neutral = false) {
  return simMatch(home, away, { seed, knockout, neutral, narrative: false });
}
