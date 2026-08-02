// ============================================================
// npc.js — conversas opcionais com NPCs via proxy server-side
//
// A chave Gemini nunca vai para o navegador. Quando a função Netlify não
// estiver configurada, o jogo continua com respostas locais determinísticas.
// ============================================================

const FALLBACKS = {
  pai: [
    'Filho, eu tenho orgulho de você. Treino é importante, mas sua saúde vem primeiro.',
    'A gente está aqui para te apoiar, ganhe ou perca. Não esquece de descansar.',
  ],
  mãe: [
    'Meu amor, respira. Uma fase ruim não define a sua história.',
    'Come alguma coisa e dorme cedo. Amanhã você pensa no próximo jogo.',
  ],
  fã: [
    'Eu vi seu último jogo! Continua acreditando, craque. A torcida está contigo!',
    'Que honra falar com você. Promete que vai continuar jogando com raça?',
  ],
  companheiro: [
    'Bora treinar depois? No vestiário todo mundo está comentando sua evolução.',
    'Fechado, irmão. A próxima partida vai ser nossa.',
  ],
  jogador: [
    'Salve! Vi seu perfil no jogo. Vamos trocar uma ideia sobre futebol?',
    'Boa! Respeito quem corre atrás do sonho. Sucesso na temporada.',
  ],
};

function fallbackReply(role = 'fã', text = '') {
  const pool = FALLBACKS[role] || FALLBACKS.fã;
  const index = Array.from(String(text)).reduce((sum, char) => sum + char.charCodeAt(0), 0) % pool.length;
  return pool[index];
}

export async function requestNpcReply({ role = 'fã', npcName = 'Pessoa', playerName = 'Craque', message, context = {} }) {
  const cleanMessage = String(message || '').trim().slice(0, 600);
  if (!cleanMessage) return { ok: false, reply: '' };
  const payload = {
    role: String(role).slice(0, 32),
    npcName: String(npcName).slice(0, 80),
    playerName: String(playerName).slice(0, 80),
    message: cleanMessage,
    context: {
      age: Number(context.age) || 0,
      club: String(context.club || '').slice(0, 80),
      phase: String(context.phase || '').slice(0, 24),
    },
  };

  try {
    const response = await fetch('/.netlify/functions/npc-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      const data = await response.json();
      const reply = String(data.reply || '').trim().slice(0, 900);
      if (reply) return { ok: true, reply, source: 'gemini' };
    }
  } catch {
    // Offline/local mode is intentional.
  }
  return { ok: true, reply: fallbackReply(payload.role, cleanMessage), source: 'local' };
}
