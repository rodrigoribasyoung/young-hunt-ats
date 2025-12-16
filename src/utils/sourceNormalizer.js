// Normalização de Origens/Fontes - Padroniza onde o candidato encontrou a vaga

// Origens principais com suas variações comuns
export const MAIN_SOURCES = {
  'Facebook': [
    'facebook', 'fb', 'face', 'facebook.com', 'fb.com',
    'facebook ads', 'anúncio facebook', 'anuncio facebook',
    'facebook marketing', 'meta', 'meta ads'
  ],
  'Instagram': [
    'instagram', 'ig', 'insta', 'instagram.com',
    'instagram ads', 'anúncio instagram', 'anuncio instagram',
    'stories instagram', 'post instagram', 'reels instagram'
  ],
  'Google': [
    'google', 'google.com', 'google ads', 'google adwords',
    'anúncio google', 'anuncio google', 'busca google',
    'pesquisa google', 'google search', 'google busca',
    'ads google', 'adwords'
  ],
  'Agência de Empregos': [
    'agência de empregos', 'agencia de empregos',
    'agência empregos', 'agencia empregos',
    'agência', 'agencia', 'agência trabalho', 'agencia trabalho',
    'empregos', 'vagas', 'site de empregos', 'portal de empregos',
    'indeed', 'linkedin jobs', 'catho', 'infojobs', 'vagas.com'
  ],
  'Site da Empresa': [
    'site da empresa', 'site empresa', 'site', 'website',
    'site young', 'young empreendimentos', 'young',
    'site oficial', 'site corporativo', 'página da empresa',
    'pagina da empresa', 'web site', 'www'
  ],
  'LinkedIn': [
    'linkedin', 'linkedin.com', 'linked in',
    'linkedin jobs', 'vagas linkedin', 'post linkedin',
    'anúncio linkedin', 'anuncio linkedin'
  ],
  'Indicação': [
    'indicação', 'indicacao', 'indicado', 'foi indicado',
    'amigo indicou', 'conhecido indicou', 'colega indicou',
    'referência', 'referencia', 'referido', 'indicação de amigo',
    'indicacao de amigo', 'indicação de colega', 'indicacao de colega'
  ],
  'WhatsApp': [
    'whatsapp', 'whats app', 'wa', 'zap', 'zap zap',
    'grupo whatsapp', 'grupo zap', 'mensagem whatsapp',
    'mensagem zap'
  ],
  'Email': [
    'email', 'e-mail', 'correio eletrônico', 'correio eletronico',
    'newsletter', 'mailing', 'campanha email', 'campanha e-mail'
  ],
  'Evento': [
    'evento', 'feira', 'feira de empregos', 'feira de trabalho',
    'workshop', 'palestra', 'seminário', 'seminario',
    'job fair', 'feira de recrutamento'
  ],
  'Jornal': [
    'jornal', 'jornal impresso', 'jornal local', 'jornal regional',
    'classificados', 'anúncio jornal', 'anuncio jornal'
  ],
  'Rádio': [
    'rádio', 'radio', 'rádio local', 'radio local',
    'anúncio rádio', 'anuncio radio', 'comercial rádio',
    'comercial radio'
  ],
  'TV': [
    'tv', 'televisão', 'televisao', 'tv local', 'canal',
    'anúncio tv', 'anuncio tv', 'comercial tv', 'propaganda tv'
  ],
  'Outros': [
    'outros', 'outro', 'diversos', 'outra fonte',
    'não informado', 'nao informado', 'não sabe', 'nao sabe'
  ]
};

/**
 * Normaliza o nome de uma origem/fonte para o formato padrão
 * @param {string} source - Nome da origem a normalizar
 * @returns {string} - Nome normalizado ou string original se não encontrado
 */
export function normalizeSource(source) {
  if (!source || typeof source !== 'string') {
    return '';
  }

  // Remove espaços extras e converte para minúsculas para comparação
  const normalized = source.trim();
  const lowerSource = normalized.toLowerCase();

  // Remove acentos para comparação mais flexível
  const removeAccents = (str) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  const lowerSourceNoAccents = removeAccents(lowerSource);

  // Procura nas origens principais
  for (const [standardName, variations] of Object.entries(MAIN_SOURCES)) {
    // Verifica se é exatamente igual (case-insensitive)
    if (lowerSource === standardName.toLowerCase()) {
      return standardName;
    }

    // Verifica variações
    for (const variation of variations) {
      const lowerVariation = variation.toLowerCase();
      const lowerVariationNoAccents = removeAccents(lowerVariation);

      // Match exato
      if (lowerSource === lowerVariation || lowerSourceNoAccents === lowerVariationNoAccents) {
        return standardName;
      }

      // Match parcial (para casos como "Facebook" dentro de "Anúncio Facebook")
      if (lowerSource.includes(lowerVariation) || lowerVariation.includes(lowerSource)) {
        // Verifica se não é muito genérico
        if (lowerVariation.length > 2 && lowerSource.length > 2) {
          return standardName;
        }
      }
    }

    // Verifica se o nome padrão está contido no input
    const lowerStandard = standardName.toLowerCase();
    const lowerStandardNoAccents = removeAccents(lowerStandard);
    
    if (lowerSource.includes(lowerStandardNoAccents) || lowerStandardNoAccents.includes(lowerSource)) {
      // Verifica se não é muito genérico
      if (lowerStandard.length > 3 && lowerSource.length > 3) {
        return standardName;
      }
    }
  }

  // Se não encontrou, tenta limpar e padronizar formato básico
  // Remove espaços extras, mantém primeira letra maiúscula
  const cleaned = normalized
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return cleaned;
}

/**
 * Obtém lista de origens principais formatadas para selects
 * @returns {Array} - Array de objetos {id, name} para uso em selects
 */
export function getMainSourcesOptions() {
  return Object.keys(MAIN_SOURCES).map((source, index) => ({
    id: index,
    name: source
  }));
}

/**
 * Verifica se uma origem é uma das principais
 * @param {string} source - Nome da origem
 * @returns {boolean} - true se for uma origem principal
 */
export function isMainSource(source) {
  if (!source) return false;
  const normalized = normalizeSource(source);
  return Object.keys(MAIN_SOURCES).includes(normalized);
}


