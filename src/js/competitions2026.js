// ============================================================
// competitions2026.js — referências oficiais da temporada 2026
//
// Os clubes e formatos abaixo são um snapshot editorial para o modo
// carreira. Resultados futuros continuam sendo simulados pelo motor.
// Atualizado em 02/08/2026 (UTC) a partir das páginas oficiais da CBF.
// ============================================================

export const COMPETITION_SOURCES_2026 = {
  cbfSerieC: 'https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-c/2026',
  cbfSerieD: 'https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-d/2026',
  cbfSerieDNews: 'https://www.cbf.com.br/futebol-brasileiro/noticias/selecao-feminina/vitoria-1/cbf-publica-documentos-tecnicos-da-nova-serie-d',
};

export const SERIE_C_2026_FORMAT = {
  id: 'br3',
  name: 'Campeonato Brasileiro Série C',
  season: 2026,
  teams: 20,
  format: '20 clubes; primeira fase em grupo único e turno único, seguida de dois quadrangulares.',
  firstPhase: 'Grupo único, turno único: 19 rodadas por clube.',
  secondPhase: 'Os oito primeiros formam dois quadrangulares; grupos B (1º, 4º, 5º, 8º) e C (2º, 3º, 6º, 7º), com ida e volta.',
  promotion: 'Os dois primeiros de cada quadrangular sobem para a Série B de 2027; os líderes decidem o título em dois jogos.',
  relegation: 'Os dois últimos da primeira fase caem para a Série D de 2027.',
  dates: '05/04/2026 a 25/10/2026',
  note: 'O campeão garante vaga na terceira fase da Copa do Brasil de 2027.',
  source: COMPETITION_SOURCES_2026.cbfSerieC,
};

// Participantes confirmados pela CBF para a Série C 2026.
export const SERIE_C_2026_CLUBS = [
  ['Anápolis', 'ANA', 'Anápolis', 'GO'],
  ['Amazonas', 'AMA', 'Manaus', 'AM'],
  ['Barra', 'BAR', 'Balneário Camboriú', 'SC'],
  ['Botafogo-PB', 'BPB', 'João Pessoa', 'PB'],
  ['Brusque', 'BRU', 'Brusque', 'SC'],
  ['Caxias', 'CAX', 'Caxias do Sul', 'RS'],
  ['Confiança', 'CON', 'Aracaju', 'SE'],
  ['Ferroviária', 'AFE', 'Araraquara', 'SP'],
  ['Figueirense', 'FIG', 'Florianópolis', 'SC'],
  ['Floresta', 'FLO', 'Fortaleza', 'CE'],
  ['Guarani', 'GUA', 'Campinas', 'SP'],
  ['Inter de Limeira', 'INT', 'Limeira', 'SP'],
  ['Itabaiana', 'ITA', 'Itabaiana', 'SE'],
  ['Ituano', 'ITU', 'Itu', 'SP'],
  ['Maranhão', 'MAC', 'São Luís', 'MA'],
  ['Maringá', 'MAR', 'Maringá', 'PR'],
  ['Paysandu', 'PAY', 'Belém', 'PA'],
  ['Santa Cruz', 'SAN', 'Recife', 'PE'],
  ['Volta Redonda', 'VRE', 'Volta Redonda', 'RJ'],
  ['Ypiranga', 'YPI', 'Erechim', 'RS'],
];

// Classificação oficial consultada na CBF em 02/08/2026, antes da rodada
// seguinte. É exibida como referência; saves novos simulam sua própria tabela.
export const SERIE_C_2026_STANDINGS = [
  ['Brusque', 27, 15, 8, 3, 4, 21, 15, 6],
  ['Guarani', 26, 15, 7, 5, 3, 28, 15, 13],
  ['Botafogo-PB', 25, 15, 8, 1, 6, 21, 16, 5],
  ['Inter de Limeira', 25, 15, 7, 4, 4, 18, 17, 1],
  ['Santa Cruz', 24, 15, 7, 3, 5, 15, 11, 4],
  ['Paysandu', 23, 15, 7, 2, 6, 23, 21, 2],
  ['Maringá', 23, 15, 6, 5, 4, 28, 25, 3],
  ['Ferroviária', 23, 15, 6, 5, 4, 15, 12, 3],
  ['Ypiranga', 21, 15, 6, 3, 6, 18, 19, -1],
  ['Caxias', 21, 15, 5, 6, 4, 14, 12, 2],
  ['Floresta', 21, 15, 5, 6, 4, 16, 15, 1],
  ['Amazonas', 20, 15, 6, 2, 7, 15, 20, -5],
  ['Figueirense', 20, 15, 5, 5, 5, 13, 18, -5],
  ['Ituano', 19, 15, 5, 4, 6, 16, 17, -1],
  ['Volta Redonda', 18, 15, 5, 3, 7, 11, 19, -8],
  ['Maranhão', 18, 15, 4, 6, 5, 11, 14, -3],
  ['Itabaiana', 17, 15, 4, 5, 6, 13, 18, -5],
  ['Barra', 15, 15, 3, 6, 6, 17, 17, 0],
  ['Anápolis', 12, 15, 3, 3, 9, 13, 19, -6],
  ['Confiança', 12, 15, 3, 3, 9, 9, 15, -6],
].map(([name, pts, played, wins, draws, losses, gf, ga, gd]) => ({
  name, pts, played, wins, draws, losses, gf, ga, gd,
}));

export const SERIE_D_2026_FORMAT = {
  id: 'br4',
  name: 'Campeonato Brasileiro Série D',
  season: 2026,
  teams: 96,
  format: '96 clubes; 16 grupos de seis, mata-mata em ida e volta e playoffs por duas vagas extras.',
  firstPhase: '16 grupos de seis, definidos por critérios geográficos; turno único de 10 rodadas (cinco em casa e cinco fora).',
  secondPhase: 'Os quatro melhores de cada grupo avançam; mata-mata em ida e volta: 64, 32, 16 e 8 clubes.',
  promotion: 'Os quatro semifinalistas sobem para a Série C de 2027; os quatro eliminados nas quartas disputam playoffs por mais duas vagas.',
  relegation: 'Não há rebaixamento esportivo na Série D.',
  dates: '05/04/2026 a 13/09/2026',
  note: 'A competição tem sete fases contando playoffs, semifinal e final; total previsto de 610 partidas.',
  source: COMPETITION_SOURCES_2026.cbfSerieD,
};

// Grupos oficiais publicados pela CBF em 06/03/2026. A ordem também é usada
// para relacionar os clubes br4_0 ... br4_95 ao grupo correto no motor.
export const SERIE_D_2026_GROUPS = [
  { id: 'A1', teams: ['Nacional-AM', 'Manaus-AM', 'Manauara-AM', 'GAS-RR', 'Monte Roraima-RR', 'São Raimundo-RR'] },
  { id: 'A2', teams: ['Independência-AC', 'Galvez-AC', 'Humaitá-AC', 'Porto Velho-RO', 'Guaporé-RO', 'Araguaína-TO'] },
  { id: 'A3', teams: ['Gama-DF', 'Brasiliense-DF', 'Luverdense-MT', 'Primavera-MT', 'Inhumas-GO', 'Aparecidense-GO'] },
  { id: 'A4', teams: ['Capital-DF', 'Ceilândia-DF', 'Mixto-MT', 'Operário-MT', 'União-MT', 'Goiatuba-GO'] },
  { id: 'A5', teams: ['Trem-AP', 'Oratório-AP', 'Tuna Luso-PA', 'Águia de Marabá-PA', 'Tocantinópolis-TO', 'Imperatriz-MA'] },
  { id: 'A6', teams: ['Sampaio Corrêa-MA', 'Moto Club-MA', 'IAPE-MA', 'Maracanã-CE', 'Iguatu-CE', 'Parnahyba-PI'] },
  { id: 'A7', teams: ['Ferroviário-CE', 'Tirol-CE', 'Atlético-CE', 'Altos-PI', 'Piauí-PI', 'Fluminense-PI'] },
  { id: 'A8', teams: ['ABC-RN', 'América-RN', 'Laguna-RN', 'Sousa-PB', 'Maguary-PE', 'Central-PE'] },
  { id: 'A9', teams: ['Retrô-PE', 'Decisão-PE', 'Serra Branca-PB', 'Treze-PB', 'Lagarto-SE', 'Sergipe-SE'] },
  { id: 'A10', teams: ['ASA-AL', 'CSA-AL', 'CSE-AL', 'Jacuipense-BA', 'Atlético-BA', 'Juazeirense-BA'] },
  { id: 'A11', teams: ['Uberlândia-MG', 'Betim-MG', 'CRAC-GO', 'ABECAT-GO', 'Operário-MS', 'Ivinhema-MS'] },
  { id: 'A12', teams: ['Porto-BA', 'Rio Branco-ES', 'Vitória-ES', 'Real Noroeste-ES', 'Tombense-MG', 'Democrata GV-MG'] },
  { id: 'A13', teams: ['Madureira-RJ', 'Portuguesa-RJ', 'America-RJ', 'Portuguesa-SP', 'Água Santa-SP', 'Pouso Alegre-MG'] },
  { id: 'A14', teams: ['Nova Iguaçu-RJ', 'Sampaio Corrêa-RJ', 'Maricá-RJ', 'XV de Piracicaba-SP', 'Noroeste-SP', 'Velo Clube-SP'] },
  { id: 'A15', teams: ['Cianorte-PR', 'FC Cascavel-PR', 'Santa Catarina-SC', 'Joinville-SC', 'Guarany de Bagé-RS', 'São Luiz-RS'] },
  { id: 'A16', teams: ['Blumenau-SC', 'Marcílio Dias-SC', 'São Joseense-PR', 'Azuriz-PR', 'São José-RS', 'Brasil-RS'] },
];

export const BRASIL_2026_COMPETITIONS = [
  { id: 'br1', name: 'Brasileirão Série A', format: '20 clubes; pontos corridos em turno e returno; quatro rebaixados.' },
  { id: 'br2', name: 'Brasileirão Série B', format: '20 clubes; pontos corridos em turno e returno; quatro acessos e quatro rebaixamentos.' },
  SERIE_C_2026_FORMAT,
  SERIE_D_2026_FORMAT,
  { id: 'copa-brasil', name: 'Copa do Brasil', format: 'Copa nacional em fases eliminatórias, com regulamento e mando definidos pela CBF.' },
  { id: 'libertadores', name: 'CONMEBOL Libertadores', format: 'Fases preliminares, fase de grupos e mata-mata em ida e volta; final em jogo único.' },
  { id: 'sul-americana', name: 'CONMEBOL Sul-Americana', format: 'Fase de grupos e playoffs/mata-mata conforme regulamento CONMEBOL.' },
  { id: 'mundial', name: 'Copa do Mundo 2026', format: '48 seleções em 12 grupos de quatro; 32 avançam ao mata-mata.' },
];

export function serieDGroupForIndex(index) {
  return SERIE_D_2026_GROUPS[Math.floor(Number(index) / 6)] || null;
}

export function normalizeTeamName(name) {
  return String(name || '').replace(/\s*\([^)]*\)|-(AM|AC|RO|TO|DF|MT|GO|AP|PA|MA|CE|PI|RN|PB|PE|SE|AL|BA|MG|ES|RJ|SP|PR|SC|RS|MS)\s*$/i, '').trim().toLowerCase();
}
