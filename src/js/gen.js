// ============================================================
// gen.js — Geração procedural: clubes, elencos, treinadores,
// escudos (SVG), avatares. Tudo determinístico a partir da seed.
// ============================================================
import { makeRng, clamp, initials, hashStr, shade, textOn } from './util.js';
import { CLUBS, COUNTRIES, LEAGUES, NAME_POOLS, COACH_NAMES, PERSONALITIES, SPONSORS } from './data.js';
import { REAL_SQUADS } from './realsquads.js';

// Mapa país -> pool de nomes
const POOL_BY_COUNTRY = {
  br: 'br', ar: 'hisp', es: 'hisp', en: 'en', it: 'it',
  de: 'de', nl: 'de', fr: 'fr', pt: 'br',
};

function poolFor(countryId) {
  return NAME_POOLS[POOL_BY_COUNTRY[countryId] || 'br'];
}

let playerSeq = 1;

function genPlayerName(rng, countryId, used) {
  const pool = poolFor(countryId);
  for (let i = 0; i < 50; i++) {
    const n = `${rng.pick(pool.first)} ${rng.pick(pool.last)}`;
    if (!used.has(n)) { used.add(n); return n; }
  }
  const n = `${rng.pick(pool.first)} ${rng.pick(pool.last)} ${rng.pick(pool.last)}`;
  used.add(n); return n;
}

// Valor de mercado (em R$) a partir de overall, idade, potencial
export function marketValue(ovr, age, pot) {
  const base = Math.pow(Math.max(ovr - 38, 1), 3.05) * 800;
  const ageFactor = age <= 21 ? 1.5 : age <= 24 ? 1.35 : age <= 28 ? 1.15 : age <= 31 ? 0.8 : age <= 33 ? 0.5 : 0.3;
  const potBonus = pot > ovr ? (pot - ovr) * 0.04 + 1 : 1;
  return Math.round(base * ageFactor * potBonus / 1000) * 1000;
}

export function weeklyWage(value, ovr) {
  return Math.round((value / 1100 + Math.pow(Math.max(ovr - 40, 1), 2.6) * 65) / 100) * 100;
}

function genPlayer(rng, club, pos, usedNames) {
  const countryRng = rng.f();
  let country;
  if (countryRng < 0.72) country = club.country;
  else {
    const others = COUNTRIES.filter((c) => c.id !== club.country);
    country = rng.pick(others).id;
  }
  const rep = club.rep;
  
  // Overall muito mais realista baseado na reputação do clube e idade
  const age = (() => {
    const r = rng.f();
    if (r < 0.16) return rng.int(17, 20);
    if (r < 0.62) return rng.int(21, 28);
    if (r < 0.88) return rng.int(29, 32);
    return rng.int(33, 37);
  })();

  // Base OVR: Reputação do clube - offset. Muito mais preciso para realismo.
  let baseOvr = (rep * 0.65) + 22 + rng.int(-3, 3);
  
  // Jovens começam com OVR menor mas POT maior
  if (age <= 19) baseOvr -= 18;
  else if (age <= 21) baseOvr -= 10;
  else if (age <= 23) baseOvr -= 5;
  
  let ovr = clamp(Math.round(baseOvr), 40, 96);
  
  let pot = ovr;
  if (age <= 20) pot = clamp(ovr + rng.int(10, 25), ovr, 99);
  else if (age <= 23) pot = clamp(ovr + rng.int(4, 15), ovr, 99);
  else if (age <= 26) pot = clamp(ovr + rng.int(0, 8), ovr, 99);
  
  // Casos especiais de "Gui Negão" e outros jovens artilheiros
  // Se for muito jovem e estiver num clube gigante, o OVR inicial deve ser baixo (reserva)
  if (age < 19 && rep > 80 && ovr > 68) ovr = rng.int(60, 67);

  const value = marketValue(ovr, age, pot);
  const height = pos === 'G' ? rng.int(186, 198) : pos === 'D' ? rng.int(180, 194) : pos === 'M' ? rng.int(170, 188) : rng.int(172, 192);
  const p = {
    id: `p${playerSeq++}`,
    name: genPlayerName(rng, country, usedNames),
    clubId: club.id,
    age,
    height,
    weight: Math.round(height * (pos === 'G' ? 0.44 : 0.42) + rng.int(-8, 8)),
    country,
    pos,
    ovr,
    pot,
    salary: weeklyWage(value, ovr),
    contractYears: rng.int(1, 5),
    value,
    personality: rng.pick(PERSONALITIES),
    fitness: rng.int(82, 100),
    injuredWeeks: 0,
    suspended: 0,
    yellow: 0,
    number: 0,
    foot: rng.chance(0.72) ? 'D' : 'E',
    morale: rng.int(58, 92),
    xp: rng.int(5, 60) + Math.max(0, (age - 20)) * 2,
    form: rng.int(45, 85),
    photo: null,
    stats: { games: 0, goals: 0, assists: 0, yellow: 0, red: 0, ratingSum: 0, cleanSheets: 0 },
    career: { games: 0, goals: 0, assists: 0 },
    history: [],
    listed: false,
    loan: null,
    formHistory: [],
  };
  return p;
}

// Cria jogador a partir de uma linha de elenco real (atributos trazidos do motor,
// identidade — nome/posição/número/nacionalidade/foto — do dado real)
function genFromReal(rng, club, row, usedNames) {
  const p = genPlayer(rng, club, row.pos, usedNames);
  p.name = row.n;
  p.number = row.num > 0 ? row.num : 0;
  p._hasNum = p.number > 0;
  if (row.nat) p.country = row.nat; // nacionalidade real do atleta
  usedNames.add(row.n);
  if (row.face) p.face = row.face;
  
  if (row.age) p.age = row.age;

  // Ajuste fino de OVR realismo
  // Gui Negão, etc: Jovens promissores em clubes grandes
  if (p.age < 19 && club.rep > 85) {
      p.ovr = clamp(p.ovr, 58, 66);
      p.pot = clamp(p.pot, 82, 94);
  }
  // Estrelas mundiais (Vini Jr, Haaland, etc seriam rep 95+)
  if (club.rep >= 95 && p.age >= 23 && p.age <= 30) {
      p.ovr = clamp(p.ovr, 86, 96);
  }

  p.value = marketValue(p.ovr, p.age, p.pot);
  p.salary = weeklyWage(p.value, p.ovr);
  p.xp = rng.int(5, 60) + Math.max(0, (p.age - 20)) * 2;
  
  return p;
}

// Gera elenco completo de um clube
function genSquad(rng, club, usedNames) {
  const real = REAL_SQUADS[club.id];
  if (real && real.length > 0) {
    const squad = [];
    const count = { G: 0, D: 0, M: 0, A: 0 };
    for (const row of real) {
      const p = genFromReal(rng, club, row, usedNames);
      p.fictional = false;
      count[p.pos]++; squad.push(p);
    }
    
    // Garante apenas o mínimo absoluto se faltar gente para fechar 11 titulares + reservas
    // Mas o usuário quer remover fictícios, então vamos tentar manter o mais real possível.
    const minNeeded = 16;
    if (squad.length < minNeeded) {
      while (squad.length < minNeeded) {
        const pos = rng.pick(['G', 'D', 'M', 'A']);
        const p = genPlayer(rng, club, pos, usedNames);
        p.fictional = true;
        p.name = `Regen ${p.name.split(' ').slice(-1)[0]}`;
        squad.push(p);
      }
    }

    // numeração: preserva os números reais; demais recebem livres
    const used = new Set();
    for (const p of squad) { if (p._hasNum && !used.has(p.number)) used.add(p.number); else p.number = 0; }
    const freePref = [1, 12, 22, 2, 3, 4, 6, 13, 14, 15, 16, 5, 8, 10, 17, 18, 20, 21, 23, 7, 9, 11, 19, 27, 77, 24, 25, 26, 28, 29, 30, 31, 32, 33, 34, 35, 38, 40, 42, 45, 50, 55, 66, 99];
    let fi = 0;
    for (const p of squad) {
      if (p.number) continue;
      while (fi < freePref.length && used.has(freePref[fi])) fi++;
      p.number = fi < freePref.length ? freePref[fi] : 90 + rng.int(0, 9);
      used.add(p.number);
    }
    return squad;
  }
  // Se não tem real, gera o mínimo
  const plan = [['G', 2], ['D', 5], ['M', 5], ['A', 3]];
  const squad = [];
  for (const [pos, count] of plan) {
    for (let i = 0; i < count; i++) {
        const p = genPlayer(rng, club, pos, usedNames);
        p.fictional = true;
        squad.push(p);
    }
  }
  // Numeração por linha
  const nums = { G: [1, 12, 22], D: [2, 3, 4, 6, 13, 14, 15, 16], M: [5, 8, 10, 17, 18, 20, 21, 23], A: [7, 9, 11, 19, 27, 77] };
  const byPos = { G: [], D: [], M: [], A: [] };
  squad.forEach((p) => byPos[p.pos].push(p));
  for (const k of Object.keys(byPos)) {
    byPos[k].sort((a, b) => b.ovr - a.ovr);
    const free = nums[k].slice();
    byPos[k].forEach((p) => {
      if (free.length) p.number = free.shift();
      else {
        let n; do { n = rng.int(24, 99); } while (squad.some((q) => q.number === n));
        p.number = n;
      }
    });
  }
  return squad;
}

function genCoach(rng, club, usedNames) {
  const countryKey = POOL_BY_COUNTRY[club.country] || 'br';
  const list = COACH_NAMES[countryKey] || COACH_NAMES.br;
  let name = rng.pick(list);
  if (usedNames.has(name)) name = `${name.split(' ')[0]} ${rng.pick(poolFor(club.country).last)}`;
  usedNames.add(name);
  return {
    id: `c_${club.id}`,
    name,
    country: club.country,
    level: clamp(club.rep + rng.int(-6, 5), 55, 99),
    rep: club.rep,
    xp: rng.int(200, 2000),
    titles: [],
    clubId: club.id,
  };
}

// Constrói todo o banco (210+ clubes, ~5.000 jogadores) — determinístico
export function buildDatabase(seed = 2026) {
  playerSeq = 1;
  const rng = makeRng(seed);
  const clubs = {};
  const players = {};
  const coaches = {};
  const usedNames = new Set();

  for (const league of LEAGUES) {
    const rows = CLUBS[league.id] || [];
    rows.forEach((row, idx) => {
      const [name, short, city, c1, c2, rep, stadium, capK] = row;
      const id = `${league.id}_${idx}`;
      const club = {
        id, name, short, city, colors: [c1, c2], rep,
        stadium, capacity: capK * 1000,
        country: league.country, leagueId: league.id, tier: league.tier,
        fans: Math.round(rep * rep * 900 + capK * 3500),
        budget: Math.round((Math.pow(rep, 2.6) * 22000) * (0.8 + rng.f() * 0.5)),
        sponsor: { name: rng.pick(SPONSORS), value: Math.round(Math.pow(rep, 2.3) * 22000) },
        titles: [],
        youthLevel: clamp(rep + rng.int(-10, 10), 40, 99),
        founded: rng.int(1895, 1990),
      };
      clubs[id] = club;
      const squad = genSquad(rng, club, usedNames);
      squad.forEach((p) => { players[p.id] = p; });
      coaches[id] = genCoach(rng, club, usedNames);
    });
  }
  return { clubs, players, coaches, seed };
}

// -------------------- ESCUDOS SVG PROCEDURAIS --------------------
// Cada clube ganha um escudo único derivado de cores, abreviação e hash.
const CREST_TEMPLATES = ['shield', 'round', 'pennant', 'classic'];

export function crestSVG(club, size = 40) {
  const [c1, c2] = club.colors;
  const ab = club.short || initials(club.name, 3);
  const h = hashStr(club.id || club.name);
  const tpl = CREST_TEMPLATES[h % CREST_TEMPLATES.length];
  const pattern = (h >> 3) % 4; // 0 listras vert, 1 metades, 2 faixa, 3 listras horiz
  const txt = textOn(c1) === '#ffffff' ? shade(c1, -70) : '#ffffff';
  const ink = club.short === 'SAN' || club.short === 'COR' || club.short === 'BOT' || club.short === 'VAS' ? '#111' : textOn(c1);
  const monogram = ink === '#101418' ? '#101418' : ink;
  const gid = `g${h.toString(36)}${size}`;

  let shapePath, clipPath;
  if (tpl === 'round') {
    shapePath = `<circle cx="50" cy="50" r="46"/>`;
    clipPath = `<circle cx="50" cy="50" r="43"/>`;
  } else if (tpl === 'pennant') {
    shapePath = `<path d="M50 3 L95 30 L50 97 L5 30 Z"/>`;
    clipPath = `<path d="M50 8 L89 31 L50 90 L11 31 Z"/>`;
  } else if (tpl === 'classic') {
    shapePath = `<path d="M50 2 C70 8 88 10 95 10 L95 46 C95 72 74 88 50 98 C26 88 5 72 5 46 L5 10 C12 10 30 8 50 2 Z"/>`;
    clipPath = `<path d="M50 8 C66 13 80 14 88 15 L88 46 C88 68 71 81 50 90 C29 81 12 68 12 46 L12 15 C20 14 34 13 50 8 Z"/>`;
  } else {
    shapePath = `<path d="M50 2 L92 14 L92 50 C92 74 72 90 50 98 C28 90 8 74 8 50 L8 14 Z"/>`;
    clipPath = `<path d="M50 8 L86 18 L86 50 C86 70 69 84 50 91 C31 84 14 70 14 50 L14 18 Z"/>`;
  }

  let patternFill = '';
  if (pattern === 0) {
    patternFill = `<rect x="34" y="0" width="10" height="100" fill="${c2}" opacity="0.92"/><rect x="56" y="0" width="10" height="100" fill="${c2}" opacity="0.92"/>`;
  } else if (pattern === 1) {
    patternFill = `<rect x="50" y="0" width="50" height="100" fill="${c2}" opacity="0.92"/>`;
  } else if (pattern === 2) {
    patternFill = `<rect x="0" y="40" width="100" height="20" fill="${c2}" opacity="0.92"/>`;
  } else {
    patternFill = `<rect x="0" y="26" width="100" height="9" fill="${c2}" opacity="0.92"/><rect x="0" y="66" width="100" height="9" fill="${c2}" opacity="0.92"/>`;
  }

  const fs = ab.length >= 3 ? 30 : ab.length === 2 ? 36 : 44;
  const starY = tpl === 'round' ? 16 : 13;
  const stars = club.rep >= 88 ? 2 : club.rep >= 80 ? 1 : 0;
  const star = (x) => `<path transform="translate(${x} ${starY}) scale(0.55)" d="M0 -8 L2.4 -2.4 L8 -2.4 L3.4 1.4 L5 7 L0 3.6 L-5 7 L-3.4 1.4 L-8 -2.4 L-2.4 -2.4 Z" fill="#ffd34d"/>`;

  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${ab}">
  <defs><clipPath id="${gid}">${clipPath}</clipPath></defs>
  <g fill="${c1}" stroke="${shade(c1, -45)}" stroke-width="3.5">${shapePath}</g>
  <g clip-path="url(#${gid})"><rect x="0" y="0" width="100" height="100" fill="${c1}"/>${patternFill}</g>
  ${stars >= 1 ? star(stars === 2 ? 38 : 50) : ''}${stars === 2 ? star(62) : ''}
  <text x="50" y="${tpl === 'round' ? 62 : 60}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="${fs}" fill="${monogram}" stroke="${monogram === '#ffffff' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.25)'}" stroke-width="1.2">${ab}</text>
</svg>`;
}

// Avatar do jogador: círculo com iniciais e cor da posição
const POS_COLORS = { G: '#f59e0b', D: '#3b82f6', M: '#22c55e', A: '#ef4444' };
export function avatarSVG(player, size = 36) {
  if (player.face) {
    return `<img class="face" src="src/assets/faces/${player.face}" alt="" width="${size}" height="${size}" style="border-radius:50%;object-fit:cover;width:${size}px;height:${size}px" loading="lazy">`;
  }
  if (player.photo) {
    return `<img src="${player.photo}" alt="" width="${size}" height="${size}" style="border-radius:50%;object-fit:cover;width:${size}px;height:${size}px">`;
  }
  const ini = initials(player.name.split(' ').slice(-1)[0] + ' ' + player.name.split(' ')[0], 2).split('').reverse().join('');
  const c = POS_COLORS[player.pos] || '#64748b';
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="19" fill="${shade(c, -40)}" stroke="${c}" stroke-width="2"/>
  <circle cx="20" cy="14.5" r="6.5" fill="${c}"/>
  <path d="M7 34 C8 25 14 22.5 20 22.5 C26 22.5 32 25 33 34 C28 38.5 12 38.5 7 34 Z" fill="${c}"/>
</svg>`;
}
