// ============================================================
// screens2.js — Calendário, tabelas, copas, mercado, finanças,
// clube, base, treinador, estatísticas, ranking, amistosos,
// campeonato personalizado, editor, saves, config, créditos, inbox
// ============================================================
import { App, icon, toast, openModal, closeModal, confirmBox, go, esc, money, num, crest, avatar, ovrBadge, posBadge, clubCell, autosave, applySettingsToBody, renderRoute, tone } from './ui.js';
import * as G from './game.js';
import { LEAGUES, COUNTRIES, POSITIONS, POS_ORDER } from './data.js';
import { downloadFile, readUploadedFile, compressText, decompressText } from './saveio.js';
import { resizeImage, advanceWeek, playBarHTML, playBarMount, countryName, leagueName, refDateInfo } from './screens.js';
import { clamp } from './util.js';

const S = () => {
  const s = App.state;
  if (s && s.settings) {
    const isInfinite = s.settings.infiniteMoney === true || s.settings.infiniteMoney === 'true';
    if (isInfinite) {
      const val = (s.settings.infiniteMoneyValue !== undefined) ? Number(s.settings.infiniteMoneyValue) : 999999999;
      if (s.finances.balance !== val) {
        s.finances.balance = val;
      }
    }
  }
  return s;
};

// ============================================================
// CALENDÁRIO — mês, temporada, janelas e detalhes do jogo
// ============================================================
let calWeek = null;
let calMonth = 1;
let calView = 'month'; // 'month' | 'season'
let calComp = 'all';

// Janelas de transferência em semanas (espelho de transferWindowOpen)
const CAL_WINDOWS = [[1, 6], [20, 24]];

function calFixtureById(s, key) {
  const [compId, fixtureId] = key.split('|');
  const comp = s.competitions.find((c) => c.id === compId);
  const fixture = comp?.fixtures.find((f) => f.id === fixtureId);
  return comp && fixture ? { comp, fixture } : null;
}

function openFixtureModal(s, key) {
  const found = calFixtureById(s, key);
  if (!found) return;
  const { comp, fixture } = found;
  const h = s.db.clubs[fixture.home], a = s.db.clubs[fixture.away];
  const date = refDateInfo(fixture.week, s.year);
  const isUser = fixture.home === s.clubId || fixture.away === s.clubId;
  const canPlay = isUser && !fixture.played && fixture.week === s.week;
  const winner = fixture.played ? (fixture.gh > fixture.ga ? fixture.home : fixture.ga > fixture.gh ? fixture.away : (fixture.pen?.winner === 'h' ? fixture.home : fixture.pen?.winner === 'a' ? fixture.away : null)) : null;
  const userResult = fixture.played && isUser ? (winner === s.clubId ? 'Vitória' : winner ? 'Derrota' : 'Empate') : null;
  const m = openModal(`
    <div class="modal-title">${icon('trophy')} ${esc(comp.name)}</div>
    <div class="tiny muted" style="margin:-6px 0 12px">${esc(comp.roundNames?.[fixture.round - 1] || `Rodada ${fixture.round || 1}`)} · Semana ${fixture.week} · ${esc(date.weekday)} ${esc(date.day)} de ${esc(date.month.toLowerCase())}</div>
    <div class="fx-modal">
      <div class="fx-team ${winner === fixture.home ? 'winner' : ''}">${crest(h, 54)}<strong>${esc(h.short)}</strong><small>${fixture.home === s.clubId ? 'Você' : 'Mandante'}</small></div>
      <div class="fx-score">${fixture.played ? `${fixture.gh} × ${fixture.ga}` : '—'}${fixture.pen ? `<small>pên ${fixture.pen.h}-${fixture.pen.a}</small>` : ''}</div>
      <div class="fx-team ${winner === fixture.away ? 'winner' : ''}">${crest(a, 54)}<strong>${esc(a.short)}</strong><small>${fixture.away === s.clubId ? 'Você' : 'Visitante'}</small></div>
    </div>
    <div class="tiny muted" style="text-align:center;margin:10px 0 4px">${fixture.neutral ? '🏟️ Campo neutro' : `🏟️ ${esc(h.stadium)}`} · ${esc(h.city || '')}${userResult ? ` · <b class="fx-res ${userResult === 'Vitória' ? 'win' : userResult === 'Derrota' ? 'loss' : ''}">${userResult}</b>` : ''}${fixture.leg ? ` · Jogo ${fixture.leg}${fixture.leg === 2 ? ' (decisão)' : ' (ida)'}` : ''}</div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap">
      ${canPlay ? `<button class="btn primary" data-play-now>${icon('play')} Jogar agora</button>` : ''}
      ${!fixture.played && !canPlay ? `<span class="pill">${fixture.week > s.week ? `Agendado — faltam ${fixture.week - s.week} sem.` : 'Aguardando simulação'}</span>` : ''}
      <button class="btn ghost" data-close-x>Fechar</button>
    </div>`);
  m.querySelector('[data-play-now]')?.addEventListener('click', () => { closeModal(); go('match'); });
  m.querySelector('[data-close-x]').onclick = closeModal;
}

export const calendarScreen = {
  html() {
    const s = S();
    const next = G.nextUserFixture(s);
    const club = s.db.clubs[s.clubId];
    const monthDate = new Date(Date.UTC(s.year, calMonth, 1));
    const daysInMonth = new Date(Date.UTC(s.year, calMonth + 1, 0)).getUTCDate();
    const firstDay = monthDate.getUTCDay();
    const base = Date.UTC(s.year, 0, 2);
    const weekStartDay = (wk) => new Date(base + Math.max(0, wk - 1) * 7 * 86400000);
    const compFilter = (comp) => calComp === 'all' || comp.id === calComp;
    const events = {};
    const seasonFixtures = [];
    for (const comp of s.competitions) {
      if (!compFilter(comp)) continue;
      for (const fixture of comp.fixtures) {
        if (fixture.home !== s.clubId && fixture.away !== s.clubId) continue;
        seasonFixtures.push({ comp, fixture });
        const date = weekStartDay(fixture.week);
        if (date.getUTCFullYear() !== s.year || date.getUTCMonth() !== calMonth) continue;
        const day = date.getUTCDate();
        (events[day] = events[day] || []).push({ comp, fixture });
      }
    }
    seasonFixtures.sort((a, b) => a.fixture.week - b.fixture.week || (a.fixture.round || 0) - (b.fixture.round || 0));
    // O mês inteiro cai dentro de alguma janela aberta?
    const inWindow = (dayDate) => CAL_WINDOWS.some(([w1, w2]) => {
      const d1 = weekStartDay(w1), d2 = new Date(weekStartDay(w2).getTime() + 6 * 86400000);
      return dayDate >= d1 && dayDate <= d2;
    });
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const weekdays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push('<div class="ref-calendar-day is-empty"></div>');
    for (let day = 1; day <= daysInMonth; day++) {
      const entries = events[day] || [];
      const dayDate = new Date(Date.UTC(s.year, calMonth, day));
      const marketOpen = inWindow(dayDate);
      cells.push(`<div class="ref-calendar-day ${entries.length ? 'has-event' : ''} ${marketOpen ? 'open-window' : ''}"><b class="ref-calendar-number">${day}${marketOpen ? '<i class="win-dot" title="Janela de transferências aberta"></i>' : ''}</b>${entries.map(({ comp, fixture }) => {
        const opponent = s.db.clubs[fixture.home === s.clubId ? fixture.away : fixture.home];
        return `<button class="ref-calendar-event" data-fx="${comp.id}|${fixture.id}"><strong>${fixture.home === s.clubId ? 'CAS' : 'FOR'} · ${esc(opponent.short)}</strong><small>${icon('trophy')} ${fixture.played ? `${fixture.gh} × ${fixture.ga}` : `18:00 · ${esc(comp.short || comp.name)}`}</small></button>`;
      }).join('')}</div>`);
    }
    while (cells.length % 7) cells.push('<div class="ref-calendar-day is-empty"></div>');
    const nextDate = next ? refDateInfo(next.fixture.week, s.year) : null;
    const nextHome = next ? s.db.clubs[next.fixture.home] : null;
    const nextAway = next ? s.db.clubs[next.fixture.away] : null;
    const nextIsHome = next?.fixture.home === s.clubId;
    // Estado real das janelas
    const windowOpen = G.transferWindowOpen(s);
    const nextWindowWeek = s.week < CAL_WINDOWS[0][0] ? CAL_WINDOWS[0][0] : (s.week > CAL_WINDOWS[0][1] && s.week < CAL_WINDOWS[1][0]) ? CAL_WINDOWS[1][0] : (s.week > CAL_WINDOWS[1][1] ? CAL_WINDOWS[0][0] : null);
    const windowState = windowOpen ? 'JANELA ABERTA' : 'JANELA FECHADA';
    const windowLabel = (wk, end) => { const d = refDateInfo(wk, s.year); return end ? `${d.short.toLowerCase()}` : d.short.toLowerCase(); };
    const myComps = s.competitions.filter((c) => c.teams.includes(s.clubId) || c.custom || c.friendly);

    return `
    <div class="ref-calendar">
      <header class="ref-page-nav"><button class="ref-back-button" data-ref-back>${icon('back')} <span>Voltar à central</span></button><span class="ref-page-nav-title">${icon('calendar')} CALENDÁRIO</span><span></span></header>
      <section class="ref-calendar-hero">
        <div class="ref-calendar-brand">${crest(club, 76)}<div><span class="ref-eyebrow">TEMPORADA ${s.year}</span><h1>Calendário.</h1><p>Jogos, mandos, competições e períodos de recuperação.</p></div></div>
        <div class="ref-origin">${icon('calendar')}<span><b>ORIGEM</b><strong>Tabela oficial</strong></span></div>
      </section>

      <section class="ref-card ref-calendar-next ref-action" data-go-match tabindex="0">
        <div><span class="ref-section-label">PRÓXIMO JOGO</span><h2>${nextDate ? `${nextDate.day} de ${nextDate.month.toLowerCase()} · 18:00` : 'Agenda livre'}</h2><p>${next ? `${icon('trophy')} ${esc(next.comp.name)} · ${next.fixture.round || 1}/${next.comp.fixtures.length || 1}` : 'Nenhum compromisso pendente.'}</p></div>
        ${next ? `<div class="ref-calendar-matchup"><span>${crest(nextHome, 50)}<b>${esc(nextHome.short)}</b></span><strong>×</strong><span><b>${esc(nextAway.short)}</b>${crest(nextAway, 50)}</span></div><div class="ref-calendar-location"><b>${nextIsHome ? 'CASA' : 'FORA'}</b><strong>${esc(nextIsHome ? club.stadium : nextHome.stadium)}</strong></div>` : ''}
      </section>

      <section class="ref-calendar-filters">
        <div class="ref-calendar-tabs">
          <button class="${calView === 'month' ? 'active' : ''}" data-view="month">Mês</button>
          <button class="${calView === 'season' ? 'active' : ''}" data-view="season">Temporada</button>
        </div>
        <span>${icon('sliders')}</span>
        <select data-calcomp>
          <option value="all" ${calComp === 'all' ? 'selected' : ''}>Todas as competições</option>
          ${myComps.map((c) => `<option value="${c.id}" ${calComp === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
      </section>

      <section class="ref-card ref-transfer-windows">
        <div class="ref-card-head"><span class="ref-section-label">${icon('cart')} MERCADO DE TRANSFERÊNCIAS</span><h2>Janelas da temporada</h2><span class="ref-window-state ${windowOpen ? 'open' : ''}">${windowState}</span></div>
        <div class="ref-window-grid">
          <div><b>1ª JANELA</b><strong>${windowLabel(CAL_WINDOWS[0][0])} <small>até</small> ${windowLabel(CAL_WINDOWS[0][1])}</strong><em>${s.week > CAL_WINDOWS[0][1] ? 'ENCERRADA' : s.week >= CAL_WINDOWS[0][0] ? 'ABERTA AGORA' : `EM ${CAL_WINDOWS[0][0] - s.week} SEM.`}</em></div>
          <div><b>2ª JANELA</b><strong>${windowLabel(CAL_WINDOWS[1][0])} <small>até</small> ${windowLabel(CAL_WINDOWS[1][1])}</strong><em>${s.week > CAL_WINDOWS[1][1] ? 'ENCERRADA' : s.week >= CAL_WINDOWS[1][0] ? 'ABERTA AGORA' : (nextWindowWeek === CAL_WINDOWS[1][0] ? `EM ${CAL_WINDOWS[1][0] - s.week} SEM.` : 'FUTURA')}</em></div>
        </div>
        <div class="ref-window-foot"><span><i class="win-dot"></i> Dias com selo laranja indicam mercado aberto no calendário.</span><span>Propostas só são aceitas com a janela <b>aberta</b>.</span></div>
      </section>

      ${calView === 'month' ? `
      <section class="ref-card ref-month-card">
        <div class="ref-month-head"><button class="ref-month-button" data-month="-1">${icon('back')}</button><h2>${monthNames[calMonth]} <b>${s.year}</b></h2><button class="ref-month-button" data-month="1">${icon('back')}</button></div>
        <div class="ref-calendar-grid"><div class="ref-calendar-weekdays">${weekdays.map((d) => `<b>${d}</b>`).join('')}</div><div class="ref-calendar-cells">${cells.join('')}</div></div>
      </section>` : `
      <section class="ref-card ref-season-card">
        <div class="ref-card-head"><span class="ref-section-label">${icon('calendar')} TEMPORADA COMPLETA</span><h2>Todos os jogos <small>${seasonFixtures.length} compromissos</small></h2></div>
        <div class="ref-season-list">
          ${seasonFixtures.map(({ comp, fixture }) => {
            const d = refDateInfo(fixture.week, s.year);
            const opp = s.db.clubs[fixture.home === s.clubId ? fixture.away : fixture.home];
            const isHome = fixture.home === s.clubId;
            const played = fixture.played;
            const gf = isHome ? fixture.gh : fixture.ga, ga = isHome ? fixture.ga : fixture.gh;
            const resCls = played ? (gf > ga ? 'win' : gf < ga ? 'loss' : 'draw') : (fixture.week === s.week ? 'now' : '');
            return `<button class="ref-season-row ${resCls}" data-fx="${comp.id}|${fixture.id}">
              <b class="rs-date">${d.day} ${d.month.slice(0, 3)}</b>
              <span class="rs-opp">${crest(opp, 30)}<span><strong>${esc(opp.name)}</strong><small>${isHome ? 'Casa' : 'Fora'} · ${esc(comp.short || comp.name)}${fixture.leg ? ` · jogo ${fixture.leg}` : ''}</small></span></span>
              <em class="rs-res">${played ? `${gf} × ${ga}` : (fixture.week === s.week ? 'HOJE' : `S${fixture.week}`)}</em>
            </button>`;
          }).join('') || '<div class="ref-empty-small">Nenhum compromisso nesta competição.</div>'}
        </div>
      </section>`}
      <div class="ref-calendar-action">${playBarHTML()}</div>
    </div>`;
  },
  mount(el) {
    el.querySelector('[data-ref-back]')?.addEventListener('click', () => go('home'));
    el.querySelectorAll('[data-month]').forEach((b) => b.onclick = () => { calMonth = Math.max(0, Math.min(11, calMonth + Number(b.dataset.month))); renderRoute(); });
    el.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => { calView = b.dataset.view; renderRoute(); });
    el.querySelector('[data-calcomp]')?.addEventListener('change', (e) => { calComp = e.target.value; renderRoute(); });
    el.querySelectorAll('[data-fx]').forEach((b) => b.onclick = () => { const s = S(); openFixtureModal(s, b.dataset.fx); });
    el.querySelector('[data-go-match]')?.addEventListener('click', () => go('match'));
    el.querySelector('[data-go-match]')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') go('match'); });
    playBarMount(el);
  },
};

// ============================================================
// TABELAS (todas as ligas)
// ============================================================
export const tableScreen = {
  html(params) {
    const s = S();
    const myLeagueId = s.db.clubs[s.clubId].leagueId;
    const showId = params[0] || myLeagueId;
    const comp = s.competitions.find((c) => c.type === 'league' && c.id.includes(`L_${showId}_`));
    const league = LEAGUES.find((l) => l.id === showId);
    const table = comp ? G.leagueTable(s, comp) : [];
    const rel = league?.relegation || 0;
    return `
    <div class="stack">
      <div class="card"><div class="seg" style="flex-wrap:wrap">${LEAGUES.map((l) => `<button class="chip ${showId === l.id ? 'active' : ''}" data-l="${l.id}">${esc(l.name)}</button>`).join('')}</div></div>
      <div class="card">
        <div class="h-sec">${esc(league?.name || '')} — ${s.year}</div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>#</th><th>Clube</th><th class="num">P</th><th class="num">J</th><th class="num">V</th><th class="num">E</th><th class="num">D</th><th class="num">GP</th><th class="num">GC</th><th class="num">SG</th></tr></thead>
          <tbody>${table.map((r, i) => `<tr class="${r.clubId === s.clubId ? 'me' : i < 4 ? 'promo' : rel && i >= table.length - rel ? 'releg' : ''}" data-club="${r.clubId}">
            <td>${i + 1}</td><td>${clubCell(s, r.clubId)}</td><td class="num"><b>${r.pts}</b></td><td class="num">${r.played}</td><td class="num">${r.w}</td><td class="num">${r.d}</td><td class="num">${r.l}</td><td class="num">${r.gf}</td><td class="num">${r.ga}</td><td class="num">${r.gd}</td>
          </tr>`).join('')}</tbody></table></div>
        <div class="tiny muted" style="margin-top:10px"><span class="pill green"> continental</span> ${rel ? `<span class="pill red"> rebaixamento</span>` : ''}</div>
      </div>
    </div>`;
  },
  mount(el) {
    el.querySelectorAll('[data-l]').forEach((b) => b.onclick = () => go(`table/${b.dataset.l}`));
  },
};

// ============================================================
// COPAS (brackets das competições do usuário)
// ============================================================
export const cupsScreen = {
  html() {
    const s = S();
    const cups = s.competitions.filter((c) => c.type === 'cup' && (c.teams.includes(s.clubId) || c.custom));
    const others = s.competitions.filter((c) => c.type === 'cup' && !c.teams.includes(s.clubId) && !c.custom && !c.friendly && !c.singleMatch);
    const bracket = (comp) => {
      const rounds = {};
      comp.fixtures.forEach((f) => { (rounds[f.round] = rounds[f.round] || []).push(f); });
      const rKeys = Object.keys(rounds).map(Number).sort((a, b) => a - b);
      return rKeys.map((r) => `
        <div class="bracket-round"><div class="br-title">${comp.roundNames?.[r - 1] || 'Fase ' + r}</div>
        ${rounds[r].map((f) => `
          <div class="tie">
            <div>
              <span class="${f.played && winnerOf(f) === f.home ? 'winner' : ''}">${clubCell(s, f.home)}</span>
              <b style="margin:0 5px">×</b>
              <span class="${f.played && winnerOf(f) === f.away ? 'winner' : ''}">${clubCell(s, f.away)}</span>
            </div>
            <div class="tscore">${f.played ? `${f.gh} × ${f.ga}${f.pen ? ` <span class="tiny muted">pên ${f.pen.h}-${f.pen.a}</span>` : ''}` : `<span class="pill">S${f.week}</span>`}</div>
            ${f.leg ? `<div class="tiny muted" style="grid-column:1/-1">${f.leg === 1 ? 'Jogo de ida' : `Jogo de volta${aggLabel(comp, f)}`}</div>` : ''}
          </div>`).join('')}
        </div>`).join('');
    };
    function winnerOf(f) { return f.gh > f.ga ? f.home : f.ga > f.gh ? f.away : (f.pen?.winner === 'h' ? f.home : f.away); }
    function aggLabel(comp, f) {
      const tie = comp.fixtures.filter((x) => x.tieId === f.tieId);
      const l1 = tie.find((x) => x.leg === 1), l2 = tie.find((x) => x.leg === 2);
      if (!l1 || !l2 || !l1.played) return '';
      const agg1 = l1.gh + (l2.played ? l2.ga : 0), agg2 = l1.ga + (l2.played ? l2.gh : 0);
      return ` • agregado ${agg1}–${agg2}`;
    }
    return `
    <div class="stack">
      ${cups.length ? cups.map((comp) => `
        <div class="card">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            ${icon('trophy')}<b style="font-size:1.05rem">${esc(comp.name)}</b>
            ${comp.friendly ? '<span class="pill blue">amistoso</span>' : ''}${comp.custom ? '<span class="pill gold">personalizada</span>' : ''}
            ${comp.status === 'finished' && comp.champion ? `<span class="pill gold" style="margin-left:auto">🏆 ${esc(s.db.clubs[comp.champion].short)}</span>` : `<span class="pill green" style="margin-left:auto">em andamento</span>`}
          </div>
          ${bracket(comp) || '<div class="tiny muted">Aguardando sorteio.</div>'}
        </div>`).join('') : '<div class="card empty">Você não disputa copas nesta temporada.</div>'}
      ${others.length ? `<div class="card"><div class="h-sec">Outras copas no mundo</div><div class="chips" style="flex-wrap:wrap">${others.map((c) => `<span class="pill">${esc(c.short)}${c.champion ? ` 🏆 ${esc(s.db.clubs[c.champion].short)}` : ''}</span>`).join('')}</div></div>` : ''}
    </div>`;
  },
};

// ============================================================
// MERCADO
// ============================================================
const mkt = { tab: 'buy', pos: 'all', q: '', limit: 40 };
export const marketScreen = {
  html() {
    const s = S();
    const open = G.transferWindowOpen(s);
    let body = '';
    if (mkt.tab === 'buy') {
      const list = G.marketList(s, { pos: mkt.pos === 'all' ? null : mkt.pos, search: mkt.q }).slice(0, mkt.limit);
      body = `
        <div class="card" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <input class="input" id="mk-q" placeholder="Buscar jogador…" value="${esc(mkt.q)}" style="flex:1;min-width:160px;min-height:42px">
          <div class="seg">${['all', 'G', 'D', 'M', 'A'].map((p) => `<button class="chip ${mkt.pos === p ? 'active' : ''}" data-mpos="${p}">${p === 'all' ? 'Todos' : p}</button>`).join('')}</div>
        </div>
        <div class="card"><div class="table-wrap"><table class="data">
          <thead><tr><th></th><th>Jogador</th><th>Pos</th><th class="num">OVR</th><th class="num">POT</th><th class="num">Idade</th><th class="num">Pedida</th><th></th></tr></thead>
          <tbody>${list.map((p) => `
            <tr><td>${avatar(p, 28)}</td>
            <td><b>${esc(p.name)}</b><div class="tiny muted">${clubCell(s, p.clubId, 18)}</div></td>
            <td>${posBadge(p.pos)}</td><td class="num">${ovrBadge(p.ovr)}</td><td class="num">${ovrBadge(p.pot)}</td><td class="num">${p.age}</td>
            <td class="num">${money(G.askingPrice(s, p))}</td>
            <td><button class="btn small" data-offer="${p.id}" ${open ? '' : 'disabled'}>Propor</button></td></tr>`).join('')}</tbody></table></div>
          <div style="text-align:center;margin-top:12px"><button class="btn ghost" data-more>${icon('plus')} Carregar mais</button></div>
        </div>`;
    } else if (mkt.tab === 'sell') {
      const mine = G.clubPlayers(s.db, s.clubId).sort((a, b) => b.value - a.value);
      const bids = s.market.offers.filter((o) => s.db.players[o.playerId]);
      body = `
        ${bids.length ? `<div class="card"><div class="h-sec">Ofertas recebidas (leilão)</div>${bids.map((o) => {
          const p = s.db.players[o.playerId]; const buyer = s.db.clubs[o.fromClubId];
          return `<div class="inbox-item" style="margin-bottom:10px"><div class="it-title">${esc(buyer.name)} → ${esc(p.name)}: ${money(o.fee)}</div>
            <div class="tiny muted">expira na semana ${o.expires}</div>
            <div class="inbox-actions">
              <button class="btn small primary" data-bid="${o.id}:accept">Vender</button>
              <button class="btn small" data-bid="${o.id}:counter">Negociar +15%</button>
              <button class="btn small danger" data-bid="${o.id}:reject">Recusar</button>
            </div></div>`;
        }).join('')}</div>` : ''}
        <div class="card"><div class="h-sec">Seu elenco — toque para listar/retirar</div><div class="table-wrap"><table class="data">
        <thead><tr><th></th><th>Jogador</th><th>Pos</th><th class="num">OVR</th><th class="num">Valor</th><th>Status</th></tr></thead>
        <tbody>${mine.map((p) => `<tr data-list="${p.id}"><td>${avatar(p, 28)}</td><td><b>${esc(p.name)}</b></td><td>${posBadge(p.pos)}</td><td class="num">${ovrBadge(p.ovr)}</td><td class="num">${money(p.value)}</td>
        <td>${p.listed ? '<span class="pill yellow">à venda</span>' : '<span class="pill">—</span>'}</td></tr>`).join('')}</tbody></table></div></div>`;
    } else if (mkt.tab === 'pending') {
      const pend = (s.market.pending || []);
      body = `<div class="card"><div class="h-sec">Negociações em andamento</div>
        ${pend.length ? pend.map((o) => {
          const p = s.db.players[o.playerId];
          if (!p) return '';
          return `<div class="inbox-item" style="margin-bottom:10px"><div class="it-title">${esc(p.name)} — ${p.clubId ? esc(s.db.clubs[p.clubId].short) : ''}</div>
          <div class="it-text">Sua oferta: ${money(o.fee)} • Pedida: ${money(o.asking)} • Status: ${o.status === 'accepted' ? '✅ aceita' : o.status === 'counter' ? '🔁 contraproposta' : 'aguardando (semana ' + o.responseWeek + ')'}</div>
          <div class="inbox-actions">
            ${o.status === 'accepted' ? `<button class="btn small primary" data-confirm="${o.id}">${icon('check')} Confirmar contratação</button>` : ''}
            ${o.status === 'counter' ? `<button class="btn small primary" data-reoffer="${o.id}">Oferecer ${money(o.asking)}</button>` : ''}
          </div></div>`;
        }).join('') : '<div class="empty">Nenhuma negociação em andamento.<br><span class="tiny">Envie propostas na aba Comprar.</span></div>'}</div>`;
    } else {
      const free = G.freeAgents(s);
      body = `<div class="card"><div class="h-sec">Agentes livres</div><div class="table-wrap"><table class="data">
        <thead><tr><th></th><th>Jogador</th><th>Pos</th><th class="num">OVR</th><th class="num">Idade</th><th class="num">Salário</th><th></th></tr></thead>
        <tbody>${free.map((p) => `<tr><td>${avatar(p, 28)}</td><td><b>${esc(p.name)}</b></td><td>${posBadge(p.pos)}</td><td class="num">${ovrBadge(p.ovr)}</td><td class="num">${p.age}</td><td class="num">${money(p.salary)}</td>
        <td><button class="btn small primary" data-sign="${p.id}" ${open ? '' : 'disabled'}>Contratar</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Nenhum agente livre.</td></tr>'}</tbody></table></div>
        <div class="tiny muted" style="margin-top:8px">Jogadores sem contrato renovado ao fim da temporada ficam livres no mercado.</div></div>`;
    }
    return `
    <div class="stack">
      <div class="card" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between">
        <div class="seg" id="mkt-tabs">
          ${[['buy', 'Comprar'], ['sell', 'Vender'], ['pending', `Negociações${(S().market.pending || []).length ? ` (${S().market.pending.length})` : ''}`], ['free', 'Livres']].map(([k, l]) => `<button class="chip ${mkt.tab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}
        </div>
        <span class="pill ${open ? 'green' : 'red'}">${open ? '🟢 Janela ABERTA' : '🔒 Janela fechada (semanas 1–6 e 20–24)'}</span>
      </div>
      ${body}
    </div>`;
  },
  mount(el) {
    const s = S();
    el.querySelectorAll('#mkt-tabs [data-tab]').forEach((b) => b.onclick = () => { mkt.tab = b.dataset.tab; renderRoute(); });
    el.querySelectorAll('[data-mpos]').forEach((b) => b.onclick = () => { mkt.pos = b.dataset.mpos; renderRoute(); });
    const q = el.querySelector('#mk-q');
    if (q) {
      let mqTimer = null;
      q.addEventListener('input', () => {
        clearTimeout(mqTimer);
        mqTimer = setTimeout(() => {
          mkt.q = q.value;
          renderRoute();
          setTimeout(() => { const nq = document.querySelector('#mk-q'); if (nq) { nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); } }, 30);
        }, 260);
      });
    }
    el.querySelector('[data-more]')?.addEventListener('click', () => { mkt.limit += 40; renderRoute(); });
    el.querySelectorAll('[data-offer]').forEach((b) => b.onclick = () => openOfferModal(b.dataset.offer));
    el.querySelectorAll('[data-list]').forEach((r) => r.onclick = () => {
      const p = s.db.players[r.dataset.list];
      G.listPlayerForSale(s, p.id, !p.listed);
      toast(p.listed ? `${esc(p.name)} está à venda.` : `${esc(p.name)} removido da lista.`);
      autosave(); renderRoute();
    });
    el.querySelectorAll('[data-bid]').forEach((b) => b.onclick = () => {
      const [id, act] = b.dataset.bid.split(':');
      G.respondBid(s, id, act);
      autosave(); renderRoute();
    });
    el.querySelectorAll('[data-confirm]').forEach((b) => b.onclick = () => {
      const r = G.confirmBuy(s, b.dataset.confirm);
      toast(r.ok ? '✅ Reforço confirmado!' : (r.msg || 'Falha na contratação.'), r.ok ? 'ok' : 'error');
      autosave(); renderRoute();
    });
    el.querySelectorAll('[data-reoffer]').forEach((b) => b.onclick = () => {
      const o = (s.market.pending || []).find((x) => x.id === b.dataset.reoffer);
      if (o) { o.fee = o.asking; o.responseWeek = s.week + 1; o.status = null; toast('Nova proposta enviada!'); autosave(); renderRoute(); }
    });
    el.querySelectorAll('[data-sign]').forEach((b) => b.onclick = () => {
      const r = G.signFreeAgent(s, b.dataset.sign);
      toast(r.ok ? '✅ Contratado sem custos de transferência!' : (r.msg || 'Falhou.'), r.ok ? 'ok' : 'error');
      autosave(); renderRoute();
    });
  },
};

function openOfferModal(playerId) {
  const s = S();
  const p = s.db.players[playerId];
  const ask = G.askingPrice(s, p);
  const min = Math.round(p.value * 0.6 / 10000) * 10000, max = Math.round(ask * 1.4 / 10000) * 10000;
  const m = openModal(`
    <div class="modal-title">${icon('cart')} Proposta por ${esc(p.name)}</div>
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">${avatar(p, 46)}<div><b>${esc(p.name)}</b><div class="tiny muted">${POSITIONS[p.pos]} • ${p.age} anos • OVR ${p.ovr} • ${esc(s.db.clubs[p.clubId].name)}</div></div></div>
    <div class="field"><label>Valor da transferência: <b id="of-fee-v">${money(Math.round((ask + min) / 2))}</b> <span class="tiny muted">(pedida ~ ${money(ask)})</span></label>
      <input class="input" type="range" id="of-fee" min="${min}" max="${max}" step="10000" value="${Math.round((ask + min) / 2)}"></div>
    <div class="field"><label>Salário semanal: <b id="of-wage-v">${money(Math.round(p.salary * 1.1))}</b></label>
      <input class="input" type="range" id="of-wage" min="${Math.round(p.salary * 0.9)}" max="${Math.round(p.salary * 2)}" step="1000" value="${Math.round(p.salary * 1.1)}"></div>
    <div class="tiny muted" style="margin-bottom:14px">O clube responde na próxima semana. Empresário cobra ~6% de comissão.</div>
    <div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn ghost" data-c>Cancelar</button><button class="btn primary" data-s>Enviar proposta</button></div>`);
  const fee = m.querySelector('#of-fee'), wage = m.querySelector('#of-wage');
  fee.oninput = () => m.querySelector('#of-fee-v').textContent = money(Number(fee.value));
  wage.oninput = () => m.querySelector('#of-wage-v').textContent = money(Number(wage.value));
  m.querySelector('[data-c]').onclick = closeModal;
  m.querySelector('[data-s]').onclick = () => {
    const r = G.makeOffer(s, playerId, Number(fee.value), Number(wage.value));
    closeModal();
    toast(r.ok ? '📨 Proposta enviada!' : (r.msg || 'Erro'), r.ok ? 'ok' : 'error');
    if (r.ok) autosave(); renderRoute();
  };
}

// ============================================================
// FINANÇAS
// ============================================================
export const financesScreen = {
  html() {
    const s = S();
    const club = s.db.clubs[s.clubId];
    const wages = G.clubPlayers(s.db, s.clubId).reduce((x, p) => x + p.salary, 0);
    const income = s.finances.ledger.filter((l) => l.value > 0).slice(0, 30).reduce((x, l) => x + l.value, 0);
    const out = s.finances.ledger.filter((l) => l.value < 0).slice(0, 30).reduce((x, l) => x - l.value, 0);
    return `
    <div class="stack" style="max-width:900px;margin:0 auto">
      <div class="grid cols-4">
        <div class="card kpi"><div class="v" style="color:${s.finances.balance < 0 ? 'var(--red)' : 'var(--accent)'}">${money(s.finances.balance)}</div><div class="l">Caixa atual</div></div>
        <div class="card kpi"><div class="v">${money(wages)}</div><div class="l">Folha/semana</div></div>
        <div class="card kpi"><div class="v">${money(Math.round(club.sponsor.value / 44))}</div><div class="l">Patrocínio/sem</div></div>
        <div class="card kpi"><div class="v">${num(club.capacity)}</div><div class="l">Capacidade</div></div>
      </div>
      <div class="card">
        <div class="h-sec">Patrocinador master</div>
        <div style="display:flex;align-items:center;gap:12px"><span class="pill gold" style="font-size:1rem">${esc(club.sponsor.name)}</span><span class="muted">${money(club.sponsor.value)} por temporada</span></div>
      </div>
      <div class="card">
        <div class="h-sec">Extrato recente <span class="pill green" style="float:right">+ ${money(income)}</span> <span class="pill red" style="float:right;margin-right:6px">− ${money(out)}</span></div>
        <div class="table-wrap"><table class="data" style="min-width:0">
          <thead><tr><th>Sem</th><th>Descrição</th><th class="num">Valor</th></tr></thead>
          <tbody>${s.finances.ledger.slice(0, 40).map((l) => `<tr><td class="muted">S${l.week}</td><td>${esc(l.desc)}</td><td class="num" style="color:${l.value < 0 ? 'var(--red)' : '#4ade80'};font-weight:700">${l.value < 0 ? '−' : '+'} ${money(Math.abs(l.value))}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
      <div class="card tiny muted">💡 Receitas: bilheteria (jogos em casa), patrocínio semanal, premiações e vendas de atletas. Despesas: folha salarial semanal, transferências e comissões de empresários.</div>
    </div>`;
  },
};

// ============================================================
// CLUBE
// ============================================================
export const clubScreen = {
  html() {
    const s = S();
    const c = s.db.clubs[s.clubId];
    const squad = G.clubPlayers(s.db, s.clubId);
    const avgOvr = Math.round(squad.reduce((x, p) => x + p.ovr, 0) / squad.length);
    return `
    <div class="stack" style="max-width:900px;margin:0 auto">
      <div class="card" style="text-align:center;padding:26px">
        ${crest(c, 110)}
        <div style="font-weight:900;font-size:1.5rem;margin-top:12px">${esc(c.name)}</div>
        <div class="muted">${esc(c.city)}, ${esc(countryName(s, c.country))} • fundado em ${c.founded}</div>
        <div class="pill gold" style="margin-top:10px">Reputação ${'★'.repeat(Math.max(1, Math.round(c.rep / 20)))} (${c.rep})</div>
      </div>
      <div class="grid cols-4">
        <div class="card kpi"><div class="v">${esc(c.stadium)}</div><div class="l">Estádio</div></div>
        <div class="card kpi"><div class="v">${num(c.capacity)}</div><div class="l">Capacidade</div></div>
        <div class="card kpi"><div class="v">${num(c.fans)}</div><div class="l">Torcedores</div></div>
        <div class="card kpi"><div class="v">${avgOvr}</div><div class="l">OVR médio</div></div>
      </div>
      <div class="grid cols-2">
        <div class="card"><div class="h-sec">Competição atual</div><div style="font-weight:700">${esc(leagueName(c.leagueId))}</div><div class="tiny muted">${c.tier === 2 ? 'Segunda divisão' : 'Primeira divisão'}</div></div>
        <div class="card"><div class="h-sec">Categorias de base</div>${`<div class="meter"><span class="tiny muted" style="min-width:70px">Nível</span><div class="bar"><i style="width:${c.youthLevel}%"></i></div><span class="val">${c.youthLevel}</span></div>`}<div class="tiny muted" style="margin-top:8px">Revelações chegam no início de cada temporada.</div></div>
      </div>
      <div class="card">
        <div class="h-sec">Títulos do clube (${c.titles.length})</div>
        ${c.titles.length ? `<div class="chips" style="flex-wrap:wrap">${c.titles.map((t) => `<span class="pill gold">${esc(t.comp)} ${t.year}</span>`).join('')}</div>` : '<div class="muted">Nenhum título conquistado ainda nesta carreira. Mude a história!</div>'}
      </div>
    </div>`;
  },
};

// ============================================================
// BASE / OLHEIROS
// ============================================================
export const youthScreen = {
  html() {
    const s = S();
    const club = s.db.clubs[s.clubId];
    const kids = G.clubPlayers(s.db, s.clubId).filter((p) => p.age <= 20).sort((a, b) => b.pot - a.pot);
    const invested = s.scoutSeason === s.season;
    return `
    <div class="stack" style="max-width:900px;margin:0 auto">
      <div class="card">
        <div class="h-sec">Categorias de base — ${esc(club.name)}</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
          <div style="flex:1;min-width:220px">
            <div class="meter"><span class="tiny muted" style="min-width:110px">Nível da base</span><div class="bar"><i style="width:${club.youthLevel}%"></i></div><span class="val">${club.youthLevel}</span></div>
            <div class="tiny muted" style="margin-top:8px">Todo início de temporada, 2–3 jovens são promovidos. O nível define a qualidade média das revelações.</div>
          </div>
          <button class="btn" data-scout ${invested ? 'disabled' : ''}>${icon('sprout')} ${invested ? 'Olheiros ativos' : 'Investir em olheiros (R$ 3 mi)'}</button>
        </div>
      </div>
      <div class="card">
        <div class="h-sec">Jóias do clube (sub-20)</div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th></th><th>Nome</th><th>Pos</th><th class="num">Idade</th><th class="num">OVR</th><th class="num">POT</th><th class="num">Valor</th><th></th></tr></thead>
          <tbody>${kids.map((p) => `<tr><td>${avatar(p, 28)}</td><td><b>${esc(p.name)}</b></td><td>${posBadge(p.pos)}</td><td class="num">${p.age}</td><td class="num">${ovrBadge(p.ovr)}</td><td class="num">${ovrBadge(p.pot)}</td><td class="num">${money(p.value)}</td>
            <td><button class="btn small" data-view="${p.id}">Ver</button></td></tr>`).join('') || '<tr><td colspan="8" class="muted">Nenhum jovem no elenco.</td></tr>'}</tbody></table></div>
        <div class="tiny muted" style="margin-top:10px">💎 Potencial acima de 82 indica uma possível joia mundial. Empreste jovens (tela do jogador) para evoluírem mais rápido.</div>
      </div>
    </div>`;
  },
  mount(el) {
    const s = S();
    el.querySelector('[data-scout]')?.addEventListener('click', () => {
      G.enforceInfiniteMoney(s);
      if (s.finances.balance < 3e6) { toast('Caixa insuficiente.', 'error'); return; }
      s.finances.balance -= 3e6;
      G.enforceInfiniteMoney(s);
      s.db.clubs[s.clubId].youthLevel = clamp(s.db.clubs[s.clubId].youthLevel + 3, 40, 99);
      s.scoutSeason = s.season;
      G.log(s, 'Investimento em olheiros', -3e6);
      toast('🔭 Olheiros contratados! A próxima leva da base será melhor.');
      autosave(); renderRoute();
    });
    el.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => go(`player/${b.dataset.view}`));
  },
};

// ============================================================
// TREINADOR
// ============================================================
export const managerScreen = {
  html() {
    const s = S();
    const m = s.manager;
    const xpPct = (m.xp % 300) / 300 * 100;
    return `
    <div class="stack" style="max-width:760px;margin:0 auto">
      <div class="card" style="text-align:center;padding:26px">
        <div style="width:84px;height:84px;border-radius:50%;margin:0 auto 12px;background:linear-gradient(135deg,var(--accent),var(--accent-2));display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:900;color:#07130b">${esc(m.name.split(' ').map((w) => w[0]).slice(0, 2).join(''))}</div>
        <div style="font-weight:900;font-size:1.4rem">${esc(m.name)}</div>
        <div class="muted">${esc(s.db.clubs[s.clubId].name)} • ${esc(countryName(s, m.country))}</div>
        <div class="pill gold" style="margin-top:10px">Nível ${m.level}</div>
      </div>
      <div class="card">
        <div class="h-sec">Evolução</div>
        <div class="meter"><span class="tiny muted" style="min-width:110px">Experiência</span><div class="bar"><i style="width:${xpPct}%"></i></div><span class="val">${m.xp}</span></div>
        <div style="height:10px"></div>
        <div class="meter"><span class="tiny muted" style="min-width:110px">Reputação</span><div class="bar"><i style="width:${m.rep}%"></i></div><span class="val">${Math.round(m.rep)}</span></div>
        <div class="tiny muted" style="margin-top:10px">Ganhe XP vencendo partidas (30), empatando (12) e conquistando títulos (+120–250). A cada nível, a moral do elenco sobe.</div>
      </div>
      <div class="card">
        <div class="h-sec">Conquistas (${m.titles.length})</div>
        ${m.titles.length ? `<div class="chips" style="flex-wrap:wrap">${m.titles.map((t) => `<span class="pill gold">🏆 ${esc(t.comp)} — T${t.season}</span>`).join('')}</div>` : '<div class="muted">Ainda sem títulos. A sala de troféus espera por você.</div>'}
      </div>
    </div>`;
  },
};

// ============================================================
// ESTATÍSTICAS (artilharia, histórico, recordes, hall da fama)
// ============================================================
let statsTab = 'scorers', statsComp = null;
export const statsScreen = {
  html() {
    const s = S();
    const comps = s.competitions.filter((c) => Object.keys(c.scorers || {}).length);
    if (!statsComp || !comps.some((c) => c.id === statsComp)) statsComp = comps[0]?.id;
    let body = '';
    if (statsTab === 'scorers') {
      const comp = comps.find((c) => c.id === statsComp);
      const rows = comp ? Object.entries(comp.scorers).sort((a, b) => b[1] - a[1]).slice(0, 15) : [];
      const as = comp ? Object.entries(comp.assists).sort((a, b) => b[1] - a[1]).slice(0, 10) : [];
      body = `
      <div class="card"><div class="seg" style="flex-wrap:wrap">${comps.map((c) => `<button class="chip ${c.id === statsComp ? 'active' : ''}" data-comp="${c.id}">${esc(c.short)}</button>`).join('')}</div></div>
      <div class="grid cols-2">
        <div class="card"><div class="h-sec">Artilharia ${comp ? '— ' + esc(comp.name) : ''}</div>
          ${rows.map(([pid, g], i) => { const p = s.db.players[pid]; return `<div class="hall-card" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="hall-num">${i + 1}</span>${p ? `${avatar(p, 30)}<div style="flex:1"><b>${esc(p.name)}</b><div class="tiny muted">${p.clubId ? esc(s.db.clubs[p.clubId]?.short || '') : ''}</div></div><span style="font-weight:900;font-size:1.15rem">${g}</span>` : '—'}</div>`; }).join('') || '<div class="muted">Sem gols ainda.</div>'}
        </div>
        <div class="card"><div class="h-sec">Assistências</div>
          ${as.map(([pid, g], i) => { const p = s.db.players[pid]; return `<div class="hall-card" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="hall-num">${i + 1}</span>${p ? `<div style="flex:1"><b>${esc(p.name)}</b><div class="tiny muted">${p.clubId ? esc(s.db.clubs[p.clubId]?.short || '') : ''}</div></div><span style="font-weight:900">${g}</span>` : '—'}</div>`; }).join('') || '<div class="muted">—</div>'}
        </div>
      </div>`;
    } else if (statsTab === 'history') {
      const byYear = {};
      s.history.champions.forEach((c) => { (byYear[c.year] = byYear[c.year] || []).push(c); });
      body = `<div class="card"><div class="h-sec">Histórico de campeões</div>
      ${Object.keys(byYear).sort((a, b) => b - a).map((y) => `
        <div style="margin-bottom:14px"><div class="pill gold">${y}</div>
        <div class="table-wrap" style="margin-top:8px"><table class="data" style="min-width:0"><tbody>
          ${byYear[y].map((c) => `<tr class="${c.clubId === s.clubId ? 'me' : ''}"><td>${esc(c.name)}</td><td>${clubCell(s, c.clubId)} <b>${esc(s.db.clubs[c.clubId]?.name || '')}</b></td></tr>`).join('')}
        </tbody></table></div></div>`).join('') || '<div class="muted">Temporada em andamento.</div>'}</div>`;
    } else if (statsTab === 'records') {
      const recs = Object.entries(s.history.records);
      body = `<div class="card"><div class="h-sec">Recordes (artilharia em uma temporada)</div>
        ${recs.map(([k, r]) => { const p = s.db.players[r.playerId]; return `<div class="hall-card" style="padding:10px 0;border-bottom:1px solid var(--line)">${icon('fire')}<div style="flex:1;margin-left:8px"><b>${esc(k.replace(/^L_|^C_|^CONT_/, ''))}</b><div class="tiny muted">${p ? esc(p.name) : '—'} em ${r.year}</div></div><span style="font-weight:900;color:var(--gold)">${r.goals} gols</span></div>`; }).join('') || '<div class="muted">Os recordes serão definidos ao fim da primeira temporada.</div>'}</div>`;
    } else {
      const topScorers = Object.values(s.db.players).sort((a, b) => b.career.goals - a.career.goals).slice(0, 10);
      const topAssists = Object.values(s.db.players).sort((a, b) => b.career.assists - a.career.assists).slice(0, 10);
      body = `<div class="grid cols-2">
        <div class="card"><div class="h-sec">⭐ Hall da Fama — Gols na carreira</div>
          ${topScorers.map((p, i) => `<div class="hall-card" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="hall-num">${i + 1}</span>${avatar(p, 30)}<div style="flex:1"><b>${esc(p.name)}</b><div class="tiny muted">${p.clubId ? esc(s.db.clubs[p.clubId]?.short || '') : ''} • ${p.pos}</div></div><span style="font-weight:900">${p.career.goals}</span></div>`).join('')}</div>
        <div class="card"><div class="h-sec">🎯 Assistências na carreira</div>
          ${topAssists.map((p, i) => `<div class="hall-card" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="hall-num">${i + 1}</span>${avatar(p, 30)}<div style="flex:1"><b>${esc(p.name)}</b><div class="tiny muted">${p.clubId ? esc(s.db.clubs[p.clubId]?.short || '') : ''} • ${p.pos}</div></div><span style="font-weight:900">${p.career.assists}</span></div>`).join('')}</div>
      </div>`;
    }
    return `
    <div class="stack">
      <div class="card"><div class="seg" id="stats-tabs">
        ${[['scorers', 'Artilharia'], ['history', 'Histórico'], ['records', 'Recordes'], ['hall', 'Hall da Fama']].map(([k, l]) => `<button class="chip ${statsTab === k ? 'active' : ''}" data-st="${k}">${l}</button>`).join('')}
      </div></div>
      ${body}
    </div>`;
  },
  mount(el) {
    el.querySelectorAll('[data-st]').forEach((b) => b.onclick = () => { statsTab = b.dataset.st; renderRoute(); });
    el.querySelectorAll('[data-comp]').forEach((b) => b.onclick = () => { statsComp = b.dataset.comp; renderRoute(); });
  },
};

// ============================================================
// RANKING MUNDIAL
// ============================================================
export const rankingScreen = {
  html() {
    const s = S();
    const rank = G.worldRanking(s).slice(0, 60);
    const myPos = G.worldRanking(s).findIndex((r) => r.clubId === s.clubId) + 1;
    return `
    <div class="stack" style="max-width:800px;margin:0 auto">
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div><div class="h-sec" style="margin:0">Ranking Mundial de Clubes</div><div class="tiny muted">Reputação + títulos conquistados</div></div>
        <span class="pill gold">Seu clube: #${myPos}</span>
      </div>
      <div class="card"><div class="table-wrap"><table class="data">
        <thead><tr><th>#</th><th>Clube</th><th>País</th><th class="num">Títulos</th><th class="num">Pontos</th></tr></thead>
        <tbody>${rank.map((r, i) => { const c = s.db.clubs[r.clubId]; return `<tr class="${r.clubId === s.clubId ? 'me' : ''}">
          <td>${i + 1}</td><td>${clubCell(s, r.clubId)} <b>${esc(c.name)}</b></td><td class="muted">${esc(countryName(s, c.country))}</td>
          <td class="num">${c.titles.length} 🏆</td><td class="num"><b>${num(r.score)}</b></td></tr>`; }).join('')}</tbody></table></div></div>
    </div>`;
  },
};

// ============================================================
// AMISTOSOS
// ============================================================
const fri = { q: '', opp: null, weekOffset: 1 };
export const friendliesScreen = {
  html() {
    const s = S();
    const q = fri.q.toLowerCase();
    const opts = Object.values(s.db.clubs).filter((c) => c.id !== s.clubId && (!q || c.name.toLowerCase().includes(q) || c.short.toLowerCase().includes(q))).slice(0, 14);
    const opp = fri.opp ? s.db.clubs[fri.opp] : null;
    const scheduled = s.competitions.filter((c) => c.friendly);
    return `
    <div class="stack" style="max-width:760px;margin:0 auto">
      <div class="card">
        <div class="h-sec">Agendar amistoso</div>
        <div class="field"><label>Adversário</label><input class="input" id="fr-q" placeholder="Digite para buscar…" value="${esc(fri.q)}"></div>
        <div class="chips" id="fr-opts" style="max-height:180px;overflow-y:auto">${opts.map((c) => `<button class="chip ${fri.opp === c.id ? 'active' : ''}" data-opp="${c.id}">${crest(c, 20)} ${esc(c.name)}</button>`).join('')}</div>
        <div class="field" style="margin-top:14px"><label>Semana do jogo: <b>${s.week + fri.weekOffset}</b> (em ${fri.weekOffset} sem.)</label>
          <input class="input" type="range" id="fr-wk" min="1" max="6" value="${fri.weekOffset}"></div>
        <button class="btn primary block" id="fr-go" ${opp ? '' : 'disabled'}>${icon('handshake')} Marcar contra ${opp ? esc(opp.name) : '…'}</button>
      </div>
      <div class="card">
        <div class="h-sec">Amistosos marcados/realizados</div>
        ${scheduled.length ? scheduled.map((c) => c.fixtures.map((f) => `
          <div class="tie"><div>${clubCell(s, f.home)} <b style="margin:0 5px">×</b> ${clubCell(s, f.away)}</div>
          <div class="tscore">${f.played ? `${f.gh} × ${f.ga}` : `<span class="pill">Semana ${f.week}</span>`}</div></div>`).join('')).join('') : '<div class="muted">Nenhum amistoso marcado.</div>'}
      </div>
    </div>`;
  },
  mount(el) {
    const s = S();
    const q = el.querySelector('#fr-q');
    q.oninput = () => { fri.q = q.value; fri.opp = null; renderRoute(); setTimeout(() => { const nq = document.querySelector('#fr-q'); if (nq) { nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); } }, 30); };
    el.querySelector('[data-fr-search]')?.addEventListener('click', () => { fri.q = q.value; fri.opp = null; renderRoute(); });
    el.querySelectorAll('[data-opp]').forEach((b) => b.onclick = () => { fri.opp = b.dataset.opp; renderRoute(); });
    el.querySelector('#fr-wk').oninput = (e) => { fri.weekOffset = Number(e.target.value); renderRoute(); };
    el.querySelector('#fr-go').onclick = () => {
      if (!fri.opp) return;
      G.scheduleFriendly(s, fri.opp, s.week + fri.weekOffset);
      toast('🤝 Amistoso agendado!');
      fri.opp = null; fri.q = '';
      autosave(); renderRoute();
    };
  },
};

// ============================================================
// CAMPEONATO PERSONALIZADO
// ============================================================
const cst = { name: '', format: 'cup', q: '', teams: [] };
export const customScreen = {
  html() {
    const s = S();
    const q = cst.q.toLowerCase();
    const opts = Object.values(s.db.clubs).filter((c) => !cst.teams.includes(c.id) && (!q || c.name.toLowerCase().includes(q) || c.short.toLowerCase().includes(q))).slice(0, 12);
    return `
    <div class="stack" style="max-width:760px;margin:0 auto">
      <div class="card">
        <div class="h-sec">Criar campeonato personalizado</div>
        <div class="field"><label>Nome do campeonato</label><input class="input" id="cs-name" maxlength="30" placeholder="Ex.: Copa dos Campeões" value="${esc(cst.name)}"></div>
        <div class="field"><label>Formato</label><div class="seg">
          <button class="chip ${cst.format === 'cup' ? 'active' : ''}" data-fmt="cup">Mata-mata</button>
          <button class="chip ${cst.format === 'league' ? 'active' : ''}" data-fmt="league">Pontos corridos (turno único)</button>
        </div></div>
        <div class="field"><label>Equipes (${cst.teams.length}) — mínimo 4</label>
          <div class="chips" style="margin-bottom:10px">${cst.teams.map((id) => `<button class="chip active" data-rm="${id}">${crest(s.db.clubs[id], 18)} ${esc(s.db.clubs[id].short)} ✕</button>`).join('') || '<span class="tiny muted">Adicione seu time e os adversários abaixo…</span>'}</div>
          <input class="input" id="cs-q" placeholder="Buscar clube…" value="${esc(cst.q)}">
          <div class="chips" style="margin-top:10px">${opts.map((c) => `<button class="chip" data-add="${c.id}">${crest(c, 18)} ${esc(c.name)}</button>`).join('')}</div>
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn" id="cs-my">${icon('plus')} Incluir meu clube</button>
          <button class="btn primary" id="cs-go" ${cst.name && cst.teams.length >= 4 ? '' : 'disabled'}>${icon('trophy')} Criar campeonato</button>
        </div>
        <div class="tiny muted" style="margin-top:10px">O campeonato entra no seu calendário a partir da próxima semana. Se o seu clube estiver entre as equipes, você disputa normalmente!</div>
      </div>
    </div>`;
  },
  mount(el) {
    const s = S();
    el.querySelector('#cs-name').oninput = (e) => { cst.name = e.target.value; };
    el.querySelectorAll('[data-fmt]').forEach((b) => b.onclick = () => { cst.format = b.dataset.fmt; renderRoute(); });
    const q = el.querySelector('#cs-q');
    q.onchange = () => { cst.q = q.value; renderRoute(); };
    el.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => { if (cst.teams.length < 32) cst.teams.push(b.dataset.add); renderRoute(); });
    el.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { cst.teams = cst.teams.filter((x) => x !== b.dataset.rm); renderRoute(); });
    el.querySelector('#cs-my').onclick = () => { if (!cst.teams.includes(s.clubId)) cst.teams.push(s.clubId); renderRoute(); };
    el.querySelector('#cs-go').onclick = () => {
      const r = G.createCustomCompetition(s, { name: cst.name.trim(), teamIds: cst.teams, format: cst.format });
      if (r.ok) { toast('🏆 Campeonato criado! Veja em Copas.'); cst.name = ''; cst.teams = []; cst.q = ''; autosave(); go('cups'); }
      else toast(r.msg || 'Erro ao criar.', 'error');
    };
  },
};

// ============================================================
// EDITOR — CRIAR JOGADOR
// ============================================================
const ed = { name: '', pos: 'M', age: 21, ovr: 70, pot: 78, country: 'br', clubId: null, photo: null };
export const editorScreen = {
  html() {
    const s = S();
    if (!ed.clubId) ed.clubId = s.clubId;
    const clubsSorted = Object.values(s.db.clubs).sort((a, b) => a.name.localeCompare(b.name));
    return `
    <div class="stack" style="max-width:640px;margin:0 auto">
      <div class="card">
        <div class="h-sec">Criar novo jogador</div>
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:16px">
          <div id="ed-preview">${ed.photo ? `<img src="${ed.photo}" width="64" height="64" style="border-radius:50%;object-fit:cover">` : avatar({ name: ed.name || 'Novo Jogador', pos: ed.pos }, 64)}</div>
          <div style="flex:1"><input class="input" id="ed-name" maxlength="28" placeholder="Nome do jogador" value="${esc(ed.name)}"></div>
        </div>
        <div class="field"><label>Foto (opcional — redimensionada para 96×96)</label><input class="input" type="file" id="ed-photo" accept="image/*" style="padding:11px"></div>
        <div class="field"><label>Posição</label><div class="seg">${POS_ORDER.map((p) => `<button class="chip ${ed.pos === p ? 'active' : ''}" data-pos="${p}">${POSITIONS[p]}</button>`).join('')}</div></div>
        <div class="grid cols-2">
          <div class="field"><label>Idade: <b id="ed-age-v">${ed.age}</b></label><input class="input" type="range" min="15" max="40" id="ed-age" value="${ed.age}"></div>
          <div class="field"><label>Nacionalidade</label><select class="input" id="ed-country">${COUNTRIES.map((c) => `<option value="${c.id}" ${ed.country === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label>Overall: <b id="ed-ovr-v">${ed.ovr}</b></label><input class="input" type="range" min="40" max="99" id="ed-ovr" value="${ed.ovr}"></div>
        <div class="field"><label>Potencial: <b id="ed-pot-v">${ed.pot}</b></label><input class="input" type="range" min="40" max="99" id="ed-pot" value="${ed.pot}"></div>
        <div class="field"><label>Clube</label><select class="input" id="ed-club">${clubsSorted.map((c) => `<option value="${c.id}" ${ed.clubId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
        <button class="btn primary big block" id="ed-create" ${ed.name.trim() ? '' : 'disabled'}>${icon('plus')} Criar jogador</button>
      </div>
    </div>`;
  },
  mount(el) {
    const s = S();
    const name = el.querySelector('#ed-name');
    name.oninput = () => { ed.name = name.value; el.querySelector('#ed-create').disabled = !ed.name.trim(); el.querySelector('#ed-preview').innerHTML = ed.photo ? `<img src="${ed.photo}" width="64" height="64" style="border-radius:50%;object-fit:cover">` : avatar({ name: ed.name || 'NP', pos: ed.pos }, 64); };
    el.querySelector('#ed-photo').onchange = (e) => {
      const f = e.target.files[0];
      if (f) resizeImage(f, 96, (d) => { ed.photo = d; renderRoute(); });
    };
    el.querySelectorAll('[data-pos]').forEach((b) => b.onclick = () => { ed.pos = b.dataset.pos; renderRoute(); });
    const bindR = (id, key) => { const i = el.querySelector(`#ed-${id}`); i.oninput = () => { ed[key] = Number(i.value); el.querySelector(`#ed-${id}-v`).textContent = i.value; }; };
    bindR('age', 'age'); bindR('ovr', 'ovr'); bindR('pot', 'pot');
    el.querySelector('#ed-country').onchange = (e) => ed.country = e.target.value;
    el.querySelector('#ed-club').onchange = (e) => ed.clubId = e.target.value;
    el.querySelector('#ed-create').onclick = () => {
      const value = App.revalue(ed.ovr, ed.age, Math.max(ed.pot, ed.ovr));
      const p = {
        id: `pc_${Date.now().toString(36)}`,
        name: ed.name.trim(), clubId: ed.clubId, age: ed.age,
        height: 172 + Math.round(Math.random() * 20), weight: 70 + Math.round(Math.random() * 15),
        country: ed.country, pos: ed.pos, ovr: ed.ovr, pot: Math.max(ed.pot, ed.ovr),
        salary: Math.round(value / 1100 / 100) * 100 || 5000, contractYears: 3, value,
        personality: 'Profissional', fitness: 95, injuredWeeks: 0, suspended: 0, yellow: 0,
        number: 0, foot: 'D', morale: 75, xp: 20, form: 60, photo: ed.photo,
        stats: { games: 0, goals: 0, assists: 0, yellow: 0, red: 0, ratingSum: 0, cleanSheets: 0 },
        career: { games: 0, goals: 0, assists: 0 }, history: [], listed: false, loan: null, formHistory: [],
      };
      const used = new Set(G.clubPlayers(s.db, ed.clubId).map((x) => x.number));
      let n = 30; while (used.has(n)) n++; p.number = n;
      s.db.players[p.id] = p;
      toast(`✅ ${esc(p.name)} criado e adicionado ao ${esc(s.db.clubs[ed.clubId].short)}!`);
      autosave(); go(`player/${p.id}`);
    };
  },
};

// ============================================================
// CONFIGURAÇÕES
// ============================================================
export const settingsScreen = {
  html() {
    const st = S() ? S().settings : App.bootSettings;
    return `
    <div class="menu-wrap" style="max-width:560px;text-align:left">
      <div class="menu-title" style="font-size:1.5rem;text-align:center;margin-bottom:16px">CONFI<span>GURAÇÕES</span></div>
      <div class="card stack">
        <div class="field"><label>Idioma / Language</label><div class="seg">
          <button class="chip ${st.lang === 'pt' ? 'active' : ''}" data-set="lang:pt">Português</button>
          <button class="chip ${st.lang === 'en' ? 'active' : ''}" data-set="lang:en">English</button>
        </div></div>
        <div class="field"><label>Cor de destaque</label><div class="chips">
          ${[['laranja', '#ff7700'], ['verde', '#22c55e'], ['azul', '#38bdf8'], ['roxo', '#a78bfa'], ['dourado', '#f5c542'], ['vermelho', '#fb7185']].map(([k, c]) => `<button class="chip ${st.accent === k ? 'active' : ''}" data-set="accent:${k}"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c};margin-right:6px;vertical-align:-2px"></span>${k}</button>`).join('')}
        </div></div>
        <div class="field"><label>Velocidade da simulação ao vivo: <b>${['Lenta', 'Normal', 'Rápida'][st.speed - 1]}</b></label><input class="input" type="range" min="1" max="3" id="set-speed" value="${st.speed}"></div>
        <div class="field"><label>Volume dos efeitos: <b id="vol-v">${st.volume}</b></label><input class="input" type="range" min="0" max="100" id="set-vol" value="${st.volume}"></div>
        <div class="field"><label>Qualidade gráfica</label><div class="seg">
          <button class="chip ${st.quality === 'alta' ? 'active' : ''}" data-set="quality:alta">Alta (animações)</button>
          <button class="chip ${st.quality === 'baixa' ? 'active' : ''}" data-set="quality:baixa">Baixa (desempenho)</button>
        </div></div>
        <div class="field"><label>Dinheiro Infinito</label><div class="seg">
          <button class="chip ${st.infiniteMoney ? 'active' : ''}" data-set="infiniteMoney:true">Ligado</button>
          <button class="chip ${!st.infiniteMoney ? 'active' : ''}" data-set="infiniteMoney:false">Desligado</button>
        </div></div>
        <div class="field" style="margin-top:6px"><label>Valor do dinheiro infinito (quando ligado)</label>
          <input class="input" type="number" id="inf-val" value="${st.infiniteMoneyValue || 999999999}" min="1" step="1000000" style="width:220px">
        </div>
        <div class="tiny muted">As configurações são salvas automaticamente.</div>
        ${App.state ? '' : `<button class="btn ghost block" data-back>${icon('back')} Voltar ao menu</button>`}
      </div>
    </div>`;
  },
  mount(el) {
    const st = S() ? S().settings : App.bootSettings;
    const persist = () => {
      const s = S();
      if (s) {
        if (s.settings && (s.settings.infiniteMoney === true || s.settings.infiniteMoney === 'true')) {
          s.finances.balance = Number(s.settings.infiniteMoneyValue) || 999999999;
        }
        autosave();
      } else {
        try { App.storage.setItem('fm_boot_settings', JSON.stringify(st)); } catch {}
      }
      applySettingsToBody();
      if (!s) renderRoute();
    };
    el.querySelectorAll('[data-set]').forEach((b) => b.onclick = () => {
      const [k, v] = b.dataset.set.split(':');
      let val = v;
      if (v === 'true') val = true;
      else if (v === 'false') val = false;
      st[k] = val;
      applySettingsToBody();
      persist();
      renderRoute();
    });
    el.querySelector('#set-speed').oninput = (e) => { st.speed = Number(e.target.value); persist(); renderRoute(); };
    const vol = el.querySelector('#set-vol');
    vol.oninput = () => { st.volume = Number(vol.value); el.querySelector('#vol-v').textContent = vol.value; persist(); };
    vol.onchange = () => tone(700, 0.15, 'triangle');
    const infVal = el.querySelector('#inf-val');
    if (infVal) {
      infVal.oninput = () => {
        st.infiniteMoneyValue = Number(infVal.value) || 0;
        const s = S();
        if (s && s.settings && (s.settings.infiniteMoney === true || s.settings.infiniteMoney === 'true')) {
          s.finances.balance = st.infiniteMoneyValue;
        }
        if (s) autosave();
        else { try { App.storage.setItem('fm_boot_settings', JSON.stringify(st)); } catch {} }
      };
    }
    el.querySelector('[data-back]')?.addEventListener('click', () => go('menu'));
  },
};

// ============================================================
// SAVES
// ============================================================
export const savesScreen = {
  html() {
    const slots = App.storage ? G.saveSlots(App.storage) : {};
    const list = ['auto', 'slot1', 'slot2', 'slot3'];
    return `
    <div class="menu-wrap" style="max-width:620px;text-align:left">
      <div class="menu-title" style="font-size:1.5rem;text-align:center;margin-bottom:16px">SA<span>VES</span></div>
      <div class="stack">
        ${list.map((id) => {
          const sl = slots[id];
          return `<div class="card" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
            <span class="pill ${id === 'auto' ? 'blue' : ''}">${id === 'auto' ? 'AUTO' : id.replace('slot', 'Slot ')}</span>
            <div style="flex:1;min-width:160px">
              ${sl ? `<b>${esc(sl.clubName)}</b><div class="tiny muted">${esc(sl.manager)} • Temporada ${sl.season} • Semana ${sl.week} • ${new Date(sl.savedAt).toLocaleString('pt-BR')}</div>` : '<span class="muted">vazio</span>'}
            </div>
            <div style="display:flex;gap:8px">
              ${App.state ? `<button class="btn small" data-save="${id}">${icon('save')} Salvar</button>` : ''}
              ${sl ? `<button class="btn small primary" data-load="${id}">${icon('upload')} Carregar</button>` : ''}
              ${sl && id !== 'auto' ? `<button class="btn small danger" data-del="${id}">${icon('x')}</button>` : ''}
            </div>
          </div>`;
        }).join('')}
        <div class="card">
          <div class="h-sec">Exportar / Importar</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${App.state ? `<button class="btn" data-exp>${icon('download')} Exportar save (arquivo)</button>` : ''}
            <label class="btn" style="cursor:pointer">${icon('upload')} Importar save<input type="file" id="imp-file" accept=".json,.fmsave" style="display:none"></label>
          </div>
          <div class="tiny muted" style="margin-top:10px">Exporte para compartilhar entre dispositivos ou guardar um backup. O arquivo é comprimido automaticamente.</div>
        </div>
        ${App.state ? '' : `<button class="btn ghost block" data-back>${icon('back')} Voltar ao menu</button>`}
      </div>
    </div>`;
  },
  mount(el) {
    el.querySelectorAll('[data-save]').forEach((b) => b.onclick = async () => {
      const r = await G.writeSlot(App.storage, b.dataset.save, S());
      toast(r.ok ? `💾 Save gravado em ${b.dataset.save}.` : (r.msg || 'Falha ao salvar.'), r.ok ? 'ok' : 'error');
      renderRoute();
    });
    el.querySelectorAll('[data-load]').forEach((b) => b.onclick = async () => {
      try {
        const st = await G.readSlot(App.storage, b.dataset.load);
        if (st) { App.onLoadState && App.onLoadState(st); toast('💾 Save carregado!'); }
      } catch (e) { toast('Save corrompido ou incompatível.', 'error'); }
    });
    el.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => {
      confirmBox('Apagar save', 'Esta ação não pode ser desfeita. Apagar este slot?', () => {
        G.deleteSlot(App.storage, b.dataset.del); toast('Slot apagado.'); renderRoute();
      }, 'Apagar');
    });
    el.querySelector('[data-exp]')?.addEventListener('click', async () => {
      const packed = await compressText(G.serialize(S()));
      const club = S().db.clubs[S().clubId].short;
      downloadFile(`fmsave_${club}_T${S().season}_S${S().week}.fmsave.json`, packed);
      toast('⬇️ Save exportado.');
    });
    el.querySelector('#imp-file')?.addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const raw = await readUploadedFile(f);
        const json = await decompressText(raw);
        const st = G.deserialize(json);
        App.onLoadState && App.onLoadState(st);
        toast('⬆️ Save importado com sucesso!');
      } catch (err) { toast('Arquivo inválido.', 'error'); console.error(err); }
    });
    el.querySelector('[data-back]')?.addEventListener('click', () => go('menu'));
  },
};

// ============================================================
// CRÉDITOS
// ============================================================
export const creditsScreen = {
  html() {
    return `
    <div class="menu-wrap" style="text-align:left;max-width:520px">
      <div style="text-align:center"><img src="public/favicon.svg" width="64" height="64" alt="">
      <div class="menu-title" style="font-size:1.5rem;margin:10px 0 16px">CRÉ<span>DITOS</span></div></div>
      <div class="card" style="line-height:1.65">
        <p><b>Futebol Manager 26</b> — jogo original de gerenciamento de futebol para navegador, inspirado nas mecânicas clássicas dos managers de texto.</p>
        <br>
        <p class="muted">• Motor de simulação, interface e banco de dados 100% próprios, escritos em HTML, CSS e JavaScript puros — sem frameworks, sem build.<br>
        • Os <b>escudos exibidos pertencem aos seus respectivos clubes</b>; os arquivos foram obtidos de páginas públicas da Wikipedia/Wikimedia apenas para referência visual em uso pessoal e não comercial. Se um clube não tiver imagem (ex.: clubes que você criar), o jogo gera um escudo alternativo automaticamente. Os <b>jogadores são fictícios</b>, criados por algoritmo — nenhum dado real de atletas é usado.<br>
        • Todo o progresso fica salvo apenas no seu dispositivo (localStorage), com compressão gzip.</p>
        <br>
        <p class="tiny muted">Feito com ⚽ e JavaScript. Bom jogo, treinador!</p>
      </div>
      <div style="margin-top:14px"><button class="btn ghost block" data-back>${icon('back')} Voltar</button></div>
    </div>`;
  },
  mount(el) { el.querySelector('[data-back]').onclick = () => history.back(); },
};

// ============================================================
// TREINOS — planejador semanal com efeitos reais + histórico
// ============================================================
export const trainingScreen = {
  html() {
    const s = S();
    const tr = s.training || { focus: 'fisico', done: false };
    const plan = Array.isArray(tr.plan) && tr.plan.length === 7 ? tr.plan : G.defaultTrainPlan();
    const squad = G.clubPlayers(s.db, s.clubId);
    const avgFit = Math.round(squad.reduce((x, p) => x + p.fitness, 0) / Math.max(1, squad.length));
    const avgMor = Math.round(squad.reduce((x, p) => x + p.morale, 0) / Math.max(1, squad.length));
    const avgForm = Math.round(squad.reduce((x, p) => x + p.form, 0) / Math.max(1, squad.length));
    const chemNow = Math.round(s.chemistry || 70);
    const injuredCount = squad.filter((p) => p.injuredWeeks > 0).length;
    const focus = G.TRAINING_FOCUS[tr.focus] || G.TRAINING_FOCUS.fisico;
    // Recomendação dinâmica da comissão, calculada pelo estado real do elenco
    const recKey = avgFit < 70 ? 'fisico' : chemNow < 66 ? 'tatica' : avgForm < 58 ? 'tecnica' : avgMor < 62 ? 'descanso' : 'tecnica';
    const recReason = avgFit < 70 ? 'Elenco abaixo da condição ideal para a sequência.'
      : chemNow < 66 ? 'O grupo ainda não absorveu o plano de jogo.'
        : avgForm < 58 ? 'O ritmo de jogo está caindo; fundamentos ajudam.'
          : avgMor < 62 ? 'O ambiente do vestiário pede leveza.'
            : 'Semana equilibrada: mantenha a evolução técnica.';
    const rec = G.TRAINING_FOCUS[recKey];
    const totals = G.planTotals(plan);
    const history = Array.isArray(tr.history) ? tr.history : [];
    const fmtSigned = (v) => `${v > 0 ? '+' : ''}${Math.round(v)}`;
    const activityOptions = Object.entries(G.TRAIN_ACTIVITIES);
    const typeRows = activityOptions.map(([k, v]) => [v.label, v.desc]);

    return `
    <div class="ref-training">
      <header class="ref-page-nav"><button class="ref-back-button" data-ref-back>${icon('back')} <span>Voltar à Central</span></button><span class="ref-page-nav-title">${icon('whistle')} CENTRO DE TREINAMENTO</span><button class="ref-view-squad" data-ref-squad>Ver elenco</button></header>
      <section class="ref-training-hero"><div><h1>Prepare. Recupere. Evolua.</h1><p>Planeje cada sessão e encontre o equilíbrio entre desempenho, desgaste e risco.</p></div>${crest(s.db.clubs[s.clubId], 76)}</section>
      <section class="ref-training-kpis">
        <div><span>${icon('medical')}<b>CONDIÇÃO</b></span><strong>${avgFit}%</strong><i><b style="width:${avgFit}%"></b></i></div>
        <div><span>${icon('fire')}<b>RITMO</b></span><strong>${avgForm}%</strong><i><b style="width:${avgForm}%"></b></i></div>
        <div><span>${icon('star')}<b>MORAL</b></span><strong>${avgMor}%</strong><i><b style="width:${avgMor}%"></b></i></div>
        <div><span>${icon('target')}<b>ENTROSAMENTO</b></span><strong>${chemNow}%</strong><i><b style="width:${chemNow}%"></b></i></div>
      </section>
      <section class="ref-training-recommendation">
        <div class="ref-recommendation-copy"><span class="ref-section-label">${icon('star')} RECOMENDAÇÃO DA COMISSÃO</span><strong>${rec.label}</strong><small>${esc(recReason)}${injuredCount ? ` ${injuredCount} atleta(s) no DM.` : ''}</small></div>
        <label><span>Prioridade semanal</span><select data-focus-select>${Object.entries(G.TRAINING_FOCUS).map(([k, v]) => `<option value="${k}" ${tr.focus === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
        <label><span>Efeito do foco</span><i class="ref-focus-effect">${esc(focus.desc)}</i></label>
        <button class="ref-apply-training" data-train ${tr.done ? 'disabled' : ''}>${tr.done ? 'Treino aplicado' : 'Aplicar à semana'}</button>
      </section>

      <section class="ref-card ref-week-planner">
        <div class="ref-card-head"><span class="ref-section-label">${icon('calendar')} PRÓXIMOS SETE DIAS</span><h2>Planejamento da semana</h2><small>Cada sessão altera condição, ritmo, entrosamento e risco.</small></div>
        <div class="ref-training-days">${plan.map((day, index) => {
          const date = refDateInfo(s.week, s.year, index);
          const act = G.TRAIN_ACTIVITIES[day.activity] || G.TRAIN_ACTIVITIES.tecnica;
          const mult = G.intensityMult(day.intensity);
          const eff = (v) => Math.round(v * mult);
          return `<article class="ref-training-day">
            <b>${date.weekday} · ${date.day} DE ${date.month}</b>
            <strong>${esc(act.label)}</strong>
            <label>Atividade<select data-day-act="${index}">${activityOptions.map(([k, v]) => `<option value="${k}" ${day.activity === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
            <label>Intensidade<select data-day-int="${index}">${['leve', 'normal', 'alta'].map((it) => `<option value="${it}" ${day.intensity === it ? 'selected' : ''}>${it.charAt(0).toUpperCase() + it.slice(1)}</option>`).join('')}</select></label>
            <div class="ref-training-tags"><span>Condição ${fmtSigned(eff(act.cond))}</span><span>Ritmo ${fmtSigned(eff(act.ritmo))}</span><small>Risco ${Math.round(act.risk * mult)}%</small></div>
            <p>${esc(act.desc)}${act.morale ? ` Moral ${fmtSigned(eff(act.morale))}.` : ''}${act.chem ? ` Entrosamento ${fmtSigned(eff(act.chem))}.` : ''}</p>
          </article>`;
        }).join('')}</div>
        <div class="ref-week-forecast">
          <span>${icon('pulse')} <b>PREVISÃO DA SEMANA</b></span>
          <em class="${totals.cond >= 0 ? 'pos' : 'neg'}">Condição ${fmtSigned(totals.cond)}</em>
          <em class="${totals.ritmo >= 0 ? 'pos' : 'neg'}">Ritmo ${fmtSigned(totals.ritmo)}</em>
          <em class="${totals.morale >= 0 ? 'pos' : 'neg'}">Moral ${fmtSigned(totals.morale)}</em>
          <em class="pos">Entrosamento ${fmtSigned(totals.chem)}</em>
          <em class="${totals.risk > 0 ? 'neg' : 'pos'}">Risco de lesão ${Math.round(totals.risk)}%</em>
          ${tr.done ? '<i class="rf-done">✓ Semana já treinada — novo plano após avançar</i>' : ''}
        </div>
      </section>

      <section class="ref-training-bottom">
        <section class="ref-card ref-session-types"><div class="ref-card-head"><span class="ref-section-label">${icon('pulse')} TIPOS DE SESSÃO</span><h2>Objetivo de cada atividade</h2></div>${typeRows.map(([title, desc]) => `<div class="ref-session-row">${icon('shield')}<span><strong>${title}</strong><small>${desc}</small></span></div>`).join('')}</section>
        <section class="ref-card ref-session-history"><div class="ref-card-head"><span class="ref-section-label">${icon('clock')} HISTÓRICO</span><h2>Últimas sessões <small>${history.length}</small></h2></div>
          <div class="ref-history-list">${history.length ? history.map((h) => {
            const counts = {};
            (h.plan || []).forEach((a) => { counts[a] = (counts[a] || 0) + 1; });
            const summary = Object.entries(counts).map(([a, n]) => `${n}× ${G.TRAIN_ACTIVITIES[a]?.label || a}`).join(', ');
            return `<div class="ref-history-row">
              <span class="rh-week">S${h.week} · T${h.season}</span>
              <span class="rh-info"><strong>Foco: ${esc(G.TRAINING_FOCUS[h.focus]?.label || h.focus)}${h.injury ? ` · 🤕 ${esc(h.injury)}` : ''}</strong><small>${esc(summary)}</small></span>
              <span class="rh-gains"><em class="${h.gains?.cond >= 0 ? 'pos' : 'neg'}">C ${fmtSigned(h.gains?.cond || 0)}</em><em class="${h.gains?.ritmo >= 0 ? 'pos' : 'neg'}">R ${fmtSigned(h.gains?.ritmo || 0)}</em></span>
            </div>`;
          }).join('') : '<div class="ref-history-empty">Nenhuma sessão registrada ainda. Monte o plano acima e aplique o primeiro treino da carreira.</div>'}</div>
        </section>
      </section>
    </div>`;
  },
  mount(el) {
    const s = S();
    const tr = s.training || (s.training = { focus: 'fisico', done: false, plan: G.defaultTrainPlan(), history: [] });
    if (!Array.isArray(tr.plan) || tr.plan.length !== 7) tr.plan = G.defaultTrainPlan();
    if (!Array.isArray(tr.history)) tr.history = [];
    el.querySelector('[data-ref-back]')?.addEventListener('click', () => go('home'));
    el.querySelector('[data-ref-squad]')?.addEventListener('click', () => go('squad'));
    el.querySelector('[data-focus-select]')?.addEventListener('change', (e) => { tr.focus = e.target.value; autosave(); renderRoute(); });
    el.querySelectorAll('[data-day-act]').forEach((sel) => sel.addEventListener('change', () => {
      tr.plan[Number(sel.dataset.dayAct)].activity = sel.value;
      autosave(); renderRoute();
    }));
    el.querySelectorAll('[data-day-int]').forEach((sel) => sel.addEventListener('change', () => {
      tr.plan[Number(sel.dataset.dayInt)].intensity = sel.value;
      autosave(); renderRoute();
    }));
    el.querySelector('[data-train]')?.addEventListener('click', () => {
      const r = G.doTraining(s, tr.focus);
      if (r.ok) {
        const g = r.gains || {};
        toast(`✅ Semana treinada! Plano: ${g.cond >= 0 ? '+' : ''}${g.cond} condição, ${g.ritmo >= 0 ? '+' : ''}${g.ritmo} ritmo, +${g.chem} entrosamento.${g.injury ? ` 🤕 ${g.injury} no DM (1 sem.)` : ''}`);
      } else toast(r.msg || 'Treino indisponível.', 'error');
      autosave(); renderRoute();
    });
  },
};

// ============================================================
// CENTRAL DE MENSAGENS — caixa de entrada reinventada
// Categorias com contadores, filtros, mensagens expansíveis
// (estilo conversa) e ações contextuais reais por tipo.
// ============================================================
const inboxCatOf = (type) => (
  ['bid', 'offerAccepted', 'offerCounter', 'offerRejected'].includes(type) ? 'mercado'
    : type === 'jobOffer' ? 'carreira'
      : type === 'contract' ? 'elenco' : 'clube'
);
const INBOX_CATS = {
  mercado: { label: 'Mercado', icon: 'cart', who: 'Empresários & clubes' },
  carreira: { label: 'Carreira', icon: 'star', who: 'Diretorias interessadas' },
  elenco: { label: 'Elenco', icon: 'users', who: 'Comissão técnica' },
  clube: { label: 'Clube', icon: 'building', who: 'Administração' },
};
let inboxFilter = 'all';
let inboxOpenId = null;

export const inboxScreen = {
  html() {
    const s = S();
    const unread = s.inbox.filter((i) => !i.read).length;
    const counts = { all: s.inbox.length, unread };
    for (const cat of Object.keys(INBOX_CATS)) counts[cat] = s.inbox.filter((i) => inboxCatOf(i.type) === cat).length;
    const list = s.inbox.filter((i) => {
      if (inboxFilter === 'all') return true;
      if (inboxFilter === 'unread') return !i.read;
      return inboxCatOf(i.type) === inboxFilter;
    });
    const chip = (key, label, ico) => `<button class="ibf-chip ${inboxFilter === key ? 'active' : ''}" data-f="${key}">${ico ? icon(ico) : ''}${label}<b>${counts[key] || 0}</b></button>`;

    return `
    <div class="ibx">
      <header class="ibx-header">
        <div class="ibx-title">
          <span class="ref-eyebrow">CENTRAL DO CLUBE</span>
          <h1>${icon('mail')} Mensagens <em class="ibx-count">${unread ? `${unread} nova(s)` : 'em dia'}</em></h1>
        </div>
        <div class="ibx-tools">
          <button class="btn small ghost" data-readall>${icon('check')} Marcar tudo como lido</button>
          <button class="btn small ghost" data-clear>${icon('x')} Limpar lidas</button>
        </div>
      </header>

      <nav class="ibx-filters">
        ${chip('all', 'Todas', 'mail')}${chip('unread', 'Não lidas', 'bell')}
        ${Object.entries(INBOX_CATS).map(([k, c]) => chip(k, c.label, c.icon)).join('')}
      </nav>

      <section class="ibx-list">
        ${list.length ? list.map((i) => {
          const cat = inboxCatOf(i.type);
          const meta = INBOX_CATS[cat];
          const open = inboxOpenId === i.id;
          const p = i.playerId ? s.db.players[i.playerId] : null;
          const hasActions = (i.type === 'bid' && p) || i.type === 'offerAccepted' || i.type === 'offerCounter' || i.type === 'jobOffer';
          return `
          <article class="ibx-item cat-${cat} ${i.read ? '' : 'unread'} ${open ? 'open' : ''}" data-msg="${i.id}">
            <span class="ibx-ico">${icon(meta.icon)}</span>
            <div class="ibx-main">
              <div class="ibx-head">
                <strong>${esc(i.title)}</strong>
                <span class="ibx-meta"><i class="ibx-cat">${esc(meta.label)}</i><i class="ibx-dot" title="Não lida"></i><time>S${i.week} · T${s.season}</time></span>
              </div>
              <p>${esc(i.text)}</p>
              <div class="ibx-extra">
                <div class="ibx-who">${icon(meta.icon)} ${esc(meta.who)}${p ? ` · <b>${esc(p.name)}</b> (${p.pos} · OVR ${p.ovr})` : ''}</div>
                <div class="inbox-actions">
                  ${i.type === 'bid' && p ? `
                    <button class="btn small primary" data-bid="${i.offerId}:accept">Vender ${icon('check')}</button>
                    <button class="btn small" data-bid="${i.offerId}:counter">Negociar +15%</button>
                    <button class="btn small danger" data-bid="${i.offerId}:reject">Recusar</button>` : ''}
                  ${i.type === 'offerAccepted' ? `<button class="btn small primary" data-confirm="${i.offerId}">${icon('check')} Confirmar contratação</button>` : ''}
                  ${i.type === 'offerCounter' ? `<button class="btn small primary" data-goto-market>Aceitar contraproposta no Mercado</button>` : ''}
                  ${i.type === 'jobOffer' ? `
                    <button class="btn small primary" data-job="${i.id}:1">${icon('check')} Aceitar e assumir o clube</button>
                    <button class="btn small danger" data-job="${i.id}:0">Recusar</button>` : ''}
                  ${p ? `<button class="btn small ghost" data-player="${p.id}">${icon('users')} Ver jogador</button>` : ''}
                  ${!hasActions ? `<button class="btn small ghost" data-del="${i.id}">${icon('x')} Excluir mensagem</button>` : ''}
                </div>
              </div>
            </div>
            <span class="ibx-chev">›</span>
          </article>`;
        }).join('') : `
        <div class="card empty">${icon('mail')}
          <div style="font-weight:700;margin:6px 0 2px">${inboxFilter === 'all' ? 'Caixa vazia por aqui.' : 'Nada nesta categoria.'}</div>
          <div class="tiny muted">Propostas de transferência, ofertas de emprego e avisos da diretoria aparecem aqui.</div>
        </div>`}
      </section>
    </div>`;
  },
  mount(el) {
    const s = S();
    // Filtros
    el.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { inboxFilter = b.dataset.f; renderRoute(); });
    // Expandir/recolher (estilo conversa)
    el.querySelectorAll('[data-msg]').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return; // ações não colapsam
        inboxOpenId = inboxOpenId === card.dataset.msg ? null : card.dataset.msg;
        renderRoute();
      });
    });
    // Ações de mercado
    el.querySelectorAll('[data-bid]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      const [id, act] = b.dataset.bid.split(':');
      G.respondBid(s, id, act);
      toast(act === 'accept' ? '💰 Jogador vendido!' : act === 'counter' ? '🔁 Contraproposta enviada.' : 'Proposta recusada.');
      autosave(); renderRoute();
    });
    el.querySelectorAll('[data-confirm]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      const r = G.confirmBuy(s, b.dataset.confirm);
      toast(r.ok ? '✅ Reforço confirmado!' : (r.msg || 'Falhou'), r.ok ? 'ok' : 'error');
      autosave(); renderRoute();
    });
    el.querySelectorAll('[data-goto-market]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); mkt.tab = 'pending'; go('market'); }));
    // Proposta de emprego — trocar de clube de verdade!
    el.querySelectorAll('[data-job]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      const [id, accept] = b.dataset.job.split(':');
      const r = G.respondJobOffer(s, id, accept === '1');
      if (r.ok && r.club) toast(`🧳 Você é o novo treinador do ${esc(r.club)}!`);
      else if (r.ok) toast('Proposta recusada. Você segue no cargo.');
      else toast(r.msg || 'Falhou.', 'error');
      autosave(); renderRoute();
    });
    el.querySelectorAll('[data-player]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); go(`player/${b.dataset.player}`); });
    el.querySelectorAll('[data-del]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      s.inbox = s.inbox.filter((i) => i.id !== b.dataset.del);
      if (inboxOpenId === b.dataset.del) inboxOpenId = null;
      autosave(); renderRoute();
    });
    // Ferramentas
    el.querySelector('[data-readall]').onclick = () => { s.inbox.forEach((i) => { i.read = true; }); autosave(); renderRoute(); };
    el.querySelector('[data-clear]').onclick = () => { s.inbox = s.inbox.filter((i) => !i.read); inboxOpenId = null; autosave(); renderRoute(); };
    // Marca como lidas automaticamente ao visualizar (o selo some da topbar)
    setTimeout(() => { s.inbox.forEach((i) => { i.read = true; }); }, 900);
  },
};
