// ============================================================
// supabase.js — Integração completa com Supabase
// Login da rede social = login do jogo
// Salva automaticamente a cada ação importante
// ============================================================

// Use the official CDN ESM build (works in browser without bundler)
let supabase = null;

export async function initSupabase() {
  if (supabase) return supabase;

  const SUPABASE_URL = 'https://yfezkikjyfnyptzhkoim.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_jNdzkjYt_gv7DDXkCViaKw_MT7zHi-O'; // PUBLISHABLE KEY (public)

  try {
    // Dynamic import from CDN (modern, no build needed)
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    console.log('%c[Supabase] Cliente inicializado com sucesso', 'color:#22c55e');
    return supabase;
  } catch (err) {
    console.error('[Supabase] Falha ao carregar cliente:', err);
    // Fallback: cria um cliente fake para não quebrar o jogo
    supabase = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signUp: async () => ({ data: null, error: { message: 'Supabase não disponível offline' } }),
        signInWithPassword: async () => ({ data: null, error: { message: 'Offline' } }),
        signOut: async () => ({ error: null })
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        upsert: async () => ({ error: null }),
        insert: async () => ({ error: null })
      })
    };
    return supabase;
  }
}

export function getSupabase() {
  return supabase;
}

// ============================================================
// AUTENTICAÇÃO (Login da Rede Social = Login do Jogo)
// ============================================================
export async function signUpWithEmail(email, password, playerName) {
  const client = await initSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { player_name: playerName, game_version: '26' }
    }
  });
  return { data, error };
}

export async function signInWithEmail(email, password) {
  const client = await initSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  const client = await initSupabase();
  const { error } = await client.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const client = await initSupabase();
  const { data: { user } } = await client.auth.getUser();
  return user;
}

// ============================================================
// SALVAMENTO AUTOMÁTICO (via Rede Social)
// ============================================================
export async function saveGameToSupabase(state, userId = null) {
  if (!state || !state.player) return { ok: false, msg: 'Estado inválido' };

  const client = await initSupabase();
  const user = userId || (await getCurrentUser())?.id;

  if (!user) {
    // Sem login ainda → salva localmente (já temos autosave)
    return { ok: false, msg: 'Faça login na rede social para salvar na nuvem' };
  }

  const payload = {
    user_id: user,
    player_name: state.player.name,
    age: state.player.age,
    ovr: state.player.ovr,
    fame: state.player.fame,
    phase: state.player.phase,
    game_state: JSON.stringify(state),   // salva o estado completo
    last_saved: new Date().toISOString(),
    version: 26
  };

  try {
    const { error } = await client
      .from('game_saves')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) throw error;

    // Também salva um resumo leve na tabela profiles
    await client.from('profiles').upsert({
      id: user,
      player_name: state.player.name,
      last_ovr: state.player.ovr,
      last_fame: state.player.fame,
      updated_at: new Date().toISOString()
    });

    return { ok: true };
  } catch (err) {
    console.warn('[Supabase Save]', err);
    return { ok: false, msg: err.message || 'Erro ao salvar na nuvem' };
  }
}

export async function loadGameFromSupabase(userId = null) {
  const client = await initSupabase();
  const user = userId || (await getCurrentUser())?.id;

  if (!user) return null;

  try {
    const { data, error } = await client
      .from('game_saves')
      .select('game_state')
      .eq('user_id', user)
      .single();

    if (error || !data) return null;

    const parsed = JSON.parse(data.game_state);
    return parsed;
  } catch (err) {
    console.warn('[Supabase Load]', err);
    return null;
  }
}

// ============================================================
// REDE SOCIAL REAL (Posts, Mensagens, Interações)
// ============================================================
export async function createSocialPost(userId, text, playerName) {
  const client = await initSupabase();
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) return { ok: false };

  const { error } = await client.from('social_posts').insert({
    user_id: uid,
    author_name: playerName,
    content: text,
    created_at: new Date().toISOString()
  });

  return { ok: !error, error };
}

export async function getSocialFeed(limit = 12) {
  const client = await initSupabase();
  const { data, error } = await client
    .from('social_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

export async function sendMessageToBrother(userId, toUserId, message, fromName) {
  const client = await initSupabase();
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) return { ok: false };

  const { error } = await client.from('social_messages').insert({
    from_user: uid,
    to_user: toUserId || 'brother_simulated',
    message,
    from_name: fromName,
    created_at: new Date().toISOString()
  });

  return { ok: !error };
}

export async function getMessagesWithBrother(userId) {
  const client = await initSupabase();
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) return [];

  const { data } = await client
    .from('social_messages')
    .select('*')
    .or(`from_user.eq.${uid},to_user.eq.${uid}`)
    .order('created_at', { ascending: true })
    .limit(30);

  return data || [];
}

// ============================================================
// HELPER: Auto-save hook (chame depois de ações importantes)
// ============================================================
export async function autoSaveToCloud(state) {
  try {
    const user = await getCurrentUser();
    if (!user || !state.player?.hasCellphone) return;

    const res = await saveGameToSupabase(state);
    if (res.ok) {
      console.log('%c[Supabase] Jogo salvo automaticamente na nuvem', 'color:#3b82f6');
    }
  } catch (e) {
    // silencioso — o jogo continua funcionando offline
  }
}

// ============================================================
// TABELAS NECESSÁRIAS NO SUPABASE (SQL que o usuário deve rodar)
// ============================================================
/*
-- Cole isso no SQL Editor do Supabase (uma vez só):

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  player_name text,
  last_ovr int,
  last_fame int,
  updated_at timestamptz default now()
);

create table if not exists game_saves (
  user_id uuid primary key references auth.users,
  player_name text,
  age int,
  ovr int,
  fame int,
  phase text,
  game_state jsonb,
  last_saved timestamptz,
  version int
);

create table if not exists social_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  author_name text,
  content text,
  created_at timestamptz default now()
);

create table if not exists social_messages (
  id uuid default gen_random_uuid() primary key,
  from_user uuid,
  to_user text,
  from_name text,
  message text,
  created_at timestamptz default now()
);

-- RLS policies (recomendado)
alter table game_saves enable row level security;
create policy "Users can manage own saves" on game_saves for all using (auth.uid() = user_id);

alter table social_posts enable row level security;
create policy "Anyone can read posts" on social_posts for select using (true);
create policy "Users can insert own posts" on social_posts for insert with check (auth.uid() = user_id);
*/