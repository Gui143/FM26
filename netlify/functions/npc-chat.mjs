// Netlify Function: Gemini NPC proxy.
// Configure GEMINI_API_KEY in the Netlify environment; never put it in JS.

const ALLOWED_ROLES = new Set(['pai', 'mãe', 'fã', 'companheiro', 'jogador']);

function json(body, status = 200) {
  return {
    statusCode: status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

export default async function handler(event) {
  if (event.httpMethod !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json({ error: 'NPC service not configured.' }, 503);

  let input;
  try { input = JSON.parse(event.body || '{}'); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const role = ALLOWED_ROLES.has(input.role) ? input.role : 'fã';
  const npcName = String(input.npcName || 'Pessoa').slice(0, 80);
  const playerName = String(input.playerName || 'Craque').slice(0, 80);
  const message = String(input.message || '').trim().slice(0, 600);
  const context = input.context && typeof input.context === 'object' ? input.context : {};
  if (!message) return json({ error: 'Mensagem vazia.' }, 400);

  // O prompt limita o modelo ao papel de NPC de um jogo e evita que ele
  // invente ações de servidor ou peça dados privados ao jogador.
  const prompt = [
    'Você é um NPC de um simulador de carreira de futebol em português do Brasil.',
    `Seu papel é ${role}; seu nome é ${npcName}. O jogador se chama ${playerName}.`,
    `Contexto seguro do jogo: idade ${Number(context.age) || 0}, fase ${String(context.phase || 'carreira').slice(0, 24)}, clube ${String(context.club || 'sem clube').slice(0, 80)}.`,
    'Responda como uma mensagem curta, humana e calorosa, com no máximo 3 frases.',
    'Não peça senha, e-mail, telefone, localização precisa ou dados financeiros. Não diga que é uma IA. Não dê instruções médicas, legais ou de apostas.',
    `Mensagem recebida: ${message}`,
  ].join('\n');

  const model = String(process.env.GEMINI_MODEL || 'gemini-3.5-flash').replace(/^models\//, '');
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/interactions';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ model, input: prompt }),
    });
    if (!response.ok) return json({ error: 'Gemini indisponível.' }, 502);
    const data = await response.json();
    const textParts = [];
    if (typeof data.output_text === 'string') textParts.push(data.output_text);
    for (const output of (data.outputs || [])) {
      if (typeof output.text === 'string') textParts.push(output.text);
      for (const content of (output.content || [])) if (typeof content.text === 'string') textParts.push(content.text);
    }
    for (const step of (data.steps || [])) {
      for (const content of (step.content || [])) if (typeof content.text === 'string') textParts.push(content.text);
    }
    const reply = textParts.join('').trim();
    if (!reply) return json({ error: 'Resposta vazia.' }, 502);
    return json({ reply: reply.slice(0, 900) });
  } catch {
    return json({ error: 'Falha de rede.' }, 502);
  }
}

export const config = { path: '/.netlify/functions/npc-chat' };
