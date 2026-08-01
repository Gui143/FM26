// ============================================================
// saveio.js — Compressão de saves (gzip nativo) + helpers de
// exportar/importar arquivo. Fallback para texto puro quando
// CompressionStream não está disponível.
// ============================================================

function toBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
function fromBase64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function compressText(text) {
  try {
    if (typeof CompressionStream === 'undefined' || typeof Blob === 'undefined') return 'J:' + text;
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return 'G:' + toBase64(new Uint8Array(buf));
  } catch {
    return 'J:' + text;
  }
}

export async function decompressText(stored) {
  if (stored.startsWith('J:')) return stored.slice(2);
  if (stored.startsWith('G:')) {
    const bytes = fromBase64(stored.slice(2));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  }
  return stored; // formato legado (texto puro)
}

export function downloadFile(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
}

export function readUploadedFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsText(file);
  });
}
