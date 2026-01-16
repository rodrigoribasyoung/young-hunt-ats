// Normalização de Cidades - Padroniza nomes de cidades do RS

// Cidades principais com suas variações comuns
export const MAIN_CITIES = {
  // Formato: nomePadrao: [variacoes]
  'Porto Alegre/RS': [
    'porto alegre', 'porto alegre/rs', 'poa', 'poa/rs', 'portoalegre',
    'porto alegre rs', 'p. alegre', 'p. alegre/rs'
  ],
  'Canoas/RS': [
    'canoas', 'canoas/rs', 'canoas rs'
  ],
  'Bagé/RS': [
    'bagé', 'bage', 'bagé/rs', 'bage/rs', 'bagé rs', 'bage rs'
  ],
  'Santo Antônio da Patrulha/RS': [
    'santo antônio da patrulha', 'santo antonio da patrulha',
    'sto antônio da patrulha', 'sto antonio da patrulha',
    'santo ant patrulha', 'sto ant patrulha',
    'sap', 'sap/rs', 'sap rs',
    'santo antônio da patrulha/rs', 'santo antonio da patrulha/rs',
    'sto antônio da patrulha/rs', 'sto antonio da patrulha/rs',
    'santo ant patrulha/rs', 'sto ant patrulha/rs'
  ],
  'Guaíba/RS': [
    'guaíba', 'guaiba', 'guaíba/rs', 'guaiba/rs', 'guaíba rs', 'guaiba rs'
  ],
  'Osório/RS': [
    'osório', 'osorio', 'osório/rs', 'osorio/rs', 'osório rs', 'osorio rs'
  ],
  'Tramandaí/RS': [
    'tramandaí', 'tramandai', 'tramandaí/rs', 'tramandai/rs',
    'tramandaí rs', 'tramandai rs', 'tramandai/rs'
  ],
  'São Borja/RS': [
    'são borja', 'sao borja', 'são borja/rs', 'sao borja/rs',
    'são borja rs', 'sao borja rs', 's borja', 's borja/rs'
  ],
  "Sant'Ana do Livramento/RS": [
    "sant'ana do livramento", "santana do livramento",
    "sant'ana do livramento/rs", "santana do livramento/rs",
    "sant'ana do livramento rs", "santana do livramento rs",
    "sant ana do livramento", "sant ana do livramento/rs",
    "livramento", "livramento/rs", "livramento rs"
  ],
  'Cruz Alta/RS': [
    'cruz alta', 'cruz alta/rs', 'cruz alta rs', 'cruzalta', 'cruzalta/rs'
  ],
  'Itaqui/RS': [
    'itaqui', 'itaqui/rs', 'itaqui rs'
  ],
  'Alegrete/RS': [
    'alegrete', 'alegrete/rs', 'alegrete rs'
  ],
  'Arroio do Sal/RS': [
    'arroio do sal', 'arroio do sal/rs', 'arroio do sal rs',
    'arroio sal', 'arroio sal/rs', 'arroio sal rs'
  ],
  'Torres/RS': [
    'torres', 'torres/rs', 'torres rs'
  ]
};

/**
 * Normaliza o nome de uma cidade para o formato padrão
 * @param {string} city - Nome da cidade a normalizar
 * @returns {string} - Nome normalizado ou string original se não encontrado
 */
export function normalizeCity(city) {
  if (!city || typeof city !== 'string') {
    return '';
  }

  // Remove espaços extras e converte para minúsculas para comparação
  const normalized = city.trim();
  const lowerCity = normalized.toLowerCase();

  // Remove acentos para comparação mais flexível
  const removeAccents = (str) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  const lowerCityNoAccents = removeAccents(lowerCity);

  // Procura nas cidades principais
  for (const [standardName, variations] of Object.entries(MAIN_CITIES)) {
    // Verifica se é exatamente igual (case-insensitive)
    if (lowerCity === standardName.toLowerCase()) {
      return standardName;
    }

    // Verifica variações
    for (const variation of variations) {
      const lowerVariation = variation.toLowerCase();
      const lowerVariationNoAccents = removeAccents(lowerVariation);

      // Match exato
      if (lowerCity === lowerVariation || lowerCityNoAccents === lowerVariationNoAccents) {
        return standardName;
      }

      // Match parcial (para casos como "SAP" dentro de "SAP/RS")
      if (lowerCity.includes(lowerVariation) || lowerVariation.includes(lowerCity)) {
        // Verifica se não é muito genérico (ex: "RS" sozinho)
        if (lowerVariation.length > 2 && lowerCity.length > 2) {
          return standardName;
        }
      }
    }

    // Verifica se o nome padrão está contido no input (ex: "Porto Alegre" em "Porto Alegre/RS")
    const lowerStandard = standardName.toLowerCase();
    const lowerStandardNoAccents = removeAccents(lowerStandard);
    
    if (lowerCity.includes(lowerStandardNoAccents) || lowerStandardNoAccents.includes(lowerCity)) {
      // Verifica se não é muito genérico
      if (lowerStandard.length > 5 && lowerCity.length > 5) {
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

  // Se termina com /RS, mantém; se não, adiciona se for do RS (assumindo que todas são do RS por enquanto)
  // Mas só adiciona se não tiver estado já
  if (!cleaned.includes('/') && !cleaned.match(/\b(RS|SC|PR|SP|RJ|MG|ES|BA|SE|AL|PE|PB|RN|CE|PI|MA|PA|AP|AM|AC|RO|RR|TO|GO|MT|MS|DF)\b/i)) {
    return cleaned + '/RS';
  }

  return cleaned;
}

/**
 * Obtém lista de cidades principais formatadas para selects
 * @returns {Array} - Array de objetos {id, name} para uso em selects
 */
export function getMainCitiesOptions() {
  return Object.keys(MAIN_CITIES).map((city, index) => ({
    id: index,
    name: city
  }));
}

/**
 * Verifica se uma cidade é uma das principais
 * @param {string} city - Nome da cidade
 * @returns {boolean} - true se for uma cidade principal
 */
export function isMainCity(city) {
  if (!city) return false;
  const normalized = normalizeCity(city);
  return Object.keys(MAIN_CITIES).includes(normalized);
}






