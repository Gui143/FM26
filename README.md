# ⚽ Vida de Craque 26 — Carreira de Jogador

**BitLife × FIFA** — viva a vida de um jogador de futebol, do campinho de terra ao topo do mundo. Jogo completo que roda **100% no navegador** — sem servidor, sem build, sem dependências. HTML + CSS + JavaScript puros (ES Modules), pronto para publicar no Netlify.

- **Mundo real restaurado**: 232 clubes com **escudos reais**, ligas reais (Brasileirão Série A–D, Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Liga Portugal, Eredivisie, Argentina) e **5.000+ jogadores com nomes e fotos reais** — o elenco do seu clube aparece com as fotos na aba Carreira → Elenco
- **Nascimento → Lenda**: crie seu personagem (nome, país, posição, traços, idade inicial) e avance **mês a mês** pela vida — infância, escola, escolinha, peneira, base, profissional, veteranato, aposentadoria e a vida depois dela (até o fim).
- **Decisões de vida (BitLife)**: eventos aleatórios com escolhas que mudam sua história — escola, festas, namoro, casamento, filhos, escândalos, patrocínios, investimentos, lesões, propostas da Arábia…
- **Carreira de jogador (FIFA)**: atributos (ritmo, chute, passe, drible, defesa, físico, mental), overall e potencial, treinos mensais com foco e intensidade, partidas com **narrativa minuto a minuto e nota 0–10**.
- **Ligas e copas**: campeonato nacional com tabela real, Copa Nacional, competição continental e **seleção** (convocação, eliminatórias, Copa do Mundo a cada 4 anos).
- **Mercado**: janelas em janeiro/julho/agosto, propostas de clubes do mundo todo, salários, luvas, cláusulas de rescisão, renovações e pedidos de transferência.
- **Vida pessoal e finanças**: família, namoro, filhos, amigos, fama e seguidores, patrocínios, estilo de vida, compras (carro, mansão, iate…), investimentos (CDB, imóveis, alto risco) e pensão na aposentadoria.
- **Prêmios**: artilheiro, melhor do campeonato, revelação, Chuteira de Ouro, **Bola de Ouro** e títulos de seleção.
- **Hall da Fama**: ao se aposentar, veja seu **Legado** — e depois a vida continua: novos projetos, saúde e família até o fim.
- **Saves** com compressão gzip (auto + 3 slots), exportar/importar arquivo.
- Interface mobile-first, tema escuro, 6 cores de destaque, sons via WebAudio.

---

## 🚀 Como publicar (deploy)

### Netlify (recomendado)
1. Baixe a pasta do projeto.
2. Acesse **app.netlify.com/drop** e arraste a pasta inteira. Pronto — o site está no ar.
   - Não há etapa de build (`netlify.toml` já está configurado com `publish = "."`).

### Outras hospedagens
Qualquer hospedagem estática funciona (GitHub Pages, Vercel, Cloudflare Pages, Firebase Hosting). Basta servir a pasta.

### Rodar localmente
Navegadores bloqueiam ES Modules via `file://`. Use um servidorzinho local:

```bash
cd vidacraque
python3 -m http.server 8080
# abra http://localhost:8080
```

---

## 🎮 Como jogar

1. **Novo Jogo** → crie seu craque: nome, gênero, país, posição, traços de personalidade e idade inicial (5, 12, 16 ou 18 anos).
2. Na tela inicial, veja suas barras de vida (saúde, felicidade, energia, forma) e os jogos do mês.
3. **Treine** uma vez por mês (foco + intensidade), **jogue** as partidas (narração ao vivo) ou simule.
4. **Avançar mês** faz a vida andar: salário, eventos, envelhecimento, convocações e propostas.
5. Quando aparecer uma **decisão pendente**, responda — ela pode mudar tudo.
6. Suba de nível, troque de clube, brilhe na seleção, ganhe a Bola de Ouro… e escreva sua lenda.

O progresso é **salvo automaticamente** a cada mês (slot `auto`).

---

## 🗂️ Estrutura

| Arquivo | Papel |
|---|---|
| `src/js/game.js` | Motor do jogo: vida, tempo, treino, partidas, transferências, seleção, eventos, aposentadoria, saves |
| `src/js/data.js` | Dados estáticos: países, ligas, clubes, nomes, posições, atributos, traços, prêmios, narração |
| `src/js/gen.js` | Gera o banco real: 232 clubes, 5.000+ jogadores (com fotos), escudos SVG, avatares |
| `src/js/realsquads.js` | Elencos reais por clube (nomes, números, posições e fotos) |
| `src/js/logos.js` | Manifesto de escudos reais (`src/assets/logos/`) |
| `src/js/screens.js` | Telas: menu, criação de personagem, home, decisões |
| `src/js/screens2.js` | Telas: treino, partidas, carreira, mercado, família, dinheiro, fama, mensagens, hall da fama |
| `src/js/ui.js` | Framework de UI: rotas, navegação, modais, toasts, sons |
| `src/styles/main.css` | Folha de estilos (tema escuro, mobile-first) |

Feito com ⚽ e JavaScript. Bom jogo, craque!
