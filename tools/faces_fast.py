#!/usr/bin/env python3
"""
Download acelerado de fotos (retomável, com cache e fallback pt.wiki):

  python3 tools/faces_fast.py [--max N] [--workers 4]

- Lê /tmp/squads.json (ordem natural: Brasil primeiro)
- Resolve thumbs em lotes de 50 via API pageimages (en, fallback pt)
- Baixa imagens em paralelo com número limitado de workers
- Salva src/assets/faces/<slug>.jpg re-encodado 96x96 via PIL
- Cache de URLs em /home/user/thumbs_cache.json (persiste entre sessões)
"""
import json, os, re, sys, time, urllib.parse, urllib.request, threading, queue

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FACE_DIR = os.path.join(BASE, 'src', 'assets', 'faces')
os.makedirs(FACE_DIR, exist_ok=True)
UA = {'User-Agent': 'FutebolManager26/1.0 (personal non-commercial project; contact: local)'}
SQUADS_JSON = '/tmp/squads.json'
if not os.path.exists(SQUADS_JSON):
    SQUADS_JSON = '/home/user/squads_backup.json'
CACHE = '/home/user/thumbs_cache.json'
LOCK = threading.Lock()

def slug(t):
    return re.sub(r'[^\w]+', '_', t.lower()).strip('_')[:60]

def api(params, lang='en'):
    q = urllib.parse.urlencode(params)
    url = f'https://{lang}.wikipedia.org/w/api.php?{q}'
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read())
            time.sleep(1.0)
            return data
        except Exception as e:
            wait = [6, 15, 40, 90, 150][attempt]
            print(f'  api {lang} 429/erro ({e}); aguardando {wait}s', flush=True)
            time.sleep(wait)
    return None

def resolve_batch(chunk, lang, cache):
    d = api({'action': 'query', 'format': 'json', 'prop': 'pageimages', 'redirects': '1',
             'titles': '|'.join(chunk), 'pithumbsize': '220', 'pilicense': 'any'}, lang)
    if not d:
        return 0
    hits = 0
    pages = d.get('query', {}).get('pages', {}).values()
    found = {}
    for p in pages:
        th = p.get('thumbnail')
        if th and p.get('title'):
            found[p['title']] = th['source']
    red = {r['from']: r['to'] for r in d.get('query', {}).get('redirects', [])}
    norm = {n['from']: n['to'] for n in d.get('query', {}).get('normalized', [])}
    for t in chunk:
        if t in cache and cache[t]:
            continue
        cand = [t, norm.get(t, t), red.get(norm.get(t, t), red.get(t, t))]
        for c in cand:
            if c in found:
                cache[t] = found[c]
                hits += 1
                break
    return hits

def download_one(url):
    """Direto primeiro; se o upload.wikimedia travar (429), cai no proxy weserv."""
    full = url if not url.startswith('//') else 'https:' + url
    targets = [(full, UA), (full, UA)]
    hostless = full.replace('https://', '').replace('http://', '')
    proxy = 'https://images.weserv.nl/?w=96&h=96&fit=cover&url=' + urllib.parse.quote(hostless, safe='/:')
    targets += [(proxy, {'User-Agent': 'Mozilla/5.0'})] * 2
    for i, (t, hdrs) in enumerate(targets):
        try:
            req = urllib.request.Request(t, headers=hdrs)
            with urllib.request.urlopen(req, timeout=20) as r:
                blob = r.read()
            if len(blob) > 900:
                return blob
        except Exception:
            time.sleep([1.5, 6, 2, 8][i])
    return None

def save_jpg(blob, path):
    try:
        from PIL import Image
        import io
        im = Image.open(io.BytesIO(blob)).convert('RGB')
        im.thumbnail((96, 96))
        im.save(path, 'JPEG', quality=78)
        return True
    except Exception as e:
        print('  pil falhou:', e, flush=True)
        return False

def worker(q, stats):
    while True:
        item = q.get()
        if item is None:
            q.task_done()
            break
        t, url = item
        fn = os.path.join(FACE_DIR, slug(t) + '.jpg')
        if os.path.exists(fn):
            with LOCK:
                stats['skip'] += 1
            q.task_done()
            continue
        blob = download_one(url)
        if blob and len(blob) > 900 and save_jpg(blob, fn):
            with LOCK:
                stats['ok'] += 1
                if stats['ok'] % 25 == 0:
                    print(f"  {stats['ok']} fotos novas baixadas…", flush=True)
        else:
            with LOCK:
                stats['fail'] += 1
        time.sleep(0.06)
        q.task_done()

def main():
    args = sys.argv[1:]
    maxn = int(args[args.index('--max') + 1]) if '--max' in args else None
    nworkers = int(args[args.index('--workers') + 1]) if '--workers' in args else 4
    data = json.load(open(SQUADS_JSON))
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}

    titles = []
    seen = set()
    for cid, squad in data.items():      # ordem do JSON: Brasil primeiro
        for p in squad:
            t = p.get('t')
            if t and t not in seen:
                seen.add(t)
                if not os.path.exists(os.path.join(FACE_DIR, slug(t) + '.jpg')):
                    titles.append(t)
    if maxn:
        titles = titles[:maxn]
    print(f'{len(titles)} jogadores sem foto; cache tem {len(cache)} URLs resolvidas', flush=True)

    # 1) resolve URLs (en), cacheando
    unresolved = [t for t in titles if t not in cache]
    print(f'{len(unresolved)} precisam resolver URL (en)…', flush=True)
    for i in range(0, len(unresolved), 50):
        chunk = unresolved[i:i + 50]
        hits = resolve_batch(chunk, 'en', cache)
        for t in chunk:
            cache.setdefault(t, '')
        json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)
        print(f'  lote {i // 50 + 1}/{(len(unresolved) + 49) // 50}: +{hits} URLs (total {sum(1 for v in cache.values() if v)})', flush=True)

    # 2) fallback pt.wiki para os que ficaram sem (só se não pulou com --skip-pt)
    unresolved_pt = [] if '--skip-pt' in args else [t for t in titles if not cache.get(t)]
    if unresolved_pt:
        print(f'{len(unresolved_pt)} tentando fallback pt.wiki…', flush=True)
        for i in range(0, len(unresolved_pt), 50):
            chunk = unresolved_pt[i:i + 50]
            hits = resolve_batch(chunk, 'pt', cache)
            json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)
            print(f'  lote pt {i // 50 + 1}/{(len(unresolved_pt) + 49) // 50}: +{hits} URLs', flush=True)

    # 3) baixa em paralelo
    queue_items = [(t, cache[t]) for t in titles if cache.get(t)
                   and not os.path.exists(os.path.join(FACE_DIR, slug(t) + '.jpg'))]
    print(f'{len(queue_items)} downloads pendentes', flush=True)
    q = queue.Queue()
    stats = {'ok': 0, 'fail': 0, 'skip': 0}
    threads = [threading.Thread(target=worker, args=(q, stats), daemon=True) for _ in range(nworkers)]
    for th in threads:
        th.start()
    for item in queue_items:
        q.put(item)
    for _ in threads:
        q.put(None)
    q.join()
    print(f"PRONTO: {stats['ok']} novas, {stats['fail']} falhas, {stats['skip']} já existiam", flush=True)

if __name__ == '__main__':
    main()
