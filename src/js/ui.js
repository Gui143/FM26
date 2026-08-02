// ============================================================
// ui.js — Framework de interface: ícones, rotas, layout, modais,
// toasts, sons. Não conhece as telas (registradas pelo app.js).
// ============================================================
import { fmtMoney, fmtNum, escapeHtml, clamp } from './util.js';
import { crestSVG, avatarSVG } from './gen.js';
import { LOGOS } from './logos.js';
import { T as i18n } from './data.js';

// -------------------- ÍCONES (SVG inline, estilo stroke) --------------------
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0Z"/><path d="M7 6H4a1 1 0 0 0-1 1c0 2.5 2 4 4 4M17 6h3a1 1 0 0 1 1 1c0 2.5-2 4-4 4"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  table: '<path d="M3 5h18M3 12h18M3 19h18"/><path d="M9 5v14"/>',
  cart: '<circle cx="9" cy="21" r="1.6"/><circle cx="19" cy="21" r="1.6"/><path d="M2.5 3h2l2.7 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21.5 7H6"/>',
  money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 21v-4h6v4"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2"/>',
  sprout: '<path d="M12 22v-8"/><path d="M12 14C12 9 8 6 3 6c0 5 4 8 9 8Z"/><path d="M12 14c0-5 4-8 9-8 0 5-4 8-9 8Z"/>',
  whistle: '<circle cx="14" cy="14" r="7"/><path d="M14 14 4 10l2-3 11 4"/><circle cx="14" cy="14" r="2.5"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-6 4 3 5-8"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  handshake: '<path d="m11 17 2 2a1 1 0 0 0 1.4 0l3-3a1 1 0 0 0 0-1.4L14 11"/><path d="m14 11 3.5-3.5a1.5 1.5 0 0 0-2-2L12 8 8.5 4.5a1.5 1.5 0 0 0-2 2L8 8"/><path d="M3 13l5 5a1.4 1.4 0 0 0 2 0l1-1a1.4 1.4 0 0 0 0-2l-2-2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6L22 7"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  edit: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  medical: '<path d="M8 3h8v5h5v8h-5v5H8v-5H3V8h5Z"/>',
  fire: '<path d="M12 22c4.4 0 7-2.8 7-6.5 0-3-2-5.3-3.5-7C14 7 13 5.5 13 3c-3 2-5 4.5-5 8-1-.8-1.7-1.7-2-3-1.2 1.5-2 3.4-2 5.5C4 19.2 7.6 22 12 22Z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/>',
  sliders: '<path d="M4 6h6M14 6h6M4 12h2M10 12h10M4 18h10M18 18h2"/><circle cx="12" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
  shield: '<path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6Z"/><path d="m9 12 2 2 4-4"/>',
  pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3"/>',
};
export function icon(name, cls = 'ico') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || P.info}</svg>`;
}

// -------------------- Estado global da UI --------------------
export const App = {
  state: null,
  previousState: null,
  storage: (typeof localStorage !== 'undefined') ? localStorage : null,
  screens: {},
  live: null, // controlador de partida ao vivo
};
export const hasGame = () => !!App.state;
export function lang() { return App.state?.settings?.lang || 'pt'; }
export function t(key) { return i18n(lang(), key); }

// -------------------- Helpers de componentes --------------------
export const esc = escapeHtml;
export const money = fmtMoney;
export const num = fmtNum;

const COMP_LOGOS = {
  'br1': 'https://logospng.org/logo-brasileirao/logo-brasileirao-serie-a-768.png',
  'br2': 'https://seeklogo.com/images/B/brasileirao-serie-b-logo-955B77DBF5-seeklogo.com.png',
  'br3': 'https://seeklogo.com/images/B/brasileirao-serie-c-logo-94B6984714-seeklogo.com.png',
  'br4': 'https://seeklogo.com/images/B/brasileirao-serie-d-logo-04D7964E8C-seeklogo.com.png',
  'ar1': 'https://seeklogo.com/images/L/liga-profesional-de-futbol-logo-4A1C0B52B7-seeklogo.com.png',
  'en1': 'https://seeklogo.com/images/P/premier-league-new-logo-D1105979F2-seeklogo.com.png',
  'es1': 'https://seeklogo.com/images/L/la-liga-2023-logo-C78D24E334-seeklogo.com.png',
  'it1': 'https://seeklogo.com/images/S/serie-a-logo-7E6672322E-seeklogo.com.png',
  'de1': 'https://seeklogo.com/images/B/bundesliga-logo-8408B73905-seeklogo.com.png',
  'fr1': 'https://seeklogo.com/images/L/ligue-1-mcdonalds-logo-E79B5CD030-seeklogo.com.png',
  'pt1': 'https://seeklogo.com/images/L/liga-portugal-logo-E4369B2A44-seeklogo.com.png',
  'nl1': 'https://seeklogo.com/images/E/eredivisie-logo-955B1B7D50-seeklogo.com.png',
  'CdB': 'https://logospng.org/wp-content/uploads/copa-do-brasil.png',
  'LIB': 'https://logospng.org/wp-content/uploads/conmebol-libertadores.png',
  'SUL': 'https://logospng.org/wp-content/uploads/conmebol-sudamericana.png',
  'UCL': 'https://logospng.org/wp-content/uploads/uefa-champions-league.png',
  'UEL': 'https://logospng.org/wp-content/uploads/uefa-europa-league.png',
  'ECL': 'https://logospng.org/wp-content/uploads/uefa-conference-league.png',
  'MUN': 'https://seeklogo.com/images/F/fifa-club-world-cup-logo-1E763A99B9-seeklogo.com.png',
};

const AWARD_ICONS = {
  ballonDor: 'https://images.vexels.com/media/users/3/132104/isolated/preview/594a7054a323f46f481ad363cd845a74-icone-do-trofeu-bola-de-ouro.png',
  goldenShoe: 'https://cdn-icons-png.flaticon.com/512/5166/5166649.png',
  theBest: 'https://seeklogo.com/images/F/fifa-the-best-logo-50D5773193-seeklogo.com.png',
  puskas: 'https://cdn-icons-png.flaticon.com/512/5166/5166649.png',
};

export const awardIcon = (id, size = 30) => {
  const url = AWARD_ICONS[id];
  if (url) return `<img src="${url}" width="${size}" height="${size}" style="object-fit:contain" alt="${id}">`;
  return icon('star');
};

export const compLogo = (id, size = 30) => {
  const url = COMP_LOGOS[id] || COMP_LOGOS[id.split('_')[1]];
  if (url) return `<img src="${url}" width="${size}" height="${size}" style="object-fit:contain" alt="${id}">`;
  return icon('trophy');
};

const NEWS_LOGOS = {
  'GE': 'https://s.glbimg.com/es/ge/static/ge-logo.png',
  'TNT': 'https://seeklogo.com/images/T/tnt-sports-logo-6B98B6D14C-seeklogo.com.png',
  'CAZÉ': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/CazeTV_logo.png/640px-CazeTV_logo.png',
};

export const newsLogo = (source, size = 40) => {
  const url = NEWS_LOGOS[source];
  if (url) return `<img src="${url}" width="${size}" height="${size}" style="border-radius:4px;object-fit:contain" alt="${source}">`;
  return icon('clipboard');
};

export const crest = (club, size = 40) => {
  if (club && club.id && LOGOS.has(club.id)) {
    return `<img class="club-logo" src="src/assets/logos/${club.id}.png" width="${size}" height="${size}" alt="${escapeHtml(club.short || club.name || '')}" loading="lazy">`;
  }
  return crestSVG(club, size);
};
export const avatar = (p, size = 36) => avatarSVG(p, size);

export function ovrClass(ovr) { return ovr >= 90 ? 'ovr-90' : ovr >= 80 ? 'ovr-80' : ovr >= 70 ? 'ovr-70' : ovr >= 60 ? 'ovr-60' : 'ovr-0'; }
export function ovrBadge(ovr) { return `<span class="ovr-badge ${ovrClass(ovr)}">${ovr}</span>`; }
export function posBadge(pos) { return `<span class="pos-badge pos-${pos}">${pos}</span>`; }
export function formPill(v) { const c = v >= 70 ? 'green' : v >= 50 ? 'yellow' : 'red'; return `<span class="pill ${c}">${v}</span>`; }
export function meter(label, val, max = 100) {
  return `<div class="meter" title="${label}: ${val}"><span class="tiny muted" style="min-width:70px">${label}</span><div class="bar"><i style="width:${clamp(Math.round(val / max * 100), 0, 100)}%"></i></div><span class="val">${val}</span></div>`;
}

export function clubCell(state, clubId, size = 30) {
  const c = state.db.clubs[clubId];
  if (!c) return '<span class="muted">—</span>';
  return `<span style="display:inline-flex;align-items:center;gap:8px;min-width:0">${crest(c, size)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.short)}</span></span>`;
}

// -------------------- Toast --------------------
export function toast(msg, type = 'ok', ms = 3200) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = msg;
  root.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, ms);
}

// -------------------- Modal --------------------
export function openModal(html, onMount) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-backdrop" data-close="1"><div class="modal" role="dialog">${html}</div></div>`;
  const bd = root.firstElementChild;
  bd.addEventListener('click', (e) => { if (e.target.dataset.close) closeModal(); });
  if (onMount) onMount(root.querySelector('.modal'));
  return root.querySelector('.modal');
}
export function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

export function confirmBox(title, text, onYes, yesLabel = 'Confirmar') {
  const m = openModal(`
    <div class="modal-title">${icon('info')} ${esc(title)}</div>
    <p class="muted" style="line-height:1.5;margin-bottom:18px">${text}</p>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn ghost" data-act="no">Cancelar</button>
      <button class="btn primary" data-act="yes">${esc(yesLabel)}</button>
    </div>`);
  m.querySelector('[data-act=no]').onclick = closeModal;
  m.querySelector('[data-act=yes]').onclick = () => { closeModal(); onYes(); };
}

// -------------------- Sheet (menu "Mais" mobile) --------------------
export function openSheet(items) {
  const root = document.getElementById('sheet-root');
  root.innerHTML = `<div class="sheet-backdrop"></div><div class="sheet"><div class="sheet-handle"></div><div class="nav-grid">${items.map((it) => `
    <button class="nav-item ${it.active ? 'active' : ''}" data-r="${it.route}">${icon(it.icon)}<span>${it.label}</span></button>`).join('')}
  </div></div>`;
  root.querySelector('.sheet-backdrop').onclick = closeSheet;
  root.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => { closeSheet(); go(b.dataset.r); });
}
export function closeSheet() { document.getElementById('sheet-root').innerHTML = ''; }

// -------------------- Roteador --------------------
export function go(route) {
  location.hash = '#/' + route;
}
export function currentRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  const [name, ...params] = h.split('/');
  return { name: name || 'menu', params };
}

let _screens = {};
export function registerScreens(screens) { _screens = screens; }

export function renderRoute() {
  stopLive();
  const { name, params } = currentRoute();
  const scr = _screens[name] || _screens.menu;
  const inGame = hasGame();
  const publicRoutes = ['menu', 'new', 'settings', 'saves', 'credits'];
  if (!inGame && !publicRoutes.includes(name)) { go('menu'); return; }
  const menuRoot = document.getElementById('menu-root');
  const appRoot = document.getElementById('app');
  if (inGame && name !== 'menu') {
    menuRoot.classList.add('hidden'); menuRoot.innerHTML = '';
    appRoot.classList.remove('hidden');
    renderChrome(name);
    const el = document.getElementById('screen');
    el.innerHTML = scr.html(params);
    if (scr.mount) scr.mount(el, params);
    el.scrollTop = 0; window.scrollTo(0, 0);
  } else {
    appRoot.classList.add('hidden');
    menuRoot.classList.remove('hidden');
    menuRoot.innerHTML = scr.html(params);
    if (scr.mount) scr.mount(menuRoot, params);
  }
}

// -------------------- Chrome (topbar, sidebar, tabbar) --------------------
const NAV_MAIN = [
  { route: 'home', icon: 'home', key: 'home' },
  { route: 'squad', icon: 'users', key: 'squad' },
  { route: 'tactics', icon: 'clipboard', key: 'tactics' },
  { route: 'match', icon: 'play', key: 'play' },
  { route: 'calendar', icon: 'calendar', key: 'fixtures' },
  { route: 'table', icon: 'table', key: 'league' },
  { route: 'cups', icon: 'trophy', key: 'cup' },
  { route: 'market', icon: 'cart', key: 'market' },
  { route: 'finances', icon: 'money', key: 'finances' },
  { route: 'club', icon: 'building', key: 'club' },
  { route: 'youth', icon: 'sprout', key: 'youth' },
  { route: 'training', icon: 'whistle', key: 'training' },
  { route: 'manager', icon: 'chart', key: 'manager' },
  { route: 'stats', icon: 'chart', key: 'stats' },
  { route: 'ranking', icon: 'globe', key: 'ranking' },
  { route: 'friendlies', icon: 'handshake', key: 'friendlies' },
  { route: 'custom', icon: 'plus', key: 'custom' },
  { route: 'editor', icon: 'edit', key: 'editor' },
  { route: 'saves', icon: 'save', key: 'saves' },
  { route: 'settings', icon: 'gear', key: 'settings' },
];

function renderChrome(active) {
  // A tela ativa também fica disponível como estado de apresentação para o CSS.
  // Isso permite que as telas de referência usem uma moldura própria sem tocar
  // na navegação ou no estado da partida.
  document.body.dataset.screen = active;
  const app = document.getElementById('app');
  if (app) app.dataset.screen = active;
  const s = App.state;
  const club = s.db.clubs[s.clubId];
  const unread = s.inbox.filter((i) => !i.read).length;
  document.getElementById('topbar').innerHTML = `
    <div class="topbar-club" style="cursor:pointer" data-go="club">${crest(club, 36)}
      <div><div class="cname">${esc(club.name)}</div><div class="cmeta">${s.year} • Semana ${s.week}</div></div>
    </div>
    <div class="topbar-right">
      <span class="topbar-money ${s.finances.balance < 0 ? 'neg' : ''}">${money(s.finances.balance)}</span>
      <button class="icon-btn" data-go="inbox" title="Caixa de entrada">${icon('bell')}${unread ? `<span class="badge">${unread}</span>` : ''}</button>
    </div>`;

  document.getElementById('sidebar').innerHTML = `
    <div class="sb-logo"><img src="public/favicon.svg" width="30" height="30" alt="">Futebol Manager 26</div>
    ${NAV_MAIN.map((n) => `<button class="nav-item ${n.route === active ? 'active' : ''}" data-go="${n.route}">${icon(n.icon)}<span>${t(n.key)}</span></button>`).join('')}
    <button class="nav-item" data-go="menu" style="margin-top:auto">${icon('logout')}<span>Sair / Menu</span></button>`;

  const tabs = [
    { route: 'home', icon: 'home', key: 'home' },
    { route: 'squad', icon: 'users', key: 'squad' },
    { route: 'match', icon: 'play', key: 'play', play: true },
    { route: 'market', icon: 'cart', key: 'market' },
    { route: '__more', icon: 'menu', key: 'more' },
  ];
  document.getElementById('tabbar').innerHTML = tabs.map((tb) => {
    if (tb.play) return `<button class="tab play ${active === 'match' ? 'active' : ''}" data-go="match"><span class="playpill">${icon('play')}</span><span>${t('play')}</span></button>`;
    if (tb.route === '__more') return `<button class="tab" data-more="1">${icon('menu')}<span>${t('more')}</span></button>`;
    return `<button class="tab ${active === tb.route ? 'active' : ''}" data-go="${tb.route}">${icon(tb.icon)}<span>${t(tb.key)}</span></button>`;
  }).join('');

  document.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
  document.querySelectorAll('[data-more]').forEach((b) => b.onclick = () => {
    openSheet(NAV_MAIN.filter((n) => !['home', 'squad', 'match', 'market'].includes(n.route)).map((n) => ({ ...n, label: t(n.key), active: n.route === active })));
  });
}

// -------------------- Partida ao vivo (controlador global) --------------------
export function setLive(live) { App.live = live; }
export function stopLive() { if (App.live && App.live.timer) { clearInterval(App.live.timer); App.live.timer = null; } }

// -------------------- Som (WebAudio, sem arquivos) --------------------
let audioCtx = null;
export function tone(freq = 660, dur = 0.12, type = 'sine') {
  try {
    const vol = (App.state?.settings?.volume ?? 50) / 100;
    if (vol <= 0) return;
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25 * vol, audioCtx.currentTime + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur + 0.02);
  } catch { /* sem áudio */ }
}
export function goalSound() { tone(520, 0.12, 'triangle'); setTimeout(() => tone(700, 0.15, 'triangle'), 120); setTimeout(() => tone(920, 0.22, 'triangle'), 250); }

// -------------------- Autosave --------------------
import { writeSlot } from './game.js';
export function autosave() {
  if (!App.state || !App.storage) return;
  writeSlot(App.storage, 'auto', App.state).then((r) => {
    if (!r.ok) toast(r.msg || 'Falha ao salvar.', 'error');
  }).catch(() => {});
}

export function applySettingsToBody() {
  const st = App.state?.settings || App.bootSettings || {};
  document.body.dataset.accent = st.accent || 'laranja';
  document.body.dataset.quality = st.quality || 'alta';
}
