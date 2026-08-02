# 🔐 SUPABASE SETUP — Vida de Craque 26

## ✅ Chaves já conectadas (client-side seguro)

**Project URL:** `https://yfezkikjyfnyptzhkoim.supabase.co`  
**Publishable Key:** já está no código (`sb_publishable_...`)

O jogo agora:
- Faz login = rede social
- Salva automaticamente na nuvem quando você tem celular
- Posts e mensagens podem ir para o Supabase

---

## 1. CRIE AS TABELAS (obrigatório) — ERRO 42710 CORRIGIDO

O erro que você está vendo é:

> `ERROR: 42710: policy "Users manage own saves" for table "game_saves" already exists`

Isso significa que as políticas de segurança (RLS) já existem de uma tentativa anterior.

### ✅ MELHOR SOLUÇÃO: Use o script único (recomendado)

**Use este arquivo:**
→ **`sql/setup-complete.sql`**

**Passos exatos:**

1. Abra o arquivo **`sql/setup-complete.sql`**
2. **Copie todo o conteúdo** (Ctrl+A + Ctrl+C)
3. Vá no Supabase → **SQL Editor**
4. Cole tudo
5. Clique em **Run**

Este script faz:
- Limpeza agressiva das políticas antigas
- Criação das tabelas
- Criação das políticas corretas

---

### Se ainda der erro, use o método de 2 passos:

**Passo A:** Rode primeiro o fix
- Arquivo: `sql/fix-policies.sql`
- Cole e rode

**Passo B:** Depois rode
- Arquivo: `sql/setup.sql`
- Cole e rode

---

Depois de rodar com sucesso, volte pro jogo e teste:
**Mercado → Comprar Celular → Rede Social**

Ou copie direto daqui (versão corrigida):

```sql
-- ============================================================
-- VIDA DE CRAQUE 26 — SETUP COMPLETO DO SUPABASE (IDEMPOTENTE)
-- Cole TUDO isso no SQL Editor do Supabase
-- Pode rodar VÁRIAS VEZES sem erro
-- ============================================================

-- 1. PROFILES
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  player_name text,
  last_ovr int default 50,
  last_fame int default 0,
  updated_at timestamptz default now()
);

-- 2. GAME SAVES (principal)
create table if not exists game_saves (
  user_id uuid primary key references auth.users,
  player_name text,
  age int,
  ovr int,
  fame int,
  phase text,
  game_state jsonb,
  last_saved timestamptz default now(),
  version int default 26
);

-- 3. SOCIAL POSTS (feed da rede social)
create table if not exists social_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  author_name text,
  content text,
  created_at timestamptz default now()
);

-- 4. SOCIAL MESSAGES (chat com irmão + amigos)
create table if not exists social_messages (
  id uuid default gen_random_uuid() primary key,
  from_user uuid,
  to_user text,
  from_name text,
  message text,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS (Row Level Security) — IDÉMPOTENTE (corrige erro 42710)
-- ============================================================

-- Habilita RLS (safe)
alter table game_saves enable row level security;
alter table profiles enable row level security;
alter table social_posts enable row level security;
alter table social_messages enable row level security;

-- Remove políticas antigas (se existirem) antes de recriar
drop policy if exists "Users manage own saves" on game_saves;
drop policy if exists "Users manage own profile" on profiles;
drop policy if exists "Public read posts" on social_posts;
drop policy if exists "Users insert own posts" on social_posts;
drop policy if exists "Users see their messages" on social_messages;

-- Recria as políticas corretamente
create policy "Users manage own saves" on game_saves
  for all using (auth.uid() = user_id);

create policy "Users manage own profile" on profiles
  for all using (auth.uid() = id);

create policy "Public read posts" on social_posts for select using (true);

create policy "Users insert own posts" on social_posts
  for insert with check (auth.uid() = user_id);

create policy "Users see their messages" on social_messages
  for all using (auth.uid() = from_user or auth.uid()::text = to_user);

-- ============================================================
-- FIM DO SETUP
-- Depois de rodar isso, volte pro jogo e teste:
-- Mercado → Comprar Celular → Rede Social → Cadastrar/Entrar
-- ============================================================
```

---

## 2. HABILITE AUTH (Email + Senha)

No Supabase Dashboard:
1. Authentication → Providers → **Email** → Ative
2. Authentication → URL Configuration:
   - Site URL: `http://localhost:8080` (ou seu domínio quando publicar)
   - Redirect URLs: adicione `http://localhost:8080`

---

## 3. TESTE RÁPIDO

1. Abra o jogo
2. Crie um personagem
3. Vá em **Mercado** → compre o **Celular**
4. Vá em **Rede Social**
5. Use os campos de login:
   - Email: `craque@fm26.com`
   - Senha: `12345678`
6. Clique **Cadastrar** (primeira vez) ou **Entrar**
7. Poste algo → deve salvar na nuvem

---

## 4. SERVICE ROLE KEY (RECEBIDA COM SEGURANÇA ✅)

**✅ Service Role Key recebida com segurança** em 02/08/2026.

### O que foi feito para proteger:

- Chave **NUNCA** colocada no código do navegador
- Criado arquivo protegido: `supabase-service-key.txt`
- Criado `.env` (também protegido)
- `.gitignore` atualizado para ignorar `.env*` e `*-key.txt`
- Criado `src/js/supabase-admin.js` com cliente admin separado (só deve ser usado manualmente ou em backend)

### Como usar o Service Role (somente dev / admin):

```js
// ⚠️ Só rode isso manualmente no console ou em scripts separados
import('/src/js/supabase-admin.js').then(m => {
  const key = 'eyJhbGci...'; // cole aqui só quando for usar
  m.createAdminClient(key).then(admin => {
    console.log('Cliente admin pronto');
    // m.adminDeleteAllPosts(admin);
  });
});
```

**Nunca** coloque esta chave no código que vai pro navegador em produção.

---

**O que podemos fazer agora com a Service Role:**
- Forçar salvamento na nuvem mesmo sem login
- Limpar dados de teste (posts/mensagens)
- Operações administrativas avançadas
- Futuramente: Edge Functions

Me avise o que você quer testar primeiro usando a chave admin.
---

## 5. PRÓXIMOS PASSOS

1. Rode o SQL em `sql/setup.sql` (ou copie da seção acima)
2. Abra o jogo
3. Teste o fluxo normal com a publishable key (celular + Rede Social)
4. Quando quiser, me diga que podemos ativar funções com a Service Role


Pronto! Me avise quando rodar o SQL que eu posso testar junto com você.