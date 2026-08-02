# ⚽ Vida de Craque 26 — Carreira de Jogador

**BitLife × FIFA** — viva a vida de um jogador de futebol, do campinho de terra ao topo do mundo. O cliente roda no navegador com HTML, CSS e JavaScript puros; a conta social, o presence e as conversas online são opcionais e usam Supabase/Netlify Functions.

- **Criação completa**: nome, gênero, nacionalidade, cidade opcional, perna dominante (direita, esquerda ou ambidestro), clube de formação opcional, posição, traços e idade inicial.
- **Peneira realmente difícil**: entrar na base depende de desempenho, forma, atributos mentais/físicos, clube-alvo e uma chance baixa; escolher um clube não pula a avaliação.
- **Mercado de transferências**: propostas de outros clubes, agente livre, renovação, salário, luvas, cláusula de rescisão e pedido para ser negociado. Compras e celular ficam separados do mercado esportivo.
- **Rede social viva**: feed, publicações, NPCs de família/fãs/companheiros e presença de jogadores que estão conectados no jogo. O botão de conta fica discreto no cabeçalho; e-mail e senha nunca são exibidos no perfil público.
- **Conversas NPC**: a função opcional `npc-chat` usa Gemini via proxy server-side, sem expor a chave no navegador, e tem fallback local offline.
- **Competições brasileiras 2026**: Série C com os 20 participantes, formato oficial e snapshot da tabela consultado na CBF em 02/08/2026; Série D com 96 clubes em 16 grupos oficiais, além dos formatos e fontes na aba **Carreira → Competições**. O futuro de cada save continua sendo simulado, não é uma promessa de resultados ao vivo.
- **Vida pessoal e finanças**: família, namoro, filhos, amigos, fama, seguidores, patrocínios, estilo de vida, compras, investimentos, aposentadoria e legado.
- **Trilha opcional**: o player aponta para `public/audio/sorry-licensed.mp3` quando o arquivo for fornecido por uma fonte autorizada. Configurações têm mute e volume próprios para a música.

---

## 🚀 Como publicar

### Netlify (recomendado)

1. Configure as variáveis de ambiente no painel do site:
   - `GEMINI_API_KEY` — chave do Google AI Studio, somente no ambiente da Function.
   - `GEMINI_MODEL` — opcional; padrão `gemini-3.5-flash`.
2. Rode `sql/setup.sql` no SQL Editor do Supabase para habilitar saves, feed, mensagens e presença.
3. Coloque, por uma fonte licenciada, `sorry-licensed.mp3` em `public/audio/` se a trilha tiver sido liberada para distribuição.
4. Faça deploy da pasta inteira. O `netlify.toml` publica `.` e registra `netlify/functions`.

**A chave Gemini enviada em uma mensagem não foi colocada no código. Como ela ficou exposta em texto, revogue-a e gere outra antes de publicar. Nunca coloque API keys, senha ou service-role key no frontend.**

### Outras hospedagens

O cliente sem a Function funciona em qualquer hospedagem estática (GitHub Pages, Vercel, Cloudflare Pages). Nesse caso, as conversas Gemini usam fallback local; feed/online dependem do Supabase e da configuração de autenticação.

### Rodar localmente

```bash
cd FM26
python3 -m http.server 8080
# abra http://localhost:8080
```

---

## 🎮 Como jogar

1. **Novo Jogo** → preencha as opções de identidade e, se quiser, escolha cidade, perna e clube-alvo.
2. Na tela inicial, acompanhe saúde, felicidade, energia, forma e jogos do mês.
3. **Treine**, jogue as partidas ou simule; decisões pendentes precisam ser respondidas.
4. Na carreira, consulte o formato real de 2026 e a classificação do seu save.
5. No **Mercado de Transferências**, busque ofertas, aceite/recuse uma proposta ou peça negociação.
6. Compre um celular no Mercado para abrir a Rede Social. O ícone de conta permite entrar/criar conta sem poluir o menu do jogo.
7. Use **Família** ou a Rede Social para conversar com pais, fãs e companheiros; a IA é opcional.

O progresso é salvo automaticamente no slot `auto`; também há exportação/importação JSON e slots manuais.

---

## 🤖 Adaptador Java opcional

O cliente publicado usa Netlify Functions, mas `services/gemini-java/` contém um exemplo Maven usando o SDK oficial `com.google.genai:google-genai` e a API de Interactions. Ele lê `GEMINI_API_KEY` do ambiente e nunca deve receber uma chave hardcoded:

```bash
cd services/gemini-java
export GEMINI_API_KEY='sua-chave'
mvn -q compile exec:java -Dexec.args='Pai, como foi meu treino?'
```

---

## 🗂️ Estrutura

| Arquivo | Papel |
|---|---|
| `src/js/game.js` | Motor do jogo: vida, tempo, treino, partidas, transferências, peneiras, seleção, eventos, aposentadoria e saves |
| `src/js/data.js` | Dados estáticos de países, ligas e clubes; inclui os 20 clubes da Série C e os 96 da Série D 2026 |
| `src/js/competitions2026.js` | Formatos, grupos oficiais da Série D e snapshot da Série C 2026 com links da CBF |
| `src/js/gen.js` | Banco procedural de elencos, atributos, avatares e escudos fallback |
| `src/js/screens.js` | Menu, criação de personagem, home e decisões |
| `src/js/screens2.js` | Treino, partidas, carreira/competições, mercado, família, finanças, rede social e configurações |
| `src/js/supabase.js` | Autenticação, saves na nuvem, feed, mensagens e presença |
| `src/js/npc.js` / `netlify/functions/npc-chat.mjs` | Conversas NPC com fallback local e proxy seguro do Gemini |
| `src/js/music.js` / `public/audio/README.md` | Player de trilha opcional e instruções de asset licenciado |
| `services/gemini-java/` | Cliente Java opcional da API de Interactions |
| `sql/setup.sql` | Tabelas e políticas RLS do Supabase |

Feito com ⚽ e JavaScript. Bom jogo, craque!
