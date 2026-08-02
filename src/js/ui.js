// ============================================================
// ui.js — Framework de interface: ícones, rotas, layout, modais,
// toasts, sons. Não conhece as telas (registradas pelo app.js).
// ============================================================
import { fmtMoney, fmtNum, escapeHtml, clamp } from './util.js';
import { T as i18n } from './data.js';
import { LOGOS } from './logos.js';
import { crestSVG, avatarSVG } from './gen.js';

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
  heart: '<path d="M19 14c1.5-1.5 2-2.9 2-4.5A4.5 4.5 0 0 0 16.5 5c-1.3 0-2.6.6-3.5 1.6h-2A4.5 4.5 0 0 0 3 9.5c0 1.6.5 3 2 4.5l7 7Z"/>',
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
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6L22 7"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3"/>',
  bank: '<path d="M3 21h18M4 10h16M5 10V7l7-4 7 4v3M7 10v6M12 10v6M17 10v6M2 21l1-3h18l1 3Z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8s-1-5-4-5c-1.8 0-2.8 1.5-1.5 3S10 8 12 8Zm0 0s1-5 4-5c1.8 0 2.8 1.5 1.5 3S14 8 12 8Z"/>',
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
  bootSettings: null,
  onNewGame: null,
  onContinue: null,
  onLoadState: null,
  live: null,
};
export const hasGame = () => !!App.state;
export function lang() { return App.state?.settings?.lang || 'pt'; }
export function t(key) { return i18n(lang(), key); }

// -------------------- Helpers de componentes --------------------
export const esc = escapeHtml;
export const money = fmtMoney;
export const num = fmtNum;

// Avatar circular com iniciais
export function avatarEl(name, size = 48, extra = '') {
  const initials = String(name || '?').replace(/[^A-Za-zÀ-ÿ ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px;${extra}">${esc(initials || '?')}</span>`;
}

// Escudo do clube: imagem real (src/assets/logos/<id>.png) ou SVG procedural
export function crest(club, size = 40, extra = '') {
  if (!club) return '<span class="muted">—</span>';
  const hasLogo = club.id && LOGOS.has(club.id);
  if (hasLogo) {
    return `<img class="club-logo" src="src/assets/logos/${club.id}.png" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px;object-fit:contain;${extra}" title="${esc(club.name)}">`;
  }
  if (club.colors) return crestSVG(club, size);
  const short = club.short || String(club.name || '?').slice(0, 3).toUpperCase();
  return `<span class="club-crest" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.3)}px;${extra}" title="${esc(club.name)}">${esc(short)}</span>`;
}

// Avatar de jogador do banco (foto real quando existir)
export function avatar(player, size = 40) {
  if (!player) return avatarEl('?', size);
  if (player.face || player.photo) return avatarSVG(player, size);
  return avatarEl(player.name, size);
}

export function ovrBadge(ovr, size = 44) {
  const cls = ovr >= 85 ? 'ovr-90' : ovr >= 75 ? 'ovr-80' : ovr >= 62 ? 'ovr-70' : 'ovr-60';
  return `<span class="ovr-badge ${cls}" style="min-width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">${Math.round(ovr)}</span>`;
}

export function posBadge(pos, size = 'auto') {
  const map = { GOL: 'GOL', ZAG: 'ZAG', LAT: 'LAT', VOL: 'VOL', MC: 'MC', MEI: 'MEI', PON: 'PON', ATA: 'ATA' };
  const cls = { GOL: 'pos-G', ZAG: 'pos-D', LAT: 'pos-D', VOL: 'pos-D', MC: 'pos-M', MEI: 'pos-M', PON: 'pos-A', ATA: 'pos-A' }[pos] || 'pos-M';
  return `<span class="pos-badge ${cls}" ${size === 'auto' ? '' : `style="min-width:${size}px"`}>${map[pos] || pos}</span>`;
}

export function meter(label, val, max = 100, color) {
  const c = color || 'var(--accent)';
  return `<div class="meter" title="${label}: ${val}"><span class="tiny muted" style="min-width:86px">${label}</span><div class="bar"><i style="width:${clamp(Math.round(val / max * 100), 0, 100)}%;background:${c}"></i></div><span class="val">${Math.round(val)}</span></div>`;
}

export function lifeMeter(label, val, icon, color) {
  const c = color || 'var(--accent)';
  const cls = val >= 60 ? '' : val >= 35 ? 'warn' : 'low';
  return `<div class="life-meter ${cls}"><span class="lm-ico">${icon}</span><div class="lm-body"><div class="lm-top"><span>${label}</span><b>${Math.round(val)}</b></div><div class="bar"><i style="width:${clamp(val, 0, 100)}%;background:${c}"></i></div></div></div>`;
}

export function pill(text, type = '') {
  return `<span class="pill ${type}">${text}</span>`;
}

// -------------------- Toast --------------------
export function toast(msg, type = 'ok', ms = 3400) {
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
  const { name, params } = currentRoute();
  const scr = _screens[name] || _screens.menu;
  const inGame = hasGame();
  const publicRoutes = ['menu', 'new', 'settings', 'saves', 'credits', 'howto'];
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
  { route: 'training', icon: 'whistle', key: 'training' },
  { route: 'match', icon: 'play', key: 'play' },
  { route: 'career', icon: 'chart', key: 'career' },
  { route: 'market', icon: 'cart', key: 'market' },
  { route: 'social', icon: 'users', key: 'social' },
  { route: 'immersion', icon: 'globe', key: 'immersion' },
  { route: 'family', icon: 'heart', key: 'family' },
  { route: 'money', icon: 'money', key: 'money' },
  { route: 'inbox', icon: 'mail', key: 'inbox' },
  { route: 'saves', icon: 'save', key: 'saves' },
  { route: 'settings', icon: 'gear', key: 'settings' },
  { route: 'howto', icon: 'info', key: 'howto' },
  { route: 'credits', icon: 'award', key: 'credits' },
];

function renderChrome(active) {
  document.body.dataset.screen = active;
  const app = document.getElementById('app');
  if (app) app.dataset.screen = active;
  const s = App.state;
  if (!s) return;
  const p = s.player;
  const club = s.career.clubId ? (s.db.clubs || {})[s.career.clubId] : null;
  const unread = s.inbox.filter((i) => !i.read).length;
  const hasPending = !!s.pending;
  document.getElementById('topbar').innerHTML = `
    <div class="topbar-club" style="cursor:pointer" data-go="home">
      ${avatarEl(p.name, 38)}
      <div><div class="cname">${esc(p.name)}</div><div class="cmeta">${p.age} anos • OVR ${p.ovr} ${club ? '• ' + esc(club.short) : ''}</div></div>
    </div>
    <div class="topbar-right">
      <span class="topbar-money">${money(s.life.bank)}</span>
      <button class="icon-btn" data-go="inbox" title="Mensagens">${icon('bell')}${(unread || hasPending) ? `<span class="badge">${unread + (hasPending ? 1 : 0)}</span>` : ''}</button>
    </div>`;

  document.getElementById('sidebar').innerHTML = `
    <div class="sb-logo"><span class="sb-ball">⚽</span> Vida de Craque 26</div>
    <div class="sb-player">
      ${avatarEl(p.name, 44)}
      <div><div class="sb-name">${esc(p.name)}</div><div class="sb-meta">${p.age} anos • ${posBadge(p.position)} OVR <b>${p.ovr}</b></div></div>
    </div>
    ${NAV_MAIN.map((n) => `<button class="nav-item ${n.route === active ? 'active' : ''}" data-go="${n.route}">${icon(n.icon)}<span>${t(n.key)}</span>${n.route === 'inbox' && (unread || hasPending) ? `<span class="pill gold" style="margin-left:auto">${unread + (hasPending ? 1 : 0)}</span>` : ''}</button>`).join('')}
    <button class="nav-item" data-go="menu" style="margin-top:auto">${icon('logout')}<span>Sair / Menu</span></button>`;

  const tabs = [
    { route: 'home', icon: 'home', key: 'home' },
    { route: 'training', icon: 'whistle', key: 'training' },
    { route: 'match', icon: 'play', key: 'play', play: true },
    { route: 'social', icon: 'users', key: 'social' },
    { route: '__more', icon: 'menu', key: 'more' },
  ];
  document.getElementById('tabbar').innerHTML = tabs.map((tb) => {
    if (tb.play) return `<button class="tab play ${active === 'match' ? 'active' : ''}" data-go="match"><span class="playpill">${icon('play')}</span><span>${t('play')}</span></button>`;
    if (tb.route === '__more') return `<button class="tab" data-more="1">${icon('menu')}<span>${t('more')}</span></button>`;
    return `<button class="tab ${active === tb.route ? 'active' : ''}" data-go="${tb.route}">${icon(tb.icon)}<span>${t(tb.key)}</span></button>`;
  }).join('');

  document.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
  document.querySelectorAll('[data-more]').forEach((b) => b.onclick = () => {
    openSheet(NAV_MAIN.filter((n) => !['home', 'training', 'match', 'career'].includes(n.route)).map((n) => ({ ...n, label: t(n.key), active: n.route === active })));
  });
}

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
