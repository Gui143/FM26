// ============================================================
// screens2.js — Calendário, tabelas, copas, mercado, finanças,
// clube, base, treinador, estatísticas, ranking, amistosos,
// campeonato personalizado, editor, saves, config, créditos, inbox
// ============================================================
import { App, icon, toast, openModal, closeModal, confirmBox, go, esc, money, num, crest, avatar, ovrBadge, posBadge, clubCell, autosave, applySettingsToBody, renderRoute, tone } from './ui.js';
import * as G from './game.js';
import { LEAGUES, COUNTRIES, POSITIONS, POS_ORDER } from './data.js';
import { downloadFile, readUploadedFile, compressText, decompressText } from './saveio.js';
import { resizeImage, advanceWeek, playBarHTML, playBarMount, countryName, leagueName } from './screens.js';
import { clamp } from './util.js';

const S = () => App.state;

// ============================================================
// CALENDÁRIO
// ============================================================
let calWeek = null;
export const calendarScreen = {
  html() {
    const s = S();
    if (!calWeek || calWeek < 1) calWeek = s.week;
    const rows = [];
    for (const comp of s.competitions) {
      for (const f of comp.fixtures.filter((x) => x.week === calWeek)) {
        if (f.home === s.clubId || f.away === s.clubId || comp.type === 'league' && comp.teams.includes(s.clubId) && comp.id.startsWith('L_')) {
          rows.push({ comp, f, mine: f.home === s.clubId || f.away === s.clubId });
        }
      }
    }
    rows.sort((a, b) => (b.mine - a.mine));
    const next = [];
    for (let w = s.week; w <= s.week + 7; w++) {
      for (const comp of s.competitions) {
        for (const f of comp.fixtures.filter((x) => x.week === w && !x.played && (x.home === s.clubId || x.away === s.clubId))) {
          next.push({ comp, f });
        }
      }
    }
    return `
    <div class="stack">
      <div class="card" style="display:flex;align-items:center;gap:12px;justify-content:space-between">
        <button class="btn small" data-w="-1">${icon('back')} Semana -</button>
        <div style="font-weight:900;font-size:1.1rem">Semana ${calWeek} <span class="tiny muted">de ${s.year}</span></div>
        <button class="btn small" data-w="1">Semana + ${icon('play')}</button>
      </div>
      <div class="card">
        <div class="h-sec">Jogos da semana</div>
        ${rows.length ? rows.map(({ comp, f, mine }) => `
          <div class="tie" style="${mine ? 'border-color:var(--accent)' : ''}">
            <div>${clubCell(s, f.home)} <b style="margin:0 6px">×</b> ${clubCell(s, f.away)}<div class="tiny muted">${esc(comp.short)} • R${f.round}</div></div>
            <div class="tscore">${f.played ? `${f.gh} × ${f.ga}${f.pen ? `<div class="tiny muted">pên ${f.pen.h}-${f.pen.a}</div>` : ''}` : `<span class="pill">a jogar</span>`}</div>
          </div>`).join('') : '<div class="empty">Nenhum jogo nesta semana.</div>'}
      </div>
      <div class="card">
        <div class="h-sec">Sua agenda — próximas semanas</div>
        ${next.length ? next.map(({ comp, f }) => `
          <div class="news-item"><span class="wk">S${f.week}</span><span><b>${esc(comp.name)}</b> — ${esc(s.db.clubs[f.home].short)} × ${esc(s.db.clubs[f.away].short)} ${f.home === s.clubId ? '(casa)' : '(fora)'}</span></div>`).join('') : '<div class="tiny muted">Agenda livre.</div>'}
      </div>
      <div class="card">${playBarHTML()}</div>
    </div>`;
  },
  mount(el) {
    el.querySelectorAll('[data-w]').forEach((b) => b.onclick = () => { calWeek = Math.max(1, calWeek + Number(b.dataset.w)); renderRoute(); });
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
    if (q) q.onchange = () => { mkt.q = q.value; renderRoute(); };
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
      if (s.finances.balance < 3e6) { toast('Caixa insuficiente.', 'error'); return; }
      s.finances.balance -= 3e6;
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
          ${rows.map(([pid, g], i) => { const p = s.db.players[pid]; return `<div class="hall-card" style="padding:8px 0;border-bottom:1px solid rgba(35,49,82,.5)"><span class="hall-num">${i + 1}</span>${p ? `${avatar(p, 30)}<div style="flex:1"><b>${esc(p.name)}</b><div class="tiny muted">${p.clubId ? esc(s.db.clubs[p.clubId]?.short || '') : ''}</div></div><span style="font-weight:900;font-size:1.15rem">${g}</span>` : '—'}</div>`; }).join('') || '<div class="muted">Sem gols ainda.</div>'}
        </div>
        <div class="card"><div class="h-sec">Assistências</div>
          ${as.map(([pid, g], i) => { const p = s.db.players[pid]; return `<div class="hall-card" style="padding:8px 0;border-bottom:1px solid rgba(35,49,82,.5)"><span class="hall-num">${i + 1}</span>${p ? `<div style="flex:1"><b>${esc(p.name)}</b><div class="tiny muted">${p.clubId ? esc(s.db.clubs[p.clubId]?.short || '') : ''}</div></div><span style="font-weight:900">${g}</span>` : '—'}</div>`; }).join('') || '<div class="muted">—</div>'}
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
        ${recs.map(([k, r]) => { const p = s.db.players[r.playerId]; return `<div class="hall-card" style="padding:10px 0;border-bottom:1px solid rgba(35,49,82,.5)">${icon('fire')}<div style="flex:1;margin-left:8px"><b>${esc(k.replace(/^L_|^C_|^CONT_/, ''))}</b><div class="tiny muted">${p ? esc(p.name) : '—'} em ${r.year}</div></div><span style="font-weight:900;color:var(--gold)">${r.goals} gols</span></div>`; }).join('') || '<div class="muted">Os recordes serão definidos ao fim da primeira temporada.</div>'}</div>`;
    } else {
      const topScorers = Object.values(s.db.players).sort((a, b) => b.career.goals - a.career.goals).slice(0, 10);
      const topAssists = Object.values(s.db.players).sort((a, b) => b.career.assists - a.career.assists).slice(0, 10);
      body = `<div class="grid cols-2">
        <div class="card"><div class="h-sec">⭐ Hall da Fama — Gols na carreira</div>
          ${topScorers.map((p, i) => `<div class="hall-card" style="padding:8px 0;border-bottom:1px solid rgba(35,49,82,.5)"><span class="hall-num">${i + 1}</span>${avatar(p, 30)}<div style="flex:1"><b>${esc(p.name)}</b><div class="tiny muted">${p.clubId ? esc(s.db.clubs[p.clubId]?.short || '') : ''} • ${p.pos}</div></div><span style="font-weight:900">${p.career.goals}</span></div>`).join('')}</div>
        <div class="card"><div class="h-sec">🎯 Assistências na carreira</div>
          ${topAssists.map((p, i) => `<div class="hall-card" style="padding:8px 0;border-bottom:1px solid rgba(35,49,82,.5)"><span class="hall-num">${i + 1}</span>${avatar(p, 30)}<div style="flex:1"><b>${esc(p.name)}</b><div class="tiny muted">${p.clubId ? esc(s.db.clubs[p.clubId]?.short || '') : ''} • ${p.pos}</div></div><span style="font-weight:900">${p.career.assists}</span></div>`).join('')}</div>
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
          ${[['verde', '#22c55e'], ['azul', '#38bdf8'], ['roxo', '#a78bfa'], ['dourado', '#f5c542'], ['vermelho', '#fb7185']].map(([k, c]) => `<button class="chip ${st.accent === k ? 'active' : ''}" data-set="accent:${k}"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c};margin-right:6px;vertical-align:-2px"></span>${k}</button>`).join('')}
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
          <input class="input" type="number" id="inf-val" value="${st.infiniteMoneyValue || 999999999}" min="1" step="1000000" style="width:220px"></div>
          <button class="chip ${st.quality === 'alta' ? 'active' : ''}" data-set="quality:alta">Alta (animações)</button>
          <button class="chip ${st.quality === 'baixa' ? 'active' : ''}" data-set="quality:baixa">Baixa (desempenho)</button>
        </div></div>
        <div class="tiny muted">As configurações são salvas automaticamente.</div>
        ${App.state ? '' : `<button class="btn ghost block" data-back>${icon('back')} Voltar ao menu</button>`}
      </div>
    </div>`;
  },
  mount(el) {
    const st = S() ? S().settings : App.bootSettings;
    const persist = () => {
      if (S()) autosave();
      else { try { App.storage.setItem('fm_boot_settings', JSON.stringify(st)); } catch {} }
      applySettingsToBody();
      if (!S()) renderRoute();
    };
    el.querySelectorAll('[data-set]').forEach((b) => b.onclick = () => {
      const [k, v] = b.dataset.set.split(':');
      st[k] = v; applySettingsToBody(); persist();
      renderRoute();
    });
    el.querySelector('#set-speed').oninput = (e) => { st.speed = Number(e.target.value); persist(); renderRoute(); };
    const vol = el.querySelector('#set-vol');
    vol.oninput = () => { st.volume = Number(vol.value); el.querySelector('#vol-v').textContent = vol.value; persist(); };
    vol.onchange = () => tone(700, 0.15, 'triangle');
    const infVal = el.querySelector('#inf-val');
    if (infVal) {
      infVal.oninput = () => { st.infiniteMoneyValue = Number(infVal.value) || 999999999; persist(); renderRoute(); };
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
// CAIXA DE ENTRADA
// ============================================================
export const inboxScreen = {
  html() {
    const s = S();
    return `
    <div class="stack" style="max-width:720px;margin:0 auto">
      <div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <b style="font-size:1.1rem">${icon('mail')} Caixa de entrada</b>
        <button class="btn small ghost" data-clear>Limpar lidas</button>
      </div>
      ${s.inbox.length ? s.inbox.map((i) => {
        const p = i.playerId ? s.db.players[i.playerId] : null;
        let actions = '';
        if (i.type === 'bid' && p) {
          actions = `<div class="inbox-actions">
            <button class="btn small primary" data-bid="${i.offerId}:accept">Vender</button>
            <button class="btn small" data-bid="${i.offerId}:counter">Negociar +15%</button>
            <button class="btn small danger" data-bid="${i.offerId}:reject">Recusar</button></div>`;
        } else if (i.type === 'offerAccepted') {
          actions = `<div class="inbox-actions"><button class="btn small primary" data-confirm="${i.offerId}">✅ Confirmar contratação</button></div>`;
        } else if (i.type === 'offerCounter') {
          actions = `<div class="inbox-actions"><button class="btn small primary" data-goto-market>Aceitar ${esc(i.counter ? 'e reenviar' : '')}</button></div>`;
        }
        return `<div class="inbox-item ${i.read ? '' : 'unread'}">
          <div class="it-title">${esc(i.title)}</div>
          <div class="it-text">${esc(i.text)}</div>
          <div class="tiny muted" style="margin-top:6px">Semana ${i.week} • Temporada ${s.season}</div>
          ${actions}
        </div>`;
      }).join('') : `<div class="card empty">${icon('mail')}<div>Caixa vazia. Propostas e respostas aparecem aqui.</div></div>`}
    </div>`;
  },
  mount(el) {
    const s = S();
    el.querySelectorAll('[data-bid]').forEach((b) => b.onclick = () => {
      const [id, act] = b.dataset.bid.split(':');
      G.respondBid(s, id, act);
      autosave(); renderRoute();
    });
    el.querySelectorAll('[data-confirm]').forEach((b) => b.onclick = () => {
      const r = G.confirmBuy(s, b.dataset.confirm);
      toast(r.ok ? '✅ Reforço confirmado!' : (r.msg || 'Falhou'), r.ok ? 'ok' : 'error');
      autosave(); renderRoute();
    });
    el.querySelector('[data-goto-market]')?.addEventListener('click', () => go('market'));
    el.querySelector('[data-clear]').onclick = () => { s.inbox = s.inbox.filter((i) => !i.read); autosave(); renderRoute(); };
    // marca como lidas
    setTimeout(() => { s.inbox.forEach((i) => { i.read = true; }); }, 600);
  },
};
