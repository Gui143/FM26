// ============================================================
// screens.js — Telas principais: menu, novo jogo, home, partida,
// elenco, jogador, táticas
// ============================================================
import { App, icon, toast, openModal, closeModal, confirmBox, go, esc, money, num, crest, avatar, ovrBadge, posBadge, formPill, meter, clubCell, setLive, stopLive, goalSound, autosave, t, renderRoute, newsLogo } from './ui.js';
import * as G from './game.js';
import { simMatch } from './engine.js';
import { FORMATIONS, MENTALITIES, PRESSING, LINES, STYLES, POSITIONS, POS_ORDER, LEAGUES, COUNTRIES, CLUBS, NAT_LABELS } from './data.js';
import { clamp, makeRng } from './util.js';

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
export function refDateInfo(week, year = 2026, dayOffset = 0) {
  const d = new Date(Date.UTC(year, 0, 2));
  d.setUTCDate(d.getUTCDate() + Math.max(0, Number(week || 1) - 1) * 7 + Number(dayOffset || 0));
  const weekdays = ['DOM.', 'SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.'];
  const months = ['JAN.', 'FEV.', 'MAR.', 'ABR.', 'MAI.', 'JUN.', 'JUL.', 'AGO.', 'SET.', 'OUT.', 'NOV.', 'DEZ.'];
  return {
    date: d,
    weekday: weekdays[d.getUTCDay()],
    day: String(d.getUTCDate()).padStart(2, '0'),
    month: months[d.getUTCMonth()],
    short: `${String(d.getUTCDate()).padStart(2, '0')} DE ${months[d.getUTCMonth()]}`,
  };
}

function refHomeFixtureDate(f, year) {
  return refDateInfo(f?.week || 1, year);
}

// ============================================================
// CENTRAL DO TREINADOR
// ============================================================
export const homeScreen = {
  html() {
    const s = S();
    const club = s.db.clubs[s.clubId];
    const next = G.nextUserFixture(s);
    const squad = G.clubPlayers(s.db, s.clubId);
    const avgMorale = Math.round(squad.reduce((x, p) => x + p.morale, 0) / Math.max(1, squad.length));
    const avgFitness = Math.round(squad.reduce((x, p) => x + p.fitness, 0) / Math.max(1, squad.length));
    const avgForm = Math.round(squad.reduce((x, p) => x + p.form, 0) / Math.max(1, squad.length));
    const unread = s.inbox.filter((i) => !i.read).length;
    const news = s.news.slice(0, 3);
    const future = [];
    for (const comp of s.competitions) {
      for (const fixture of comp.fixtures) {
        if (!fixture.played && (fixture.home === s.clubId || fixture.away === s.clubId)) future.push({ comp, fixture });
      }
    }
    future.sort((a, b) => a.fixture.week - b.fixture.week);

    let wins = 0, draws = 0, losses = 0;
    for (const comp of s.competitions) {
      for (const f of comp.fixtures) {
        if (!f.played || (f.home !== s.clubId && f.away !== s.clubId)) continue;
        const gf = f.home === s.clubId ? f.gh : f.ga;
        const ga = f.home === s.clubId ? f.ga : f.gh;
        if (gf > ga) wins++;
        else if (gf === ga) draws++;
        else losses++;
      }
    }
    const nextDate = next ? refHomeFixtureDate(next.fixture, s.year) : null;
    const nextHome = next ? s.db.clubs[next.fixture.home] : null;
    const nextAway = next ? s.db.clubs[next.fixture.away] : null;
    const nextIsHome = next?.fixture.home === s.clubId;
    const inbox = s.inbox[0];
    const inboxTitle = inbox?.title || 'Plano confirmado: Evento com patrocinadores';
    const inboxMeta = inbox?.text || 'Comissão técnica';
    const shortcutItems = [
      ['squad', 'users', 'Elenco'], ['tactics', 'clipboard', 'Tática'],
      ['calendar', 'calendar', 'Calendário'], ['table', 'table', 'Classificação'],
      ['cups', 'trophy', 'Copas'], ['market', 'cart', 'Mercado'],
      ['training', 'whistle', 'Treinos'], ['inbox', 'mail', 'Mensagens'],
      ['finances', 'money', 'Finanças'], ['club', 'building', 'Clube'],
      ['youth', 'sprout', 'Base'], ['manager', 'chart', 'Treinador'],
      ['stats', 'star', 'Estatísticas'], ['ranking', 'globe', 'Ranking'],
      ['friendlies', 'handshake', 'Amistosos'], ['saves', 'save', 'Saves'],
    ];
    const condition = [
      ['Condição física', avgFitness, 'var(--accent)'],
      ['Moral', avgMorale, 'var(--blue)'],
      ['Ritmo de jogo', avgForm, 'var(--ref-accent)'],
    ];
    // Disponibilidade real do elenco
    const injured = squad.filter((p) => p.injuredWeeks > 0);
    const suspended = squad.filter((p) => p.suspended > 0);
    const outCount = injured.length + suspended.length;
    const availabilityText = outCount
      ? `${injured.length ? `${injured.length} lesionado(s)` : ''}${injured.length && suspended.length ? ' · ' : ''}${suspended.length ? `${suspended.length} suspenso(s)` : ''}`
      : 'Nenhum desfalque registrado.';
    // Objetivos dinâmicos da diretoria (liga, entrosamento e juventude)
    const myLeagueComp = s.competitions.find((c) => c.type === 'league' && c.teams.includes(s.clubId));
    let myPos = null, leagueSize = 0;
    if (myLeagueComp) {
      const tbl = G.leagueTable(s, myLeagueComp);
      myPos = tbl.findIndex((r) => r.clubId === s.clubId) + 1;
      leagueSize = tbl.length;
    }
    const goalPos = club.rep >= 85 ? 4 : club.rep >= 75 ? 8 : 12;
    const objPos = {
      title: `Terminar a liga entre os ${goalPos} primeiros`,
      status: myPos ? (myPos <= goalPos ? 'No caminho certo' : 'Abaixo da meta') : 'Sem jogos ainda',
      good: myPos ? myPos <= goalPos : true,
      meta: myPos ? `Posição atual: ${myPos}º de ${leagueSize}` : 'A temporada mal começou',
    };
    const chem = Math.round(s.chemistry || 70);
    const objChem = {
      title: 'Construir uma identidade de jogo (entrosamento 85+)',
      status: chem >= 85 ? 'Cumprido' : chem >= 74 ? 'Em andamento' : 'Longe do ideal',
      good: chem >= 74,
      meta: `Entrosamento atual: ${chem}`,
    };
    const youngGames = squad.filter((p) => p.age <= 21).reduce((x, p) => x + p.stats.games, 0);
    const objYouth = {
      title: 'Valorizar atletas da base (40 jogos sub-21)',
      status: youngGames >= 40 ? 'Cumprido' : youngGames >= 15 ? 'Em andamento' : 'Atenção da diretoria',
      good: youngGames >= 15,
      meta: `${youngGames}/40 jogos de jovens na temporada`,
    };
    const objectives = [objPos, objChem, objYouth];

    return `
    <div class="ref-home">
      <header class="ref-home-hero">
        <div class="ref-home-identity">
          ${crest(club, 76)}
          <div class="ref-home-heading">
            <div class="ref-eyebrow">TEMPORADA ${s.year}</div>
            <h1>Central do treinador.</h1>
            <div class="ref-home-manager">${esc(s.manager.name)}</div>
          </div>
        </div>
        <button class="ref-performance ref-action" data-ref-route="stats">
          ${icon('trophy')}
          <span><b>DESEMPENHO</b><strong>${wins}V · ${draws}E · ${losses}D</strong></span>
        </button>
      </header>

      <button class="ref-tip ref-action" data-ref-route="inbox">
        <span class="ref-tip-icon">${icon('star')}</span>
        <span><b>DICA CONTEXTUAL</b><strong>${unread ? 'Decisão pendente' : 'Tudo em dia'}</strong><small>${unread ? `Há ${unread} mensagem(ns) não lida(s); algumas podem exigir resposta antes de avançar.` : 'Nenhuma decisão aguarda sua resposta.'}</small></span>
      </button>

      <div class="ref-home-layout">
        <main class="ref-home-main">
          <section class="ref-card ref-next-card ref-action" data-go-match tabindex="0">
            <div class="ref-card-head ref-next-head">
              <div><span class="ref-section-label">${icon('clock')} PRÓXIMO COMPROMISSO</span></div>
              <span class="ref-next-competition">${next ? `${esc(next.comp.name)} · ${next.fixture.round || 1}/${next.comp.fixtures.length || 1}` : 'Sem próximo compromisso'}</span>
            </div>
            ${next ? `
            <div class="ref-next-body">
              <div class="ref-next-date"><b>${nextDate.weekday}</b><strong>${nextDate.day} DE<br>${nextDate.month}</strong><small>18:00</small></div>
              <div class="ref-matchup">
                <div class="ref-team">${crest(nextHome, 68)}<strong>${esc(nextHome.name)}</strong></div>
                <span class="ref-vs">×</span>
                <div class="ref-team">${crest(nextAway, 68)}<strong>${esc(nextAway.name)}</strong></div>
              </div>
              <div class="ref-venue"><b>${nextIsHome ? 'EM CASA' : 'FORA DE CASA'}</b><span>${esc(nextHome.stadium || club.stadium)}</span><small>${esc(nextIsHome ? club.city : nextHome.city || '')}</small></div>
            </div>` : `<div class="ref-empty">${icon('calendar')}<span>Todas as partidas da temporada foram jogadas.</span></div>`}
          </section>

          <div class="ref-home-pair">
            <section class="ref-card ref-inbox-card">
              <div class="ref-card-head"><span class="ref-section-label">${icon('mail')} COMUNICAÇÃO</span><h2>Caixa de entrada <em>${unread || 1}</em></h2></div>
              <div class="ref-list-item ref-action" data-ref-route="inbox"><span class="ref-dot"></span><span><strong>${esc(inboxTitle)}</strong><small>${esc(inboxMeta)}</small></span><b>›</b></div>
            </section>
            <section class="ref-card ref-objectives-card">
              <div class="ref-card-head"><span class="ref-section-label">${icon('target')} DIRETORIA</span><h2>Objetivos <small>Avaliação semanal</small></h2></div>
              <div class="ref-objectives">
                ${objectives.map((o) => `<div>${icon(o.good ? 'check' : 'clock')}<span><strong>${esc(o.title)}</strong><small class="${o.good ? 'obj-ok' : 'obj-warn'}">${esc(o.status)} · ${esc(o.meta)}</small></span></div>`).join('')}
              </div>
            </section>
          </div>

          <div class="ref-home-pair">
            <section class="ref-card ref-condition-card">
              <div class="ref-card-head"><span class="ref-section-label">${icon('medical')} VESTIÁRIO</span><h2>Condição do elenco <small class="ref-link" data-ref-route="squad">Ver elenco ›</small></h2></div>
              <div class="ref-condition-body">
                ${condition.map(([label, value, color]) => `<div class="ref-condition"><div><strong>${label}</strong><b>${value}%</b></div><div class="ref-progress"><i style="width:${value}%;background:${color}"></i></div></div>`).join('')}
                <div class="ref-availability">${icon('pulse')}<span><strong>Elenco disponível — ${squad.length - outCount}/${squad.length} atletas</strong><small>${esc(availabilityText)}${injured.length ? ` · DM: ${injured.slice(0, 3).map((p) => p.name.split(' ')[0]).join(', ')}${injured.length > 3 ? '…' : ''}` : ''}</small></span></div>
              </div>
            </section>
            <section class="ref-card ref-agenda-card">
              <div class="ref-card-head"><span class="ref-section-label">${icon('calendar')} AGENDA</span><h2>Próximos jogos <small class="ref-link" data-ref-route="calendar">Calendário ›</small></h2></div>
              <div class="ref-agenda-list">
                ${future.slice(0, 4).map(({ comp, fixture }) => {
                  const date = refHomeFixtureDate(fixture, s.year);
                  const opponent = fixture.home === s.clubId ? s.db.clubs[fixture.away] : s.db.clubs[fixture.home];
                  return `<div class="ref-agenda-item"><b>${date.day} DE<br>${date.month}</b><span>${crest(opponent, 34)}</span><strong>${esc(opponent.short || opponent.name)}<small>${fixture.home === s.clubId ? 'Casa' : 'Fora'} · ${esc(comp.short || comp.name)}</small></strong><em>${fixture.week === s.week ? '18:00' : '16:00'}</em></div>`;
                }).join('') || '<div class="ref-empty-small">Nenhum jogo agendado.</div>'}
              </div>
            </section>
          </div>

          <section class="ref-card ref-news-card">
            <div class="ref-card-head"><span class="ref-section-label">${icon('clipboard')} NOTICIÁRIO</span><h2>Últimas notícias</h2></div>
            <div class="ref-news-grid">
              ${news.map((n) => `
                <article style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
                  ${newsLogo(n.source || 'GE', 32)}
                  <div>
                    <b style="font-size:0.75rem;text-transform:uppercase;color:var(--accent)">${n.source || 'GE'}</b>
                    <strong style="display:block;font-size:0.95rem;margin-top:2px">${esc(n.text)}</strong>
                  </div>
                </article>`).join('') || '<div class="ref-empty-small">Sem notícias.</div>'}
            </div>
          </section>
        </main>

        <aside class="ref-home-side">
          <section class="ref-card ref-shortcuts-card">
            <div class="ref-card-head"><span class="ref-section-label">${icon('chart')} ATALHOS</span><h2>Gestão do clube</h2></div>
            <div class="ref-shortcuts-grid">${shortcutItems.map(([route, ico, label]) => `<button class="ref-shortcut" data-ref-route="${route}">${icon(ico)}<span>${label}</span></button>`).join('')}</div>
          </section>
          <section class="ref-card ref-coach-card">
            <div class="ref-card-head"><span class="ref-section-label">${icon('trophy')} SEU TREINADOR</span><h2>${esc(s.manager.name)} <small class="ref-link" data-ref-route="manager">Evoluir ›</small></h2></div>
            <div class="ref-coach-score"><strong>${Math.round(s.manager.rep)}</strong><span><b>REPUTAÇÃO</b>${s.manager.rep >= 80 ? 'Ídolo mundial' : s.manager.rep >= 68 ? 'Respeitado' : s.manager.rep >= 55 ? 'Promissor' : 'Iniciante'}</span></div>
            <div class="ref-coach-meta"><span>IDADE<strong>${34 + s.season} anos</strong></span><span>LICENÇA<strong>${s.manager.level >= 8 ? 'Licença PRO' : s.manager.level >= 5 ? 'Licença Nacional A' : s.manager.level >= 3 ? 'Licença Nacional B' : 'Licença Nacional C'}</strong></span><span>NÍVEL<strong>${s.manager.level}</strong></span></div>
            <button class="ref-side-link" data-ref-route="manager">Árvore, atributos e licenças <b>→</b></button>
          </section>
          <section class="ref-card ref-finance-card">
            <div class="ref-card-head"><span class="ref-section-label">${icon('money')} FINANÇA PESSOAL</span><h2>Seu salário, suas escolhas</h2></div>
            <div class="ref-balance-label">SALDO PESSOAL</div><strong class="ref-balance">${money(s.finances.balance)}</strong><small>+ ${money(Math.round((club.sponsor?.value || 0) / 44))}/mês</small>
            <p>Use o salário para comprar imóveis, viagens, equipe pessoal e melhorias para o treinador.</p>
            <button class="ref-side-link" data-ref-route="finances">Ver loja e patrimônio <b>→</b></button>
          </section>
          <section class="ref-card ref-career-card">
            <div class="ref-card-head"><span class="ref-section-label">${icon('clock')} FUTURO DA CARREIRA</span><h2>Avançar ou encerrar</h2></div>
            <button data-career-act="endSeason">${icon('play')}<span>Ir ao fim da temporada<small>Simule automaticamente até o encerramento</small></span></button>
            <button data-career-act="skipCareer">${icon('trophy')}<span>Pular para o fim da carreira<small>Simule o legado até a aposentadoria</small></span></button>
            <button data-career-act="retire">${icon('trophy')}<span>Aposentar treinador<small>Encerre agora e entre no Hall da Fama</small></span></button>
          </section>
        </aside>
      </div>
    </div>`;
  },
  mount(el) {
    el.querySelectorAll('[data-ref-route]').forEach((b) => b.onclick = () => go(b.dataset.refRoute));
    el.querySelector('[data-go-match]')?.addEventListener('click', () => go('match'));
    el.querySelector('[data-go-match]')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') go('match'); });
    el.querySelector('[data-career-act=endSeason]')?.addEventListener('click', () => {
      confirmBox('Ir ao fim da temporada', 'O jogo simulará todas as semanas restantes automaticamente. Deseja continuar?', () => {
        simulateToSeasonEnd();
      });
    });
    el.querySelector('[data-career-act=skipCareer]')?.addEventListener('click', () => {
      confirmBox('Pular para o fim da carreira', 'Simula os próximos 15 anos de sua carreira com base no seu desempenho atual. Esta ação não pode ser desfeita!', () => {
        simulateToCareerEnd();
      });
    });
    el.querySelector('[data-career-act=retire]')?.addEventListener('click', () => {
      confirmBox('Aposentar treinador', 'Deseja encerrar sua carreira agora e ver seu legado final?', () => {
        retireManager();
      });
    });
  },
};

function simulateToSeasonEnd() {
  const el = document.getElementById('screen');
  el.innerHTML = `<div class="sim-loading"><div class="spinner"></div><div class="muted">Simulando até o fim da temporada...</div></div>`;
  setTimeout(() => {
    let r = { seasonEnded: false };
    while (!r.seasonEnded) {
      r = G.simWeek(S());
    }
    autosave();
    toast('🏁 Temporada encerrada automaticamente!');
    go('home');
    renderRoute();
  }, 100);
}

function simulateToCareerEnd() {
  const el = document.getElementById('screen');
  el.innerHTML = `<div class="sim-loading"><div class="spinner"></div><div class="muted">Simulando legado da carreira...</div></div>`;
  setTimeout(() => {
    const s = S();
    for (let i = 0; i < 15; i++) {
      let r = { seasonEnded: false };
      while (!r.seasonEnded) {
        r = G.simWeek(s);
      }
    }
    autosave();
    toast('🏆 Carreira simulada com sucesso!');
    go('stats');
    renderRoute();
  }, 100);
}

function retireManager() {
  const s = S();
  s.retired = true;
  autosave();
  go('manager');
  renderRoute();
}

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
const squadFilter = { pos: 'all', sort: 'ovr', q: '', situation: 'all', age: 'all' };
export const squadScreen = {
  html() {
    const s = S();
    let players = G.clubPlayers(s.db, s.clubId);
    if (squadFilter.pos !== 'all') players = players.filter((p) => p.pos === squadFilter.pos);
    if (squadFilter.q) {
      const q = squadFilter.q.toLowerCase();
      players = players.filter((p) => p.name.toLowerCase().includes(q) || String(p.number).includes(q));
    }
    if (squadFilter.situation === 'available') players = players.filter((p) => p.injuredWeeks <= 0 && p.suspended <= 0);
    if (squadFilter.situation === 'unavailable') players = players.filter((p) => p.injuredWeeks > 0 || p.suspended > 0);
    if (squadFilter.age === 'young') players = players.filter((p) => p.age <= 23);
    if (squadFilter.age === 'senior') players = players.filter((p) => p.age >= 30);
    const sortFns = {
      ovr: (a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || b.ovr - a.ovr,
      age: (a, b) => a.age - b.age,
      salary: (a, b) => b.salary - a.salary,
      value: (a, b) => b.value - a.value,
      form: (a, b) => b.form - a.form,
      pot: (a, b) => b.pot - a.pot,
    };
    players.sort(sortFns[squadFilter.sort] || sortFns.ovr);
    const playerCount = G.clubPlayers(s.db, s.clubId).length;
    const positionLabel = (pos) => POSITIONS[pos] || pos;
    const statusLabel = (p) => p.injuredWeeks > 0 ? `Lesionado · ${p.injuredWeeks} sem.` : p.suspended > 0 ? 'Suspenso' : p.listed ? 'Na lista' : 'Titular';

    return `
    <div class="ref-squad">
      <header class="ref-page-nav"><button class="ref-back-button" data-ref-back>${icon('back')} <span>Voltar à central</span></button><span class="ref-page-nav-title">${icon('users')} ELENCO</span><span></span></header>
      <section class="ref-squad-filters">
        <label class="ref-squad-search"><span>${icon('search')}</span><input id="sq-q" type="search" placeholder="Pesquisar jogador ou número..." value="${esc(squadFilter.q)}"></label>
        <div class="ref-position-filters">
          ${[['all', 'Todos'], ['G', 'Goleiros'], ['D', 'Defensores'], ['M', 'Meio-campistas'], ['A', 'Atacantes']].map(([p, label]) => `<button class="ref-position-chip ${squadFilter.pos === p ? 'active' : ''}" data-p="${p}">${label}</button>`).join('')}
        </div>
        <div class="ref-filter-controls">
          <div class="ref-filter-title">${icon('sliders')} <strong>Filtros</strong></div>
          <label class="ref-filter-field"><span>Situação</span><select id="sq-situation"><option value="all" ${squadFilter.situation === 'all' ? 'selected' : ''}>Todos</option><option value="available" ${squadFilter.situation === 'available' ? 'selected' : ''}>Disponíveis</option><option value="unavailable" ${squadFilter.situation === 'unavailable' ? 'selected' : ''}>Indisponíveis</option></select></label>
          <label class="ref-filter-field"><span>Idade</span><select id="sq-age"><option value="all" ${squadFilter.age === 'all' ? 'selected' : ''}>Todas</option><option value="young" ${squadFilter.age === 'young' ? 'selected' : ''}>Até 23 anos</option><option value="senior" ${squadFilter.age === 'senior' ? 'selected' : ''}>30+ anos</option></select></label>
          <label class="ref-filter-field"><span>Ordenar</span><select id="sq-sort"><option value="ovr" ${squadFilter.sort === 'ovr' ? 'selected' : ''}>Posição</option><option value="pot" ${squadFilter.sort === 'pot' ? 'selected' : ''}>Potencial</option><option value="age" ${squadFilter.sort === 'age' ? 'selected' : ''}>Idade</option><option value="value" ${squadFilter.sort === 'value' ? 'selected' : ''}>Valor</option><option value="salary" ${squadFilter.sort === 'salary' ? 'selected' : ''}>Salário</option><option value="form" ${squadFilter.sort === 'form' ? 'selected' : ''}>Forma</option></select></label>
        </div>
      </section>

      <section class="ref-squad-table-card">
        <div class="ref-squad-table-wrap"><table class="ref-squad-data">
          <colgroup><col class="col-player"><col class="col-position"><col class="col-age"><col class="col-ger"><col class="col-pot"><col class="col-condition"><col class="col-morale"><col class="col-hierarchy"><col class="col-market"><col class="col-value"><col class="col-salary"></colgroup>
          <thead><tr><th>Jogador</th><th>Posição</th><th>Idade</th><th>GER</th><th>POT</th><th>Condição</th><th>Moral</th><th>Hierarquia</th><th>Mercado</th><th>Valor</th><th>Salário</th></tr></thead>
          <tbody>${players.map((p) => `
            <tr data-pid="${p.id}" class="${p.injuredWeeks > 0 || p.suspended > 0 ? 'is-unavailable' : ''}">
              <td><div class="ref-player-cell">${avatar(p, 46)}<span><strong>${esc(p.name)}</strong><small>${icon('users')} Nº ${p.number} · ${esc(statusLabel(p))}</small></span></div></td>
              <td class="ref-position-cell">${esc(positionLabel(p.pos))}</td>
              <td>${p.age}</td>
              <td><strong class="ref-overall">${p.ovr}</strong></td>
              <td><strong class="ref-potential">${p.pot}</strong></td>
              <td><div class="ref-condition-value"><span>${p.fitness}</span><i><b style="width:${p.fitness}%"></b></i></div></td>
              <td><strong class="ref-morale">${Math.round(p.morale)}</strong></td>
              <td><span class="ref-status-pill">${icon('users')} Integrante</span></td>
              <td><span class="ref-market-pill">${icon('shield')} No elenco</span></td>
              <td>${money(p.value)}</td>
              <td><span class="ref-salary">${money(p.salary * 4)}</span><small>/mês</small></td>
            </tr>`).join('') || `<tr><td colspan="11" class="ref-table-empty">Nenhum jogador encontrado nos filtros atuais.</td></tr>`}</tbody>
        </table></div>
        <div class="ref-squad-cards">${players.map((p) => `
          <button class="sq-card ${p.injuredWeeks > 0 || p.suspended > 0 ? 'is-unavailable' : ''}" data-pid="${p.id}">
            ${avatar(p, 44)}
            <span class="sq-card-main"><strong>${esc(p.name)}</strong><small>${esc(positionLabel(p.pos))} · ${p.age} anos · Nº ${p.number}</small></span>
            <span class="sq-card-nums"><b class="sq-ovr">${p.ovr}</b><b class="sq-pot">${p.pot}</b></span>
            <span class="sq-card-foot"><i><b style="width:${p.fitness}%"></b></i><small>COND ${p.fitness}</small><em>${money(p.value)}</em></span>
          </button>`).join('') || '<div class="ref-table-empty">Nenhum jogador encontrado nos filtros atuais.</div>'}</div>
        <div class="ref-squad-summary">${players.length} de ${playerCount} atletas · clique em um jogador para abrir o perfil</div>
      </section>
    </div>`;
  },
  mount(el) {
    el.querySelector('[data-ref-back]')?.addEventListener('click', () => go('home'));
    el.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => { squadFilter.pos = b.dataset.p; renderRoute(); });
    el.querySelector('#sq-sort').onchange = (e) => { squadFilter.sort = e.target.value; renderRoute(); };
    el.querySelector('#sq-situation').onchange = (e) => { squadFilter.situation = e.target.value; renderRoute(); };
    el.querySelector('#sq-age').onchange = (e) => { squadFilter.age = e.target.value; renderRoute(); };
    const q = el.querySelector('#sq-q');
    let qTimer = null;
    q.addEventListener('input', () => {
      clearTimeout(qTimer);
      qTimer = setTimeout(() => {
        squadFilter.q = q.value.trim();
        renderRoute();
        setTimeout(() => { const nq = document.querySelector('#sq-q'); if (nq) { nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); } }, 30);
      }, 260);
    });
    el.querySelectorAll('[data-pid]').forEach((r) => r.onclick = () => go(`player/${r.dataset.pid}`));
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
  return bench.map((p) => `<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid var(--line)">
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
