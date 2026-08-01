#!/usr/bin/env python3
"""
Elencos reais + fotos de jogadores (Wikipedia/Wikimedia).

Uso:
  python3 tools/fetch_squads.py squads            # baixa elencos (rápido)
  python3 tools/fetch_squads.py faces [--limit N] # baixa fotos (retomável)
  python3 tools/fetch_squads.py build             # gera src/js/realsquads.js

Nomes de atletas são informação factual pública; fotos vêm de páginas
públicas da Wikipedia/Wikimedia — uso pessoal e não comercial.
"""
import json, os, re, sys, time, urllib.parse, urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FACE_DIR = os.path.join(BASE, 'src', 'assets', 'faces')
os.makedirs(FACE_DIR, exist_ok=True)
UA = {'User-Agent': 'FutebolManager26/1.0 (personal non-commercial project)'}
SQUADS_JSON = '/tmp/squads.json'
TITLES_SRC = '/tmp/fetch_logos.py'

# Mapeamento de títulos de artigos (reaproveita o script de escudos se existir)
def load_titles():
    if os.path.exists(TITLES_SRC):
        src = open(TITLES_SRC).read()
        ns = {}
        exec(src.split('W = {')[1].split('}')[0].join(['W = {', '}']), ns)
        return ns.get('W', {})
    return {}

def clubs_list():
    import subprocess
    out = subprocess.check_output(
        ['node', '-e', "import('/home/user/futmanager/src/js/data.js').then(({CLUBS,LEAGUES})=>{const o=[];for(const l of LEAGUES){(CLUBS[l.id]||[]).forEach((r,i)=>o.push({id:l.id+'_'+i,name:r[0],league:l.id}))}console.log(JSON.stringify(o))})"]
    ).decode()
    return json.loads(out)

def api(params, lang='en', raw=False):
    q = urllib.parse.urlencode(params)
    url = f'https://{lang}.wikipedia.org/w/api.php?{q}'
    last = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            time.sleep(1.4)
            return data if raw else json.loads(data)
        except Exception as e:
            last = e; time.sleep([25, 60, 120][attempt % 3])
    print('  api falhou:', last)
    return None

def wikitext(title, lang='en'):
    d = api({'action': 'query', 'format': 'json', 'prop': 'revisions',
             'rvprop': 'content', 'rvslots': 'main', 'titles': title, 'redirects': '1'}, lang)
    if not d: return ''
    for p in d.get('query', {}).get('pages', {}).values():
        rev = p.get('revisions')
        if rev: return rev[0]['slots']['main']['*']
    return ''

ROW_RE = re.compile(r'\{\{(?:[Ff][Ss] player|[Ff]ootball squad player|[Ff]ootball squad player2|Fsb player)\s*\|([^}]*)\}\}')
F_RE = re.compile(r'(\w+)\s*=\s*([^|]*)')
LINK_RE = re.compile(r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\]')

def parse_squad(wt):
    out, seen = [], set()
    for r in ROW_RE.findall(wt):
        f = dict(F_RE.findall(r))
        link = f.get('name', '').strip()
        m = LINK_RE.match(link)
        title = m.group(1).strip() if m else ''
        disp = (m.group(2) if m and m.group(2) else (m.group(1) if m else link)) or ''
        disp = re.sub(r'\s*\(.*?\)\s*', '', disp).strip()
        key = disp.lower()
        if not title or len(disp) < 3 or key in seen: continue
        seen.add(key)
        out.append({'num': re.sub(r'\D', '', f.get('no', '')) or '',
                    'pos': f.get('pos', '').strip().upper(),
                    'nat': f.get('nat', '').strip(), 'name': disp, 'title': title})
    return out

def find_squad_template(club_name, lang='en'):
    d = api({'action': 'query', 'format': 'json', 'list': 'search',
             'srsearch': f'{club_name} squad', 'srnamespace': '10', 'srlimit': '3'}, lang)
    if not d: return None
    for r in d.get('query', {}).get('search', []):
        if 'squad' in r['title'].lower(): return r['title']
    return None

POSMAP = {'GK':'G','DF':'D','CB':'D','RB':'D','LB':'D','RWB':'D','LWB':'D','WB':'D','SW':'D',
          'MF':'M','DM':'M','CM':'M','AM':'M','RM':'M','LM':'M',
          'FW':'A','ST':'A','CF':'A','RW':'A','LW':'A','SS':'A'}
NATMAP = {'brazil':'br','bra':'br','brasil':'br','argentina':'ar','arg':'ar','spain':'es','esp':'es',
          'england':'en','eng':'en','france':'fr','fra':'fr','italy':'it','ita':'it','germany':'de','ger':'de',
          'portugal':'pt','por':'pt','netherlands':'nl','ned':'nl','belgium':'bel','col':'col','uru':'uru',
          'colombia':'col','uruguay':'uru','chile':'chi','paraguay':'par','peru':'per','ecuador':'ecu',
          'venezuela':'ven','mexico':'mex','usa':'usa','japan':'jpn','denmark':'den','norway':'nor',
          'sweden':'swe','croatia':'cro','serbia':'srb','poland':'pol','ukraine':'ukr','ghana':'gha',
          'nigeria':'nga','senegal':'sen','morocco':'mar','algeria':'alg','egypt':'egy','cameroon':'cmr',
          'ivory coast':'civ',"côte d'ivoire":'civ','turkey':'tur','greece':'gre','switzerland':'sui',
          'austria':'aut','scotland':'sco','wales':'wal','ireland':'irl','south korea':'kor','korea':'kor',
          'mali':'mli','guinea':'gui','togo':'tog','gabon':'gab','congo':'con','dr congo':'cod','canada':'can'}

def norm_nat(n):
    return NATMAP.get(n.strip().lower(), n.strip().lower()[:3] or 'br')

def download_img(url):
    full = url if not url.startswith('//') else 'https:' + url
    for attempt in range(5):
        try:
            req = urllib.request.Request(full, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                blob = r.read()
            time.sleep(0.6)
            return blob
        except Exception as e:
            time.sleep([8, 20, 45, 90][min(attempt, 3)])
    return None

def step_squads():
    clubs = clubs_list()
    titles = load_titles()
    print(f'{len(clubs)} clubes')
    data = json.load(open(SQUADS_JSON)) if os.path.exists(SQUADS_JSON) else {}
    print(f'já prontos: {len(data)} — retomando')
    for c in clubs:
        if c['id'] in data and len(data[c['id']]) >= 8:
            continue
        cid, name = c['id'], c['name']
        candidates = titles.get(cid, [name]) + [name]
        squad = []
        for cand in candidates:
            wt = wikitext(cand, 'en')
            squad = parse_squad(wt)
            if len(squad) >= 10: break
        if len(squad) < 10:
            tpl = find_squad_template(name)
            if tpl:
                squad = parse_squad(wikitext(tpl, 'en'))
        # organiza: goleiros primeiro, ordena por número
        gk = [p for p in squad if p['pos'] == 'GK']
        rest = [p for p in squad if p['pos'] != 'GK']
        rest.sort(key=lambda p: int(p['num'] or 90))
        squad = (gk[:3] + rest)[:34]
        data[cid] = [{'n': p['name'], 't': p['title'], 'pos': POSMAP.get(p['pos'], 'M'),
                      'num': int(p['num']) if p['num'] else 0, 'nat': norm_nat(p['nat'])} for p in squad]
        print(f"{cid} {name}: {len(data[cid])}", flush=True)
        json.dump(data, open(SQUADS_JSON, 'w'), ensure_ascii=False)  # progresso incremental
        time.sleep(0.35)
    total = sum(len(v) for v in data.values())
    full = sum(1 for v in data.values() if len(v) >= 10)
    print(f'\n{total} jogadores reais em {full} clubes completos', flush=True)

def step_faces(limit=None):
    data = json.load(open(SQUADS_JSON))
    titles_all = []
    for cid, squad in data.items():
        for p in squad:
            titles_all.append((p['t'], cid))
    # resolve em lotes de 50
    thumbs = {}
    batch = []
    pend = [t for t, _ in titles_all]
    # pula quem já tem foto
    def slug(t):
        s = re.sub(r'[^\w]+', '_', t.lower()).strip('_')
        return s[:60]
    todo = [t for t in pend if not os.path.exists(os.path.join(FACE_DIR, slug(t) + '.jpg'))]
    print(f'{len(pend)} jogadores | {len(todo)} sem foto ainda')
    if limit: todo = todo[:limit]
    for i in range(0, len(todo), 50):
        chunk = todo[i:i + 50]
        d = api({'action': 'query', 'format': 'json', 'prop': 'pageimages', 'redirects': '1',
                 'titles': '|'.join(chunk), 'pithumbsize': '220', 'pilicense': 'any'})
        if d:
            for p in d.get('query', {}).get('pages', {}).values():
                th = p.get('thumbnail')
                title = p.get('title')
                if th and title:
                    # acha o título original que redirecionou para este
                    thumbs[title] = th['source']
            # mapeia redirects
            for red in d.get('query', {}).get('redirects', []):
                if red.get('to') in thumbs:
                    thumbs[red['from']] = thumbs[red['to']]
            # normaliza títulos do chunk
            norm = {n.get('to'): n.get('from') for n in d.get('query', {}).get('normalized', [])}
            for t in chunk:
                if t in thumbs: continue
                t2 = norm.get(t, t)
                if t2 in thumbs: thumbs[t] = thumbs[t2]
        json.dump(thumbs, open('/tmp/thumbs.json', 'w'))
        done = sum(1 for t in pend if os.path.exists(os.path.join(FACE_DIR, slug(t) + '.jpg')))
        print(f'lote {i//50 + 1}: {done + len(thumbs)} resolvidos…')
        # baixa imediatamente os thumbs novos
        for t, url in list(thumbs.items()):
            fn = os.path.join(FACE_DIR, slug(t) + '.jpg')
            if os.path.exists(fn): continue
            blob = download_img(url)
            if blob is None:
                print('  dl falhou', t, flush=True)
                continue
            try:
                from PIL import Image
                import io
                im = Image.open(io.BytesIO(blob)).convert('RGBA')
                bg = Image.new('RGBA', im.size, (13, 17, 25, 255))
                bg.paste(im, (0, 0), im)
                im2 = bg.convert('RGB')
                im2.thumbnail((96, 96))
                canvas = Image.new('RGB', (96, 96), (13, 17, 25))
                canvas.paste(im2, ((96 - im2.width) // 2, (96 - im2.height) // 2))
                canvas.save(os.path.join(FACE_DIR, slug(t) + '.jpg'), 'JPEG', quality=78)
            except Exception as e:
                print('  encode falhou', t, e, flush=True)
    json.dump(thumbs, open('/tmp/thumbs.json', 'w'))
    print('fotos em disco:', len(os.listdir(FACE_DIR)))

def step_build():
    data = json.load(open(SQUADS_JSON))
    thumbs = json.load(open('/tmp/thumbs.json')) if os.path.exists('/tmp/thumbs.json') else {}
    def slug(t):
        return re.sub(r'[^\w]+', '_', t.lower()).strip('_')[:60]
    out = {}
    count_faces = 0
    for cid, squad in data.items():
        if len(squad) < 8: continue  # clube fraco: usa geração procedural
        rows = []
        for p in squad:
            face = slug(p['t']) + '.jpg'
            has = os.path.exists(os.path.join(FACE_DIR, face))
            if has: count_faces += 1
            rows.append({'n': p['n'], 'face': face if has else None, 'pos': p['pos'], 'num': p['num'], 'nat': p['nat']})
        out[cid] = rows
    js = '// Elencos reais gerados por tools/fetch_squads.py (nomes = informação factual pública)\n'
    js += 'export const REAL_SQUADS = ' + json.dumps(out, ensure_ascii=False) + ';\n'
    open(os.path.join(BASE, 'src', 'js', 'realsquads.js'), 'w', encoding='utf-8').write(js)
    print(f'realsquads.js: {len(out)} clubes, {sum(len(v) for v in out.values())} jogadores, {count_faces} com foto')

if __name__ == '__main__':
    step = sys.argv[1] if len(sys.argv) > 1 else 'squads'
    if step == 'squads': step_squads()
    elif step == 'faces':
        lim = None
        if '--limit' in sys.argv: lim = int(sys.argv[sys.argv.index('--limit') + 1])
        step_faces(lim)
    elif step == 'build': step_build()
