# ⚽ Futebol Manager 26

Jogo completo de gerenciamento de futebol que roda **100% no navegador** — sem servidor, sem build, sem dependências. HTML + CSS + JavaScript puros (ES Modules), pronto para publicar no Netlify.

- **192 clubes** com **escudos reais** e **elencos reais** (nomes, posições, números e **fotos** de milhares de jogadores obtidos da Wikipedia/Wikimedia); onde faltar dado, o motor completa com atletas fictícios
- **Copa do Brasil no formato oficial 2026** (CBF): fases preliminares em jogo único com a Série B, entrada da Série A na 5ª fase (32 clubes, blocos por ranking), confrontos de **ida e volta** até a semifinal e **final única em campo neutro**
- **19 competições** por temporada: 10 ligas, copas nacionais, Libertadores, Sul-Americana, Champions, Europa League, Conference League, Supercopa, Estaduais e Mundial de Clubes
- Simulação **minuto a minuto** com relato ao vivo, estatísticas e narração de eventos
- Confrontos de **ida e volta** com agregado e **pênaltis diretos** se o agregado empatar (regra da CBF)
- Mercado completo: compra, venda, leilão, empréstimos, agentes livres, renovações e comissão de empresário
- Economia: bilheteria, patrocínio, premiações, folha salarial
- Base/olheiros, evolução de jogadores, aposentadorias, acesso/rebaixamento
- Saves com compressão gzip (auto + 3 slots), exportar/importar arquivo
- Interface mobile-first, tema escuro, animações, 5 cores de destaque, sons via WebAudio

---

## 🚀 Como publicar (deploy)

### Netlify (recomendado)
1. Faça o download da pasta `futmanager`.
2. Acesse **app.netlify.com/drop** e arraste a pasta inteira. Pronto — o site está no ar.
   - Não há etapa de build (`netlify.toml` já está configurado com `publish = "."`).

### Outras hospedagens
Qualquer hospedagem estática funciona (GitHub Pages, Vercel, Cloudflare Pages, Firebase Hosting). Basta servir a pasta.

### Rodar localmente
Navegadores bloqueiam ES Modules via `file://`. Use um servidorzinho local:

```bash
cd futmanager
python3 -m http.server 8080
# abra http://localhost:8080
```

> 💡 Testado em Safari (iPhone), Chrome (Android/desktop), Firefox e Edge. O jogo é mobile-first: desktop ganha sidebar; celulares ganham barra de abas inferior com botão "Jogar" em destaque.

---

## 🎮 Como jogar

1. **Novo Jogo** → escolha país → liga → clube → seu nome de treinador.
2. Na tela inicial, veja sua próxima partida. Toque em **Jogar** para assistir minuto a minuto (com velocidades 1x/2x/4x e botão Pular) ou use **Resultado rápido**.
3. Sem jogos na semana? **Avançar semana** simula todo o restante (bilheteria, folha, lesões, mercado…).
4. Monte seu time em **Táticas** (toque nas posições do campo para trocar jogadores), ajuste mentalidade, pressão, linha e estilo.
5. Reforce o elenco no **Mercado** (janelas abertas nas semanas 1–6 e 20–24).
6. Vença, suba de nível como treinador e entre para o Hall da Fama.

O progresso é **salvo automaticamente** ao fim de cada partida/semana (slot `auto`).

---

## 📁 Estrutura do projeto

```
futmanager/
├── index.html              → página única (shell do app)
├── netlify.toml            → config de deploy estático
├── README.md               → esta documentação
├── public/
│   └── favicon.svg         → ícone do jogo
├── src/
│   ├── styles/
│   │   └── main.css        → todo o visual (tema escuro, responsivo, animações)
│   └── js/
│       ├── util.js         → RNG com semente, formatadores, helpers
│       ├── data.js         → BANCO ESTÁTICO: países, ligas, 192 clubes,
│       │                     nomes p/ geração, formações, patrocinadores, i18n
│       ├── gen.js          → geração procedural: elencos, treinadores,
│       │                     escudos SVG, avatares, valores/salários
│       ├── engine.js       → motor de partida (minuto a minuto, táticas,
│       │                     cartões, lesões, pênaltis, prorrogação)
│       ├── game.js         → núcleo: temporada, competições, economia,
│       │                     mercado, base, ranking, saves (slots)
│       ├── saveio.js       → compressão gzip + exportar/importar arquivos
│       ├── logos.js        → manifesto dos escudos reais (gerado automaticamente)
│       ├── ui.js           → framework de UI: rotas, ícones, modais, toasts, som
│       ├── screens.js      → telas: menu, novo jogo, home, partida, elenco,
│       │                     jogador, táticas
│       ├── screens2.js     → telas: calendário, tabelas, copas, mercado,
│       │                     finanças, clube, base, treinador, estatísticas,
│       │                     ranking, amistosos, campeonatos personalizados,
│       │                     editor, saves, configurações, créditos, inbox
│       └── app.js          → bootstrap: registra telas e liga o roteador
└── test/
    ├── smoke.mjs           → testa toda a lógica (temporadas completas, saves…)
    └── ui.mjs              → testa renderização das 24 telas
```

O jogo é dividido em duas camadas sem dependências de DOM (`data.js`, `gen.js`, `engine.js`, `game.js`) — testáveis no Node — e a camada de apresentação (`ui.js`, `screens*.js`, `app.js`).

---

## 🛠️ Personalização — Perguntas frequentes

### ➕ Como adicionar um novo clube

1. Abra `src/js/data.js` e localize a liga desejada em `CLUBS` (ex.: `br2`).
2. Adicione uma linha no formato:

```js
['Nome do Clube', 'ABR', 'Cidade', '#cor1', '#cor2', reputacao, 'Estádio', capacidadeMil],
// ex.:
['Atlético Tubarão', 'TUB', 'Florianópolis', '#0d80bf', '#ffffff', 65, 'Estádio do Mar', 12],
```

- `reputacao`: 1–99 (define a força do elenco gerado e do orçamento).
- Você pode **adicionar clubes junto de outro existente** (liga com mais times funciona automaticamente — ex.: 22 clubes gera 42 rodadas).

3. Salve e recarregue. **Atenção:** mudanças no banco valem para jogos **novos** (saves antigos guardam o banco da época).

### ➕ Como adicionar jogadores / atualizar elencos reais

1. **Elencos reais (automático):** rode `python3 tools/fetch_squads.py squads && python3 tools/fetch_squads.py build`. O script lê os elencos atuais na Wikipedia e regenera `src/js/realsquads.js`. Para as **fotos**, rode `python3 tools/faces_fast.py` (acelerado, retomável, com fallback na Wikipedia em português) e depois `python3 tools/fetch_squads.py build` novamente. Atributos (overall, idade, potencial, salário) continuam sendo calculados pelo motor — os dados reais entram com nome, posição, número, nacionalidade e foto.
2. **No jogo:** menu **Editor** → cria jogador personalizado (nome, foto, posição, overall, potencial…). Salva direto no seu save.
3. **Editar jogador existente:** abra o perfil → **Editar jogador**.
4. **Fictícios:** os elencos complementares usam os pools `NAME_POOLS` em `data.js` — acrescente nomes para variar.

### 🏆 Como adicionar campeonatos

1. **No jogo:** menu **Criar Campeonato** → nome, formato (mata-mata ou pontos corridos), escolha de 4 a 32 equipes. Ele entra no calendário na semana seguinte.
2. **No código:** em `game.js`, função `generateSeason()`, use os construtores:

```js
// Liga (pontos corridos): id, nome, abrev, times, semana inicial, turno e returno?
buildLeagueComp('MEU_ID', 'Minha Liga', 'MLG', listaDeClubIds, 1, true);

// Copa (mata-mata): id, nome, abrev, times, semana inicial, intervalo entre fases
buildKnockoutComp('MINHA_COPA', 'Minha Copa', 'MCP', listaDeClubIds, 4, 3, { seeded: false });
```

Basta dar `comps.push(...)` com o objeto criado. Tabelas, artilharia, chaveamento, premiação e histórico funcionam automaticamente.

### 🛡️ Como trocar / adicionar escudos

Os escudos reais dos **192 clubes já estão inclusos** em `src/assets/logos/<id_do_clube>.png`
(ex.: `br1_0.png` = Flamengo), obtidos das páginas dos clubes na Wikipedia/Wikimedia.

- **Trocar um escudo:** substitua o arquivo PNG (mantenha o nome `<id>.png`). Tamanho sugerido: 260px+.
- **Clube novo** (que você adicionou em `data.js`): rode `python3 tools/fetch_logos.py` —
  o script localiza e baixa o escudo na Wikipedia e atualiza o manifesto `src/js/logos.js`.
- **Fallback automático:** clubes sem PNG (ex.: recém-criados) ganham um escudo SVG procedural
  gerado com as cores/sigla do clube (`crestSVG()` em `src/js/gen.js`) — o jogo nunca fica sem escudo.
- Os ids dos clubes seguem o padrão `<liga>_<índice>` definido pela ordem em `src/js/data.js`.
- ⚠️ Escudos são marcas dos respectivos clubes: uso neste projeto é apenas referência visual, pessoal e não comercial.

### 🌍 Como personalizar ligas

Em `src/js/data.js`, a lista `LEAGUES` define `id`, `country`, `name`, `tier`, `teams` e `relegation` (rebaixados). Para criar uma nova liga:

1. Adicione a entrada em `LEAGUES` e o array de clubes em `CLUBS['seu_id']`.
2. Se quiser copa nacional para esse país, inclua o par de nomes no mapa `cupNames` em `game.js/generateSeason()`.
3. Países com duas divisões ganham **acesso/rebaixamento automático** (basta `tier: 1` e `tier: 2` com o mesmo `country`).

### 🔄 Como atualizar dados (elencos, orçamentos…)

O banco é **determinístico** (semente `2026`): o mesmo código sempre gera o mesmo mundo. Para "atualizar o banco":

1. Edite reputações/orçamentos em `data.js` (mudam elencos e economia gerados).
2. Para mundos levemente diferentes por save, mude a seed em `app.js`: `buildDatabase(2026)`.
3. Comece um **Novo Jogo** para aplicar. Saves antigos continuam intactos com o banco deles.

### 🌐 Como traduzir

Os rótulos centrais ficam em `I18N` (`data.js`). Adicione um idioma (ex.: `es`) com as mesmas chaves e ele aparece selecionável (basta incluir o botão em `settingsScreen`, ou estender a lista `data-set="lang:xx"`). Os relatos minuto a minuto estão em `engine.js` (função `resolveAttack` e mensagens `ev(...)`).

### ⏱️ Velocidade, tema, volume, qualidade

Tudo ajustável em **Configurações** dentro do jogo (persistentes por save e também no menu).

---

## 💾 Sistema de saves

| Recurso | Onde |
|---|---|
| Salvamento automático | após cada partida e avanço de semana (slot `auto`) |
| Salvamento manual | tela **Saves** → 3 slots |
| Exportar | tela **Saves** → arquivo `.fmsave.json` (gzip) |
| Importar | tela **Saves** → selecionar arquivo |
| Armazenamento | `localStorage` do navegador, comprimido (~0,7 MB/save) |

Saves guardam o **mundo inteiro** (todos os clubes e jogadores), então você pode ter carreiras paralelas em slots diferentes.

---

## 🧪 Testes

```bash
node test/smoke.mjs   # lógica: temporada inteira, copas, rebaixamento, mercado, saves
node test/ui.mjs      # renderiza as 24 telas e valida o fluxo de partida
```

---

## ⚖️ Aviso

Projeto **original**: todo o código (motor, interface, banco de dados) é próprio — nenhum conteúdo de outros jogos foi copiado. Nomes de clubes, competições e **jogadores** são informações factuais públicas do esporte (via Wikipedia), usadas apenas como referência. Os **escudos dos clubes** e as **fotos dos atletas** foram obtidos de páginas públicas da Wikipedia/Wikimedia e permanecem propriedade dos respectivos detentores (clubes/fotógrafos/licenciadores): o uso aqui é estritamente **pessoal e não comercial**. Para distribuição pública/comercial, recomenda-se apagar `src/assets/logos` e `src/assets/faces` (o jogo gera escudos e avatares procedurais automaticamente) ou obter autorização dos detentores. Atributos, idades, potenciais e valores dos atletas são calculados pelo motor do jogo e não pretendem representar a realidade.
