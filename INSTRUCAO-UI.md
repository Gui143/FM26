# INSTRUÇÃO — Ajustar a UI do FM26 para ficar igual às prints

Olá, agente. Você está trabalhando no repositório **Gui143/FM26** (Futebol Manager 26),
um jogo de gerenciamento de futebol em navegador (HTML/CSS/JS puro, sem framework).

## Sua tarefa

Deixar a interface (UI) do jogo **igual às imagens de referência** abaixo, mexendo
**APENAS no visual (HTML/CSS/JS de apresentação)**. **NÃO altere nenhuma lógica do jogo**
(simulação, banco de dados, economia, saldo, motor de partida, progressão, etc.).

A **cor atual pode continuar** (laranja/preto, tema escuro) — o que precisa mudar é o
**layout / estrutura das telas** para combinar com as prints.

## Imagens de referência (já commitadas na raiz da main)

**Antes de tudo:** rode `git pull` para garantir que tem a versão mais recente, e depois
`ls` na raiz do repositório para confirmar que estes arquivos estão presentes
(todos na raiz, sem pasta):

- `elencos` — tela de Elenco (extensão pode ser `.png`, `.jpg` ou `.webp`; use `ls` para descobrir)
- `central do treinador` — tela de onde joga / ir para a partida (parte 1)
- `central do treinador pt2` — continuação da tela acima (parte 2)
- `treinos` — tela de Treinos
- `calendario` — tela de Calendário

Se a extensão não for `.png` (ex.: for `.jpg`/`.webp`), ajuste o nome completo na hora
de ler. Use `ls -la` na raiz para ver os nomes exatos.

Use a ferramenta de leitura de arquivos (`read_file`) para **abrir e analisar cada uma
dessas imagens** antes de mexer no código. Observe com atenção:
- estrutura (cards, listas, tabelas, grades)
- posição e tamanho dos blocos, títulos e seções
- cabeçalhos e organização de cada tela
- quantas colunas/linhas, ordem dos elementos

## Onde está o código da UI

- `src/styles/main.css` — toda a folha de estilos (tema escuro laranja, componentes).
- `src/js/ui.js` — componentes de interface.
- `src/js/screens.js` e `src/js/screens2.js` — construção das telas (Elenco, Central do
  Treinador, Treinos, Calendário, partida, etc.).
- `src/js/app.js`, `src/js/saveio.js` — estrutura do app (não mexa em lógica).

## Como validar

- Rode os testes existentes: `node test/smoke.mjs` e `node test/ui.mjs`.
- Abra o `index.html` no navegador para conferir visualmente o resultado.

## Critérios de conclusão

- [ ] Elenco está igual à print `elencos` (mantendo a cor atual).
- [ ] Central do Treinador (onde joga / ir para a partida) está igual às prints `central do treinador` e `central do treinador pt2`.
- [ ] Treinos está igual à print `treinos`.
- [ ] Calendário está igual à print `calendario`.
- [ ] Nenhuma lógica do jogo foi alterada.
- [ ] Testes passando.
