-- ============================================================
-- 🔧 FIX DEFINITIVO - ERRO 42710 (policy already exists)
-- 
-- COPIE TODO O CÓDIGO ABAIXO E COLE NO SQL EDITOR
-- Rode este script AGORA
-- ============================================================

-- 1. Desabilita Row Level Security
ALTER TABLE IF EXISTS public.game_saves DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.social_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.social_messages DISABLE ROW LEVEL SECURITY;

-- 2. Remove a política que está causando o erro (a mais importante)
DROP POLICY IF EXISTS "Users manage own saves" ON public.game_saves;

-- 3. Remove todas as outras políticas conhecidas
DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public read posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users insert own posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users see their messages" ON public.social_messages;

-- 4. Limpeza total de qualquer política restante (loop de segurança)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('game_saves', 'profiles', 'social_posts', 'social_messages')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 5. Confirmação
SELECT 
    '✅ SUCESSO! Políticas removidas.' AS status,
    (SELECT count(*) FROM pg_policies 
     WHERE schemaname = 'public' 
     AND tablename IN ('game_saves','profiles','social_posts','social_messages')) AS politicas_restantes;

-- ============================================================
-- PRÓXIMO PASSO:
-- Agora copie e rode o conteúdo de: sql/setup.sql
-- ============================================================