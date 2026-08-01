#!/usr/bin/env python3
"""
Baixa/renova escudos dos clubes do jogo a partir das thumbnails da Wikipedia.

Uso:
    cd futmanager
    python3 tools/fetch_logos.py

- Lê src/js/data.js (lista CLUBS) e salva PNGs em src/assets/logos/<id>.png
- Atualiza o manifesto src/js/logos.js automaticamente
- Retomável: pula arquivos já baixados (apague um PNG para baixar de novo)
- Se você adicionou um clube novo em data.js, basta rodar este script.
  Sem resultado na Wikipedia, o jogo usa o escudo procedural como fallback.

Requer Python 3, sem dependências externas.
"""
import json, os, re, subprocess, time, urllib.parse, urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_DIR = os.path.join(BASE, 'src', 'assets', 'logos')
UA = {'User-Agent': 'FutebolManager26/1.0 (projeto pessoal sem fins lucrativos)'}
SIZE = 260
os.makedirs(LOGO_DIR, exist_ok=True)

# --- Extrai a lista de clubes direto do src/js/data.js ---
def read_clubs():
    src = open(os.path.join(BASE, 'src', 'js', 'data.js'), encoding='utf-8').read()
    clubs = {}
    for league, body in re.findall(r"(\w+):\s*\[(.*?)\n  \],?", src, re.S):
        for i, row in enumerate(re.findall(r"\[\s*'([^']+)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'", body)):
            name = row[0]
            clubs[f'{league}_{i}'] = {'name': name, 'league': league}
    return clubs

def api_get(url, as_json=True, retries=5):
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=25) as r:
                data = r.read()
            time.sleep(0.8)
            return json.loads(data) if as_json else data
        except Exception as e:
            last = e
            time.sleep([8, 20, 45, 90][min(attempt, 3)])
    print('  falhou:', last)
    return None

def wiki_thumb(title, lang='en'):
    q = urllib.parse.urlencode({
        'action': 'query', 'format': 'json', 'prop': 'pageimages', 'redirects': '1',
        'titles': title, 'pithumbsize': SIZE, 'pilicense': 'any',
    })
    d = api_get(f'https://{lang}.wikipedia.org/w/api.php?{q}')
    if not d:
        return None
    for p in d.get('query', {}).get('pages', {}).values():
        th = p.get('thumbnail')
        if th and th.get('source'):
            s = th['source']
            return 'https:' + s if s.startswith('//') else s
    return None

def main():
    # títulos alternativos especiais podem ser definidos aqui
    overrides = {
        # 'it1_0': ['Inter Milan'],
    }
    clubs = read_clubs()
    print(f'{len(clubs)} clubes no banco de dados')
    ok, fail = [], []
    for cid, info in clubs.items():
        dest = os.path.join(LOGO_DIR, f'{cid}.png')
        if os.path.exists(dest) and os.path.getsize(dest) > 800:
            ok.append(cid)
            continue
        candidates = overrides.get(cid, []) + [info['name']]
        if len(info['name'].split()) <= 2:
            candidates.append(info['name'] + ' F.C.')
        url = None
        for cand in candidates:
            url = wiki_thumb(cand, 'en') or wiki_thumb(cand, 'pt')
            if url:
                break
        if not url:
            print(f'sem imagem: {cid} {info["name"]} (usará escudo procedural)')
            fail.append(cid)
            continue
        data = api_get(url, as_json=False)
        if data:
            with open(dest, 'wb') as f:
                f.write(data)
            ok.append(cid)
            print('ok', cid, info['name'])
    # manifesto
    ids = sorted(f[:-4] for f in os.listdir(LOGO_DIR) if f.endswith('.png'))
    manifest = ("// Manifesto de escudos em src/assets/logos/<id>.png\n"
                "// Clubes sem arquivo aqui usam o escudo procedural (fallback automático).\n"
                f"export const LOGOS = new Set({json.dumps(ids)});\n")
    with open(os.path.join(BASE, 'src', 'js', 'logos.js'), 'w') as f:
        f.write(manifest)
    print(f'\n{len(ok)} escudos prontos | {len(fail)} sem imagem: {fail}')
    print('manifesto atualizado em src/js/logos.js')

if __name__ == '__main__':
    main()
