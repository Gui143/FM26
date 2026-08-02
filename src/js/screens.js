// ============================================================
// screens.js — Telas principais: menu, criação de personagem,
// home (vida do craque). Vida de Craque 26 — BitLife × FIFA
// ============================================================
import {
  App, icon, toast, openModal, closeModal, confirmBox, go, esc, money, num,
  avatarEl, crest, ovrBadge, posBadge, meter, lifeMeter, pill, autosave, t,
  renderRoute, applySettingsToBody, tone, goalSound,
} from './ui.js';
import * as G from './game.js';
import { COUNTRIES, CITIES, CLUBS, LEAGUES, countryById, CAREER_POSITIONS, TRAITS, positionById, TRAININGS } from './data.js';

const S = () => App.state;

// ============================================================
// MENU PRINCIPAL — NEYMAR HERO + RESPONSIVE
// ============================================================
export const menuScreen = {
  html() {
    const slots = App.storage ? G.saveSlots(App.storage) : {};
    const hasAuto = !!slots.auto;
    return `
    <div class="menu-wrap">
      <div class="menu-logo"><span class="menu-ball">⚽</span></div>
      <div class="menu-title">VIDA DE<br><span>CRAQUE 26</span></div>
      <p class="menu-sub">O jogo de carreira de jogador MAIS IMERSIVO DO MUNDO.<br>Até 90 anos • Rede social real • Carros reais • Fale o que quiser.</p>
      <div class="menu-buttons">
        ${hasAuto ? `<button class="btn primary big" data-m="continue">${icon('play')} Continuar — ${esc(slots.auto.playerName)} (${slots.auto.age} anos, OVR ${slots.auto.ovr})</button>` : ''}
        <button class="btn ${hasAuto ? '' : 'primary'} big" data-m="new">${icon('plus')} Novo Jogo</button>
        <button class="btn" data-m="load">${icon('save')} Carregar Save</button>
        <button class="btn" data-m="howto">${icon('info')} Como Jogar</button>
        <button class="btn" data-m="settings">${icon('gear')} Configurações</button>
        <button class="btn" data-m="credits">${icon('award')} Créditos</button>
      </div>
      <div class="menu-foot">v26 • Glassmorphism • carreira viva • modo offline disponível</div>
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
// CRIAÇÃO DE PERSONAGEM (Novo Jogo)
// ============================================================
const WIZARD_CLUBS = Object.entries(CLUBS).flatMap(([leagueId, rows]) => rows.map((row, index) => ({
  id: `${leagueId}_${index}`,
  leagueId,
  league: LEAGUES.find((l) => l.id === leagueId)?.name || leagueId,
  name: row[0],
  city: row[2],
})));
const wizard = { name: '', gender: 'M', country: 'br', city: '', foot: 'D', clubId: '', position: 'ATA', traits: [], startAge: 5 };

export const newGameScreen = {
  html() {
    const pos = CAREER_POSITIONS.find((p) => p.id === wizard.position) || CAREER_POSITIONS[0];
    return `
    <div class="menu-wrap" style="max-width:680px;text-align:left">
      <div style="text-align:center;margin-bottom:16px">
        <div class="menu-title" style="font-size:1.7rem">NASCER <span>PRA JOGAR</span></div>
        <p class="menu-sub" style="margin:6px 0 0">Crie seu personagem e comece sua história. Suas escolhas moldam a lenda.</p>
      </div>
      <div class="card stack">
        <div class="field">
          <label>1. Nome completo</label>
          <input class="input" id="w-name" maxlength="28" placeholder="Ex.: Neymar da Silva Santos" value="${esc(wizard.name)}">
        </div>
        <div class="field">
          <label>2. Gênero</label>
          <div class="seg">
            <button class="chip ${wizard.gender === 'M' ? 'active' : ''}" data-g="M">👨 Masculino</button>
            <button class="chip ${wizard.gender === 'F' ? 'active' : ''}" data-g="F">👩 Feminino</button>
          </div>
        </div>
        <div class="field">
          <label>3. Nacionalidade</label>
          <div class="chips" id="w-countries">${COUNTRIES.map((c) => `<button class="chip ${wizard.country === c.id ? 'active' : ''}" data-c="${c.id}">${c.flag} ${esc(c.name)}</button>`).join('')}</div>
        </div>
        <div class="field two-col-fields">
          <div>
            <label for="w-city">4. Cidade <span class="muted">(opcional)</span></label>
            <input class="input" id="w-city" maxlength="48" placeholder="Ex.: Recife" value="${esc(wizard.city)}" list="w-city-list">
            <datalist id="w-city-list">${(CITIES[wizard.country] || []).map((city) => `<option value="${esc(city)}"></option>`).join('')}</datalist>
            <div class="tiny muted">Se deixar vazio, uma cidade compatível será escolhida.</div>
          </div>
          <div>
            <label for="w-foot">5. Perna dominante</label>
            <select class="input" id="w-foot">
              <option value="D" ${wizard.foot === 'D' ? 'selected' : ''}>🦶 Direita</option>
              <option value="E" ${wizard.foot === 'E' ? 'selected' : ''}>🦶 Esquerda</option>
              <option value="AMB" ${wizard.foot === 'AMB' ? 'selected' : ''}>🦶 Ambidestro</option>
            </select>
            <div class="tiny muted">A perna escolhida aparece na ficha do jogador.</div>
          </div>
        </div>
        <div class="field">
          <label>6. Clube de formação <span class="muted">(opcional)</span></label>
          <select class="input" id="w-club">
            <option value="">Sem clube definido — deixar o futebol decidir</option>
            ${WIZARD_CLUBS.map((c) => `<option value="${c.id}" ${wizard.clubId === c.id ? 'selected' : ''}>${esc(c.name)} — ${esc(c.league)} · ${esc(c.city)}</option>`).join('')}
          </select>
          <div class="tiny muted">Aos 16/18 anos, o clube escolhido vira seu ponto de partida. Antes disso é apenas uma preferência: ainda será preciso passar na peneira.</div>
        </div>
        <div class="field">
          <label>7. Posição</label>
          <div class="chips" id="w-pos">${CAREER_POSITIONS.map((p) => `<button class="chip ${wizard.position === p.id ? 'active' : ''}" data-p="${p.id}" title="${esc(p.desc)}">${p.icon} ${esc(p.name)}</button>`).join('')}</div>
          <div class="tiny muted" id="w-posdesc">${esc(pos.desc)}</div>
        </div>
        <div class="field">
          <label>8. Traços de personalidade (escolha até 2)</label>
          <div class="chips" id="w-traits">${TRAITS.map((tr) => `<button class="chip ${wizard.traits.includes(tr.id) ? 'active' : ''}" data-t="${tr.id}" title="${esc(tr.desc)}">${tr.icon} ${esc(tr.name)}</button>`).join('')}</div>
          <div class="tiny muted">Os traços afetam eventos, evolução e fama durante toda a vida.</div>
        </div>
        <div class="field">
          <label>9. Começar em qual idade?</label>
          <div class="startage-grid" id="w-age">
            ${[
              { v: 5, icon: '🧒', name: 'Infância', desc: '5 anos — experiência completa: escola, escolinha, peneira…' },
              { v: 12, icon: '🎒', name: 'Adolescência', desc: '12 anos — já na escolinha, rumo à peneira.' },
              { v: 16, icon: '🌱', name: 'Base', desc: '16 anos — contrato juvenil num clube, luta pela promoção.' },
              { v: 18, icon: '🚀', name: 'Profissional', desc: '18 anos — estreia direto no futebol profissional.' },
            ].map((o) => `<button class="age-card ${wizard.startAge === o.v ? 'sel' : ''}" data-v="${o.v}"><span class="age-ico">${o.icon}</span><span><b>${o.name}</b><small>${o.desc}</small></span></button>`).join('')}
          </div>
        </div>
        <button class="btn primary big block" id="w-start">${icon('play')} Começar a vida</button>
        <button class="btn ghost block" data-back>${icon('back')} Voltar ao menu</button>
      </div>
    </div>`;
  },
  mount(el) {
    const nameInp = el.querySelector('#w-name');
    nameInp.oninput = () => { wizard.name = nameInp.value; };
    el.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => { wizard.gender = b.dataset.g; renderRoute(); });
    el.querySelectorAll('#w-countries [data-c]').forEach((b) => b.onclick = () => { wizard.country = b.dataset.c; renderRoute(); });
    const cityInp = el.querySelector('#w-city');
    cityInp.oninput = () => { wizard.city = cityInp.value; };
    el.querySelector('#w-foot').onchange = (e) => { wizard.foot = e.target.value; };
    el.querySelector('#w-club').onchange = (e) => { wizard.clubId = e.target.value; };
    el.querySelectorAll('#w-pos [data-p]').forEach((b) => b.onclick = () => { wizard.position = b.dataset.p; renderRoute(); });
    el.querySelectorAll('#w-traits [data-t]').forEach((b) => b.onclick = () => {
      const id = b.dataset.t;
      if (wizard.traits.includes(id)) wizard.traits = wizard.traits.filter((x) => x !== id);
      else if (wizard.traits.length < 2) wizard.traits.push(id);
      renderRoute();
    });
    el.querySelectorAll('#w-age [data-v]').forEach((b) => b.onclick = () => { wizard.startAge = Number(b.dataset.v); renderRoute(); });
    el.querySelector('[data-back]').onclick = () => go('menu');
    el.querySelector('#w-start').onclick = () => {
      const name = wizard.name.trim();
      if (name.length < 3) { toast('Escreva o nome completo do seu craque.', 'error'); return; }
      const menuRoot = document.getElementById('menu-root');
      menuRoot.innerHTML = `<div class="menu-wrap"><div class="sim-loading"><div class="spinner"></div><div class="muted">Nascendo… ${esc(name)} está chegando ao mundo ⚽</div></div></div>`;
      setTimeout(() => {
        App.onNewGame({ ...wizard, name });
      }, 50);
    };
  },
};

// ============================================================
// DECISÃO DE VIDA (evento pendente) — modal compartilhado
// ============================================================
export function openPendingModal(s) {
  const p = s.pending;
  if (!p) return;
  openModal(`
    <div class="decision-card">
      <div class="modal-title">${esc(p.title)}</div>
      <p class="decision-text">${esc(p.text)}</p>
      ${p.hint ? `<p class="tiny muted" style="margin-bottom:12px">💡 ${esc(p.hint)}</p>` : ''}
      <div class="decision-choices">
        ${p.choices.map((c, i) => `<button class="btn block choice" data-c="${i}"><span>${esc(c.label)}</span>${c.hint ? `<small>${esc(c.hint)}</small>` : ''}</button>`).join('')}
      </div>
    </div>`, (m) => {
    m.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => {
      const i = Number(b.dataset.c);
      const r = G.decidePending(s, i);
      closeModal();
      if (r.ok) {
        tone(700, 0.1, 'triangle');
        autosave();
        renderRoute();
        toast(r.result?.news ? '✅ Decisão tomada.' : '✅ Decisão tomada.');
      } else {
        toast(r.msg || 'Erro.', 'error');
      }
    });
  });
}

// ============================================================
// HOME — a vida do craque
// ============================================================
export const homeScreen = {
  html() {
    const s = S();
    const p = s.player;
    const club = G.myClub(s);
    const pos = positionById(p.position);
    const tny = G.tournamentFor(s.calendar.year);
    const unread = s.inbox.filter((i) => !i.read).length;
    const news = s.inbox.slice(0, 4);
    const upcoming = s.matches.filter((f) => !f.played);
    const played = s.matches.filter((f) => f.played);
    const season = s.career.season;
    const nextMatch = upcoming[0] || null;

    return `
    <div class="vc-home">
      ${s.pending ? `
      <!-- ALERTA DE DECISÃO PENDENTE -->
      <div class="card alert-banner" data-open-pending style="cursor:pointer;margin-bottom:16px">
        <div class="alert-ico">${icon('alert')}</div>
        <div class="alert-body">
          <div class="alert-title">⚠️ DECISÃO PENDENTE: ${esc(s.pending.title)}</div>
          <div class="tiny muted">Clique aqui para responder e continuar sua trajetória no futebol</div>
        </div>
        <div class="alert-action"><button class="btn small primary">Responder</button></div>
      </div>` : ''}

      <!-- HERO: FICHA DO CRAQUE (GLASSMORPHISM + DESTAQUE ESPECULAR) -->
      <section class="player-hero card">
        <div class="ph-left">
          ${avatarEl(p.name, 86, 'font-weight:900;border:2px solid var(--accent)')}
          <div class="ph-identity">
            <div class="ph-eyebrow">${countryById(p.country)?.flag || '🌍'} ${esc(countryById(p.country)?.name || p.country)} • ${p.city ? esc(p.city) : ''}</div>
            <h1 class="ph-name">${esc(p.name)}</h1>
            <div class="ph-meta">
              ${posBadge(p.position)} <span class="ph-age">${p.age} ANOS</span> <span class="pill ghost">${p.foot === 'D' ? '🦶 Destro' : p.foot === 'AMB' ? '🦶 Ambidestro' : '🦶 Canhoto'}</span>
              <span class="ph-phase">${G.phaseLabel(s)}</span>
            </div>
          </div>
        </div>
        <div class="ph-right">
          <div class="ph-ovr-box">
            ${ovrBadge(p.ovr, 68)}
            <span class="ph-tier ${ovrTierClass(p.ovr)}">${ovrTierLabel(p.ovr)}</span>
            <div class="ph-pot tiny muted">POT <b>${p.pot}</b></div>
          </div>
          <div class="ph-club">
            ${(club && s.career.contract && s.career.contract.until >= s.calendar.year) ? 
              `${crest(club, 48)}<div><div class="ph-clubname">${esc(club.name)}</div><div class="tiny muted">${esc(club.league)}</div></div>
              <div class="ph-contract">R$ ${num(s.career.contract.salary)}/mês</div>` : 
              club ? `${crest(club, 48)}<div><div class="ph-clubname">${esc(club.name)}</div><div class="tiny muted">Sem contrato ativo</div></div>` : 
              `<div class="ph-clubname">⚽ Sem clube</div><div class="tiny muted">${p.phase === "retired" ? "Aposentado(a)" : "Em busca de um time"}</div>`}
            <div class="ph-value">${money(p.value)}</div>
          </div>
          <div class="ph-stats-grid">
            <div class="kpi card"><div class="v">${season.goals}</div><div class="l">GOLS</div></div>
            <div class="kpi card"><div class="v">${season.assists}</div><div class="l">ASSIST.</div></div>
            <div class="kpi card"><div class="v">${season.apps > 0 ? (season.ratingSum / season.apps).toFixed(1) : '-'}</div><div class="l">NOTA</div></div>
            <div class="kpi card"><div class="v">${season.apps}</div><div class="l">JOGOS</div></div>
          </div>
        </div>
      </section>

      <!-- ATRIBUTOS VITAIS DO ATLETA (HIERARQUIA VISUAL + GLOW DINÂMICO) -->
      <section class="card life-grid-wrapper" style="margin-top:16px">
        <div class="h-sec">⚡ ATRIBUTOS VITAIS DO ATLETA</div>
        <div class="life-grid">
          ${lifeMeter('SAÚDE', p.health, '❤️', 'var(--red)')}
          ${lifeMeter('ENERGIA', p.energy !== undefined ? p.energy : p.fitness, '⚡', 'var(--yellow)')}
          ${lifeMeter('FORMA', p.form, '🔥', 'var(--accent)')}
          ${lifeMeter('MORAL', p.morale, '😊', 'var(--blue)')}
          ${lifeMeter('FELICIDADE', p.happiness !== undefined ? p.happiness : p.morale, '😄', 'var(--green)')}
        </div>
      </section>

      <!-- PAINEL CENTRAL DE COMANDO DO ATLETA (ASSIMÉTRICO: PARTIDAS EM DESTAQUE) -->
      <section class="action-dashboard">
        <button class="action-card action-side" data-go="training">
          <div class="action-ico">${icon('whistle')}</div>
          <div class="action-body">
            <span class="action-title">TREINAR</span>
            <small class="action-sub">Evoluir OVR & Atributos</small>
          </div>
        </button>

        <button class="action-card action-center action-primary" data-go="match">
          <div class="action-highlight">AÇÃO PRINCIPAL</div>
          <div class="action-ico-lg">${icon('play')}</div>
          <div class="action-body">
            <span class="action-title-lg">PARTIDAS</span>
            <small class="action-sub-lg">${nextMatch ? `Próximo: vs <b>${esc(G.oppInfo(s, nextMatch).name)}</b> (${nextMatch.home ? 'Casa' : 'Fora'})` : 'Calendário & Torneios'}</small>
          </div>
          <div class="action-arrow">➔</div>
        </button>

        <button class="action-card action-side" data-act="advance">
          <div class="action-ico">${icon('calendar')}</div>
          <div class="action-body">
            <span class="action-title">AVANÇAR MÊS</span>
            <small class="action-sub">${G.MONTHS_FULL[Math.max(0, s.calendar.month - 1)]} de ${s.calendar.year}</small>
          </div>
        </button>
      </section>

      <!-- PRÓXIMAS PARTIDAS & HISTÓRICO RECENTE -->
      <section class="card fixtures-card" style="margin-top:16px">
        <div class="h-sec" style="display:flex;justify-content:space-between;align-items:center">
          <span>📅 PRÓXIMAS PARTIDAS</span>
          <button class="btn ghost small" data-go="match">${icon('table')} Ver Todos</button>
        </div>
        <div class="fixtures-list">
          ${upcoming.slice(0, 3).map((f) => fixtureRow(s, f, true)).join('')}
          ${upcoming.length === 0 && played.length > 0 ? `<div class="tiny muted" style="margin-bottom:8px">Últimos jogos realizados:</div>` + played.slice(0, 2).map((f) => fixtureRow(s, f, false)).join('') : ''}
          ${upcoming.length === 0 && played.length === 0 ? `<div class="muted" style="padding:16px 0;text-align:center">${p.phase === 'child' || p.phase === 'teen' ? '🧒 Você está na categoria de base/escolinha. Treine e avance meses para disputar partidas da sua categoria!' : '⚽ Nenhuma partida marcada no momento. Avançe o mês ou confira os campeonatos.'}</div>` : ''}
        </div>
      </section>

      <!-- FAMA E DINHEIRO -->
      <section class="card fame-card" style="margin-top:16px">
        <div class="h-sec">⭐ FAMA E FINANÇAS</div>
        <div class="fame-row">
          <div class="meter" style="margin-bottom:10px"><span class="tiny muted" style="min-width:86px">FAMA</span><div class="bar"><i style="width:${Math.max(0, p.fame)}%;background:var(--gold)"></i></div><span class="val">${Math.round(p.fame)}</span></div>
          <div class="fame-stats-row">
            <div class="f-item"><span>📱 SEGUIDORES</span><b class="val-big">${num(p.followers)}</b></div>
            <div class="f-item"><span>💰 SALDO BANCÁRIO</span><b class="val-big">${money(s.life.bank)}</b></div>
            ${s.career.contract ? `<div class="f-item"><span>✍️ CONTRATO</span><b class="val-big">Até ${s.career.contract.until}</b></div>` : ''}
            ${s.career.contract ? `<div class="f-item"><span>🔒 CLÁUSULA</span><b class="val-big">R$ ${num(s.career.contract.releaseClause)}</b></div>` : ''}
          </div>
        </div>
      </section>

      <!-- NOTÍCIAS -->
      <section class="card news-card" style="margin-top:16px">
        <div class="h-sec" style="display:flex;justify-content:space-between;align-items:center">📰 NOTÍCIAS DO FUTEBOL ${unread ? `<button class="btn small primary" data-act="readall">Marcar lidas</button>` : ''}</div>
        <div class="news-list">
          ${news.map((n) => newsRow(n)).join('')}
          ${news.length === 0 ? '<div class="muted">Nenhuma notícia ainda. Sua história começa agora!</div>' : ''}
        </div>
      </section>
    </div>`;
  },
  mount(el) {
    const s = S();
    el.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
    el.querySelector('[data-open-pending]')?.addEventListener('click', () => openPendingModal(s));
    el.querySelector('[data-act=readall]')?.addEventListener('click', () => { G.markAllRead(s); autosave(); renderRoute(); });
    el.querySelector('[data-act=advance]')?.addEventListener('click', () => advanceMonthUI());
    el.querySelectorAll('[data-play]').forEach((b) => b.onclick = () => {
      if (s.player.injured > 0) { toast('Você está lesionado!', 'error'); return; }
      go(`match/play/${b.dataset.play}`);
    });
    el.querySelectorAll('[data-quick]').forEach((b) => b.onclick = () => {
      const r = G.quickSimMatch(s, b.dataset.quick);
      autosave();
      toast(r.ok ? `⚽ Simulado: ${r.fx.gh}×${r.fx.ga} (nota ${r.fx.rating})` : (r.msg || 'Erro.'), r.ok ? 'ok' : 'error');
      renderRoute();
    });
  },
};

function inFootballPhase(s) { return ['base', 'pro', 'vet'].includes(s.player.phase); }

// Patamar do jogador (estilo "O FENÔMENO")
function ovrTierLabel(ovr) {
  if (ovr >= 90) return 'O FENÔMENO';
  if (ovr >= 82) return 'CRAQUE';
  if (ovr >= 72) return 'DESTAQUE';
  if (ovr >= 60) return 'PROFISSIONAL';
  return 'PROMESSA';
}
function ovrTierClass(ovr) {
  if (ovr >= 90) return 'tier-legend';
  if (ovr >= 82) return 'tier-star';
  if (ovr >= 72) return 'tier-pro';
  if (ovr >= 60) return 'tier-solid';
  return 'tier-rookie';
}

function fixtureRow(s, f, upcoming) {
  const opp = G.oppInfo(s, f);
  const res = f.result === 'W' ? '<span class="fx-res win">VITÓRIA</span>' : f.result === 'L' ? '<span class="fx-res loss">DERROTA</span>' : f.result === 'D' ? '<span class="fx-res">EMPATE</span>' : '';
  const isNT = f.type === 'nt';
  const badge = isNT ? `<span class="pill blue">${esc(f.compName)}</span>` : `<span class="pill">${esc(f.compName)}</span>`;
  const oppClub = (s.db.clubs || {})[f.oppId] || { id: f.oppId, name: opp.name || 'Adversário', short: (opp.name || 'ADV').slice(0, 3).toUpperCase(), colors: ['#2a2a33', '#16161b'] };
  return `
  <div class="fixture-row ${upcoming ? '' : 'played'}">
    <div class="fx-crest">${isNT ? `<span class="avatar" style="width:34px;height:34px">${countryById(f.oppCountry)?.flag || '🌍'}</span>` : crest(oppClub, 34)}</div>
    <div class="fx-info">
      <div class="fx-name">${isNT ? `${countryById(f.oppCountry)?.flag || ''} ${esc(opp.name)}` : esc(opp.name)}</div>
      <div class="tiny muted">${badge} ${f.home ? '🏟️ Casa' : '✈️ Fora'}${f.played ? ` • ${f.gh}×${f.ga}` : ''}</div>
    </div>
    ${f.played ? `<div class="fx-right"><div class="fx-score-sm">${f.rating != null ? `Nota <b>${f.rating}</b>` : ''}${f.goals ? ` • ${f.goals}⚽` : ''}${f.motm ? ' ⭐' : ''}</div>${res}</div>`
    : `<div class="fx-right"><button class="btn small primary" data-play="${f.id}">${icon('play')} Jogar</button><button class="btn small" data-quick="${f.id}">Simular</button></div>`}
  </div>`;
}

export function newsRow(n) {
  const icons = { info: '📌', club: '🏟️', vida: '💬', clube: '🏟️', selecao: '🦅', fama: '⭐', money: '💰', star: '⭐', trophy: '🏆', injury: '🤕' };
  return `<div class="news-item ${n.read ? '' : 'unread'}" data-news="${n.id}"><span class="news-ico">${icons[n.type] || '📌'}</span><div class="news-body"><div class="news-text">${esc(n.text)}</div><div class="tiny muted">${esc(n.date)}</div></div></div>`;
}

// Avança o mês com spinner e lida com pendências
export function advanceMonthUI(afterRoute = 'home') {
  const s = S();
  if (s.pending) {
    openPendingModal(s);
    return;
  }
  const el = document.getElementById('screen');
  el.innerHTML = `<div class="sim-loading"><div class="spinner"></div><div class="muted">A vida segue… ${G.MONTHS_FULL[Math.max(0, s.calendar.month - 1)]} de ${s.calendar.year}</div></div>`;
  setTimeout(() => {
    const r = G.advanceMonth(s);
    autosave();
    if (r.ok === false) {
      toast(r.msg || 'Você precisa tomar uma decisão antes.', 'error');
      go(afterRoute); renderRoute(); openPendingModal(s);
      return;
    }
    if (r.seasonEnded) toast('🏁 Temporada encerrada! Confira os prêmios no Início.', 'ok', 4500);
    if (r.death) {
      go('hall'); renderRoute();
      return;
    }
    if (s.player.phase === 'retired' && !s.player.legacy) {
      // caiu na aposentadoria por evento
    }
    go(afterRoute);
    renderRoute();
    if (s.pending) {
      setTimeout(() => openPendingModal(s), 250);
    } else if (r.autoSim) {
      toast(`⚽ ${r.autoSim} partida(s) foram simuladas.`, 'ok', 2600);
    }
  }, 90);
}
