// ============================================================
// npc.js — conversas com NPCs via Gemini (com fallback local)
//
// Fluxo das respostas:
//   1) tenta a função Netlify (GEMINI_API_KEY configurada no servidor);
//   2) se indisponível, chama a API Gemini direto do navegador usando a
//      chave pública embutida abaixo (modo simples, funciona em qualquer
//      hospedagem estática);
//   3) sem internet/API, respostas locais determinísticas que reagem ao
//      assunto da mensagem.
//
// ⚠️ ATENÇÃO: a chave abaixo fica VISÍVEL no código do navegador (repo
// público) e qualquer pessoa pode usá-la e consumir sua cota do Gemini.
// O ideal em produção é configurar GEMINI_API_KEY na função Netlify e
// remover esta constante. Se notar uso estranho, revogue a chave no
// Google AI Studio e gere outra.
// ============================================================

const PUBLIC_GEMINI_KEY = 'AQ.Ab8RN6LroTOappP5Mmd3U7kbB1MOD7AIOg-5aUJ6Ce1AZuhx0g';
const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

// Respostas locais (offline) — cada papel reage ao ASSUNTO da mensagem
const FALLBACKS = {
  pai: {
    generico: ['Filho, eu tenho orgulho de você. Treino é importante, mas sua saúde vem primeiro.', 'Fala, filho. Como foi o dia hoje?', 'A família está na torcida, como sempre.'],
    gol: ['Que golaço, hein! A gente viu aqui em casa. Continua assim que o céu é o limite!', 'Vi seu nome na TV hoje! O pai quase chorou de orgulho.'],
    treino: ['Treina com humildade que o talento aparece. O pai tá de olho em tudo, viu?', 'Treino é a base de tudo, filho. Sem esforço não tem vitória.'],
    saude: ['Se cuida, filho. Lesão não espera. Qualquer coisa, a casa é sua.', 'Não força, hein! Um jogo não vale sua saúde.'],
    dinheiro: ['Dinheiro vem e vai, filho. O que importa é tua saúde e tua paz.', 'Guarda uma parte do que ganha, que o futuro agradece.'],
    jogo: ['A torcida fala, o técnico cobra, mas quem te ama é a família. Foco, craque!', 'Vimos o jogo inteiro aqui em casa. Você lutou, e isso é o que importa.'],
  },
  mãe: {
    generico: ['Meu amor, respira. Uma fase ruim não define a sua história.', 'Oi, meu anjo. A mãe está sempre aqui por você.', 'Como você está? Conta tudo pra mãe.'],
    gol: ['Que alegria ver você realizado! Eu gritei na sala quando você marcou!', 'Seu pai não fala, mas vibra igual criança quando você marca. Que orgulho!'],
    treino: ['Come alguma coisa e dorme cedo. Amanhã você pensa no próximo jogo.', 'Treinou bem? Não esquece de se alongar, tá?'],
    saude: ['Filho, dinheiro nenhum paga saúde. Se machucou, avisa a gente, tá?', 'Meu amor, vai ao médico sim. A mãe não dorme enquanto você não cuidar disso.'],
    dinheiro: ['Guarda seu dinheiro com carinho, filho. A vida muda rápido.', 'A mãe não precisa de nada, só de você bem.'],
    jogo: ['Eu rezo por você em todos os jogos! Que alegria ver você realizado.', 'A mãe viu o jogo. Você jogou com o coração, e isso é o que vale.'],
  },
  fã: {
    generico: ['Eu vi seu último jogo! Continua acreditando, craque. A torcida está contigo!', 'Que honra falar com você. Promete que vai continuar jogando com raça?', 'Acompanho sua carreira desde o começo. Sigo contigo sempre!'],
    gol: ['QUE GOLAÇO! Eu tava no estádio e explodimos juntos! Inesquecível!', 'Esse gol foi o mais bonito da rodada, todo mundo tá comentando!'],
    treino: ['Continua treinando forte que a seleção te chama, craque!', 'Sua dedicação nos treinos aparece em campo. Respeito!'],
    saude: ['Melhoras, craque! A torcida espera você voltar 100%.', 'Se cuida, ídolo. Sua saúde vem antes de tudo.'],
    dinheiro: ['Merece cada centavo, craque! Joga muito!', 'A torcida sabe o quanto você vale. Continua voando!'],
    jogo: ['Você é o motivo de eu ir ao estádio todo fim de semana. Voa, craque!', 'Esse time é outro com você em campo. A gente sente a diferença!'],
  },
  companheiro: {
    generico: ['Salve! No vestiário todo mundo está comentando sua evolução.', 'Fechado, irmão. A próxima partida vai ser nossa.', 'E aí, craque? Tudo certo pro próximo jogo?'],
    gol: ['Jogou muito hoje! Assim a gente vai longe. Respeito total.', 'Dois gols, hein! No próximo racha você me ensina essa finalização!'],
    treino: ['Bora treinar depois? Tô querendo evoluir também.', 'Treino pesado hoje, hein. Gostei da intensidade.'],
    saude: ['Fica bem, irmão. O time sente sua falta em campo.', 'Não apressa a volta, não. Lesão mal cuidada é o fim da carreira.'],
    dinheiro: ['Aproveita que o momento é bom, irmão. Contrato novo é merecido!', 'Chama a gente pra comemorar quando renovar, hein!'],
    jogo: ['O grupo confia em você. Continua com essa cabeça que o título vem.', 'Jogamos bem hoje. Foi coletivo, foi raça. Assim é bom demais!'],
  },
  jogador: {
    generico: ['Salve! Vi seu perfil no jogo. Vamos trocar uma ideia sobre futebol?', 'Boa! Respeito quem corre atrás do sonho. Sucesso na temporada.', 'E aí, craque! Bora trocar umas ideias de futebol?'],
    gol: ['Que jogada naquele último jogo! Tô até agora comentando com a galera.', 'Esses gols foram cirúrgicos. Tá inspirado, hein!'],
    treino: ['Futebol é isso: constância. Continua nesse ritmo que a seleção te chama!', 'Vi seu treino no story. Ritmo bom, continua assim!'],
    saude: ['Lesão é a pior parte do futebol. Se cuida pra voltar mais forte!', 'Fisioterapia e paciência, irmão. Volta voando.'],
    dinheiro: ['Boa contratação, hein! Mereceu cada centavo.', 'Dinheiro é consequência de trabalho. Tá no caminho certo!'],
    jogo: ['Você tá voando! Tô acompanhando seus jogos por aqui. Bora marcar um racha?', 'Esse último jogo foi aula de futebol. Aprendi contigo.'],
  },
};

function fallbackReply(role = 'fã', text = '') {
  const topics = FALLBACKS[role] || FALLBACKS.fã;
  const t = String(text).toLowerCase();
  let topic = 'generico';
  if (/gol|hat|marc|balanç|golaç|artilheir/.test(t)) topic = 'gol';
  else if (/trein|técnic|tatic|físic|academ/.test(t)) topic = 'treino';
  else if (/les|dor|machuc|saúd|joelho|médic|hospital/.test(t)) topic = 'saude';
  else if (/salário|dinheiro|contrat|proposta|clube|renov/.test(t)) topic = 'dinheiro';
  else if (/jogo|partida|vitória|derrot|empate|time|campo/.test(t)) topic = 'jogo';
  const pool = topics[topic] || topics.generico;
  const index = Array.from(String(text)).reduce((sum, char) => sum + char.charCodeAt(0), 0) % pool.length;
  return pool[index];
}

function sanitizeContext(context = {}) {
  return {
    age: Math.min(Number(context.age) || 0, 120),
    club: String(context.club || '').slice(0, 80),
    phase: String(context.phase || '').slice(0, 24),
    ovr: Math.min(Number(context.ovr) || 0, 99),
    form: Math.min(Number(context.form) || 0, 100),
    fame: Math.min(Number(context.fame) || 0, 100),
    gols: Math.max(Number(context.gols) || 0, 0),
    jogos: Math.max(Number(context.jogos) || 0, 0),
    ultimoJogo: String(context.ultimoJogo || '').slice(0, 180),
  };
}

function buildPrompt({ role, npcName, playerName, message, context }) {
  const c = context || {};
  const lines = [
    'Você é um NPC de um simulador de carreira de futebol em português do Brasil.',
    `Seu papel é ${role}; seu nome é ${npcName}. O jogador se chama ${playerName}.`,
    `Contexto do jogo: ${c.age || '?'} anos, fase ${c.phase || 'carreira'}, clube ${c.club || 'sem clube'}, OVR ${c.ovr || '?'}, forma ${c.form || '?'}, fama ${c.fame || '?'}, ${c.gols ?? 0} gols na carreira em ${c.jogos ?? 0} jogos.`,
  ];
  if (c.ultimoJogo) lines.push(`Último jogo do jogador: ${c.ultimoJogo}. Reaja a isso naturalmente se fizer sentido.`);
  lines.push('Reaja à mensagem como essa pessoa reagiria de verdade: curta, humana e calorosa, com no máximo 3 frases, em português do Brasil.');
  lines.push('Não peça senha, e-mail, telefone, localização precisa ou dados financeiros. Não diga que é uma IA. Não dê instruções médicas, legais ou de apostas.');
  lines.push(`Mensagem recebida: ${message}`);
  return lines.join('\n');
}

async function geminiDirect(prompt) {
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': PUBLIC_GEMINI_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p) => p.text || '').join('').trim();
      if (text) return text.slice(0, 900);
    } catch {
      // tenta o próximo modelo
    }
  }
  return '';
}

export async function requestNpcReply({ role = 'fã', npcName = 'Pessoa', playerName = 'Craque', message, context = {} }) {
  const cleanMessage = String(message || '').trim().slice(0, 600);
  if (!cleanMessage) return { ok: false, reply: '' };
  const payload = {
    role: String(role).slice(0, 32),
    npcName: String(npcName).slice(0, 80),
    playerName: String(playerName).slice(0, 80),
    message: cleanMessage,
    context: sanitizeContext(context),
  };
  const prompt = buildPrompt(payload);

  // 1) Função Netlify (chave no servidor — caminho recomendado)
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
    // segue para a chamada direta
  }

  // 2) Gemini direto do navegador (chave pública embutida)
  const direct = await geminiDirect(prompt);
  if (direct) return { ok: true, reply: direct, source: 'gemini' };

  // 3) Fallback local
  return { ok: true, reply: fallbackReply(payload.role, cleanMessage), source: 'local' };
}
