// ============================================================
// util.js — Utilidades gerais (RNG determinístico, formatadores)
// ============================================================

// RNG com semente (mulberry32) — garante banco de dados estável
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const rng = mulberry32(seed);
  return {
    f: rng,
    int(min, max) { return Math.floor(rng() * (max - min + 1)) + min; },
    pick(arr) { return arr[Math.floor(rng() * arr.length)]; },
    chance(p) { return rng() < p; },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

let _uid = 1;
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${(_uid++).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i); h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---- Formatadores ----
export function fmtMoney(v) {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${sign}R$ ${(abs / 1e9).toFixed(2).replace('.', ',')} bi`;
  if (abs >= 1e6) return `${sign}R$ ${(abs / 1e6).toFixed(2).replace('.', ',')} mi`;
  if (abs >= 1e3) return `${sign}R$ ${(abs / 1e3).toFixed(1).replace('.', ',')} mil`;
  return `${sign}R$ ${abs.toFixed(0)}`;
}

export function fmtNum(v) {
  return Number(v).toLocaleString('pt-BR');
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function initials(name, n = 3) {
  const words = String(name).replace(/[^A-Za-zÀ-ÿ ]/g, '').split(' ').filter(Boolean);
  const letters = [];
  for (const w of words) { letters.push(w[0]); if (letters.length >= n) break; }
  return letters.join('').toUpperCase();
}

export function slug(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Cor auxiliar: clareia/escurece hex
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Contraste: texto claro ou escuro sobre a cor
export function textOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#101418' : '#ffffff';
}

export function pct(v, total) {
  if (!total) return 50;
  return Math.round((v / total) * 100);
}
