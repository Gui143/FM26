// ============================================================
// supabase-admin.js — APENAS PARA USO SEGURO (NÃO IMPORTAR NO JOGO)
// 
// ⚠️ NUNCA USE ESTE ARQUIVO NO NAVEGADOR DE PRODUÇÃO
// ⚠️ Esta chave só deve ser usada em:
//    - Scripts de desenvolvimento locais
//    - Edge Functions
//    - Scripts Node.js / backend
// ============================================================

let adminClient = null;

/**
 * Cria um cliente Supabase com a SERVICE ROLE KEY (poder total)
 * ⚠️ NUNCA chame isso de dentro do index.html ou src/js/app.js
 * 
 * @param {string} serviceRoleKey - A chave completa (vem de .env ou arquivo seguro)
 * @returns {object} cliente Supabase com privilégios admin
 */
export async function createAdminClient(serviceRoleKey) {
  if (!serviceRoleKey || !serviceRoleKey.startsWith('eyJ')) {
    throw new Error('Service Role Key inválida ou vazia');
  }

  const SUPABASE_URL = 'https://yfezkikjyfnyptzhkoim.supabase.co';

  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    
    adminClient = createClient(SUPABASE_URL, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    console.warn('%c[Supabase Admin] Cliente com SERVICE ROLE criado. Use com cuidado!', 'color:#ef4444; font-weight:bold');
    return adminClient;
  } catch (err) {
    console.error('[Supabase Admin] Erro ao criar cliente admin:', err);
    throw err;
  }
}

/**
 * Exemplo de uso seguro (só rode isso manualmente no console do navegador
 * ou em um script Node separado):
 * 
 * import { createAdminClient } from './supabase-admin.js';
 * const admin = await createAdminClient('eyJhbGci...');
 * 
 * // Exemplo: limpar posts de teste
 * await admin.from('social_posts').delete().eq('author_name', 'Teste');
 */

// ============================================================
// FUNÇÕES ADMIN ÚTEIS (use apenas quando necessário)
// ============================================================

export async function adminDeleteAllPosts(adminClient) {
  if (!adminClient) throw new Error('Admin client não inicializado');
  const { error } = await adminClient.from('social_posts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  return { success: !error, error };
}

export async function adminDeleteAllMessages(adminClient) {
  if (!adminClient) throw new Error('Admin client não inicializado');
  const { error } = await adminClient.from('social_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  return { success: !error, error };
}

export async function adminForceSaveGame(adminClient, userId, gameState) {
  if (!adminClient || !userId) throw new Error('Parâmetros inválidos');
  
  const payload = {
    user_id: userId,
    player_name: gameState.player?.name || 'Unknown',
    age: gameState.player?.age || 18,
    ovr: gameState.player?.ovr || 50,
    fame: gameState.player?.fame || 0,
    phase: gameState.player?.phase || 'jovem',
    game_state: JSON.stringify(gameState),
    last_saved: new Date().toISOString(),
    version: 26
  };

  const { error } = await adminClient
    .from('game_saves')
    .upsert(payload, { onConflict: 'user_id' });

  return { success: !error, error };
}

// ============================================================
// INSTRUÇÕES DE USO SEGURO
// ============================================================
/*
Como usar de forma segura:

1. Abra o arquivo .env ou supabase-service-key.txt
2. Copie a SERVICE_ROLE_KEY
3. No console do navegador (APENAS EM DESENVOLVIMENTO):

   import('/src/js/supabase-admin.js').then(m => {
     m.createAdminClient('SUA_SERVICE_KEY_AQUI').then(admin => {
       console.log('Admin client pronto');
       // m.adminDeleteAllPosts(admin);
     });
   });

4. NUNCA coloque a chave no código do jogo.
5. Para produção real, use Edge Functions do Supabase.
*/