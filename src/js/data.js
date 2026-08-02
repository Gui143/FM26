// ============================================================
// data.js — Banco de dados estático do jogo
// Vida de Craque 26 — Modo Carreira de Jogador (BitLife × FIFA)
// Países, cidades, nomes, posições, atributos, traços, clubes,
// ligas, prêmios, marcas, estilos de vida e i18n
// ============================================================

export const DB_VERSION = 2;

// -------------------- PAÍSES --------------------
export const COUNTRIES = [
  { id: 'br', name: 'Brasil', flag: '🇧🇷', confed: 'CONMEBOL', ntRep: 86 },
  { id: 'ar', name: 'Argentina', flag: '🇦🇷', confed: 'CONMEBOL', ntRep: 90 },
  { id: 'uy', name: 'Uruguai', flag: '🇺🇾', confed: 'CONMEBOL', ntRep: 78 },
  { id: 'co', name: 'Colômbia', flag: '🇨🇴', confed: 'CONMEBOL', ntRep: 79 },
  { id: 'pt', name: 'Portugal', flag: '🇵🇹', confed: 'UEFA', ntRep: 86 },
  { id: 'es', name: 'Espanha', flag: '🇪🇸', confed: 'UEFA', ntRep: 91 },
  { id: 'en', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', confed: 'UEFA', ntRep: 90 },
  { id: 'fr', name: 'França', flag: '🇫🇷', confed: 'UEFA', ntRep: 90 },
  { id: 'de', name: 'Alemanha', flag: '🇩🇪', confed: 'UEFA', ntRep: 87 },
  { id: 'it', name: 'Itália', flag: '🇮🇹', confed: 'UEFA', ntRep: 85 },
  { id: 'nl', name: 'Holanda', flag: '🇳🇱', confed: 'UEFA', ntRep: 82 },
  { id: 'be', name: 'Bélgica', flag: '🇧🇪', confed: 'UEFA', ntRep: 80 },
  { id: 'hr', name: 'Croácia', flag: '🇭🇷', confed: 'UEFA', ntRep: 80 },
  { id: 'rs', name: 'Sérvia', flag: '🇷🇸', confed: 'UEFA', ntRep: 75 },
  { id: 'us', name: 'EUA', flag: '🇺🇸', confed: 'CONCACAF', ntRep: 73 },
  { id: 'mx', name: 'México', flag: '🇲🇽', confed: 'CONCACAF', ntRep: 74 },
  { id: 'jp', name: 'Japão', flag: '🇯🇵', confed: 'AFC', ntRep: 76 },
  { id: 'kr', name: 'Coreia do Sul', flag: '🇰🇷', confed: 'AFC', ntRep: 75 },
  { id: 'ng', name: 'Nigéria', flag: '🇳🇬', confed: 'CAF', ntRep: 77 },
  { id: 'sn', name: 'Senegal', flag: '🇸🇳', confed: 'CAF', ntRep: 76 },
  { id: 'ma', name: 'Marrocos', flag: '🇲🇦', confed: 'CAF', ntRep: 77 },
  { id: 'eg', name: 'Egito', flag: '🇪🇬', confed: 'CAF', ntRep: 74 },
];

export const countryById = (id) => COUNTRIES.find((c) => c.id === id);

// Cidades por país (flavor)
export const CITIES = {
  br: ['Rio de Janeiro', 'São Paulo', 'Belo Horizonte', 'Porto Alegre', 'Salvador', 'Fortaleza', 'Curitiba', 'Recife', 'Santos', 'Goiânia', 'Niterói', 'Campinas', 'Manaus', 'Cuiabá', 'Vitória', 'Belém'],
  ar: ['Buenos Aires', 'Rosário', 'Córdoba', 'La Plata', 'Mendoza'],
  uy: ['Montevidéu', 'Paysandú', 'Salto'],
  co: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla'],
  pt: ['Lisboa', 'Porto', 'Braga', 'Faro', 'Coimbra'],
  es: ['Madrid', 'Barcelona', 'Sevilha', 'Valência', 'Bilbao'],
  en: ['Londres', 'Manchester', 'Liverpool', 'Birmingham', 'Leeds'],
  fr: ['Paris', 'Lyon', 'Marselha', 'Lille', 'Nice'],
  de: ['Munique', 'Berlim', 'Dortmund', 'Hamburgo', 'Leipzig'],
  it: ['Roma', 'Milão', 'Nápoles', 'Turim', 'Florença'],
  nl: ['Amsterdã', 'Roterdã', 'Eindhoven'],
  be: ['Bruxelas', 'Antuérpia', 'Gante'],
  hr: ['Zagreb', 'Split', 'Rijeka'],
  rs: ['Belgrado', 'Novi Sad', 'Niš'],
  us: ['Miami', 'Los Angeles', 'Nova York', 'Atlanta', 'Seattle'],
  mx: ['Cidade do México', 'Monterrey', 'Guadalajara'],
  jp: ['Tóquio', 'Osaka', 'Yokohama'],
  kr: ['Seul', 'Busan', 'Incheon'],
  ng: ['Lagos', 'Abuja', 'Kano'],
  sn: ['Dacar', 'Touba', 'Thiès'],
  ma: ['Casablanca', 'Rabat', 'Marraquexe'],
  eg: ['Cairo', 'Alexandria', 'Gizé'],
};

// -------------------- NOMES --------------------
// first: [masculinos], firstF: [femininos] — usados para o jogador, família e parceiro(a)
export const NAME_POOLS = {
  br: {
    first: ['Gabriel', 'Lucas', 'Matheus', 'Pedro', 'Vinícius', 'Rafael', 'Bruno', 'Thiago', 'Felipe', 'Rodrigo', 'Gustavo', 'Diego', 'André', 'Caio', 'Eduardo', 'Fernando', 'Guilherme', 'Henrique', 'Igor', 'João', 'Kauã', 'Leonardo', 'Marcos', 'Nathan', 'Otávio', 'Paulo', 'Renan', 'Samuel', 'Victor', 'Wesley', 'Yuri', 'Arthur', 'Danilo', 'Everton', 'Fábio', 'Hugo', 'Jean', 'Murilo', 'Nicolas', 'Pablo', 'Ricardo', 'Sérgio', 'Talles', 'Willian', 'Adriano', 'Alex', 'Antony', 'Breno', 'Carlos', 'Daniel', 'Ederson', 'Fabinho', 'Gerson', 'Luan', 'Marlon', 'Oscar', 'Patrick', 'Richarlison', 'Savio', 'Tetê', 'Vanderson', 'Zé'],
    firstF: ['Ana', 'Beatriz', 'Camila', 'Débora', 'Elena', 'Fernanda', 'Gabriela', 'Helena', 'Isabela', 'Júlia', 'Larissa', 'Lívia', 'Luana', 'Mariana', 'Natália', 'Olívia', 'Patrícia', 'Rafaela', 'Sofia', 'Tainá', 'Valentina', 'Yasmin', 'Amanda', 'Bruna', 'Carla', 'Duda', 'Elisa', 'Flávia', 'Giovana', 'Ingrid', 'Joana', 'Karina', 'Letícia', 'Maitê', 'Nicole', 'Paula', 'Raquel', 'Sabrina', 'Tatiane', 'Vitória', 'Aline', 'Bianca', 'Carol', 'Daiane', 'Érica', 'Fabiana', 'Gisele', 'Heloísa', 'Isadora', 'Jéssica'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Rocha', 'Almeida', 'Nascimento', 'Araújo', 'Melo', 'Barbosa', 'Cardoso', 'Correia', 'Dias', 'Teixeira', 'Fernandes', 'Freitas', 'Moreira', 'Nogueira', 'Pinto', 'Ramos', 'Cavalcante', 'Duarte', 'Farias', 'Macedo', 'Moraes', 'Nunes', 'Peixoto', 'Reis', 'Sales', 'Vieira', 'Andrade', 'Batista', 'Campos', 'Cunha', 'Figueiredo', 'Lopes', 'Miranda', 'Monteiro', 'Pires', 'Tavares', 'Viana', 'Assis', 'Borges', 'Castro', 'Dantas', 'Esteves', 'Fonseca', 'Guimarães', 'Leite', 'Maia', 'Neves', 'Paiva', 'Queiroz', 'Siqueira', 'Toledo', 'Vasconcelos', 'Braga', 'Aguiar', 'Barros', 'Coelho'],
  },
  hisp: {
    first: ['Alejandro', 'Bruno', 'Carlos', 'Damián', 'Diego', 'Emiliano', 'Enzo', 'Facundo', 'Federico', 'Franco', 'Gonzalo', 'Ignacio', 'Joaquín', 'Julián', 'Lautaro', 'Lisandro', 'Luciano', 'Marcos', 'Mateo', 'Matías', 'Maximiliano', 'Nicolás', 'Pablo', 'Pedro', 'Santiago', 'Sebastián', 'Thiago', 'Tomás', 'Valentín', 'Exequiel', 'Agustín', 'Alexis', 'Andrés', 'Ángel', 'Cristian', 'Ezequiel', 'Germán', 'Hernán', 'Iván', 'Javier', 'Kevin', 'Leandro', 'Manuel', 'Marcelo', 'Mauricio', 'Nahuel', 'Óscar', 'Ramiro', 'Rodrigo', 'Rubén'],
    firstF: ['Sofía', 'Valentina', 'Camila', 'Luciana', 'Martina', 'Julieta', 'Florencia', 'Agustina', 'Milagros', 'Catalina', 'Isabella', 'Antonella', 'Renata', 'Josefina', 'Emilia', 'Victoria', 'Guadalupe', 'Abril', 'Morena', 'Malena', 'Delfina', 'Amparo', 'Lucía', 'Micaela', 'Rocío'],
    last: ['González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Pérez', 'García', 'Romero', 'Sosa', 'Álvarez', 'Torres', 'Ruiz', 'Ramírez', 'Flores', 'Benítez', 'Acosta', 'Medina', 'Herrera', 'Suárez', 'Aguirre', 'Giménez', 'Pereyra', 'Rojas', 'Castillo', 'Vega', 'Campos', 'Fuentes', 'Cabrera', 'Morales', 'Navarro', 'Ortiz', 'Vargas', 'Castro', 'Paredes', 'Mercado', 'Quiroga', 'Figueroa', 'Palacios', 'Ledesma', 'Arce'],
  },
  en: {
    first: ['Jack', 'Harry', 'Oliver', 'George', 'Charlie', 'Jacob', 'Alfie', 'Leo', 'Oscar', 'Henry', 'Archie', 'Joshua', 'Ethan', 'Daniel', 'Samuel', 'James', 'William', 'Thomas', 'Benjamin', 'Lucas', 'Mason', 'Finley', 'Harrison', 'Jude', 'Cole', 'Declan', 'Phil', 'Bukayo', 'Marcus', 'Trent', 'Jordan', 'Aaron', 'Callum', 'Reece', 'Conor', 'Mason', 'Jarrod', 'Ivan', 'Ollie', 'Kobbie', 'Lewis', 'Curtis', 'Anthony', 'Dominic', 'Kieran', 'Ben', 'Luke'],
    firstF: ['Olivia', 'Amelia', 'Isla', 'Ava', 'Mia', 'Poppy', 'Freya', 'Grace', 'Sophie', 'Emily', 'Ella', 'Evie', 'Ruby', 'Lily', 'Chloe', 'Jessica', 'Charlotte', 'Harriet', 'Daisy', 'Maisie', 'Nancy', 'Darcie', 'Elsie', 'Phoebe', 'Imogen'],
    last: ['Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies', 'Wilson', 'Evans', 'Thomas', 'Johnson', 'Roberts', 'Walker', 'Wright', 'Robinson', 'Thompson', 'Hughes', 'White', 'Edwards', 'Green', 'Hall', 'Lewis', 'Harris', 'Clarke', 'Patel', 'Jackson', 'Wood', 'Turner', 'Martin', 'Cooper', 'Hill', 'Ward', 'Morris', 'Moore', 'Clark', 'King', 'Baker', 'Young', 'Allen', 'Mitchell', 'Phillips', 'Campbell', 'Parker', 'Bell', 'Graham', 'Kelly', 'Howard', 'Rice', 'Foden', 'Palmer'],
  },
  it: {
    first: ['Alessandro', 'Andrea', 'Antonio', 'Carlo', 'Daniele', 'Davide', 'Domenico', 'Edoardo', 'Federico', 'Filippo', 'Francesco', 'Gabriele', 'Giacomo', 'Giorgio', 'Giovanni', 'Giuseppe', 'Lorenzo', 'Luca', 'Marco', 'Matteo', 'Mattia', 'Michele', 'Nicola', 'Riccardo', 'Salvatore', 'Simone', 'Stefano', 'Tommaso', 'Vincenzo', 'Alessio', 'Bruno', 'Claudio', 'Elia', 'Fabio', 'Gianluca', 'Ivan', 'Manuel', 'Massimo', 'Paolo', 'Pietro', 'Renato', 'Samuele', 'Umberto', 'Valerio'],
    firstF: ['Sofia', 'Giulia', 'Alessia', 'Chiara', 'Francesca', 'Martina', 'Giorgia', 'Anna', 'Elena', 'Sara', 'Giovanna', 'Beatrice', 'Ludovica', 'Bianca', 'Vittoria', 'Aurora', 'Rachele', 'Gaia', 'Emma', 'Matilde', 'Camilla', 'Noemi', 'Greta', 'Marta', 'Serena'],
    last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Costa', 'Giordano', 'Mancini', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi', 'Caruso', 'Ferraro', 'Fabbri', 'Valentini', 'Basile', 'Serra', 'Vitale', 'Pellegrini', 'Bellini', 'Monti', 'Palumbo', 'Sorrentino', 'Leone', 'Marchetti', 'Battaglia', 'Neri', 'Franco', 'Martini', 'Ferretti', 'Parisi', 'Testa', 'Grassi', 'Riva', 'Caputo'],
  },
  de: {
    first: ['Ben', 'Finn', 'Jonas', 'Leon', 'Luca', 'Lukas', 'Maximilian', 'Moritz', 'Niklas', 'Noah', 'Paul', 'Philipp', 'Tim', 'Tom', 'Felix', 'Jan', 'Julian', 'Kai', 'Kevin', 'Marco', 'Marius', 'Nico', 'Sebastian', 'Simon', 'Timo', 'Tobias', 'Yannick', 'Dominik', 'Erik', 'Florian', 'Henrik', 'Jamal', 'Joshua', 'Karim', 'Leroy', 'Mats', 'Max', 'Robin', 'Serge', 'Sven', 'Thilo', 'Tony', 'Tristan', 'Wout', 'Sepp', 'Xaver', 'Malik', 'Emre', 'Antonio'],
    firstF: ['Emma', 'Hannah', 'Mia', 'Lea', 'Lena', 'Anna', 'Lina', 'Marie', 'Sophie', 'Emilia', 'Clara', 'Laura', 'Julia', 'Amelie', 'Katharina', 'Marlene', 'Frieda', 'Ida', 'Nora', 'Paula', 'Greta', 'Maja', 'Lotte', 'Alma', 'Ronja'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Schulz', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Krause', 'Meier', 'Lehmann', 'Schmid', 'Schulze', 'Maier', 'Köhler', 'Herrmann', 'Walter', 'König', 'Mayer', 'Huber', 'Kaiser', 'Fuchs', 'Peters', 'Lang', 'Scholz', 'Brandt', 'Haas', 'Vogel', 'Jung', 'Hahn', 'Keller', 'Busch', 'Berger', 'Kramer'],
  },
  fr: {
    first: ['Adrien', 'Alexandre', 'Antoine', 'Aurélien', 'Benjamin', 'Brice', 'Clément', 'Corentin', 'Dimitri', 'Enzo', 'Florian', 'Hugo', 'Jordan', 'Jules', 'Kylian', 'Léo', 'Loïc', 'Louis', 'Lucas', 'Mathis', 'Maxence', 'Moussa', 'Nabil', 'Nathan', 'Nicolas', 'Olivier', 'Paul', 'Pierre', 'Quentin', 'Randal', 'Romain', 'Samuel', 'Sofiane', 'Théo', 'Thomas', 'Valentin', 'Wissam', 'Yacine', 'Boubacar', 'Dayot', 'Gautier', 'Ismaël', 'Jonathan', 'Kingsley', 'Leny', 'Maghnes', 'Youssouf', 'Warren'],
    firstF: ['Louise', 'Emma', 'Jade', 'Léa', 'Manon', 'Chloé', 'Camille', 'Sarah', 'Inès', 'Lina', 'Nina', 'Juliette', 'Zoé', 'Anaïs', 'Margaux', 'Clara', 'Alice', 'Jeanne', 'Romane', 'Élise', 'Ambre', 'Maëlys', 'Victoire', 'Constance', 'Apolline'],
    last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefèvre', 'Michel', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Lefebvre', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'Fontaine', 'Rousseau', 'Chevalier', 'Robin', 'Barbier', 'Gauthier', 'Perrin', 'Charpentier', 'Renard', 'Moulin', 'Collet', 'Benoit', 'Gros', 'Henry', 'Masson', 'Marchand', 'Duval', 'Denis', 'Dumont', 'Marie', 'Noël', 'Perrot', 'Camara'],
  },
};

// Mapa país -> pool de nomes
export const POOL_BY_COUNTRY = {
  br: 'br', ar: 'hisp', uy: 'hisp', co: 'hisp', mx: 'hisp', es: 'hisp',
  en: 'en', us: 'en', it: 'it', de: 'de', nl: 'de', be: 'de', fr: 'fr',
  pt: 'br', hr: 'hisp', rs: 'hisp', jp: 'en', kr: 'en', ng: 'en', sn: 'fr', ma: 'fr', eg: 'en',
};

// -------------------- POSIÇÕES --------------------
// OVR = média ponderada dos atributos + mental
export const POSITIONS = [
  { id: 'GOL', name: 'Goleiro', abbr: 'GOL', color: 'pos-G', icon: '🧤', desc: 'Defende a meta. Depende do atributo Goleiro.', w: { GOL: 0.62, DEF: 0.12, PHY: 0.10, PAS: 0.10, COM: 0.06 }, main: 'GOL' },
  { id: 'ZAG', name: 'Zagueiro', abbr: 'ZAG', color: 'pos-D', icon: '🛡️', desc: 'Rocha da defesa: marcação e jogo aéreo.', w: { DEF: 0.42, PHY: 0.26, PAS: 0.12, PAC: 0.10, DRI: 0.04, SHO: 0.04, COM: 0.02 }, main: 'DEF' },
  { id: 'LAT', name: 'Lateral', abbr: 'LAT', color: 'pos-D', icon: '🏃', desc: 'Sobe e desce o flanco o jogo inteiro.', w: { PAC: 0.30, DEF: 0.28, PAS: 0.18, PHY: 0.12, DRI: 0.06, SHO: 0.04, COM: 0.02 }, main: 'PAC' },
  { id: 'VOL', name: 'Volante', abbr: 'VOL', color: 'pos-D', icon: '⚔️', desc: 'Cão de guarda do meio: rouba e distribui.', w: { DEF: 0.28, PAS: 0.24, PHY: 0.20, PAC: 0.12, DRI: 0.08, SHO: 0.05, COM: 0.03 }, main: 'DEF' },
  { id: 'MC', name: 'Meia Central', abbr: 'MC', color: 'pos-M', icon: '🧭', desc: 'Dita o ritmo do jogo com passes.', w: { PAS: 0.30, DRI: 0.18, VIS: 0.14, PAC: 0.14, DEF: 0.12, PHY: 0.08, SHO: 0.04 }, main: 'PAS' },
  { id: 'MEI', name: 'Meia Ofensivo', abbr: 'MEI', color: 'pos-M', icon: '🎩', desc: 'Cria jogadas entre as linhas e finaliza.', w: { PAS: 0.28, DRI: 0.22, SHO: 0.15, VIS: 0.14, PAC: 0.12, PHY: 0.05, DEF: 0.04 }, main: 'PAS' },
  { id: 'PON', name: 'Ponta', abbr: 'PON', color: 'pos-A', icon: '⚡', desc: 'Velocidade e 1x1 na beirada do campo.', w: { PAC: 0.28, DRI: 0.25, SHO: 0.20, PAS: 0.14, VIS: 0.06, PHY: 0.05, DEF: 0.02 }, main: 'PAC' },
  { id: 'ATA', name: 'Atacante', abbr: 'ATA', color: 'pos-A', icon: '🎯', desc: 'A referência do gol: finalização e presença.', w: { SHO: 0.32, PAC: 0.20, DRI: 0.18, PAS: 0.12, PHY: 0.12, VIS: 0.04, DEF: 0.02 }, main: 'SHO' },
];
export const positionById = (id) => POSITIONS.find((p) => p.id === id) || POSITIONS[POSITIONS.length - 1];

// -------------------- ATRIBUTOS --------------------
export const SKILLS = {
  PAC: { label: 'Ritmo', icon: '💨', group: 'fis' },
  SHO: { label: 'Chute', icon: '🎯', group: 'tec' },
  PAS: { label: 'Passe', icon: '🎳', group: 'tec' },
  DRI: { label: 'Drible', icon: '🌀', group: 'tec' },
  DEF: { label: 'Defesa', icon: '🛡️', group: 'tec' },
  PHY: { label: 'Físico', icon: '💪', group: 'fis' },
  VIS: { label: 'Visão', icon: '👁️', group: 'men' },
  LID: { label: 'Liderança', icon: '🗣️', group: 'men' },
  COM: { label: 'Compostura', icon: '🧘', group: 'men' },
  DET: { label: 'Determinação', icon: '🔥', group: 'men' },
  GOL: { label: 'Goleiro', icon: '🧤', group: 'tec' },
};
export const TECH_SKILLS = ['SHO', 'PAS', 'DRI', 'DEF'];
export const PHYS_SKILLS = ['PAC', 'PHY'];
export const MENTAL_SKILLS = ['VIS', 'LID', 'COM', 'DET'];

// -------------------- TRAÇOS DE PERSONALIDADE --------------------
export const TRAITS = [
  { id: 'prof', name: 'Profissional', icon: '📋', desc: 'Rotina impecável: menos escândalos, melhor recuperação.' },
  { id: 'amb', name: 'Ambicioso', icon: '🚀', desc: 'Evolui mais rápido, mas exige clubes grandes para ser feliz.' },
  { id: 'hum', name: 'Humilde', icon: '🙏', desc: 'Felicidade estável mesmo quando as coisas não andam.' },
  { id: 'fog', name: 'Fogoso', icon: '🌶️', desc: 'Mais raça em campo… e mais cartões.' },
  { id: 'res', name: 'Resiliente', icon: '🛠️', desc: 'Volta mais rápido de lesões e de fases ruins.' },
  { id: 'car', name: 'Carismático', icon: '⭐', desc: 'Ganha fama e seguidores mais rápido.' },
  { id: 'est', name: 'Estudioso', icon: '📚', desc: 'Inteligência alta; escola vai bem.' },
  { id: 'fes', name: 'Festeiro', icon: '🎉', desc: 'Vive a vida: mais fama, mais risco de escândalo.' },
  { id: 'sor', name: 'Sortudo', icon: '🍀', desc: 'Eventos bons acontecem com mais frequência.' },
  { id: 'cab', name: 'Cabeça Fria', icon: '🧠', desc: 'Compostura altíssima nos momentos decisivos.' },
];

// -------------------- TREINOS --------------------
export const TRAININGS = [
  { id: 'sho', name: 'Finalização', icon: '🎯', skills: ['SHO', 'PAS'], desc: 'Arremates, chutes de fora e batidas de pênalti.' },
  { id: 'dri', name: 'Drible', icon: '🌀', skills: ['DRI', 'PAC'], desc: 'Fintas, condução de bola e 1x1.' },
  { id: 'pas', name: 'Passe', icon: '🎳', skills: ['PAS', 'VIS'], desc: 'Distribuição curta e longa, visão de jogo.' },
  { id: 'pac', name: 'Velocidade', icon: '💨', skills: ['PAC', 'PHY'], desc: 'Sprints e explosão muscular.' },
  { id: 'phy', name: 'Físico', icon: '💪', skills: ['PHY', 'DEF'], desc: 'Força, resistência e jogadas de contato.' },
  { id: 'def', name: 'Defesa', icon: '🛡️', skills: ['DEF', 'PHY'], desc: 'Marcação, desarme e posicionamento defensivo.' },
  { id: 'men', name: 'Mental', icon: '🧠', skills: ['COM', 'DET', 'VIS'], desc: 'Foco, liderança e leitura de jogo.' },
  { id: 'gol', name: 'Goleiro', icon: '🧤', skills: ['GOL'], desc: 'Defesas, saídas e jogo com os pés (só goleiros).' },
  { id: 'desc', name: 'Descanso', icon: '😴', skills: [], desc: 'Recupera energia e forma, sem risco de lesão.' },
];
export const trainingById = (id) => TRAININGS.find((t) => t.id === id) || TRAININGS[0];

// -------------------- CLUBES --------------------
// tier: 1 (varzea) a 6 (elite mundial). rep: 30-99. nivelLiga: nome do campeonato
export const CLUBS = [
  // — Brasil (Série A, tier 5-6) —
  { id: 'fla', name: 'Flamengo', short: 'FLA', country: 'br', city: 'Rio de Janeiro', rep: 93, tier: 6, league: 'Série A' },
  { id: 'pal', name: 'Palmeiras', short: 'PAL', country: 'br', city: 'São Paulo', rep: 91, tier: 6, league: 'Série A' },
  { id: 'spfc', name: 'São Paulo', short: 'SAO', country: 'br', city: 'São Paulo', rep: 88, tier: 5, league: 'Série A' },
  { id: 'cor', name: 'Corinthians', short: 'COR', country: 'br', city: 'São Paulo', rep: 89, tier: 5, league: 'Série A' },
  { id: 'flu', name: 'Fluminense', short: 'FLU', country: 'br', city: 'Rio de Janeiro', rep: 86, tier: 5, league: 'Série A' },
  { id: 'bot', name: 'Botafogo', short: 'BOT', country: 'br', city: 'Rio de Janeiro', rep: 85, tier: 5, league: 'Série A' },
  { id: 'cam', name: 'Atlético Mineiro', short: 'CAM', country: 'br', city: 'Belo Horizonte', rep: 86, tier: 5, league: 'Série A' },
  { id: 'gre', name: 'Grêmio', short: 'GRE', country: 'br', city: 'Porto Alegre', rep: 86, tier: 5, league: 'Série A' },
  { id: 'int', name: 'Internacional', short: 'INT', country: 'br', city: 'Porto Alegre', rep: 85, tier: 5, league: 'Série A' },
  { id: 'cru', name: 'Cruzeiro', short: 'CRU', country: 'br', city: 'Belo Horizonte', rep: 85, tier: 5, league: 'Série A' },
  { id: 'cap', name: 'Athletico-PR', short: 'CAP', country: 'br', city: 'Curitiba', rep: 82, tier: 5, league: 'Série A' },
  { id: 'for', name: 'Fortaleza', short: 'FOR', country: 'br', city: 'Fortaleza', rep: 80, tier: 5, league: 'Série A' },
  { id: 'san', name: 'Santos', short: 'SAN', country: 'br', city: 'Santos', rep: 84, tier: 5, league: 'Série A' },
  { id: 'vas', name: 'Vasco da Gama', short: 'VAS', country: 'br', city: 'Rio de Janeiro', rep: 82, tier: 5, league: 'Série A' },
  { id: 'bah', name: 'Bahia', short: 'BAH', country: 'br', city: 'Salvador', rep: 80, tier: 5, league: 'Série A' },
  { id: 'rbb', name: 'Red Bull Bragantino', short: 'RBB', country: 'br', city: 'Bragança Paulista', rep: 78, tier: 5, league: 'Série A' },
  { id: 'juv', name: 'Juventude', short: 'JUV', country: 'br', city: 'Caxias do Sul', rep: 68, tier: 4, league: 'Série A' },
  { id: 'cui', name: 'Cuiabá', short: 'CUI', country: 'br', city: 'Cuiabá', rep: 70, tier: 4, league: 'Série A' },
  { id: 'ceara', name: 'Ceará', short: 'CEA', country: 'br', city: 'Fortaleza', rep: 73, tier: 4, league: 'Série B' },
  { id: 'sport', name: 'Sport', short: 'SPO', country: 'br', city: 'Recife', rep: 74, tier: 4, league: 'Série B' },
  { id: 'nd', name: 'Náutico', short: 'NAU', country: 'br', city: 'Recife', rep: 62, tier: 3, league: 'Série B' },
  { id: 'rem', name: 'Remo', short: 'REM', country: 'br', city: 'Belém', rep: 58, tier: 3, league: 'Série B' },
  { id: 'goy', name: 'Goiás', short: 'GOI', country: 'br', city: 'Goiânia', rep: 72, tier: 4, league: 'Série B' },
  { id: 'avi', name: 'Avaí', short: 'AVA', country: 'br', city: 'Florianópolis', rep: 60, tier: 3, league: 'Série B' },
  { id: 'vit', name: 'Vitória', short: 'VIT', country: 'br', city: 'Salvador', rep: 72, tier: 4, league: 'Série B' },
  { id: 'pon', name: 'Ponte Preta', short: 'PON', country: 'br', city: 'Campinas', rep: 55, tier: 3, league: 'Série B' },
  { id: 'csa', name: 'CSA', short: 'CSA', country: 'br', city: 'Maceió', rep: 52, tier: 3, league: 'Série C' },
  { id: 'con', name: 'Confiança', short: 'CON', country: 'br', city: 'Aracaju', rep: 45, tier: 2, league: 'Série C' },
  { id: 'vol', name: 'Volta Redonda', short: 'VOL', country: 'br', city: 'Volta Redonda', rep: 48, tier: 2, league: 'Série C' },
  // — Argentina —
  { id: 'boc', name: 'Boca Juniors', short: 'BOC', country: 'ar', city: 'Buenos Aires', rep: 88, tier: 5, league: 'Liga Argentina' },
  { id: 'riv', name: 'River Plate', short: 'RIV', country: 'ar', city: 'Buenos Aires', rep: 89, tier: 5, league: 'Liga Argentina' },
  { id: 'ind', name: 'Independiente', short: 'IND', country: 'ar', city: 'Avellaneda', rep: 76, tier: 4, league: 'Liga Argentina' },
  { id: 'rac', name: 'Racing', short: 'RAC', country: 'ar', city: 'Avellaneda', rep: 77, tier: 4, league: 'Liga Argentina' },
  { id: 'sla', name: 'San Lorenzo', short: 'SLA', country: 'ar', city: 'Buenos Aires', rep: 74, tier: 4, league: 'Liga Argentina' },
  { id: 'est', name: 'Estudiantes', short: 'EST', country: 'ar', city: 'La Plata', rep: 75, tier: 4, league: 'Liga Argentina' },
  // — Portugal —
  { id: 'ben', name: 'Benfica', short: 'BEN', country: 'pt', city: 'Lisboa', rep: 88, tier: 5, league: 'Liga Portugal' },
  { id: 'por', name: 'Porto', short: 'FCP', country: 'pt', city: 'Porto', rep: 87, tier: 5, league: 'Liga Portugal' },
  { id: 'spl', name: 'Sporting', short: 'SPO', country: 'pt', city: 'Lisboa', rep: 87, tier: 5, league: 'Liga Portugal' },
  { id: 'bra', name: 'Braga', short: 'BRA', country: 'pt', city: 'Braga', rep: 78, tier: 4, league: 'Liga Portugal' },
  { id: 'vit2', name: 'Vitória de Guimarães', short: 'VSC', country: 'pt', city: 'Guimarães', rep: 70, tier: 4, league: 'Liga Portugal' },
  // — Inglaterra —
  { id: 'mci', name: 'Manchester City', short: 'MCI', country: 'en', city: 'Manchester', rep: 98, tier: 6, league: 'Premier League' },
  { id: 'mun', name: 'Manchester United', short: 'MUN', country: 'en', city: 'Manchester', rep: 92, tier: 6, league: 'Premier League' },
  { id: 'liv', name: 'Liverpool', short: 'LIV', country: 'en', city: 'Liverpool', rep: 97, tier: 6, league: 'Premier League' },
  { id: 'ars', name: 'Arsenal', short: 'ARS', country: 'en', city: 'Londres', rep: 96, tier: 6, league: 'Premier League' },
  { id: 'che', name: 'Chelsea', short: 'CHE', country: 'en', city: 'Londres', rep: 92, tier: 6, league: 'Premier League' },
  { id: 'tot', name: 'Tottenham', short: 'TOT', country: 'en', city: 'Londres', rep: 89, tier: 5, league: 'Premier League' },
  { id: 'new', name: 'Newcastle', short: 'NEW', country: 'en', city: 'Newcastle', rep: 88, tier: 5, league: 'Premier League' },
  { id: 'avl', name: 'Aston Villa', short: 'AVL', country: 'en', city: 'Birmingham', rep: 86, tier: 5, league: 'Premier League' },
  { id: 'eve', name: 'Everton', short: 'EVE', country: 'en', city: 'Liverpool', rep: 78, tier: 4, league: 'Premier League' },
  { id: 'bh', name: 'Brighton', short: 'BHA', country: 'en', city: 'Brighton', rep: 84, tier: 5, league: 'Premier League' },
  // — Espanha —
  { id: 'rma', name: 'Real Madrid', short: 'RMA', country: 'es', city: 'Madrid', rep: 99, tier: 6, league: 'La Liga' },
  { id: 'bar', name: 'Barcelona', short: 'BAR', country: 'es', city: 'Barcelona', rep: 97, tier: 6, league: 'La Liga' },
  { id: 'atm', name: 'Atlético de Madrid', short: 'ATM', country: 'es', city: 'Madrid', rep: 92, tier: 6, league: 'La Liga' },
  { id: 'sev', name: 'Sevilla', short: 'SEV', country: 'es', city: 'Sevilha', rep: 84, tier: 5, league: 'La Liga' },
  { id: 'bil', name: 'Athletic Bilbao', short: 'ATH', country: 'es', city: 'Bilbao', rep: 85, tier: 5, league: 'La Liga' },
  { id: 'val', name: 'Valencia', short: 'VAL', country: 'es', city: 'Valência', rep: 76, tier: 4, league: 'La Liga' },
  { id: 'bet', name: 'Betis', short: 'BET', country: 'es', city: 'Sevilha', rep: 82, tier: 5, league: 'La Liga' },
  { id: 'rso', name: 'Real Sociedad', short: 'RSO', country: 'es', city: 'San Sebastián', rep: 83, tier: 5, league: 'La Liga' },
  // — Itália —
  { id: 'juv', name: 'Juventus', short: 'JUV', country: 'it', city: 'Turim', rep: 92, tier: 6, league: 'Serie A' },
  { id: 'mil', name: 'AC Milan', short: 'MIL', country: 'it', city: 'Milão', rep: 90, tier: 6, league: 'Serie A' },
  { id: 'int2', name: 'Inter de Milão', short: 'INT', country: 'it', city: 'Milão', rep: 93, tier: 6, league: 'Serie A' },
  { id: 'nap', name: 'Napoli', short: 'NAP', country: 'it', city: 'Nápoles', rep: 90, tier: 6, league: 'Serie A' },
  { id: 'rom', name: 'Roma', short: 'ROM', country: 'it', city: 'Roma', rep: 85, tier: 5, league: 'Serie A' },
  { id: 'laz', name: 'Lazio', short: 'LAZ', country: 'it', city: 'Roma', rep: 84, tier: 5, league: 'Serie A' },
  { id: 'ata', name: 'Atalanta', short: 'ATA', country: 'it', city: 'Bérgamo', rep: 88, tier: 5, league: 'Serie A' },
  { id: 'fio', name: 'Fiorentina', short: 'FIO', country: 'it', city: 'Florença', rep: 80, tier: 5, league: 'Serie A' },
  // — Alemanha —
  { id: 'bay', name: 'Bayern de Munique', short: 'BAY', country: 'de', city: 'Munique', rep: 96, tier: 6, league: 'Bundesliga' },
  { id: 'bvb', name: 'Borussia Dortmund', short: 'BVB', country: 'de', city: 'Dortmund', rep: 90, tier: 6, league: 'Bundesliga' },
  { id: 'rbl', name: 'RB Leipzig', short: 'RBL', country: 'de', city: 'Leipzig', rep: 88, tier: 5, league: 'Bundesliga' },
  { id: 'lvr', name: 'Bayer Leverkusen', short: 'B04', country: 'de', city: 'Leverkusen', rep: 90, tier: 6, league: 'Bundesliga' },
  { id: 'fch', name: 'Frankfurt', short: 'SGE', country: 'de', city: 'Frankfurt', rep: 82, tier: 5, league: 'Bundesliga' },
  { id: 'vfb', name: 'Stuttgart', short: 'VFB', country: 'de', city: 'Stuttgart', rep: 78, tier: 4, league: 'Bundesliga' },
  // — França —
  { id: 'psg', name: 'PSG', short: 'PSG', country: 'fr', city: 'Paris', rep: 96, tier: 6, league: 'Ligue 1' },
  { id: 'om', name: 'Olympique de Marselha', short: 'OM', country: 'fr', city: 'Marselha', rep: 84, tier: 5, league: 'Ligue 1' },
  { id: 'ol', name: 'Lyon', short: 'OL', country: 'fr', city: 'Lyon', rep: 82, tier: 5, league: 'Ligue 1' },
  { id: 'mon', name: 'Monaco', short: 'ASM', country: 'fr', city: 'Monaco', rep: 84, tier: 5, league: 'Ligue 1' },
  { id: 'lil', name: 'Lille', short: 'LIL', country: 'fr', city: 'Lille', rep: 83, tier: 5, league: 'Ligue 1' },
  { id: 'ren', name: 'Rennes', short: 'REN', country: 'fr', city: 'Rennes', rep: 78, tier: 4, league: 'Ligue 1' },
  // — Holanda —
  { id: 'aja', name: 'Ajax', short: 'AJA', country: 'nl', city: 'Amsterdã', rep: 85, tier: 5, league: 'Eredivisie' },
  { id: 'fey', name: 'Feyenoord', short: 'FEY', country: 'nl', city: 'Roterdã', rep: 83, tier: 5, league: 'Eredivisie' },
  { id: 'psv', name: 'PSV', short: 'PSV', country: 'nl', city: 'Eindhoven', rep: 84, tier: 5, league: 'Eredivisie' },
  // — Arábia Saudita (pero… dinheiro) —
  { id: 'hil', name: 'Al-Hilal', short: 'HIL', country: 'ksa', city: 'Riad', rep: 80, tier: 5, league: 'Liga Saudita' },
  { id: 'nass', name: 'Al-Nassr', short: 'NAS', country: 'ksa', city: 'Riad', rep: 79, tier: 5, league: 'Liga Saudita' },
  { id: 'ahli', name: 'Al-Ahli', short: 'AHL', country: 'ksa', city: 'Jidá', rep: 77, tier: 4, league: 'Liga Saudita' },
  { id: 'itt', name: 'Al-Ittihad', short: 'ITT', country: 'ksa', city: 'Jidá', rep: 78, tier: 4, league: 'Liga Saudita' },
  // — EUA / México —
  { id: 'mia', name: 'Inter Miami', short: 'MIA', country: 'us', city: 'Miami', rep: 76, tier: 4, league: 'MLS' },
  { id: 'laf', name: 'LAFC', short: 'LAF', country: 'us', city: 'Los Angeles', rep: 75, tier: 4, league: 'MLS' },
  { id: 'nyr', name: 'NY Red Bulls', short: 'NYR', country: 'us', city: 'Nova York', rep: 68, tier: 4, league: 'MLS' },
  { id: 'mon2', name: 'Monterrey', short: 'MTY', country: 'mx', city: 'Monterrey', rep: 76, tier: 4, league: 'Liga MX' },
  { id: 'ame', name: 'América', short: 'AME', country: 'mx', city: 'Cidade do México', rep: 77, tier: 4, league: 'Liga MX' },
  { id: 'cha', name: 'Chivas', short: 'GDL', country: 'mx', city: 'Guadalajara', rep: 74, tier: 4, league: 'Liga MX' },
  // — Outros mercados (flavor / transferências) —
  { id: 'gal', name: 'Galatasaray', short: 'GAL', country: 'tr', city: 'Istambul', rep: 79, tier: 4, league: 'Super Lig' },
  { id: 'fbb', name: 'Fenerbahçe', short: 'FEN', country: 'tr', city: 'Istambul', rep: 78, tier: 4, league: 'Super Lig' },
  { id: 'clb', name: 'Celtic', short: 'CEL', country: 'sco', city: 'Glasgow', rep: 78, tier: 4, league: 'Scottish Premiership' },
  { id: 'slb', name: 'Slavia Praga', short: 'SLV', country: 'cz', city: 'Praga', rep: 72, tier: 4, league: 'Liga Checa' },
  { id: 'sha', name: 'Shakhtar Donetsk', short: 'SHK', country: 'ua', city: 'Donetsk', rep: 76, tier: 4, league: 'Liga Ucraniana' },
  { id: 'zen', name: 'Zenit', short: 'ZEN', country: 'ru', city: 'São Petersburgo', rep: 77, tier: 4, league: 'Liga Russa' },
  { id: 'dym', name: 'Dinamo Zagreb', short: 'DIN', country: 'hr', city: 'Zagreb', rep: 73, tier: 4, league: 'Liga Croata' },
  { id: 'olym', name: 'Olympiacos', short: 'OLY', country: 'gr', city: 'Pireu', rep: 75, tier: 4, league: 'Liga Grega' },
  { id: 'rsb', name: 'Estrela Vermelha', short: 'ZVE', country: 'rs', city: 'Belgrado', rep: 75, tier: 4, league: 'Superliga Sérvia' },
  { id: 'bjk', name: 'Besiktas', short: 'BJK', country: 'tr', city: 'Istambul', rep: 76, tier: 4, league: 'Super Lig' },
];
export const clubById = (id) => CLUBS.find((c) => c.id === id);

// Clubes por liga (para gerar tabela e adversários)
export function clubsByLeague(leagueName) {
  return CLUBS.filter((c) => c.league === leagueName);
}

// -------------------- PRÊMIOS --------------------
export const AWARDS = [
  { id: 'artilheiro', name: 'Artilheiro da Liga', icon: '⚽' },
  { id: 'melhor_jogador', name: 'Melhor Jogador da Liga', icon: '🏅' },
  { id: 'revelacao', name: 'Revelação do Ano', icon: '🌟' },
  { id: 'bola_ouro', name: 'Bola de Ouro', icon: '🏆' },
  { id: 'chuteira', name: 'Chuteira de Ouro', icon: '👟' },
  { id: 'copa_campeao', name: 'Campeão da Copa', icon: '🏆' },
  { id: 'continental', name: 'Campeão Continental', icon: '🌎' },
  { id: 'mundial', name: 'Campeão Mundial', icon: '🌍' },
  { id: 'melhor_nt', name: 'Destaque da Seleção', icon: '🇧🇷' },
];

// -------------------- MARCAS / PATROCÍNIOS --------------------
export const BRANDS = [
  { id: 'nike', name: 'Nike', icon: '👟', tier: 3 },
  { id: 'adidas', name: 'Adidas', icon: '👟', tier: 3 },
  { id: 'puma', name: 'Puma', icon: '👟', tier: 2 },
  { id: 'energia', name: 'Energia+', icon: '⚡', tier: 1 },
  { id: 'banco', name: 'BancoPrime', icon: '🏦', tier: 2 },
  { id: 'app', name: 'SocNet', icon: '📱', tier: 1 },
  { id: 'carro', name: 'Veloz Motors', icon: '🚗', tier: 2 },
  { id: 'refri', name: 'SodaPop', icon: '🥤', tier: 1 },
  { id: 'game', name: 'PlayMax', icon: '🎮', tier: 2 },
  { id: 'relogio', name: 'LuxTime', icon: '⌚', tier: 3 },
];

// -------------------- ESTILOS DE VIDA --------------------
export const LIFESTYLES = [
  { id: 0, name: 'Humilde', icon: '🍚', cost: 0, happ: 0, fame: 0, desc: 'Vida simples, sem luxos. Sem custo fixo.' },
  { id: 1, name: 'Confortável', icon: '🏠', cost: 8000, happ: 8, fame: 1, desc: 'Apartamento bom, carro popular, restaurantes.' },
  { id: 2, name: 'Luxo', icon: '💎', cost: 60000, happ: 16, fame: 3, desc: 'Mansão, carros importados, viagens.' },
  { id: 3, name: 'Mega Estrela', icon: '👑', cost: 300000, happ: 24, fame: 6, desc: 'Jatinho, iate e festas épicas.' },
];

// -------------------- COMPRAS (flavor) --------------------
export const PURCHASES = [
  { id: 'carro_simples', name: 'Carro popular', icon: '🚗', price: 90000, happ: 5, fame: 0, needFame: 0 },
  { id: 'carro_esportivo', name: 'Carro esportivo', icon: '🏎️', price: 700000, happ: 12, fame: 3, needFame: 20 },
  { id: 'casa_apartamento', name: 'Apartamento próprio', icon: '🏢', price: 900000, happ: 10, fame: 0, needFame: 0 },
  { id: 'casa_mansao', name: 'Mansão', icon: '🏰', price: 6000000, happ: 18, fame: 6, needFame: 40 },
  { id: 'barco', name: 'Iate', icon: '⛵', price: 3500000, happ: 14, fame: 8, needFame: 50 },
  { id: 'jet', name: 'Jatinho', icon: '✈️', price: 12000000, happ: 16, fame: 10, needFame: 60 },
  { id: 'relogio', name: 'Relógio de luxo', icon: '⌚', price: 250000, happ: 6, fame: 2, needFame: 25 },
  { id: 'casa_pais', name: 'Casa para seus pais', icon: '🏡', price: 800000, happ: 12, fame: 2, needFame: 10 },
];

// -------------------- FRASES DE NARRAÇÃO --------------------
export const NARRATIVE = {
  shot: ['disparou de fora da área!', 'arriscou de longe, por cima do travessão!', 'bateu cruzado, tirando tinta da trave!', 'finalizou com perigo, o goleiro espalmou!'],
  chance: ['recebeu na entrada da área e limpou o marcador!', 'tabelou e invadiu a área, quase saiu o gol!', 'dominou no peito e girou em cima da marcação!', 'abriu espaço com um corte seco, a zaga cortou no susto!'],
  pass: ['distribuiu um lançamento perfeito para o ataque!', 'achou o companheiro em profundidade!', 'tocou de primeira e inverteu o jogo!', 'fez uma enfiada sensacional!'],
  dribble: ['passou pelo marcador com um drible desconcertante!', 'aplicou um elástico e foi para cima!', 'deu um corte seco e deixou o zagueiro sentado!', 'usou o corpo e protegeu a bola com maestria!'],
  tackle: ['roubou a bola com um carrinho perfeito!', 'se antecipou e desarmou com precisão!', 'fechou o espaço e recuperou a posse!', 'ganhou a dividida no chão!'],
  card: ['cometeu falta dura e levou cartão amarelo.', 'descarregou o braço e o árbitro marcou falta.', 'fez uma entrada forte e o juiz advertiu.'],
  save: ['voou no ângulo e salvou o time!', 'fez uma defesaça à queima-roupa!', 'saiu do gol e cortou o cruzamento no susto!', 'espalmou para escanteio uma bomba!'],
  goal: ['GOL! GOL! GOL! Que pintura de jogada!', 'GOL! Na rede! Explosão no estádio!', 'GOL! O craque fez a torcida explodir!', 'GOL! GOLAÇO! Não deu chances para o goleiro!'],
  assist: ['cruzou na medida e o companheiro só escorou: GOL!', 'deixou o atacante na cara do gol: GOL!', 'enfiou a bola e o companheiro bateu: GOL!'],
  own: ['chutou de qualquer jeito e o goleiro fez a defesa.', 'tentou o cruzamento e a zaga cortou.', 'bateu fraco, sem perigo.', 'a jogada não saiu como planejado.'],
};

// Nomes de parceiros(as) e familiares por gênero do jogador
export const PARTNER_HINTS = {
  M: ['uma jovem simpática', 'a vizinha de infância', 'uma estudante de medicina', 'uma influenciadora', 'uma arquiteta', 'uma médica', 'a professora da faculdade', 'uma empresária', 'uma atriz em ascensão', 'a melhor amiga da sua irmã'],
  F: ['um jovem charmoso', 'o vizinho de infância', 'um estudante de direito', 'um empresário', 'um engenheiro', 'um médico', 'um professor universitário', 'um músico', 'um ator em ascensão', 'o melhor amigo do seu irmão'],
};

// -------------------- i18n --------------------
export const I18N = {
  pt: {
    home: 'Início', training: 'Treino', play: 'Jogar', career: 'Carreira', market: 'Mercado',
    family: 'Família', money: 'Dinheiro', fame: 'Fama', more: 'Mais', inbox: 'Mensagens',
    settings: 'Configurações', saves: 'Saves', credits: 'Créditos', howto: 'Como Jogar',
    newGame: 'Novo Jogo', continue: 'Continuar', loadSave: 'Carregar Save',
    advance: 'Avançar mês', next: 'Próximo',
  },
  en: {
    home: 'Home', training: 'Training', play: 'Play', career: 'Career', market: 'Market',
    family: 'Family', money: 'Money', fame: 'Fame', more: 'More', inbox: 'Messages',
    settings: 'Settings', saves: 'Saves', credits: 'Credits', howto: 'How to Play',
    newGame: 'New Game', continue: 'Continue', loadSave: 'Load Save',
    advance: 'Advance month', next: 'Next',
  },
};
export const T = (lang, key) => (I18N[lang] && I18N[lang][key]) || I18N.pt[key] || key;
