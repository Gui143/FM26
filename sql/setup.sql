-- ============================================================
-- 🔥 VIDA DE CRAQUE 26 — SETUP SUPABASE (VERSÃO NUCLEAR v4)
-- 
-- ESTE É O SCRIPT ÚNICO E DEFINITIVO
-- Cole TUDO abaixo no SQL Editor e rode de uma vez
-- Resolve o erro 42710 de forma agressiva
-- ============================================================

-- ============================================================
-- ETAPA 0: LIMPEZA AGRESSIVA (resolve erro 42710)
-- ============================================================

-- Desabilita RLS em todas as tabelas
ALTER TABLE IF EXISTS public.game_saves DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.social_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.social_messages DISABLE ROW LEVEL SECURITY;

-- Remove a política problemática DIRETAMENTE (método 1)
DROP POLICY IF EXISTS "Users manage own saves" ON public.game_saves;

-- Remove todas as políticas conhecidas (método 2)
DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public read posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users insert own posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users see their messages" ON public.social_messages;

-- Remove QUALQUER outra política que ainda exista (método 3 - loop)
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('game_saves', 'profiles', 'social_posts', 'social_messages')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ============================================================
-- ETAPA 1: CRIA AS TABELAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  player_name text,
  last_ovr int DEFAULT 50,
  last_fame int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.game_saves (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  player_name text,
  age int,
  ovr int,
  fame int,
  phase text,
  game_state jsonb,
  last_saved timestamptz DEFAULT now(),
  version int DEFAULT 26
);

CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  author_name text,
  content text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user uuid,
  to_user text,
  from_name text,
  message text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ETAPA 2: HABILITA RLS E CRIA AS POLÍTICAS (limpas)
-- ============================================================

-- game_saves
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saves" 
ON public.game_saves 
FOR ALL 
USING (auth.uid() = user_id);

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = id);

-- social_posts
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read posts" 
ON public.social_posts 
FOR SELECT 
USING (true);

CREATE POLICY "Users insert own posts" 
ON public.social_posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- social_messages
ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their messages" 
ON public.social_messages 
FOR ALL 
USING (auth.uid() = from_user OR auth.uid()::text = to_user);

-- ============================================================
-- ✅ FINALIZADO
-- Agora volte para o jogo e teste:
-- Mercado → Comprar Celular → Rede Social
-- ============================================================