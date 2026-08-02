// ============================================================
// screens2.js — Treino, partidas, carreira, mercado, família,
// dinheiro, fama, mensagens, hall da fama, config, saves, créditos
// Vida de Craque 26 — BitLife × FIFA
// ============================================================
import {
  App, icon, toast, openModal, closeModal, confirmBox, go, esc, money, num,
  avatarEl, crest, ovrBadge, posBadge, meter, lifeMeter, pill, autosave, t,
  renderRoute, applySettingsToBody, tone, goalSound,
} from './ui.js';
import * as G from './game.js';
import {
  COUNTRIES, countryById, positionById, clubById,
  TRAININGS, SKILLS, LIFESTYLES, PURCHASES, AWARDS,
} from './data.js';
import { downloadFile, readUploadedFile, compressText, decompressText } from './saveio.js';
import { advanceMonthUI, openPendingModal } from './screens.js';

const S = () => App.state;
const fmt = (v) => Number(v).toLocaleString('pt-BR');

// ============================================================
// TREINO
// ============================================================
export const trainingScreen = {
  html() {
    const s = S();
    const p = s.player;
    const tr = s.training;
    const isGK = p.position === 'GOL';
    const list = TRAININGS.filter((x) => x.id !== 'gol' || isGK);
    return `
    <div class="vc-screen">
      <h1 class="h-title">${icon('whistle')} TREINO</h1>
      <p class="muted" style="margin:4px 0 14px">${G.currentDate(s)} • ${tr.done ? 'Treino de hoje já realizado.' : 'Escolha o foco e a intensidade.'}</p>
      ${!['base', 'pro', 'vet'].includes(p.phase) ? `<div class="banner info">🧒 Você ainda não tem clube, mas treinar na escolinha/na rua desenvolve suas habilidades.</div>` : ''}
      ${p.injured > 0 ? `<div class="banner warn">🤕 Lesionado! Treinos de recuperação são os únicos permitidos — use <b>Descanso</b>.</div>` : ''}

      <div class="card" style="margin-top:6px">
        <div class="h-sec">Foco do treino</div>
        <div class="chips" id="tr-focus">
          ${list.map((trd) => `<button class="chip ${tr.focus === trd.id ? 'active' : ''}" data-f="${trd.id}" title="${esc(trd.desc)}">${trd.icon} ${esc(trd.name)}</button>`).join('')}
        </div>
        <div class="tiny muted" id="tr-desc">${esc((TRAININGS.find((x) => x.id === tr.focus) || TRAININGS[0]).desc)}</div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="h-sec">Intensidade</div>
        <div class="seg" id="tr-int">
          <button class="chip ${tr.intensity === 0 ? 'active' : ''}" data-i="0">🌤️ Leve</button>
          <button class="chip ${tr.intensity === 1 ? 'active' : ''}" data-i="1">⚡ Normal</button>
          <button class="chip ${tr.intensity === 2 ? 'active' : ''}" data-i="2">🔥 Pesado</button>
        </div>
        <div class="tiny muted" style="margin-top:6px">Pesado evolui mais rápido, mas gasta energia e aumenta o risco de lesão.</div>
        <button class="btn primary big block" id="tr-go" style="margin-top:12px" ${tr.done ? 'disabled' : ''}>${icon('whistle')} ${tr.done ? 'Treino já feito este mês' : 'Treinar agora'}</button>
      </div>

      <div id="tr-result">${tr.lastResult ? resultCardHTML(tr.lastResult) : ''}</div>

      <div class="card" style="margin-top:14px">
        <div class="h-sec">📋 Últimos treinos</div>
        ${tr.history.length ? tr.history.slice(0, 8).map((h) => `
          <div class="hist-row"><span class="tiny muted">${G.fmtMonth(h.month)}/${h.year}</span><b>${(TRAININGS.find((x) => x.id === h.focus) || {}).icon || ''} ${(TRAININGS.find((x) => x.id === h.focus) || {}).name || h.focus}</b> <span class="tiny">${esc(h.gains)}</span></div>`).join('') : '<div class="muted">Nenhum treino registrado ainda.</div>'}
      </div>
    </div>`;
  },
  mount(el) {
    const s = S();
    const tr = s.training;
    el.querySelectorAll('#tr-focus [data-f]').forEach((b) => b.onclick = () => { tr.focus = b.dataset.f; renderRoute(); });
    el.querySelectorAll('#tr-int [data-i]').forEach((b) => b.onclick = () => { tr.intensity = Number(b.dataset.i); renderRoute(); });
    el.querySelector('#tr-go').onclick = () => {
      const focus = tr.focus || 'sho';
      const r = G.doTraining(s, focus, tr.intensity);
      if (!r.ok) { toast(r.msg || 'Erro.', 'error'); return; }
      tone(660, 0.12, 'triangle');
      autosave();
      s.training.lastResult = r;
      renderRoute();
    };
  },
};

function resultCardHTML(r) {
  const gains = Object.entries(r.gains).filter(([, v]) => v).map(([k, v]) => `${SKILLS[k]?.label || k}: ${v > 0 ? '+' : ''}${v}`).join(' • ');
  return `<div class="card result-card" style="margin-top:14px"><div class="h-sec">✅ TREINO CONCLUÍDO</div><div class="result-line">${esc(gains || 'Sem ganhos diretos este mês (a evolução é gradual).')}</div>${r.gains.injury ? `<div class="banner warn" style="margin-top:8px">🤕 Lesão no treino: ${r.gains.injury} mes(es) fora!</div>` : ''}</div>`;
}

// ============================================================
// PARTIDAS
// ============================================================
export const matchScreen = {
  html(params) {
    const s = S();
    if (params[0] === 'play' && params[1]) {
      const fx = s.matches.find((f) => f.id === params[1]);
      if (!fx) return '<div class="vc-screen"><p class="muted">Partida não encontrada.</p><button class="btn block" data-go="match">Voltar</button></div>';
      return matchLiveHTML(s, fx);
    }
    const upcoming = s.matches.filter((f) => !f.played);
    const played = s.matches.filter((f) => f.played);
    const club = G.myClub(s);
    return `
    <div class="vc-screen">
      <h1 class="h-title">${icon('play')} PARTIDAS</h1>
      <p class="muted" style="margin:4px 0 14px">${G.currentDate(s)} • ${club ? esc(club.name) : 'Sem clube'} • ${upcoming.length} jogo(s) no mês</p>
      ${s.player.injured > 0 ? `<div class="banner warn">🤕 Você está lesionado — não pode entrar em campo. Os jogos serão simulados no fim do mês.</div>` : ''}
      ${s.pending ? `<button class="banner decision" data-open-pending>🎲 DECISÃO PENDENTE — ${esc(s.pending.title)} →</button>` : ''}
      <div class="card" style="margin-top:6px">
        <div class="h-sec">📅 Próximos jogos do mês</div>
        ${upcoming.length === 0 ? '<div class="muted">Nenhum jogo este mês. Use o tempo para treinar forte!</div>' : ''}
        ${upcoming.map((f) => matchRow(s, f)).join('')}
      </div>
      ${played.length ? `<div class="card" style="margin-top:14px"><div class="h-sec">✅ Disputados este mês</div>${played.map((f) => matchRow(s, f, true)).join('')}</div>` : ''}
      <div class="card" style="margin-top:14px">
        <div class="h-sec">⚽ Temporada ${s.calendar.year}</div>
        <div class="grid cols-4">
          <div class="kpi"><div class="v">${s.career.season.apps}</div><div class="l">Jogos</div></div>
          <div class="kpi"><div class="v">${s.career.season.goals}</div><div class="l">Gols</div></div>
          <div class="kpi"><div class="v">${s.career.season.assists}</div><div class="l">Assist.</div></div>
          <div class="kpi"><div class="v">${s.career.season.apps ? (s.career.season.ratingSum / s.career.season.apps).toFixed(1).replace('.', ',') : '—'}</div><div class="l">Média</div></div>
        </div>
      </div>
      <div style="margin-top:14px"><button class="btn primary big block" data-act="advance">${icon('refresh')} Avançar mês</button></div>
    </div>`;
  },
  mount(el, params) {
    const s = S();
    el.querySelector('[data-open-pending]')?.addEventListener('click', () => openPendingModal(s));
    el.querySelector('[data-go="match"]')?.addEventListener('click', () => go('match'));
    el.querySelector('[data-act=advance]')?.addEventListener('click', () => advanceMonthUI('match'));
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
    if (params[0] === 'play' && params[1]) mountLive(el, s, params[1]);
  },
};

function matchRow(s, f, played = false) {
  const opp = G.oppInfo(f);
  const isNT = f.type === 'nt';
  const club = G.myClub(s);
  const score = f.played ? `<b class="fx-big">${f.gh} × ${f.ga}</b>` : 'VS';
  const resLabel = f.result === 'W' ? 'Vitória' : f.result === 'L' ? 'Derrota' : f.result === 'D' ? 'Empate' : '';
  return `
  <div class="match-row ${played ? 'played' : ''}">
    <div class="mr-teams">
      <span class="mr-club">${club ? crest(club, 30) : ''} <b>${club ? esc(club.short) : 'Você'}</b></span>
      <span class="mr-score">${score}</span>
      <span class="mr-club">${isNT ? `${countryById(f.oppCountry)?.flag || ''} <b>${esc(f.oppName)}</b>` : `${crest(clubById(f.oppId) || { name: f.oppName, short: f.oppName.slice(0, 3).toUpperCase() }, 30)} <b>${esc(f.oppName)}</b>`}</span>
    </div>
    <div class="mr-meta tiny muted">${esc(f.compName)} • ${f.home ? '🏟️ Casa' : '✈️ Fora'}</div>
    ${!played ? `<div class="mr-actions"><button class="btn small primary" data-play="${f.id}">${icon('play')} Jogar</button><button class="btn small" data-quick="${f.id}">Simular</button></div>`
    : `<div class="mr-actions"><span class="pill ${f.result === 'W' ? 'green' : f.result === 'L' ? 'red' : ''}">${resLabel}</span>${f.rating != null ? `<span class="pill gold">Nota ${f.rating}</span>` : ''}${f.goals ? `<span class="pill">${f.goals}⚽</span>` : ''}${f.assists ? `<span class="pill">${f.assists}🅰️</span>` : ''}${f.motm ? '<span class="pill blue">⭐ MOM</span>' : ''}</div>`}
  </div>`;
}

function matchLiveHTML(s, fx) {
  const opp = G.oppInfo(fx);
  const club = G.myClub(s);
  return `
  <div class="vc-screen">
    <div class="live-box card">
      <div class="live-top tiny muted">${esc(fx.compName)} • ${G.currentDate(s)}</div>
      <div class="live-teams">
        <div class="lt">${club ? crest(club, 48) : ''}<b>${club ? esc(club.name) : 'Você'}</b></div>
        <div class="ls" id="live-score">—</div>
        <div class="lt">${fx.type === 'nt' ? `${countryById(fx.oppCountry)?.flag || ''}<b>${esc(fx.oppName)}</b>` : `${crest(clubById(fx.oppId) || { name: fx.oppName, short: '???' }, 48)}<b>${esc(fx.oppName)}</b>`}</div>
      </div>
      <div class="live-progress"><div class="spinner small"></div> <span id="live-status">A bola está rolando…</span></div>
    </div>
    <div class="card" style="margin-top:14px">
      <div class="h-sec">📻 Narração</div>
      <div class="feed" id="live-feed"></div>
    </div>
    <div id="live-result"></div>
    <div style="margin-top:14px"><button class="btn ghost block" data-go="match">${icon('back')} Sair da partida</button></div>
  </div>`;
}

function mountLive(el, s, fixtureId) {
  const r = G.playMatch(s, fixtureId);
  const fx = r.fx;
  if (!r.ok) { toast(r.msg || 'Erro ao jogar.', 'error'); go('match'); return; }
  const scoreEl = document.getElementById('live-score');
  const statusEl = document.getElementById('live-status');
  const feedEl = document.getElementById('live-feed');
  const resultEl = document.getElementById('live-result');
  scoreEl.innerHTML = `<b>${fx.gh}</b> × <b>${fx.ga}</b>`;
  // delegação de clique (o botão Continuar só existe após o fim)
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-go]');
    if (btn) go(btn.dataset.go);
  });
  // anima os eventos
  const events = fx.narrative || [];
  let idx = 0;
  const timer = setInterval(() => {
    if (idx < events.length) {
      const ev = events[idx];
      const isGoal = ev.text.includes('GOL');
      const item = document.createElement('div');
      item.className = `feed-item ${isGoal ? 'goal' : ''} ${ev.who === 'you' ? 'you' : ''}`;
      item.innerHTML = `<span class="min">${ev.min ? ev.min + "'" : ''}</span><span>${esc(ev.text)}</span>`;
      feedEl.appendChild(item);
      if (isGoal) goalSound();
      idx++;
      if (idx >= events.length) {
        clearInterval(timer);
        finishLive();
      }
    }
  }, 420);
  function finishLive() {
    statusEl.textContent = 'Fim de jogo!';
    scoreEl.innerHTML = `<b>${fx.gh}</b> × <b>${fx.ga}</b>`;
    const win = fx.result === 'W' ? 'VITÓRIA' : fx.result === 'L' ? 'DERROTA' : 'EMPATE';
    resultEl.innerHTML = `
      <div class="card result-card" style="margin-top:14px">
        <div class="h-sec">🏁 FIM DE JOGO — ${win}</div>
        <div class="grid cols-3" style="margin-bottom:10px">
          <div class="kpi"><div class="v">${fx.rating ?? '—'}</div><div class="l">Sua nota</div></div>
          <div class="kpi"><div class="v">${fx.goals}</div><div class="l">Gols</div></div>
          <div class="kpi"><div class="v">${fx.assists}</div><div class="l">Assist.</div></div>
        </div>
        ${fx.motm ? '<div class="banner gold" style="margin-bottom:10px">⭐ MELHOR EM CAMPO! Destaque da partida.</div>' : ''}
        ${fx.rating < 5.5 ? '<div class="banner warn">😞 Atuação abaixo da média. A torcida reclamou.</div>' : ''}
        ${fx.goals ? `<div class="banner ok">🎉 ${fx.goals} gol(s)! Fama em alta!</div>` : ''}
        <button class="btn primary big block" data-go="match">${icon('check')} Continuar</button>
      </div>`;
    autosave();
  }
}

// ============================================================
// CARREIRA
// ============================================================
let carTab = 'stats';
export const careerScreen = {
  html() {
    const s = S();
    const p = s.player;
    const total = s.career.total;
    const season = s.career.season;
    const tabs = [['stats', '📊 Estatísticas'], ['hist', '📜 História'], ['awards', '🏆 Prêmios'], ['nt', '🦅 Seleção']];
    return `
    <div class="vc-screen">
      <h1 class="h-title">${icon('chart')} CARREIRA</h1>
      <p class="muted" style="margin:4px 0 14px">${esc(p.name)} — ${G.phaseLabel(s)} • Temporada ${s.calendar.year}</p>
      <div class="chips" id="car-tabs">${tabs.map(([id, label]) => `<button class="chip ${carTab === id ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}</div>
      <div id="car-body" style="margin-top:14px">${carBodyHTML(s, carTab)}</div>
    </div>`;
  },
  mount(el) {
    el.querySelectorAll('#car-tabs [data-tab]').forEach((b) => b.onclick = () => { carTab = b.dataset.tab; renderRoute(); });
    el.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
    el.querySelector('[data-open-pending]')?.addEventListener('click', () => openPendingModal(S()));
  },
};

function carBodyHTML(s, tab) {
  const p = s.player;
  if (tab === 'stats') {
    const total = s.career.total;
    const season = s.career.season;
    const avg = season.apps ? (season.ratingSum / season.apps).toFixed(1).replace('.', ',') : '—';
    const all = s.career.history;
    const totalAvg = total.apps ? (all.reduce((a, h) => a + h.avg * h.apps, 0) / Math.max(1, total.apps)).toFixed(1).replace('.', ',') : '—';
    return `
    <div class="card">
      <div class="h-sec">Números da carreira</div>
      <div class="grid cols-4">
        <div class="kpi"><div class="v">${total.apps}</div><div class="l">Jogos</div></div>
        <div class="kpi"><div class="v">${total.goals}</div><div class="l">Gols</div></div>
        <div class="kpi"><div class="v">${total.assists}</div><div class="l">Assist.</div></div>
        <div class="kpi"><div class="v">${totalAvg}</div><div class="l">Média</div></div>
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <div class="h-sec">Temporada ${s.calendar.year}</div>
      <div class="grid cols-4">
        <div class="kpi"><div class="v">${season.apps}</div><div class="l">Jogos</div></div>
        <div class="kpi"><div class="v">${season.goals}</div><div class="l">Gols</div></div>
        <div class="kpi"><div class="v">${season.assists}</div><div class="l">Assist.</div></div>
        <div class="kpi"><div class="v">${avg}</div><div class="l">Média</div></div>
      </div>
      ${season.titles.length ? `<div style="margin-top:10px">${season.titles.map((x) => pill(x, 'gold')).join(' ')}</div>` : ''}
      ${season.awards.length ? `<div style="margin-top:6px">${season.awards.map((a) => pill(awardName(a), 'green')).join(' ')}</div>` : ''}
    </div>
    <div class="card" style="margin-top:14px">
      <div class="h-sec">Atributos atuais</div>
      <div class="skill-grid">
        ${['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'].map((k) => skillCell(p, k)).join('')}
      </div>
      <div class="skill-grid mental">
        ${['VIS', 'LID', 'COM', 'DET'].map((k) => skillCell(p, k)).join('')}
        ${p.position === 'GOL' ? skillCell(p, 'GOL') : ''}
      </div>
    </div>
    ${s.career.history.length === 0 ? '<div class="muted" style="margin-top:12px">Nenhuma temporada completa ainda.</div>' : ''}`;
  }
  if (tab === 'hist') {
    const timeline = [...s.career.timeline].reverse();
    const seasons = [...s.career.history].reverse();
    return `
    <div class="card">
      <div class="h-sec">📜 Linha do tempo da carreira</div>
      ${timeline.length ? `<div class="timeline">${timeline.slice(0, 60).map((e) => `<div class="tl-item"><span class="tl-year">${e.year}</span><span class="tl-text">${esc(e.text)}</span></div>`).join('')}</div>` : '<div class="muted">Nada ainda.</div>'}
    </div>
    <div class="card" style="margin-top:14px">
      <div class="h-sec">Temporadas</div>
      ${seasons.length ? seasons.map((h) => `
        <div class="season-row">
          <div class="sr-year">${h.year}</div>
          <div class="sr-main"><b>${esc(h.club)}</b> <span class="tiny muted">${esc(h.league)}</span>
            <div class="tiny">${h.apps} jogos • ${h.goals} gols • ${h.assists} assist. • média ${h.avg}</div>
          </div>
          <div class="sr-badges">${h.titles.map((x) => pill(x, 'gold')).join('')} ${h.awards.map((a) => pill(awardName(a), 'green')).join('')}</div>
        </div>`).join('') : '<div class="muted">Complete uma temporada para ver o histórico.</div>'}
    </div>`;
  }
  if (tab === 'awards') {
    const allAwards = s.career.history.flatMap((h) => h.awards.map((a) => ({ a, year: h.year })));
    const allTitles = s.career.history.flatMap((h) => h.titles.map((x) => ({ x, year: h.year })));
    return `
    <div class="card">
      <div class="h-sec">🏆 Títulos</div>
      ${allTitles.length ? allTitles.map((t) => `<div class="tl-item"><span class="tl-year">${t.year}</span><span class="tl-text">🏆 ${esc(t.x)}</span></div>`).join('') : '<div class="muted">Nenhum título ainda. Vá conquistá-los!</div>'}
    </div>
    <div class="card" style="margin-top:14px">
      <div class="h-sec">⭐ Prêmios individuais</div>
      ${allAwards.length ? allAwards.map((t) => `<div class="tl-item"><span class="tl-year">${t.year}</span><span class="tl-text">${awardIcon(awardName(t.a))} ${esc(awardName(t.a))}</span></div>`).join('') : '<div class="muted">Nenhum prêmio individual ainda.</div>'}
    </div>
    <div class="card" style="margin-top:14px">
      <div class="h-sec">Reconhecimentos disponíveis</div>
      <div class="tiny muted">${AWARDS.map((a) => `${a.icon} ${esc(a.name)}`).join(' • ')}</div>
      <div class="tiny muted" style="margin-top:6px">Faça gols, seja decisivo e vença títulos para desbloqueá-los.</div>
    </div>`;
  }
  if (tab === 'nt') {
    const my = countryById(p.country);
    const tny = G.tournamentFor(s.calendar.year);
    return `
    <div class="card">
      <div class="h-sec">🦅 Seleção de ${esc(my ? my.name : p.country)}</div>
      <div class="nt-hero">
        <span class="nt-flag" style="font-size:3rem">${my ? my.flag : '🌍'}</span>
        <div>
          <div class="nt-status">${s.nt.called ? '<span class="pill green">CONVOCADO</span>' : '<span class="pill red">NÃO CONVOCADO</span>'}</div>
          <div class="tiny muted" style="margin-top:4px">${s.nt.called ? 'Você está na lista do técnico!' : s.nt.monthsOut > 0 ? `Fora da lista há ${s.nt.monthsOut} mes(es).` : 'Ainda não foi chamado.'}</div>
        </div>
      </div>
      <div class="grid cols-3" style="margin-top:12px">
        <div class="kpi"><div class="v">${s.nt.caps}</div><div class="l">Jogos</div></div>
        <div class="kpi"><div class="v">${s.nt.goals}</div><div class="l">Gols</div></div>
        <div class="kpi"><div class="v">${s.nt.lastCall || '—'}</div><div class="l">Última conv.</div></div>
      </div>
      ${tny ? `<div class="banner gold" style="margin-top:12px">🌍 Em ${tny.name} este ano${s.nt.called ? ' — você está na disputa!' : ' — a convocação ainda pode vir!'}</div>` : ''}
      <div class="tiny muted" style="margin-top:10px">Convocação depende de overall, forma e regularidade em campo. Jogar bem em clubes grandes ajuda.</div>
    </div>`;
  }
  return '';
}

function awardName(id) {
  return AWARDS.find((a) => a.id === id)?.name || id;
}
function awardIcon(name) {
  const map = { 'Artilheiro da Liga': '⚽', 'Melhor Jogador da Liga': '🏅', 'Revelação do Ano': '🌟', 'Bola de Ouro': '🏆', 'Chuteira de Ouro': '👟', 'Destaque da Seleção': '🦅' };
  return map[name] || '⭐';
}
function skillCell(p, k) {
  const sk = SKILLS[k];
  const v = p.skills[k] || 0;
  return `<div class="skill-cell"><span class="sk-ico">${sk.icon}</span><div class="sk-body"><div class="sk-top"><span>${esc(sk.label)}</span><b>${v}</b></div><div class="bar"><i style="width:${v}%;background:var(--accent)"></i></div></div></div>`;
}

// ============================================================
// MERCADO / CONTRATO / TRANSFERÊNCIAS
// ============================================================
export const marketScreen = {
  html() {
    const s = S();
    const p = s.player;
    const club = G.myClub(s);
    const con = s.career.contract;
    const offers = s.transfers.offers.filter((o) => o.type !== 'endorse');
    const endOffers = s.transfers.offers.filter((o) => o.type === 'endorse');
    const isFree = !club && ['pro', 'base', 'vet'].includes(p.phase);
    return `
    <div class="vc-screen">
      <h1 class="h-title">${icon('cart')} MERCADO</h1>
      <p class="muted" style="margin:4px 0 14px">${G.currentDate(s)} • Valor de mercado: <b class="num">${money(p.value)}</b></p>

      <div class="card">
        <div class="h-sec">✍️ Contrato atual</div>
        ${club ? `<div class="contract-box">
          <div class="cb-club">${crest(club, 44)}<div><b>${esc(club.name)}</b><div class="tiny muted">${esc(club.league)} • ${esc(club.city || '')}</div></div></div>
          ${con ? `<div class="cb-stats">
            <div><span class="tiny muted">Salário</span><b class="num">R$ ${fmt(con.salary)}/mês</b></div>
            <div><span class="tiny muted">Vigência</span><b>até ${con.until} (${con.years} ano${con.years > 1 ? 's' : ''})</b></div>
            <div><span class="tiny muted">Cláusula</span><b class="num">R$ ${fmt(con.releaseClause)}</b></div>
            <div><span class="tiny muted">Luvas recebidas</span><b class="num">R$ ${fmt(con.bonus)}</b></div>
          </div>` : '<div class="muted">Sem contrato assinado.</div>'}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
            <button class="btn small primary" data-act="renew" ${!con ? 'disabled' : ''}>${icon('edit')} Renovar contrato</button>
            <button class="btn small" data-act="ask" ${!club || p.phase === 'retired' ? 'disabled' : ''}>📢 Pedir transferência</button>
          </div>
        </div>` : `<div class="muted">${isFree ? 'Você está sem contrato — aproveite as propostas!' : p.phase === 'retired' ? 'Carreira encerrada.' : 'Você ainda não tem clube.'}</div>`}
      </div>

      ${s.transfers.asking > 0 ? `<div class="banner info" style="margin-top:12px">📢 Pedido de transferência registrado (${s.transfers.asking} mes(es)). Mais clubes vão se interessar.</div>` : ''}

      <div class="card" style="margin-top:14px">
        <div class="h-sec">📨 Propostas de clubes (${offers.length})</div>
        ${offers.length === 0 ? '<div class="muted">Nenhuma proposta no momento. Elas chegam nas janelas (janeiro, julho e agosto) conforme seu desempenho.</div>' : ''}
        ${offers.map((o) => offerCard(s, o)).join('')}
      </div>

      ${endOffers.length ? `<div class="card" style="margin-top:14px">
        <div class="h-sec">📺 Patrocínios</div>
        ${endOffers.map((o) => `<div class="offer-card">
          <div class="oc-main"><span style="font-size:1.6rem">${o.icon || '🤝'}</span><div><b>${esc(o.brand)}</b><div class="tiny muted">${fmt(o.income)}/mês por ${o.months} meses</div></div></div>
          <div class="oc-actions"><button class="btn small primary" data-end="${o.id}">Aceitar</button><button class="btn small" data-rej="${o.id}">Recusar</button></div>
        </div>`).join('')}
      </div>` : ''}

      <div class="card" style="margin-top:14px">
        <div class="h-sec">📈 Evolução do valor</div>
        <div class="tiny muted">Seu valor de mercado é atualizado todo mês com base em overall, idade, potencial, forma e fama.</div>
        <div class="meter" style="margin-top:8px"><span class="tiny muted" style="min-width:86px">Forma</span><div class="bar"><i style="width:${p.form}%"></i></div><span class="val">${Math.round(p.form)}</span></div>
        <div class="meter" style="margin-top:6px"><span class="tiny muted" style="min-width:86px">Fama</span><div class="bar"><i style="width:${p.fame}%;background:var(--gold)"></i></div><span class="val">${Math.round(p.fame)}</span></div>
      </div>
    </div>`;
  },
  mount(el) {
    const s = S();
    el.querySelector('[data-act=renew]')?.addEventListener('click', () => {
      const r = G.renewContract(s);
      toast(r.ok ? '🖋️ Contrato renovado!' : (r.msg || 'Erro.'), r.ok ? 'ok' : 'error');
      if (r.ok) { autosave(); renderRoute(); }
    });
    el.querySelector('[data-act=ask]')?.addEventListener('click', () => {
      confirmBox('Pedir transferência', 'A diretoria vai ouvir propostas por 3 meses. O torcedor pode não gostar…', () => {
        G.askForTransfer(s); autosave(); renderRoute(); toast('📢 Pedido registrado.');
      }, 'Pedir');
    });
    el.querySelectorAll('[data-off]').forEach((b) => b.onclick = () => {
      const id = b.dataset.off;
      const act = b.dataset.act;
      const o = s.transfers.offers.find((x) => x.id === id);
      if (!o) return;
      if (act === 'accept') {
        const r = G.acceptClubOffer(s, id);
        if (r.ok) {
          autosave(); renderRoute();
          toast(`✍️ Fechou com ${r.club.name}! Luvas de R$ ${fmt(o.bonus)}.`);
        } else toast(r.msg || 'Erro.', 'error');
      } else {
        G.rejectOffer(s, id);
        renderRoute();
        toast('Proposta recusada.');
      }
    });
    el.querySelectorAll('[data-end]').forEach((b) => b.onclick = () => { const r = G.acceptEndorsement(s, b.dataset.end); if (r.ok) { autosave(); renderRoute(); toast('🤝 Patrocínio fechado!'); } });
    el.querySelectorAll('[data-rej]').forEach((b) => b.onclick = () => { G.rejectOffer(s, b.dataset.rej); renderRoute(); });
  },
};

function offerCard(s, o) {
  const club = clubById(o.clubId);
  if (!club) return '';
  return `
  <div class="offer-card">
    <div class="oc-main">
      ${crest(club, 42)}
      <div>
        <b>${esc(club.name)}</b>
        <div class="tiny muted">${esc(club.league)} • ${esc(club.country)}</div>
        <div class="oc-terms tiny">💵 R$ ${fmt(o.salary)}/mês • ${o.years} ano${o.years > 1 ? 's' : ''} • Cláusula R$ ${fmt(o.releaseClause)} • Luvas R$ ${fmt(o.bonus)}</div>
        ${o.renewal ? '<div class="pill gold">RENOVAÇÃO</div>' : ''}
      </div>
    </div>
    <div class="oc-actions">
      <button class="btn small primary" data-off="${o.id}" data-act="accept">Aceitar</button>
      <button class="btn small" data-off="${o.id}" data-act="reject">Recusar</button>
    </div>
  </div>`;
}

// ============================================================
// FAMÍLIA E RELACIONAMENTOS
// ============================================================
export const familyScreen = {
  html() {
    const s = S();
    const p = s.player;
    const par = s.partner;
    const family = s.family.filter((f) => f.role !== 'filho' && f.role !== 'filha');
    const kids = s.family.filter((f) => f.role === 'filho' || f.role === 'filha');
    const roleIco = { pai: '👨', mãe: '👩', irmão: '👦', irmã: '👧', filho: '👶', filha: '👶' };
    return `
    <div class="vc-screen">
      <h1 class="h-title">${icon('heart')} FAMÍLIA E AMOR</h1>
      <p class="muted" style="margin:4px 0 14px">Relacionamentos influenciam sua felicidade dentro e fora de campo.</p>

      ${par ? `
      <div class="card partner-card">
        <div class="h-sec">💞 ${par.married ? 'Cônjuge' : 'Namorado(a)'} ${par.together ? '' : ''}</div>
        <div class="partner-box">
          ${avatarEl(par.name, 52)}
          <div style="flex:1;min-width:0">
            <b>${esc(par.name)}</b> ${par.married ? '<span class="pill gold">💍 Casado</span>' : ''}
            <div class="tiny muted">Juntos desde ${esc(par.since || '—')} • ${par.age} anos</div>
            ${meter('Amor', par.love, 100, 'var(--red)')}
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="btn small" data-par="tempo">💞 Passar tempo</button>
          <button class="btn small" data-par="presente">💝 Dar presente</button>
          ${par.married ? '' : `<button class="btn small danger" data-par="termine">💔 Terminar</button>`}
        </div>
      </div>` : `
      <div class="card">
        <div class="h-sec">💞 Amor</div>
        <div class="muted">Você está solteiro(a). Fique de olho nos eventos — o amor pode aparecer quando você menos espera.</div>
      </div>`}

      <div class="card" style="margin-top:14px">
        <div class="h-sec">👨‍👩‍👧‍👦 Família</div>
        ${family.map((f) => `
        <div class="fam-row">
          ${avatarEl(f.name, 40)}
          <div style="flex:1;min-width:0">
            <b>${roleIco[f.role] || '👤'} ${esc(f.name)}</b> <span class="tiny muted">${f.role} • ${f.age} anos</span>
            ${meter('Carinho', f.love, 100, 'var(--blue)')}
          </div>
          <div style="display:flex;gap:6px;flex-direction:column">
            <button class="btn small" data-fam="${f.id}" data-act="tempo">💬 Tempo</button>
            <button class="btn small" data-fam="${f.id}" data-act="presente">🎁</button>
          </div>
        </div>`).join('')}
      </div>

      ${kids.length ? `<div class="card" style="margin-top:14px">
        <div class="h-sec">🍼 Filhos</div>
        ${kids.map((k) => `<div class="fam-row">${avatarEl(k.name, 36)}<div><b>${k.role === 'filho' ? '👦' : '👧'} ${esc(k.name)}</b> <span class="tiny muted">${k.age} ano${k.age === 1 ? '' : 's'}</span></div>${meter('Carinho', k.love, 100, 'var(--red)')}<button class="btn small" data-fam="${k.id}" data-act="tempo">💬 Tempo</button></div>`).join('')}
      </div>` : ''}

      ${s.friends.length ? `<div class="card" style="margin-top:14px">
        <div class="h-sec">🧑‍🤝‍🧑 Amigos</div>
        ${s.friends.map((f) => `
        <div class="fam-row">
          ${avatarEl(f.name, 36)}
          <div style="flex:1;min-width:0"><b>${esc(f.name)}</b> ${meter('Amizade', f.love, 100, 'var(--green, #22c55e)')}</div>
          <button class="btn small" data-fri="${f.id}" data-act="rolê">🎮 Rolê</button>
        </div>`).join('')}
      </div>` : ''}
    </div>`;
  },
  mount(el) {
    const s = S();
    el.querySelectorAll('[data-par]').forEach((b) => b.onclick = () => {
      const r = G.partnerAct(s, b.dataset.par);
      if (!r.ok) toast(r.msg || 'Erro.', 'error'); else { autosave(); renderRoute(); }
    });
    el.querySelectorAll('[data-fam]').forEach((b) => b.onclick = () => {
      const r = G.familyAct(s, b.dataset.fam, b.dataset.act);
      if (!r.ok) toast(r.msg || 'Erro.', 'error'); else { autosave(); renderRoute(); }
    });
    el.querySelectorAll('[data-fri]').forEach((b) => b.onclick = () => {
      const r = G.friendAct(s, b.dataset.fri, b.dataset.act);
      if (!r.ok) toast(r.msg || 'Erro.', 'error'); else { autosave(); renderRoute(); }
    });
  },
};

// ============================================================
// DINHEIRO
// ============================================================
export const moneyScreen = {
  html() {
    const s = S();
    const p = s.player;
    const life = s.life;
    const last = life.lastMonth || { income: 0, expense: 0, breakdown: [] };
    return `
    <div class="vc-screen">
      <h1 class="h-title">${icon('money')} FINANÇAS</h1>
      <p class="muted" style="margin:4px 0 14px">${G.currentDate(s)}</p>

      <div class="card money-hero">
        <div class="tiny muted">BANCO</div>
        <div class="money-big ${life.bank < 0 ? 'neg' : ''}">${money(life.bank)}</div>
        <div class="money-flow">
          <span class="pill green">+ R$ ${fmt(last.income || 0)} este mês</span>
          <span class="pill red">− R$ ${fmt(last.expense || 0)} despesas</span>
        </div>
        <div class="tiny muted" style="margin-top:8px">${(last.breakdown || []).map(([k, v]) => `${esc(k)}: R$ ${fmt(v)}`).join(' • ')}</div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="h-sec">🏠 Estilo de vida</div>
        <div class="lifestyle-grid">
          ${LIFESTYLES.map((l) => `<button class="lifestyle-card ${life.lifestyle === l.id ? 'sel' : ''}" data-life="${l.id}"><span class="ls-ico">${l.icon}</span><b>${esc(l.name)}</b><small>R$ ${fmt(l.cost)}/mês</small></button>`).join('')}
        </div>
        <div class="tiny muted" style="margin-top:6px">Estilo de vida afeta felicidade e fama, mas custa caro.</div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="h-sec">🛍️ Compras</div>
        <div class="shop-grid">
          ${PURCHASES.map((it) => {
            const afford = life.bank >= it.price;
            const fameOk = p.fame >= it.needFame;
            const owned = p.possessions.some((x) => x.id === it.id);
            return `<div class="shop-card ${afford && fameOk && !owned ? '' : 'locked'}">
              <span class="sh-ico">${it.icon}</span>
              <b>${esc(it.name)}</b>
              <small>R$ ${fmt(it.price)}</small>
              ${owned ? '<span class="pill green">Possuído</span>' : `<button class="btn small primary" data-buy="${it.id}" ${afford && fameOk ? '' : 'disabled'}>Comprar</button>`}
              ${!fameOk && !owned ? `<small class="tiny muted">Requer fama ${it.needFame}</small>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="h-sec">📈 Investimentos</div>
        <div class="tiny muted" style="margin-bottom:8px">Aplicações rendem mensalmente: CDB 0,8% • Imóveis 1,4% • Risco 4% (pode oscilar!).</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn small" data-inv="cdb">🏦 CDB</button>
          <button class="btn small" data-inv="imoveis">🏢 Imóveis</button>
          <button class="btn small" data-inv="risco">🚀 Alto risco</button>
        </div>
        <input class="input" type="number" id="inv-amt" min="10000" step="10000" placeholder="Valor (mín. R$ 10 mil)" style="margin-top:8px;width:100%">
        <div style="margin-top:12px">
          ${life.investments.length ? life.investments.map((inv) => `
            <div class="inv-row"><span>${esc(inv.name)} <span class="tiny muted">(${esc(inv.risk)})</span></span><b class="num">R$ ${fmt(Math.round(inv.amount))}</b><button class="btn small" data-with="${inv.id}">Resgatar</button></div>`).join('') : '<div class="muted">Nenhum investimento ativo.</div>'}
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="h-sec">🤝 Patrocínios ativos</div>
        ${life.endorsements.length ? life.endorsements.map((e) => `<div class="inv-row"><span>🤝 ${esc(e.brand)}</span><b class="num">R$ ${fmt(e.income)}/mês</b><span class="tiny muted">${e.monthsLeft} mes(es)</span></div>`).join('') : '<div class="muted">Sem patrocínios ativos. Aumente a fama!</div>'}
      </div>

      ${p.possessions.length ? `<div class="card" style="margin-top:14px"><div class="h-sec">🎁 Seus bens</div><div>${p.possessions.map((x) => pill(`${x.icon} ${esc(x.name)}`)).join(' ')}</div></div>` : ''}
    </div>`;
  },
  mount(el) {
    const s = S();
    el.querySelectorAll('[data-life]').forEach((b) => b.onclick = () => { G.setLifestyle(s, Number(b.dataset.life)); autosave(); renderRoute(); });
    el.querySelectorAll('[data-buy]').forEach((b) => b.onclick = () => {
      const r = G.buyItem(s, b.dataset.buy);
      if (!r.ok) toast(r.msg || 'Não foi possível comprar.', 'error'); else { autosave(); renderRoute(); toast('🛍️ Compra realizada!'); }
    });
    const amt = el.querySelector('#inv-amt');
    el.querySelectorAll('[data-inv]').forEach((b) => b.onclick = () => {
      const value = Number(amt?.value) || 10000;
      const r = G.invest(s, b.dataset.inv, value);
      if (!r.ok) toast(r.msg || 'Erro.', 'error'); else { autosave(); renderRoute(); toast('📈 Investimento aplicado!'); }
    });
    el.querySelectorAll('[data-with]').forEach((b) => b.onclick = () => { G.withdrawInvest(s, b.dataset.with); autosave(); renderRoute(); toast('🏦 Resgate feito.'); });
  },
};

// ============================================================
// FAMA
// ============================================================
export const fameScreen = {
  html() {
    const s = S();
    const p = s.player;
    const tny = G.tournamentFor(s.calendar.year);
    return `
    <div class="vc-screen">
      <h1 class="h-title">${icon('star')} FAMA</h1>
      <p class="muted" style="margin:4px 0 14px">Quanto mais famoso, mais dinheiro, patrocínios e oportunidades.</p>

      <div class="card fame-hero">
        <div class="fame-stars">${'⭐'.repeat(Math.max(1, Math.ceil(p.fame / 20)))}<span class="muted">${'☆'.repeat(5 - Math.max(1, Math.ceil(p.fame / 20)))}</span></div>
        <div class="money-big" style="font-size:2rem">${num(p.followers)}</div>
        <div class="tiny muted">seguidores</div>
        ${meter('Fama', p.fame, 100, 'var(--gold)')}
      </div>

      <div class="card" style="margin-top:14px">
        <div class="h-sec">📱 Suas redes</div>
        <button class="btn primary block" data-act="post">📱 Postar conteúdo (+fama, +seguidores, −energia)</button>
        <div class="tiny muted" style="margin-top:6px">Poste uma vez por mês para manter a audiência engajada.</div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="h-sec">💡 Como ganhar fama</div>
        <div class="fame-tips">
          <div>⚽ Faça gols e atuações nota 8+</div>
          <div>🏆 Vença títulos e prêmios</div>
          <div>🦅 Destaque pela seleção</div>
          <div>🎙️ Aceite entrevistas e podcasts</div>
          <div>💎 Viva um estilo de vida luxuoso</div>
        </div>
      </div>

      ${tny && s.nt.called ? `<div class="banner gold" style="margin-top:12px">🌍 Você está no ${tny.name}! Brilhar lá é a fama máxima.</div>` : ''}
      ${s.life.posJob ? `<div class="card" style="margin-top:14px"><div class="h-sec">💼 Pós-carreira</div><div class="muted">${p.phase === 'retired' ? `Você agora é ${posJobLabel(s.life.posJob)}.` : ''}</div></div>` : ''}
    </div>`;
  },
  mount(el) {
    const s = S();
    el.querySelector('[data-act=post]')?.addEventListener('click', () => {
      const r = G.postSocial(s);
      if (!r.ok) toast(r.msg || 'Erro.', 'error'); else { autosave(); renderRoute(); }
    });
  },
};

function posJobLabel(job) {
  return { comentarista: '🎙️ comentarista de TV', tecnico: '👔 técnico de futebol', empresario: '🏢 empresário' }[job] || job;
}

// ============================================================
// MENSAGENS / NOTÍCIAS
// ============================================================
export const inboxScreen = {
  html() {
    const s = S();
    return `
    <div class="vc-screen">
      <h1 class="h-title">${icon('mail')} MENSAGENS</h1>
      <p class="muted" style="margin:4px 0 14px">Notícias, decisões e acontecimentos da sua vida.</p>
      ${s.pending ? `<button class="banner decision" data-open-pending>🎲 DECISÃO PENDENTE — ${esc(s.pending.title)} →</button>` : ''}
      <div class="card" style="margin-top:6px">
        <div class="h-sec" style="display:flex;justify-content:space-between">📥 Caixa de entrada ${s.inbox.some((i) => !i.read) ? `<button class="btn small" data-readall>Marcar todas lidas</button>` : ''}</div>
        ${s.inbox.length ? s.inbox.map((n) => `<div class="news-item ${n.read ? '' : 'unread'}" data-news="${n.id}"><span class="news-ico">${newsIcon(n.type)}</span><div class="news-body"><div class="news-text">${esc(n.text)}</div><div class="tiny muted">${esc(n.date)}</div></div></div>`).join('') : '<div class="muted">Nenhuma mensagem.</div>'}
      </div>
    </div>`;
  },
  mount(el) {
    const s = S();
    el.querySelector('[data-open-pending]')?.addEventListener('click', () => openPendingModal(s));
    el.querySelector('[data-readall]')?.addEventListener('click', () => { G.markAllRead(s); autosave(); renderRoute(); });
    el.querySelectorAll('[data-news]').forEach((b) => b.onclick = () => { G.markRead(s, b.dataset.news); renderRoute(); });
  },
};

function newsIcon(type) {
  return { info: '📌', club: '🏟️', vida: '💬', clube: '🏟️', selecao: '🦅', fama: '⭐', money: '💰', star: '⭐', trophy: '🏆', injury: '🤕' }[type] || '📌';
}

// ============================================================
// HALL DA FAMA (aposentadoria / falecimento)
// ============================================================
export const hallScreen = {
  html() {
    const s = S();
    const p = s.player;
    const dead = p.phase === 'dead';
    const retired = p.phase === 'retired';
    if (!dead && !retired) {
      return `<div class="vc-screen"><div class="card"><div class="h-sec">🏛️ Hall da Fama</div><div class="muted">Você ainda está jogando! Aposente-se para ver o legado da sua carreira.</div><button class="btn primary block" style="margin-top:12px" data-go="home">${icon('home')} Voltar</button></div></div>`;
    }
    const legacy = p.legacy || G.calcLegacy(s);
    const total = s.career.total;
    const titles = s.career.history.reduce((a, h) => a + h.titles.length, 0);
    const awards = s.career.history.reduce((a, h) => a + h.awards.length, 0);
    const allAwards = s.career.history.flatMap((h) => h.awards);
    const legacyLabel = legacy >= 85 ? 'LENDÁRIO' : legacy >= 65 ? 'ICONE' : legacy >= 45 ? 'CRAQUE' : legacy >= 30 ? 'BOM JOGADOR' : 'JOGADOR COMUM';
    return `
    <div class="vc-screen hall">
      <div class="card hall-hero">
        <div class="hall-ball">${dead ? '🕊️' : '🏆'}</div>
        <div class="hall-name">${esc(p.name)}</div>
        <div class="tiny muted">${p.age} anos • ${countryById(p.country)?.flag || ''} ${esc(countryById(p.country)?.name || '')} • ${dead ? 'In memoriam' : 'Aposentado(a)'}</div>
        <div class="hall-legacy">
          <div class="legacy-score ${legacy >= 65 ? 'epic' : ''}">${legacy}</div>
          <div><b>${legacyLabel}</b><div class="tiny muted">Legado — ${dead ? 'vida concluída' : 'carreira concluída'}</div></div>
        </div>
        <div class="hall-years tiny muted">${s.career.history.length} temporadas profissionais</div>
      </div>

      <div class="grid cols-4" style="margin-top:14px">
        <div class="kpi card"><div class="v">${total.apps}</div><div class="l">Jogos</div></div>
        <div class="kpi card"><div class="v">${total.goals}</div><div class="l">Gols</div></div>
        <div class="kpi card"><div class="v">${total.assists}</div><div class="l">Assist.</div></div>
        <div class="kpi card"><div class="v">${titles}</div><div class="l">Títulos</div></div>
      </div>
      <div class="grid cols-3" style="margin-top:14px">
        <div class="kpi card"><div class="v">${awards}</div><div class="l">Prêmios</div></div>
        <div class="kpi card"><div class="v">${s.nt.caps}</div><div class="l">Jogos na seleção</div></div>
        <div class="kpi card"><div class="v">${s.nt.goals}</div><div class="l">Gols na seleção</div></div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="h-sec">💎 Conquistas</div>
        ${allAwards.length ? allAwards.map((a) => pill(awardName(a), 'gold')).join(' ') : '<div class="muted">Sem prêmios individuais.</div>'}
        <div style="margin-top:8px">${s.career.timeline.filter((x) => x.type === 'title').slice(-8).map((x) => pill(`🏆 ${esc(x.text)}`, 'gold')).join(' ') || '<span class="muted">Sem títulos.</span>'}</div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="h-sec">💰 Ganhos totais</div>
        <div class="money-big">${money(p.totalEarnings)}</div>
        <div class="tiny muted">salários, luvas e prêmios somados</div>
      </div>

      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
        ${!dead ? `<button class="btn primary" data-act="life">${icon('heart')} Continuar a vida</button>` : ''}
        <button class="btn" data-act="menu">${icon('home')} Menu principal</button>
      </div>
      ${!dead ? '<div class="tiny muted" style="margin-top:8px">Após a aposentadoria, sua vida continua: família, saúde, novos projetos… até o fim.</div>' : ''}
    </div>`;
  },
  mount(el) {
    el.querySelector('[data-act=life]')?.addEventListener('click', () => go('home'));
    el.querySelector('[data-act=menu]')?.addEventListener('click', () => {
      if (App.state) autosave();
      go('menu');
    });
    el.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
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
        <div class="field"><label>Volume dos efeitos: <b id="vol-v">${st.volume}</b></label><input class="input" type="range" min="0" max="100" id="set-vol" value="${st.volume}"></div>
        <div class="field"><label>Qualidade gráfica</label><div class="seg">
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
      const s = S();
      if (s) autosave(); else { try { App.storage.setItem('fm_boot_settings', JSON.stringify(st)); } catch {} }
      applySettingsToBody();
      if (!s) renderRoute();
    };
    el.querySelectorAll('[data-set]').forEach((b) => b.onclick = () => {
      const [k, v] = b.dataset.set.split(':');
      st[k] = v === 'true' ? true : v === 'false' ? false : v;
      applySettingsToBody();
      persist();
      renderRoute();
    });
    const vol = el.querySelector('#set-vol');
    vol.oninput = () => { st.volume = Number(vol.value); el.querySelector('#vol-v').textContent = vol.value; persist(); };
    vol.onchange = () => tone(700, 0.15, 'triangle');
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
              ${sl ? `<b>${esc(sl.playerName)}</b><div class="tiny muted">${sl.age} anos • OVR ${sl.ovr}${sl.club ? ' • ' + esc(sl.club) : ''} • ${new Date(sl.savedAt).toLocaleString('pt-BR')}</div>` : '<span class="muted">vazio</span>'}
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
      const nm = S().player.name.replace(/\W+/g, '_').slice(0, 18);
      downloadFile(`vc26_${nm}_${S().calendar.year}.fmsave.json`, packed);
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
// COMO JOGAR
// ============================================================
export const howtoScreen = {
  html() {
    return `
    <div class="menu-wrap" style="text-align:left;max-width:560px">
      <div style="text-align:center"><span style="font-size:3rem">⚽</span>
      <div class="menu-title" style="font-size:1.5rem;margin:8px 0 16px">COMO <span>JOGAR</span></div></div>
      <div class="card stack">
        <div class="h-sec">1. Sua vida</div>
        <p class="muted" style="line-height:1.6">Cada <b>Avançar mês</b> faz o tempo passar. Você envelhece, recebe salário, recupera energia e recebe <b>decisões de vida</b> (eventos) — escolha sabiamente, elas mudam sua história.</p>
        <div class="h-sec">2. Futebol</div>
        <p class="muted" style="line-height:1.6">Com clube, você tem partidas todo mês: <b>Jogar</b> (narrativa minuto a minuto) ou <b>Simular</b>. Sua nota (0–10) define forma, fama, valor de mercado e convocação para a seleção.</p>
        <div class="h-sec">3. Treino</div>
        <p class="muted" style="line-height:1.6">Uma vez por mês, escolha <b>foco</b> (finalização, drible, físico…) e <b>intensidade</b>. Jovens evoluem rápido; depois dos 30 o corpo começa a cobrar. Use <b>Descanso</b> quando a energia estiver baixa.</p>
        <div class="h-sec">4. Mercado</div>
        <p class="muted" style="line-height:1.6">Janelas em <b>janeiro, julho e agosto</b>. Aceite propostas, renove contratos ou peça transferência. Cláusulas e luvas contam como dinheiro na conta.</p>
        <div class="h-sec">5. Vida pessoal</div>
        <p class="muted" style="line-height:1.6">Família, namoro, filhos, amigos, fama e dinheiro: tudo interage. Felicidade baixa derruba moral e desempenho. Invista, compre e viva — mas sem exagerar na farra.</p>
        <div class="h-sec">6. Fim de carreira</div>
        <p class="muted" style="line-height:1.6">A partir dos 32 anos você pode se aposentar e ver seu <b>Legado</b> no Hall da Fama. Depois, a vida continua: saúde, família e novos projetos.</p>
      </div>
      <div style="margin-top:14px"><button class="btn ghost block" data-back>${icon('back')} Voltar</button></div>
    </div>`;
  },
  mount(el) { el.querySelector('[data-back]').onclick = () => history.back(); },
};

// ============================================================
// CRÉDITOS
// ============================================================
export const creditsScreen = {
  html() {
    return `
    <div class="menu-wrap" style="text-align:left;max-width:520px">
      <div style="text-align:center"><span style="font-size:3rem">⚽</span>
      <div class="menu-title" style="font-size:1.5rem;margin:8px 0 16px">CRÉ<span>DITOS</span></div></div>
      <div class="card" style="line-height:1.65">
        <p><b>Vida de Craque 26</b> — modo carreira de jogador (BitLife × FIFA) para navegador. Evolução do Futebol Manager 26.</p>
        <br>
        <p class="muted">• Motor de simulação, eventos de vida, interface e banco de dados 100% próprios, em HTML, CSS e JavaScript puros — sem frameworks, sem build.<br>
        • Todos os jogadores, clubes e histórias são fictícios ou referências genéricas de futebol.<br>
        • Todo o progresso fica salvo apenas no seu dispositivo (localStorage), com compressão gzip.</p>
        <br>
        <p class="tiny muted">Feito com ⚽ e JavaScript. Bom jogo, craque!</p>
      </div>
      <div style="margin-top:14px"><button class="btn ghost block" data-back>${icon('back')} Voltar</button></div>
    </div>`;
  },
  mount(el) { el.querySelector('[data-back]').onclick = () => history.back(); },
};
