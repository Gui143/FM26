# Supabase — Vida de Craque 26

A integração usa a **publishable key** no cliente e RLS no banco. Não coloque uma `service_role key` no navegador, no Git ou em mensagens. O login de e-mail fica acessível discretamente pelo ícone de conta na Rede Social.

## 1. Configurar as tabelas

No SQL Editor do Supabase, rode uma vez:

- `sql/setup-complete.sql` (recomendado, idempotente), ou
- `sql/setup.sql`.

Os scripts criam:

- `profiles` e `game_saves` para sincronização;
- `social_posts` para o feed;
- `social_messages` para conversas entre contas;
- `social_presence` para mostrar jogadores ativos nos últimos dois minutos.

As políticas RLS permitem que cada conta escreva apenas seus próprios saves/presença/mensagens e que o feed/presença mínima possam ser lidos conforme o fluxo do jogo. O presence não grava e-mail público, apenas nome de jogo, contexto simples e `last_seen`.

## 2. Ativar e-mail + senha

No Supabase Dashboard:

1. **Authentication → Providers → Email**: ative e-mail/senha.
2. Em **URL Configuration**, adicione a URL local e a URL de produção.
3. Se a confirmação de e-mail estiver ativada, a criação de conta mostra a instrução para confirmar o endereço.

## 3. Testar

1. Abra o jogo e crie um jogador.
2. Vá a **Mercado → comprar celular → Rede Social**.
3. Abra o pequeno botão **Conta** no cabeçalho.
4. Crie/entre com um e-mail de teste.
5. Publique algo; abra outra sessão autenticada para conferir feed/presença.

Sem Supabase ou sem login, o jogo continua no modo local: saves locais e respostas NPC offline funcionam, mas presença/feed mundial não.

## 4. Gemini no Netlify

A chave Gemini deve existir somente como variável de ambiente da Function:

```text
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash
```

O frontend chama `/.netlify/functions/npc-chat`; a Function chama a API de Interactions e nunca devolve a chave. Como qualquer chave compartilhada em texto fica comprometida, revogue a chave que foi enviada e crie outra antes do deploy.
