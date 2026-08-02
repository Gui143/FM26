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
import { COUNTRIES, countryById, POSITIONS, TRAITS, positionById, clubById, TRAININGS } from './data.js';

const S = () => App.state;

// ============================================================
// MENU PRINCIPAL
// ============================================================
export const menuScreen = {
  html() {
    const slots = App.storage ? G.saveSlots(App.storage) : {};
    const hasAuto = !!slots.auto;
    return `
    <div class="menu-wrap">
      <div class="menu-logo"><span class="menu-ball">⚽</span></div>
      <div class="menu-title">VIDA DE<br><span>CRAQUE 26</span></div>
      <p class="menu-sub">BitLife × FIFA — viva a vida de um jogador de futebol<br>do campinho de terra ao topo do mundo. Você decide tudo.</p>
      <div class="menu-buttons">
        ${hasAuto ? `<button class="btn primary big" data-m="continue">${icon('play')} Continuar — ${esc(slots.auto.playerName)} (${slots.auto.age} anos, OVR ${slots.auto.ovr})</button>` : ''}
        <button class="btn ${hasAuto ? '' : 'primary'} big" data-m="new">${icon('plus')} Novo Jogo</button>
        <button class="btn" data-m="load">${icon('save')} Carregar Save</button>
        <button class="btn" data-m="howto">${icon('info')} Como Jogar</button>
        <button class="btn" data-m="settings">${icon('gear')} Configurações</button>
        <button class="btn" data-m="credits">${icon('award')} Créditos</button>
      </div>
      <div class="menu-foot">v2.0 • Carreira de jogador • Progresso salvo no seu navegador</div>
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
const wizard = { name: '', gender: 'M', country: 'br', position: 'ATA', traits: [], startAge: 5 };

export const newGameScreen = {
  html() {
    const pos = POSITIONS.find((p) => p.id === wizard.position) || POSITIONS[0];
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
        <div class="field">
          <label>4. Posição</label>
          <div class="chips" id="w-pos">${POSITIONS.map((p) => `<button class="chip ${wizard.position === p.id ? 'active' : ''}" data-p="${p.id}" title="${esc(p.desc)}">${p.icon} ${esc(p.name)}</button>`).join('')}</div>
          <div class="tiny muted" id="w-posdesc">${esc(pos.desc)}</div>
        </div>
        <div class="field">
          <label>5. Traços de personalidade (escolha até 2)</label>
          <div class="chips" id="w-traits">${TRAITS.map((tr) => `<button class="chip ${wizard.traits.includes(tr.id) ? 'active' : ''}" data-t="${tr.id}" title="${esc(tr.desc)}">${tr.icon} ${esc(tr.name)}</button>`).join('')}</div>
          <div class="tiny muted">Os traços afetam eventos, evolução e fama durante toda a vida.</div>
        </div>
        <div class="field">
          <label>6. Começar em qual idade?</label>
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
        const state = G.createNewGame({ ...wizard, name }, { ...App.bootSettings });
        G.writeSlot(App.storage, 'auto', state);
        App.state = state;
        applySettingsToBody();
        go('home');
        renderRoute();
        toast(`👶 ${state.player.name} nasceu em ${state.player.city}!`);
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

    return `
    <div class="vc-home">
      <!-- HERO: ficha do jogador -->
      <section class="player-hero card">
        <div class="ph-left">
          ${avatarEl(p.name, 84, 'font-weight:900;border:2px solid var(--accent)')}
          <div class="ph-identity">
            <div class="ph-eyebrow">${countryById(p.country)?.flag || '🌍'} ${esc(countryById(p.country)?.name || p.country)} • ${p.city ? esc(p.city) : ''}</div>
            <h1 class="ph-name">${esc(p.name)}</h1>
            <div class="ph-meta">
              ${posBadge(p.position)} <span class="ph-age">${p.age} anos</span> ${p.foot === 'D' ? '🦶 Direito' : '🦶 Canhoto'}
              <span class="ph-phase">${G.phaseLabel(s)}</span>
            </div>
          </div>
        </div>
        <div class="ph-right">
          ${ovrBadge(p.ovr, 64)}
          <div class="ph-pot tiny muted">POT ${p.pot}</div>
        </div>
        <div class="ph-club">
          ${club ? `${crest(club, 44)}<div><div class="ph-clubname">${esc(club.name)}</div><div class="tiny muted">${esc(club.league)}</div></div>
            <div class="ph-contract">${s.career.contract ? `R$ ${num(s.career.contract.salary)}/mês` : 'Sem contrato'}</div>` : `<div class="ph-clubname">⚽ Sem clube</div><div class="tiny muted">${p.phase === 'retired' ? 'Aposentado(a)' : 'Em busca de um time'}</div>`}
          <div class="ph-value">${money(p.value)}</div>
        </div>
      </section>

      <!-- VIDA -->
      <section class="grid cols-2" style="margin-top:14px">
        ${lifeMeter('Saúde', p.health, '❤️', 'var(--red)')}
        ${lifeMeter('Felicidade', p.happiness, '😊', 'var(--yellow)')}
        ${lifeMeter('Energia', p.energy, '⚡', 'var(--blue)')}
        ${lifeMeter('Forma', p.form, '🎯', 'var(--accent)')}
      </section>

      ${p.injured > 0 ? `<div class="banner warn">🤕 LESIONADO — fora por ${p.injured} mes(es). Sem treino pesado e sem jogos até recuperar.</div>` : ''}
      ${p.energy <= 20 ? `<div class="banner warn">🪫 Energia baixa! Faça um treino de Descanso ou evite jogar no sacrifício.</div>` : ''}
      ${s.pending ? `<button class="banner decision" data-open-pending>🎲 DECISÃO PENDENTE — ${esc(s.pending.title)} →</button>` : ''}

      <!-- AÇÕES -->
      <section class="quick-actions" style="margin-top:14px">
        <button class="qa" data-go="training">${icon('whistle')}<span><b>Treinar</b><small>${s.training.done ? 'Treino feito' : 'Treino disponível'}</small></span></button>
        <button class="qa" data-go="match">${icon('play')}<span><b>Partidas</b><small>${upcoming.length} jogo(s) no mês</small></span></button>
        <button class="qa" data-act="advance">${icon('refresh')}<span><b>Avançar mês</b><small>${G.currentDate(s)}</small></span></button>
      </section>

      <!-- PRÓXIMOS JOGOS -->
      <section class="card" style="margin-top:14px">
        <div class="h-sec">📅 ${G.MONTHS_FULL[s.calendar.month - 1].toUpperCase()} DE ${s.calendar.year}</div>
        ${upcoming.length === 0 && played.length === 0 && inFootballPhase(s) ? '<div class="muted">Sem jogos este mês.</div>' : ''}
        ${upcoming.map((f) => fixtureRow(s, f, true)).join('')}
        ${played.length ? `<div class="tiny muted" style="margin-top:8px">Jogos disputados este mês:</div>` : ''}
        ${played.slice(0, 4).map((f) => fixtureRow(s, f, false)).join('')}
        ${tny && s.nt.called && [6, 7, 8].includes(s.calendar.month) ? `<div class="banner gold" style="margin-top:10px">🌍 ${tny.name} acontecendo! ${s.career.ntTournament ? `Fase ${s.career.ntTournament.stage}/5` : 'Fase 1/5'}</div>` : ''}
      </section>

      <!-- RESUMO DA TEMPORADA -->
      <section class="grid cols-3" style="margin-top:14px">
        <div class="kpi card"><div class="v">${season.apps}</div><div class="l">Jogos</div></div>
        <div class="kpi card"><div class="v">${season.goals}</div><div class="l">Gols</div></div>
        <div class="kpi card"><div class="v">${season.assists}</div><div class="l">Assistências</div></div>
      </section>

      <!-- FAMA E DINHEIRO -->
      <section class="card" style="margin-top:14px">
        <div class="h-sec">⭐ FAMA E FINANÇAS</div>
        <div class="fame-row">
          <div class="meter" style="margin-bottom:8px"><span class="tiny muted" style="min-width:86px">Fama</span><div class="bar"><i style="width:${Math.max(0, p.fame)}%;background:var(--gold)"></i></div><span class="val">${Math.round(p.fame)}</span></div>
          <div class="tiny muted">📱 ${num(p.followers)} seguidores • 💰 ${money(s.life.bank)} no banco</div>
          ${s.career.contract ? `<div class="tiny muted" style="margin-top:4px">✍️ Contrato até ${s.career.contract.until} • Cláusula de R$ ${num(s.career.contract.releaseClause)}</div>` : ''}
        </div>
      </section>

      <!-- NOTÍCIAS -->
      <section class="card" style="margin-top:14px">
        <div class="h-sec" style="display:flex;justify-content:space-between;align-items:center">📰 NOTÍCIAS ${unread ? `<button class="btn small primary" data-act="readall">Marcar lidas</button>` : ''}</div>
        ${news.map((n) => newsRow(n)).join('')}
        ${news.length === 0 ? '<div class="muted">Nenhuma notícia ainda. Sua história começa agora!</div>' : ''}
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

function fixtureRow(s, f, upcoming) {
  const opp = G.oppInfo(f);
  const res = f.result === 'W' ? '<span class="fx-res win">VITÓRIA</span>' : f.result === 'L' ? '<span class="fx-res loss">DERROTA</span>' : f.result === 'D' ? '<span class="fx-res">EMPATE</span>' : '';
  const isNT = f.type === 'nt';
  const badge = isNT ? `<span class="pill blue">${f.compName}</span>` : `<span class="pill">${f.compName}</span>`;
  return `
  <div class="fixture-row ${upcoming ? '' : 'played'}">
    <div class="fx-crest">${isNT ? `<span class="avatar" style="width:34px;height:34px">${countryById(f.oppCountry)?.flag || '🌍'}</span>` : crest(clubById(f.oppId) || { id: f.oppId, name: f.oppName, short: f.oppName.slice(0, 3).toUpperCase() }, 34)}</div>
    <div class="fx-info">
      <div class="fx-name">${isNT ? `${countryById(f.oppCountry)?.flag || ''} ${esc(f.oppName)}` : esc(f.oppName)}</div>
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
