// ============================================================
// screens.js — Telas principais: menu, novo jogo, home, partida,
// elenco, jogador, táticas
// ============================================================
import { App, icon, toast, openModal, closeModal, confirmBox, go, esc, money, num, crest, avatar, ovrBadge, posBadge, formPill, meter, clubCell, setLive, stopLive, goalSound, autosave, t, renderRoute } from './ui.js';
import * as G from './game.js';
import { simMatch } from './engine.js';
import { FORMATIONS, MENTALITIES, PRESSING, LINES, STYLES, POSITIONS, POS_ORDER, LEAGUES, COUNTRIES, CLUBS, NAT_LABELS } from './data.js';
import { clamp, makeRng } from './util.js';

const S = () => App.state;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Avança uma semana com spinner
export function advanceWeek(afterRoute = 'home') {
  const el = document.getElementById('screen');
  el.innerHTML = `<div class="sim-loading"><div class="spinner"></div><div class="muted">Simulando semana ${S().week}…</div></div>`;
  setTimeout(() => {
    const r = G.simWeek(S());
    autosave();
    if (r.seasonEnded) toast('🏁 Temporada encerrada! Veja os campeões em Estatísticas.');
    go(afterRoute);
    renderRoute();
  }, 60);
}

// Barra de ação "jogar / avançar"
export function playBarHTML() {
  const uf = G.getUserFixtures(S());
  if (uf.length) return `<button class="btn primary big block" data-act="play">${icon('play')} Jogar partida (${uf.length} nesta semana)</button>`;
  return `<button class="btn primary big block" data-act="advance">${icon('refresh')} Não há jogos esta semana — Avançar semana</button>`;
}
export function playBarMount(el) {
  el.querySelector('[data-act=play]')?.addEventListener('click', () => go('match'));
  el.querySelector('[data-act=advance]')?.addEventListener('click', () => advanceWeek('home'));
}

// ============================================================
// MENU PRINCIPAL
// ============================================================
export const menuScreen = {
  html() {
    const slots = App.storage ? G.saveSlots(App.storage) : {};
    const hasAuto = !!slots.auto;
    return `
    <div class="menu-wrap">
      <div class="menu-logo"><img src="public/favicon.svg" width="86" height="86" alt="FM26"></div>
      <div class="menu-title">FUTEBOL<br><span>MANAGER 26</span></div>
      <p class="menu-sub">192 clubes • 4.600+ jogadores • simulação minuto a minuto<br>O manager definitivo no seu navegador.</p>
      <div class="menu-buttons">
        ${hasAuto ? `<button class="btn primary big" data-m="continue">${icon('play')} Continuar — ${esc(slots.auto.clubName)} (S${slots.auto.season})</button>` : ''}
        <button class="btn ${hasAuto ? '' : 'primary'} big" data-m="new">${icon('plus')} Novo Jogo</button>
        <button class="btn" data-m="load">${icon('save')} Carregar Save</button>
        <button class="btn" data-m="settings">${icon('gear')} Configurações</button>
        <button class="btn" data-m="credits">${icon('info')} Créditos</button>
      </div>
      <div class="menu-foot">v1.0 • Dados de jogadores fictícios gerados proceduralmente • Progresso salvo no seu navegador</div>
    </div>`;
  },
  mount(el) {
    el.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => {
      const m = b.dataset.m;
      if (m === 'continue') App.onContinue && App.onContinue();
      else if (m === 'new') go('new');
      else go(m);
    });
  },
};

// ============================================================
// NOVO JOGO (assistente)
// ============================================================
const wizard = { country: 'br', league: 'br1', clubId: null, manager: '' };
export const newGameScreen = {
  html() {
    const countries = COUNTRIES.filter((c) => LEAGUES.some((l) => l.country === c.id && CLUBS[l.id]));
    const leagues = LEAGUES.filter((l) => l.country === wizard.country && CLUBS[l.id]);
    if (!leagues.some((l) => l.id === wizard.league)) wizard.league = leagues[0]?.id;
    const clubs = (CLUBS[wizard.league] || []).map((row, idx) => ({
      id: `${wizard.league}_${idx}`, name: row[0], short: row[1], city: row[2], colors: [row[3], row[4]], rep: row[5], stadium: row[6], country: wizard.country, leagueId: wizard.league,
    }));
    const sel = clubs.find((c) => c.id === wizard.clubId);
    return `
    <div class="menu-wrap" style="max-width:640px;text-align:left">
      <div style="text-align:center;margin-bottom:18px">
        <div class="menu-title" style="font-size:1.7rem">NOVO <span>JOGO</span></div>
        <p class="menu-sub" style="margin:6px 0 0">Escolha seu clube e comece sua dinastia.</p>
      </div>
      <div class="card stack">
        <div>
          <div class="h-sec">1. País</div>
          <div class="chips" id="ng-countries">${countries.map((c) => `<button class="chip ${wizard.country === c.id ? 'active' : ''}" data-c="${c.id}">${esc(c.name)}</button>`).join('')}</div>
        </div>
        <div>
          <div class="h-sec">2. Liga</div>
          <div class="chips" id="ng-leagues">${leagues.map((l) => `<button class="chip ${wizard.league === l.id ? 'active' : ''}" data-l="${l.id}">${esc(l.name)}</button>`).join('')}</div>
        </div>
        <div>
          <div class="h-sec">3. Clube</div>
          <div class="club-list" id="ng-clubs">${clubs.map((c) => `
            <button class="club-card ${wizard.clubId === c.id ? 'sel' : ''}" data-club="${c.id}">
              ${crest(c, 44)}
              <div style="flex:1;min-width:0"><div class="cn">${esc(c.name)}</div><div class="cm">${esc(c.city)} • ${esc(c.stadium)} • Rep ${'★'.repeat(Math.max(1, Math.round(c.rep / 20)))}</div></div>
              ${wizard.clubId === c.id ? icon('check') : ''}
            </button>`).join('')}</div>
        </div>
        <div>
          <div class="h-sec">4. Seu nome de treinador</div>
          <input class="input" id="ng-manager" maxlength="24" placeholder="Ex.: Carlos Nascimento" value="${esc(wizard.manager)}">
        </div>
        <button class="btn primary big block" id="ng-start" ${sel ? '' : 'disabled'}>${icon('play')} Começar carreira ${sel ? `no ${esc(sel.name)}` : ''}</button>
        <button class="btn ghost block" data-back>${icon('back')} Voltar ao menu</button>
      </div>
    </div>`;
  },
  mount(el) {
    el.querySelectorAll('#ng-countries [data-c]').forEach((b) => b.onclick = () => { wizard.country = b.dataset.c; wizard.clubId = null; renderRoute(); });
    el.querySelectorAll('#ng-leagues [data-l]').forEach((b) => b.onclick = () => { wizard.league = b.dataset.l; wizard.clubId = null; renderRoute(); });
    el.querySelectorAll('#ng-clubs [data-club]').forEach((b) => b.onclick = () => { wizard.clubId = b.dataset.club; renderRoute(); });
    el.querySelector('[data-back]').onclick = () => go('menu');
    const nameInp = el.querySelector('#ng-manager');
    nameInp.oninput = () => { wizard.manager = nameInp.value; };
    el.querySelector('#ng-start').onclick = () => {
      if (!wizard.clubId) return;
      const name = (wizard.manager || '').trim() || 'Treinador';
      App.onNewGame && App.onNewGame(wizard.clubId, name);
    };
  },
};

// ============================================================
// HOME
// ============================================================
export const homeScreen = {
  html() {
    const s = S();
    const club = s.db.clubs[s.clubId];
    const next = G.nextUserFixture(s);
    const nextOpp = next ? (next.fixture.home === s.clubId ? s.db.clubs[next.fixture.away] : s.db.clubs[next.fixture.home]) : null;
    const leagueComp = s.competitions.find((c) => c.type === 'league' && c.teams.includes(s.clubId) && c.id.startsWith('L_'));
    const table = leagueComp ? G.leagueTable(s, leagueComp) : [];
    const myPos = table.findIndex((r) => r.clubId === s.clubId) + 1;
    const squad = G.clubPlayers(s.db, s.clubId);
    const avgMorale = Math.round(squad.reduce((x, p) => x + p.morale, 0) / squad.length);
    const top8 = table.filter((r, i) => i < 6 || r.clubId === s.clubId);
    const news = s.news.slice(0, 7);
    return `
    <div class="home-grid">
      <div class="stack">
        <div class="card">
          <div class="h-sec">${t('next')}</div>
          ${next ? `
          <div class="live-score" style="cursor:pointer" data-go-match>
            <div class="live-team">${crest(s.db.clubs[next.fixture.home], 52)}<span>${esc(s.db.clubs[next.fixture.home].short)}</span></div>
            <div><div class="pill gold">Semana ${next.fixture.week}</div><div style="font-weight:900;font-size:1.1rem;margin-top:8px">${esc(next.comp.name)}</div><div class="tiny muted">Rodada ${next.fixture.round}</div></div>
            <div class="live-team">${crest(s.db.clubs[next.fixture.away], 52)}<span>${esc(s.db.clubs[next.fixture.away].short)}</span></div>
          </div>` : `<div class="empty">${icon('calendar')}<div>Todas as partidas da temporada foram jogadas.</div></div>`}
          <div style="margin-top:14px">${playBarHTML()}</div>
        </div>
        <div class="grid cols-4">
          <div class="card kpi"><div class="v">${myPos ? myPos + 'º' : '—'}</div><div class="l">Posição</div></div>
          <div class="card kpi"><div class="v">${avgMorale}</div><div class="l">Moral</div></div>
          <div class="card kpi"><div class="v">${squad.length}</div><div class="l">Jogadores</div></div>
          <div class="card kpi"><div class="v" style="color:${s.finances.balance < 0 ? 'var(--red)' : 'inherit'}">${money(s.finances.balance)}</div><div class="l">Caixa</div></div>
        </div>
        <div class="card">
          <div class="h-sec">Últimas notícias</div>
          ${news.length ? news.map((n) => `<div class="news-item"><span class="wk">S${n.week}</span><span>${esc(n.text)}</span></div>`).join('') : '<div class="empty">Sem notícias.</div>'}
        </div>
      </div>
      <div class="stack">
        <div class="card">
          <div class="h-sec">${leagueComp ? esc(leagueComp.name) : 'Liga'} <button class="btn small ghost" style="float:right" data-go="table">Completa</button></div>
          <div class="table-wrap"><table class="data" style="min-width:0">
            <thead><tr><th>#</th><th>Clube</th><th class="num">P</th><th class="num">V</th><th class="num">SG</th></tr></thead>
            <tbody>${top8.map((r) => {
              const i = table.indexOf(r);
              return `<tr class="${r.clubId === s.clubId ? 'me' : i < 4 ? 'promo' : ''}"><td>${i + 1}</td><td>${clubCell(s, r.clubId)}</td><td class="num">${r.pts}</td><td class="num">${r.w}</td><td class="num">${r.gd}</td></tr>`;
            }).join('')}</tbody></table></div>
        </div>
        <div class="card">
          <div class="h-sec">Escuderia</div>
          <div style="display:flex;gap:12px;align-items:center">
            ${crest(club, 60)}
            <div style="flex:1">
              <div style="font-weight:900;font-size:1.1rem">${esc(club.name)}</div>
              <div class="tiny muted">${esc(club.stadium)} (${num(club.capacity)}) • ${esc(club.city)}</div>
              <div style="margin-top:8px">${meter('Entrosamento', Math.round(s.chemistry))}</div>
              <div style="margin-top:6px">${meter('Treinador nv. ' + s.manager.level, s.manager.xp % 300, 300)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },
  mount(el) {
    playBarMount(el);
    el.querySelector('[data-go-match]')?.addEventListener('click', () => go('match'));
    el.querySelector('[data-go=table]')?.addEventListener('click', () => go('table'));
  },
};

// ============================================================
// PARTIDA (pré-jogo, ao vivo, fim de jogo)
// ============================================================
function matchSide(state, clubId) {
  const side = G.userMatchSide(state, clubId);
  side.name = state.db.clubs[clubId].name;
  side.short = state.db.clubs[clubId].short;
  return side;
}

export const matchScreen = {
  html() {
    const s = S();
    const uf = G.getUserFixtures(s)[0];
    if (!uf) {
      return `<div class="card" style="max-width:560px;margin:0 auto;text-align:center">
        <div class="h-sec">Central de partidas</div>
        <div class="empty">${icon('check')}<div style="font-weight:700;margin:6px 0 2px">Sem jogos do seu time nesta semana.</div><div class="tiny muted">Avance para ver os resultados das outras equipes.</div></div>
        <button class="btn primary big block" data-act="advance">${icon('refresh')} Avançar para semana ${s.week + 1}</button>
      </div>`;
    }
    const { comp, fixture } = uf;
    const h = s.db.clubs[fixture.home], a = s.db.clubs[fixture.away];
    const userHome = fixture.home === s.clubId;
    return `
    <div style="max-width:760px;margin:0 auto" class="stack" id="match-root">
      <div class="card" style="text-align:center">
        <div class="pill gold">${esc(comp.name)} • Rodada ${fixture.round} • Semana ${fixture.week}</div>
        <div class="live-score" style="margin-top:14px">
          <div class="live-team">${crest(h, 62)}<span>${esc(h.name)}</span></div>
          <div><div class="live-goals" id="lv-score">– × –</div><div class="live-min" id="lv-min">Pré-jogo</div></div>
          <div class="live-team">${crest(a, 62)}<span>${esc(a.name)}</span></div>
        </div>
        <div class="tiny muted" style="margin-top:10px">Você joga ${userHome ? 'em casa' : 'fora'} • ${esc(h.stadium)}${fixture.leg === 2 ? aggInfo(s, comp, fixture) : ''}${fixture.leg === 1 ? ' • confronto de ida e volta (1º jogo)' : ''}${fixture.neutral ? ' • 🏟️ campo neutro' : ''}</div>
      </div>
      <div class="card" id="lv-controls">
        <div class="h-sec">Como você quer jogar?</div>
        <div class="grid cols-2">
          <button class="btn primary big" data-act="live">${icon('play')} Assistir ao vivo</button>
          <button class="btn big" data-act="quick">${icon('refresh')} Resultado rápido</button>
        </div>
        <button class="btn ghost block" style="margin-top:10px" data-act="tactics">${icon('clipboard')} Revisar táticas antes</button>
      </div>
      <div id="lv-feed" class="card hidden"><div class="h-sec">Minuto a minuto</div><div class="feed" id="lv-feed-list"></div></div>
      <div id="lv-stats" class="card hidden"><div class="h-sec">Estatísticas</div><div id="lv-stats-body"></div></div>
      <div id="lv-end" class="hidden"></div>
    </div>`;
  },
  mount(el) {
    const s = S();
    el.querySelector('[data-act=advance]')?.addEventListener('click', () => advanceWeek('home'));
    const uf = G.getUserFixtures(s)[0];
    if (!uf) return;
    el.querySelector('[data-act=tactics]')?.addEventListener('click', () => go('tactics'));
    el.querySelector('[data-act=quick]')?.addEventListener('click', () => runUserMatch(uf, false));
    el.querySelector('[data-act=live]')?.addEventListener('click', () => runUserMatch(uf, true));
  },
};

function statsHTML(stats, hShort, aShort, frac = 1) {
  const row = (label, key) => {
    const hv = Math.round(stats[key].h * frac), av = Math.round(stats[key].a * frac);
    const total = hv + av || 1;
    return `<div class="stat-row"><div class="sr-head"><span>${hv}</span><span class="l">${label}</span><span>${av}</span></div>
      <div class="bar duo"><i class="home" style="width:${hv / total * 100}%"></i><i class="away" style="width:${av / total * 100}%"></i></div></div>`;
  };
  const poss = stats.possession;
  return `
    <div class="stat-row"><div class="sr-head"><span>${poss.h}%</span><span class="l">Posse de bola</span><span>${poss.a}%</span></div>
      <div class="bar duo"><i class="home" style="width:${poss.h}%"></i><i class="away" style="width:${poss.a}%"></i></div></div>
    ${row('Finalizações', 'shots')}${row('No alvo', 'shotsOn')}${row('Escanteios', 'corners')}${row('Faltas', 'fouls')}${row('Impedimentos', 'offsides')}
    <div class="tiny muted" style="text-align:center">${hShort} (verde) × ${aShort}</div>`;
}

function runUserMatch(uf, animated) {
  const s = S();
  const { comp, fixture } = uf;
  const home = matchSide(s, fixture.home);
  const away = matchSide(s, fixture.away);
  const neutral = ['SUP', 'MUN'].includes(comp.short) && comp.type === 'cup' && (comp.roundNames?.length === 1);
  const isLeg1 = fixture.leg === 1;
  const knockoutFlag = comp.type === 'cup' && !comp.friendly && (fixture.knockout !== undefined ? fixture.knockout : true) && !isLeg1;
  const res = simMatch(home, away, {
    seed: (Date.now() % 2147483647) ^ (fixture.id.length * 31),
    knockout: knockoutFlag,
    neutral: !!(neutral || fixture.neutral),
    narrative: true,
  });
  if (fixture.leg === 2) G.leg2Decide(s, comp, fixture, res);
  const el = document.getElementById('match-root');
  const scoreEl = el.querySelector('#lv-score');
  const minEl = el.querySelector('#lv-min');
  const feedCard = el.querySelector('#lv-feed');
  const feedList = el.querySelector('#lv-feed-list');
  const statsCard = el.querySelector('#lv-stats');
  const statsBody = el.querySelector('#lv-stats-body');
  const controls = el.querySelector('#lv-controls');
  const hShort = s.db.clubs[fixture.home].short, aShort = s.db.clubs[fixture.away].short;
  let gh = 0, ga = 0;
  const maxMin = res.extraTime ? 120 : 90;

  controls.innerHTML = `
    <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">
      <span class="pill green">${animated ? 'AO VIVO' : 'Fim de jogo'}</span>
      <span class="tiny muted">Clima: ${esc(res.weather)}</span>
      <div style="display:flex;gap:8px">
        <button class="btn small" data-spd="1">1x</button><button class="btn small" data-spd="2">2x</button><button class="btn small" data-spd="3">4x</button>
        <button class="btn small primary" data-skip>Pular ${icon('play')}</button>
      </div>
    </div>`;

  feedCard.classList.remove('hidden');
  statsCard.classList.remove('hidden');

  const eventsByMin = {};
  res.events.forEach((e) => { (eventsByMin[e.min] = eventsByMin[e.min] || []).push(e); });
  const feedItem = (e) => {
    const div = document.createElement('div');
    div.className = `feed-item ${e.type === 'goal' ? 'goal' : e.type}`;
    div.innerHTML = `<span class="min">${e.min}'</span><span>${esc(e.text)}</span>`;
    return div;
  };
  const revealMin = (min) => {
    (eventsByMin[min] || []).forEach((e) => {
      if (e.type === 'goal') {
        if (e.side === 'h') gh++; else ga++;
        scoreEl.textContent = `${gh} × ${ga}`;
        scoreEl.classList.remove('goal-flash'); void scoreEl.offsetWidth; scoreEl.classList.add('goal-flash');
        goalSound();
      }
      feedList.prepend(feedItem(e));
      if (feedList.children.length > 60) feedList.lastChild.remove();
    });
    statsBody.innerHTML = statsHTML(res.stats, hShort, aShort, Math.min(min / maxMin, 1));
  };

  const finish = () => {
    stopLive();
    minEl.textContent = 'Fim de jogo' + (res.penalties ? ` • Pênaltis ${res.penalties.h}-${res.penalties.a}` : '');
    minEl.classList.remove('blink');
    controls.classList.add('hidden');
    G.applyUserResult(s, comp.id, fixture.id, res);
    autosave();
    const winClub = res.home > res.away ? fixture.home : res.away > res.home ? fixture.away : (res.penalties ? (res.penalties.winner === 'h' ? fixture.home : fixture.away) : null);
    const userWon = winClub === s.clubId;
    const more = G.getUserFixtures(s).length > 0;
    const motmP = res.motm ? s.db.players[res.motm] : null;
    const endEl = el.querySelector('#lv-end');
    endEl.classList.remove('hidden');
    endEl.innerHTML = `
      <div class="card" style="text-align:center">
        <div style="font-size:2rem">${userWon ? '🎉' : winClub ? '😞' : '🤝'}</div>
        <div style="font-weight:900;font-size:1.3rem;margin:6px 0">${userWon ? 'Vitória!' : winClub ? 'Derrota' : 'Empate'}</div>
        <div class="muted">${esc(comp.name)}: ${hShort} ${res.home} × ${res.away} ${aShort}${res.penalties ? ` (pên. ${res.penalties.h}–${res.penalties.a})` : ''}</div>
        ${motmP ? `<div style="margin-top:10px"><span class="pill gold">⭐ Melhor em campo: ${esc(motmP.name)}</span></div>` : ''}
        <div style="margin-top:16px;display:flex;gap:10px;flex-direction:column">
          ${more ? `<button class="btn primary big" data-next>${icon('play')} Próxima partida de hoje</button>` : `<button class="btn primary big" data-adv>${icon('refresh')} Avançar semana</button>`}
          <a class="btn ghost" href="#/home">${icon('home')} Voltar ao início</a>
        </div>
      </div>`;
    endEl.querySelector('[data-next]')?.addEventListener('click', () => renderRoute());
    endEl.querySelector('[data-adv]')?.addEventListener('click', () => advanceWeek('home'));
  };

  if (!animated) {
    for (let m = 1; m <= maxMin; m++) revealMin(m);
    scoreEl.textContent = `${res.home} × ${res.away}`;
    statsBody.innerHTML = statsHTML(res.stats, hShort, aShort, 1);
    finish();
    return;
  }
  // Animação
  let min = 0;
  let speed = (s.settings.speed || 2);
  const tickMs = () => [220, 120, 60][clamp(speed - 1, 0, 2)];
  const live = { timer: null };
  setLive(live);
  minEl.classList.add('blink');
  const step = () => {
    min++;
    minEl.textContent = min <= 90 ? `${min}'` : `${min}' (prorrogação)`;
    revealMin(min);
    if (min >= maxMin) { scoreEl.textContent = `${res.home} × ${res.away}`; finish(); }
  };
  live.timer = setInterval(step, tickMs());
  controls.querySelector('[data-skip]').onclick = () => {
    stopLive();
    for (let m = min + 1; m <= maxMin; m++) revealMin(m);
    scoreEl.textContent = `${res.home} × ${res.away}`;
    statsBody.innerHTML = statsHTML(res.stats, hShort, aShort, 1);
    finish();
  };
  controls.querySelectorAll('[data-spd]').forEach((b) => b.onclick = () => {
    speed = Number(b.dataset.spd);
    if (live.timer) { clearInterval(live.timer); live.timer = setInterval(step, tickMs()); }
  });
}

// ============================================================
// ELENCO
// ============================================================
const squadFilter = { pos: 'all', sort: 'ovr' };
export const squadScreen = {
  html() {
    const s = S();
    let players = G.clubPlayers(s.db, s.clubId);
    if (squadFilter.pos !== 'all') players = players.filter((p) => p.pos === squadFilter.pos);
    const sortFns = {
      ovr: (a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || b.ovr - a.ovr,
      age: (a, b) => a.age - b.age,
      salary: (a, b) => b.salary - a.salary,
      value: (a, b) => b.value - a.value,
      form: (a, b) => b.form - a.form,
      pot: (a, b) => b.pot - a.pot,
    };
    players.sort(sortFns[squadFilter.sort] || sortFns.ovr);
    const wages = G.clubPlayers(s.db, s.clubId).reduce((x, p) => x + p.salary, 0);
    return `
    <div class="stack">
      <div class="card" style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;justify-content:space-between">
        <div class="seg" id="sq-pos">${['all', 'G', 'D', 'M', 'A'].map((p) => `<button class="chip ${squadFilter.pos === p ? 'active' : ''}" data-p="${p}">${p === 'all' ? 'Todos' : POSITIONS[p] + 's'}</button>`).join('')}</div>
        <div style="display:flex;gap:10px;align-items:center">
          <select class="input" id="sq-sort" style="min-height:40px;width:auto">
            ${[['ovr', 'Posição/Overall'], ['pot', 'Potencial'], ['age', 'Idade'], ['value', 'Valor'], ['salary', 'Salário'], ['form', 'Forma']].map(([v, l]) => `<option value="${v}" ${squadFilter.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          <span class="pill">Folha: ${money(wages)}/sem</span>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap"><table class="data">
          <thead><tr><th>#</th><th></th><th>Jogador</th><th>Pos</th><th class="num">Idade</th><th class="num">OVR</th><th class="num">POT</th><th class="num">Forma</th><th class="num">Moral</th><th class="num">Valor</th><th>Status</th></tr></thead>
          <tbody>${players.map((p) => {
            const status = p.injuredWeeks > 0 ? `<span class="pill red">🤕 ${p.injuredWeeks}sem</span>` : p.suspended > 0 ? '<span class="pill red">🟥 suspenso</span>' : p.listed ? '<span class="pill yellow">à venda</span>' : p.contractYears <= 1 ? '<span class="pill yellow">contrato no fim</span>' : '<span class="pill green">ok</span>';
            return `<tr data-pid="${p.id}" style="${p.injuredWeeks > 0 ? 'opacity:.55' : ''}">
              <td class="muted">${p.number}</td><td>${avatar(p, 30)}</td>
              <td><b>${esc(p.name)}</b><div class="tiny muted">${esc(countryName(s, p.country))} • pé ${p.foot}</div></td>
              <td>${posBadge(p.pos)}</td><td class="num">${p.age}</td>
              <td class="num">${ovrBadge(p.ovr)}</td><td class="num">${ovrBadge(p.pot)}</td>
              <td class="num">${formPill(p.form)}</td><td class="num">${p.morale}</td>
              <td class="num">${money(p.value)}</td><td>${status}</td></tr>`;
          }).join('')}</tbody></table></div>
      </div>
    </div>`;
  },
  mount(el) {
    el.querySelectorAll('#sq-pos [data-p]').forEach((b) => b.onclick = () => { squadFilter.pos = b.dataset.p; renderRoute(); });
    el.querySelector('#sq-sort').onchange = (e) => { squadFilter.sort = e.target.value; renderRoute(); };
    el.querySelectorAll('tr[data-pid]').forEach((r) => r.onclick = () => go(`player/${r.dataset.pid}`));
  },
};

export function countryName(s, id) { return COUNTRIES.find((c) => c.id === id)?.name || NAT_LABELS[id] || (id ? String(id).toUpperCase() : '—'); }
export function leagueName(id) { return LEAGUES.find((l) => l.id === id)?.name || id; }

// ============================================================
// PERFIL DO JOGADOR + EDITOR
// ============================================================
export const playerScreen = {
  html(params) {
    const s = S();
    const p = s.db.players[params[0]];
    if (!p) return `<div class="card empty">Jogador não encontrado.</div>`;
    const club = p.clubId ? s.db.clubs[p.clubId] : null;
    const mine = p.clubId === s.clubId;
    const avgRating = p.stats.games ? (p.stats.ratingSum / p.stats.games).toFixed(1) : '—';
    return `
    <div class="stack" style="max-width:820px;margin:0 auto">
      <div class="card">
        <div class="player-hero">
          ${avatar(p, 74)}
          <div class="pinfo">
            <h2>${esc(p.name)}</h2>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center">
              ${posBadge(p.pos)} ${ovrBadge(p.ovr)} <span class="pill">Pot ${p.pot}</span> <span class="pill">${p.age} anos</span>
              ${p.injuredWeeks > 0 ? `<span class="pill red">🤕 lesionado ${p.injuredWeeks} sem</span>` : ''}
              ${p.loan ? `<span class="pill blue">emprestado</span>` : ''}
            </div>
            <div class="tiny muted" style="margin-top:7px">${club ? `${crest(club, 18)} ${esc(club.name)}` : 'Sem clube (agente livre)'} • ${esc(countryName(s, p.country))} • ${p.height}cm • ${p.weight}kg • Nº ${p.number}</div>
          </div>
        </div>
      </div>
      <div class="grid cols-2">
        <div class="card">
          <div class="h-sec">Atributos</div>
          ${meter('Overall', p.ovr)}<div style="height:8px"></div>
          ${meter('Potencial', p.pot)}<div style="height:8px"></div>
          ${meter('Forma', p.form)}<div style="height:8px"></div>
          ${meter('Moral', p.morale)}<div style="height:8px"></div>
          ${meter('Físico', p.fitness)}<div style="height:8px"></div>
          ${meter('Experiência', Math.min(p.xp, 99))}
        </div>
        <div class="card">
          <div class="h-sec">Temporada ${s.year}</div>
          <div class="attr-grid">
            <div class="attr-box"><div class="v">${p.stats.games}</div><div class="l">Jogos</div></div>
            <div class="attr-box"><div class="v">${p.stats.goals}</div><div class="l">Gols</div></div>
            <div class="attr-box"><div class="v">${p.stats.assists}</div><div class="l">Assist.</div></div>
            <div class="attr-box"><div class="v">${avgRating}</div><div class="l">Nota</div></div>
            <div class="attr-box"><div class="v">${p.stats.yellow}🟨/${p.stats.red}🟥</div><div class="l">Cartões</div></div>
            <div class="attr-box"><div class="v">${p.stats.cleanSheets}</div><div class="l">Sem sofrer</div></div>
          </div>
          <div class="h-sec" style="margin-top:16px">Contrato</div>
          <div class="attr-grid">
            <div class="attr-box"><div class="v">${money(p.value)}</div><div class="l">Valor</div></div>
            <div class="attr-box"><div class="v">${money(p.salary)}</div><div class="l">Salário/sem</div></div>
            <div class="attr-box"><div class="v">${p.contractYears > 0 ? p.contractYears + ' ano(s)' : 'vencendo'}</div><div class="l">Contrato</div></div>
            <div class="attr-box"><div class="v">${esc(p.personality)}</div><div class="l">Personalidade</div></div>
          </div>
        </div>
      </div>
      ${mine ? `
      <div class="card">
        <div class="h-sec">Ações</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" data-act="renew">${icon('edit')} Renovar (+12%)</button>
          <button class="btn ${p.listed ? 'danger' : ''}" data-act="list">${icon('cart')} ${p.listed ? 'Retirar da lista' : 'Listar p/ venda'}</button>
          ${p.age <= 23 ? `<button class="btn" data-act="loan">${icon('handshake')} Emprestar</button>` : ''}
          <button class="btn" data-act="edit">${icon('edit')} Editar jogador</button>
        </div>
      </div>` : ''}
      <div class="card">
        <div class="h-sec">Carreira e histórico</div>
        <div class="tiny muted" style="margin-bottom:10px">Carreira: ${p.career.games} jogos, ${p.career.goals} gols, ${p.career.assists} assistências</div>
        ${p.history.length ? `<div class="table-wrap"><table class="data" style="min-width:0"><thead><tr><th>Temp</th><th>Clube</th><th class="num">J</th><th class="num">G</th><th class="num">A</th></tr></thead>
        <tbody>${p.history.slice().reverse().map((h) => `<tr><td>${h.year}</td><td>${s.db.clubs[h.clubId] ? clubCell(s, h.clubId) : '—'}</td><td class="num">${h.games}</td><td class="num">${h.goals}</td><td class="num">${h.assists}</td></tr>`).join('')}</tbody></table></div>` : '<div class="tiny muted">Primeira temporada registrada.</div>'}
      </div>
      <button class="btn ghost" data-back>${icon('back')} Voltar</button>
    </div>`;
  },
  mount(el, params) {
    const s = S();
    const p = s.db.players[params[0]];
    el.querySelector('[data-back]').onclick = () => history.back();
    el.querySelector('[data-act=renew]')?.addEventListener('click', () => {
      const r = G.renewContract(s, p.id);
      toast(r.ok ? `✍️ ${esc(p.name)} renovou por 3 anos.` : (r.msg || 'Não foi possível renovar.'), r.ok ? 'ok' : 'error');
      autosave(); renderRoute();
    });
    el.querySelector('[data-act=list]')?.addEventListener('click', () => {
      G.listPlayerForSale(s, p.id, !p.listed);
      toast(p.listed ? `${esc(p.name)} colocado na lista de transferências.` : `${esc(p.name)} retirado da lista.`);
      autosave(); renderRoute();
    });
    el.querySelector('[data-act=loan]')?.addEventListener('click', () => {
      const r = G.loanOut(s, p.id);
      toast(r.ok ? `🔁 Emprestado ao ${esc(r.to)}.` : (r.msg || 'Sem interessados.'), r.ok ? 'ok' : 'error');
      autosave(); renderRoute();
    });
    el.querySelector('[data-act=edit]')?.addEventListener('click', () => openPlayerEditor(p));
  },
};

export function openPlayerEditor(p) {
  const m = openModal(`
    <div class="modal-title">${icon('edit')} Editar jogador</div>
    <div class="field"><label>Nome</label><input class="input" id="ed-name" maxlength="30" value="${esc(p.name)}"></div>
    <div class="grid cols-2">
      <div class="field"><label>Posição</label><select class="input" id="ed-pos">${POS_ORDER.map((x) => `<option ${p.pos === x ? 'selected' : ''} value="${x}">${POSITIONS[x]}</option>`).join('')}</select></div>
      <div class="field"><label>Número</label><input class="input" type="number" min="1" max="99" id="ed-num" value="${p.number}"></div>
    </div>
    <div class="field"><label>Overall: <b id="ed-ovr-v">${p.ovr}</b></label><input class="input" type="range" min="40" max="99" id="ed-ovr" value="${p.ovr}"></div>
    <div class="field"><label>Potencial: <b id="ed-pot-v">${p.pot}</b></label><input class="input" type="range" min="40" max="99" id="ed-pot" value="${p.pot}"></div>
    <div class="field"><label>Moral: <b id="ed-mor-v">${p.morale}</b></label><input class="input" type="range" min="20" max="99" id="ed-mor" value="${p.morale}"></div>
    <div class="field"><label>Físico: <b id="ed-fit-v">${p.fitness}</b></label><input class="input" type="range" min="40" max="100" id="ed-fit" value="${p.fitness}"></div>
    <div class="field"><label>Foto (opcional)</label><input class="input" type="file" id="ed-photo" accept="image/*" style="padding:11px"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn ghost" data-c>Cancelar</button><button class="btn primary" data-s>${icon('check')} Salvar</button></div>
  `);
  const bindRange = (id) => {
    const i = m.querySelector(`#ed-${id}`), v = m.querySelector(`#ed-${id}-v`);
    i.oninput = () => v.textContent = i.value;
  };
  ['ovr', 'pot', 'mor', 'fit'].forEach(bindRange);
  m.querySelector('[data-c]').onclick = closeModal;
  m.querySelector('[data-s]').onclick = () => {
    p.name = m.querySelector('#ed-name').value.trim() || p.name;
    p.pos = m.querySelector('#ed-pos').value;
    p.number = clamp(Number(m.querySelector('#ed-num').value) || p.number, 1, 99);
    p.ovr = Number(m.querySelector('#ed-ovr').value);
    p.pot = Math.max(Number(m.querySelector('#ed-pot').value), p.ovr);
    p.morale = Number(m.querySelector('#ed-mor').value);
    p.fitness = Number(m.querySelector('#ed-fit').value);
    p.value = (App.revalue ? App.revalue(p.ovr, p.age, p.pot) : p.value);
    const file = m.querySelector('#ed-photo').files[0];
    const done = () => { closeModal(); toast('Jogador atualizado.'); autosave(); renderRoute(); };
    if (file) resizeImage(file, 96, (dataUrl) => { p.photo = dataUrl; done(); });
    else done();
  };
}

export function resizeImage(file, size, cb) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const min = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
    cb(c.toDataURL('image/jpeg', 0.82));
  };
  img.src = URL.createObjectURL(file);
}

// ============================================================
// TÁTICAS
// ============================================================
function pitchCoords(formation) {
  const f = FORMATIONS.find((x) => x.id === formation) || FORMATIONS[0];
  const rows = [['A', f.a, 13], ['M', f.m, 40], ['D', f.d, 66], ['G', 1, 88]];
  const out = [];
  for (const [pos, n, y] of rows) {
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 50 : 12 + (i / (n - 1)) * 76;
      out.push({ pos, x, y, idx: i });
    }
  }
  return out;
}

export const tacticsScreen = {
  html() {
    const s = S();
    const tc = s.tactics;
    const coords = pitchCoords(tc.formation);
    const lineups = { G: [], D: [], M: [], A: [] };
    for (const k of POS_ORDER) lineups[k] = (tc.lineup[k] || []).map((id) => s.db.players[id]).filter(Boolean);
    const getSlot = (pos, idx) => lineups[pos][idx];
    const squad = G.clubPlayers(s.db, s.clubId);
    return `
    <div class="home-grid">
      <div class="stack">
        <div class="card">
          <div class="h-sec">Formação — ${tc.formation}</div>
          <div class="pitch">
            ${coords.map((c) => {
              const p = getSlot(c.pos, c.idx);
              return `<div class="pitch-dot" style="left:${c.x}%;top:${c.y}%" data-slot="${c.pos}:${c.idx}">
                <div class="dot">${p ? p.number : '+'}</div>
                <div class="pname">${p ? esc(p.name.split(' ').slice(-1)[0]) : 'vazio'}</div>
                ${p ? `<div class="tiny" style="margin-top:-2px">${ovrBadge(p.ovr)}</div>` : ''}
              </div>`;
            }).join('')}
          </div>
          <div class="tiny muted" style="margin-top:10px;text-align:center">Toque em uma posição para trocar o jogador.</div>
        </div>
        <div class="card">
          <div class="h-sec">Formações</div>
          <div class="chips">${FORMATIONS.map((f) => `<button class="chip ${tc.formation === f.id ? 'active' : ''}" data-form="${f.id}">${f.id}</button>`).join('')}</div>
          <div style="margin-top:12px;display:flex;gap:10px"><button class="btn" data-auto>${icon('refresh')} Escalação automática</button></div>
        </div>
      </div>
      <div class="stack">
        <div class="card">
          <div class="h-sec">Estilo de jogo</div>
          <div class="field"><label>Mentalidade</label><div class="seg">${MENTALITIES.map((m, i) => `<button class="chip ${tc.mentality === i ? 'active' : ''}" data-tac="mentality:${i}">${m}</button>`).join('')}</div></div>
          <div class="field"><label>Pressão</label><div class="seg">${PRESSING.map((m, i) => `<button class="chip ${tc.pressing === i ? 'active' : ''}" data-tac="pressing:${i}">${m}</button>`).join('')}</div></div>
          <div class="field"><label>Linha defensiva</label><div class="seg">${LINES.map((m, i) => `<button class="chip ${tc.line === i ? 'active' : ''}" data-tac="line:${i}">${m}</button>`).join('')}</div></div>
          <div class="field"><label>Estilo</label><div class="seg">${STYLES.map((m, i) => `<button class="chip ${tc.style === i ? 'active' : ''}" data-tac="style:${i}">${m}</button>`).join('')}</div></div>
        </div>
        <div class="card">
          <div class="h-sec">Funções especiais</div>
          <div class="field"><label>Capitão</label><select class="input" data-role="captain">${squad.map((p) => `<option value="${p.id}" ${tc.captain === p.id ? 'selected' : ''}>${p.number} — ${esc(p.name)} (${p.pos})</option>`).join('')}</select></div>
          <div class="field"><label>Batedor de pênaltis</label><select class="input" data-role="penalties">${squad.map((p) => `<option value="${p.id}" ${tc.penalties === p.id ? 'selected' : ''}>${esc(p.name)} (${p.ovr})</option>`).join('')}</select></div>
          <div class="field"><label>Batedor de escanteios</label><select class="input" data-role="corners">${squad.map((p) => `<option value="${p.id}" ${tc.corners === p.id ? 'selected' : ''}>${esc(p.name)} (${p.pos})</option>`).join('')}</select></div>
        </div>
        <div class="card">
          <div class="h-sec">Reservas imediatos</div>
          <div class="tiny muted" style="margin-bottom:8px">Melhores fora do time titular</div>
          ${benchList(s)}
        </div>
      </div>
    </div>`;
  },
  mount(el) {
    const s = S();
    el.querySelectorAll('[data-form]').forEach((b) => b.onclick = () => {
      s.tactics.formation = b.dataset.form;
      autoFillLineup(s);
      autosave(); renderRoute();
    });
    el.querySelector('[data-auto]').onclick = () => { autoFillLineup(s); toast('Melhor escalação aplicada.'); autosave(); renderRoute(); };
    el.querySelectorAll('[data-tac]').forEach((b) => b.onclick = () => {
      const [k, v] = b.dataset.tac.split(':');
      s.tactics[k] = Number(v);
      autosave(); renderRoute();
    });
    el.querySelectorAll('[data-role]').forEach((sel) => sel.onchange = () => { s.tactics[sel.dataset.role] = sel.value; autosave(); });
    el.querySelectorAll('[data-slot]').forEach((dot) => dot.onclick = () => {
      const [pos, idx] = dot.dataset.slot.split(':');
      pickSlotPlayer(s, pos, Number(idx));
    });
  },
};

function benchList(s) {
  const used = new Set();
  for (const k of POS_ORDER) (s.tactics.lineup[k] || []).forEach((id) => used.add(id));
  const bench = G.clubPlayers(s.db, s.clubId).filter((p) => !used.has(p.id))
    .sort((a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || b.ovr - a.ovr).slice(0, 7);
  return bench.map((p) => `<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid rgba(35,49,82,.5)">
    ${avatar(p, 28)}<span style="flex:1;font-weight:600">${esc(p.name)}</span>${posBadge(p.pos)}${ovrBadge(p.ovr)}
  </div>`).join('') || '<div class="tiny muted">—</div>';
}

function autoFillLineup(s) {
  const lineup = G.pickBestLineup(G.availablePlayers(s.db, s.clubId), s.tactics.formation);
  for (const k of POS_ORDER) s.tactics.lineup[k] = lineup[k].map((p) => p.id);
}

function pickSlotPlayer(s, pos, idx) {
  const tc = s.tactics;
  const currentIds = new Set();
  for (const k of POS_ORDER) (tc.lineup[k] || []).forEach((id) => currentIds.add(id));
  const opts = G.clubPlayers(s.db, s.clubId).filter((p) => p.pos === pos && p.injuredWeeks <= 0 && p.suspended <= 0)
    .sort((a, b) => b.ovr - a.ovr);
  const outPos = G.clubPlayers(s.db, s.clubId).filter((p) => !currentIds.has(p.id) && p.injuredWeeks <= 0 && p.suspended <= 0 && p.pos !== pos).sort((a, b) => b.ovr - a.ovr).slice(0, 4);
  const m = openModal(`
    <div class="modal-title">${icon('users')} Escolher ${POSITIONS[pos]}</div>
    <div class="stack" style="max-height:56dvh;overflow-y:auto">
      ${opts.map((p) => `<button class="club-card" data-pick="${p.id}">${avatar(p, 34)}<div style="flex:1"><div class="cn">${esc(p.name)}</div><div class="cm">Forma ${p.form} • Moral ${p.morale} • Físico ${p.fitness}${currentIds.has(p.id) ? ' • (titular)' : ''}</div></div>${ovrBadge(p.ovr)}</button>`).join('')}
      ${outPos.length ? `<div class="h-sec" style="margin-top:8px">Fora de posição</div>${outPos.map((p) => `<button class="club-card" data-pick="${p.id}">${avatar(p, 34)}<div style="flex:1"><div class="cn">${esc(p.name)}</div><div class="cm">${POSITIONS[p.pos]} improvisado</div></div>${ovrBadge(p.ovr)}</button>`).join('')}` : ''}
    </div>`);
  m.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => {
    // remove o mesmo jogador de outro slot, se estiver escalado
    for (const k of POS_ORDER) tc.lineup[k] = (tc.lineup[k] || []).filter((id) => id !== b.dataset.pick);
    tc.lineup[pos] = tc.lineup[pos] || [];
    tc.lineup[pos][idx] = b.dataset.pick;
    s.chemistry = clamp(s.chemistry - 0.3, 40, 98);
    closeModal(); autosave(); renderRoute();
  });
}

function aggInfo(s, comp, fixture) {
  const tie = comp.fixtures.filter((x) => x.tieId === fixture.tieId);
  const l1 = tie.find((x) => x.leg === 1);
  if (!l1 || !l1.played) return '';
  return ` • jogo de volta (ida: ${esc(s.db.clubs[l1.home].short)} ${l1.gh}×${l1.ga} ${esc(s.db.clubs[l1.away].short)})`;
}
