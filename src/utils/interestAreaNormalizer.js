// Normalização de Áreas de Interesse - Padroniza áreas de interesse profissional

// Áreas de interesse principais com suas variações comuns
export const MAIN_INTEREST_AREAS = {
  'Arquitetura': [
    'arquitetura', 'arquiteto', 'arquitetura e urbanismo',
    'arquitetura e urbanismo', 'arquitetura urbanismo',
    'projeto arquitetônico', 'projeto arquitetônico',
    'desenho arquitetônico', 'desenho arquitetônico',
    'arquitetura de interiores', 'arquitetura interiores'
  ],
  'Engenharia': [
    'engenharia', 'engenheiro', 'engenharia civil',
    'engenharia de obras', 'engenharia obras',
    'engenharia estrutural', 'engenharia estrutural',
    'engenharia de projetos', 'engenharia projetos',
    'eng civil', 'eng. civil', 'eng civil'
  ],
  'Marketing': [
    'marketing', 'mkt', 'mkt digital', 'marketing digital',
    'marketing de conteúdo', 'marketing de conteudo',
    'marketing de produtos', 'marketing produtos',
    'publicidade', 'propaganda', 'comunicação', 'comunicacao',
    'branding', 'marca', 'brand'
  ],
  'Comercial': [
    'comercial', 'vendas', 'vendedor', 'representante comercial',
    'representante', 'vendas externas', 'vendas internas',
    'atendimento comercial', 'atendimento', 'atendente',
    'consultor comercial', 'consultor de vendas', 'consultor vendas'
  ],
  'Estágio': [
    'estágio', 'estagio', 'estagiário', 'estagiario',
    'estágio técnico', 'estagio tecnico', 'estágio administrativo',
    'estagio administrativo', 'trainee', 'jovem aprendiz',
    'aprendiz', 'estágio remunerado', 'estagio remunerado'
  ],
  'Administrativa': [
    'administrativa', 'administração', 'administracao',
    'administrativo', 'assistente administrativo',
    'auxiliar administrativo', 'secretária', 'secretaria',
    'recepcionista', 'atendimento administrativo',
    'gestão administrativa', 'gestao administrativa'
  ],
  'Novos Negócios': [
    'novos negócios', 'novos negocios', 'novos negócios',
    'desenvolvimento de negócios', 'desenvolvimento de negocios',
    'business development', 'bd', 'novos projetos',
    'expansão', 'expansao', 'crescimento', 'inovação',
    'inovacao', 'startup', 'empreendedorismo'
  ],
  'Obras': [
    'obras', 'construção', 'construcao', 'construção civil',
    'construcao civil', 'execução de obras', 'execucao de obras',
    'gerência de obras', 'gerencia de obras', 'gerenciamento de obras',
    'fiscalização de obras', 'fiscalizacao de obras', 'fiscal de obras',
    'supervisão de obras', 'supervisao de obras', 'supervisor de obras'
  ],
  'Projetos': [
    'projetos', 'projeto', 'gestão de projetos', 'gestao de projetos',
    'gerência de projetos', 'gerencia de projetos', 'gerenciamento de projetos',
    'coordenador de projetos', 'coordenador projetos',
    'analista de projetos', 'analista projetos', 'project manager',
    'pm', 'pmo', 'escritório de projetos', 'escritorio de projetos'
  ],
  'Financeiro': [
    'financeiro', 'finanças', 'financas', 'contabilidade',
    'contador', 'analista financeiro', 'analista financeiro',
    'assistente financeiro', 'auxiliar financeiro',
    'controladoria', 'tesouraria', 'fiscal', 'fiscalização',
    'fiscalizacao', 'auditoria', 'auditor'
  ],
  'Tecnologia': [
    'tecnologia', 'ti', 't.i.', 'ti', 'tecnologia da informação',
    'tecnologia da informacao', 'informática', 'informatica',
    'desenvolvimento', 'dev', 'programação', 'programacao',
    'programador', 'desenvolvedor', 'analista de sistemas',
    'analista sistemas', 'suporte técnico', 'suporte tecnico',
    'infraestrutura', 'infra', 'dados', 'data', 'dados',
    'ciência de dados', 'ciencia de dados', 'data science'
  ],
  'Recursos Humanos': [
    'recursos humanos', 'rh', 'r.h.', 'gestão de pessoas',
    'gestao de pessoas', 'gp', 'recrutamento', 'seleção',
    'selecao', 'recrutamento e seleção', 'recrutamento e selecao',
    'r&s', 'r e s', 'dp', 'departamento pessoal',
    'benefícios', 'beneficios', 'folha de pagamento', 'folha pagamento'
  ],
  'Logística': [
    'logística', 'logistica', 'logística e distribuição',
    'logistica e distribuicao', 'almoxarifado', 'estoque',
    'armazenagem', 'distribuição', 'distribuicao',
    'supply chain', 'cadeia de suprimentos', 'cadeia suprimentos',
    'compras', 'compras e suprimentos', 'compras suprimentos'
  ],
  'Qualidade': [
    'qualidade', 'controle de qualidade', 'controle qualidade',
    'qc', 'qa', 'assurance', 'gestão da qualidade',
    'gestao da qualidade', 'iso', 'certificação', 'certificacao',
    'auditoria de qualidade', 'auditoria qualidade'
  ],
  'Segurança do Trabalho': [
    'segurança do trabalho', 'seguranca do trabalho',
    'segurança', 'seguranca', 'sst', 'sesmt', 'técnico em segurança',
    'tecnico em seguranca', 'engenharia de segurança',
    'engenharia de seguranca', 'prevenção de acidentes',
    'prevencao de acidentes', 'nr', 'normas regulamentadoras'
  ],
  'Meio Ambiente': [
    'meio ambiente', 'ambiental', 'sustentabilidade',
    'gestão ambiental', 'gestao ambiental', 'licenciamento ambiental',
    'licenciamento', 'ambientalista', 'engenharia ambiental',
    'engenharia ambiental', 'eng ambiental'
  ]
};

/**
 * Normaliza o nome de uma área de interesse para o formato padrão
 * @param {string} interestArea - Nome da área de interesse a normalizar
 * @returns {string} - Nome normalizado ou string original se não encontrado
 */
export function normalizeInterestArea(interestArea) {
  if (!interestArea || typeof interestArea !== 'string') {
    return '';
  }

  // Remove espaços extras e converte para minúsculas para comparação
  const normalized = interestArea.trim();
  const lowerInterest = normalized.toLowerCase();

  // Remove acentos para comparação mais flexível
  const removeAccents = (str) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  const lowerInterestNoAccents = removeAccents(lowerInterest);

  // Procura nas áreas principais
  for (const [standardName, variations] of Object.entries(MAIN_INTEREST_AREAS)) {
    // Verifica se é exatamente igual (case-insensitive)
    if (lowerInterest === standardName.toLowerCase()) {
      return standardName;
    }

    // Verifica variações
    for (const variation of variations) {
      const lowerVariation = variation.toLowerCase();
      const lowerVariationNoAccents = removeAccents(lowerVariation);

      // Match exato
      if (lowerInterest === lowerVariation || lowerInterestNoAccents === lowerVariationNoAccents) {
        return standardName;
      }

      // Match parcial (para casos como "Marketing" dentro de "Marketing Digital")
      if (lowerInterest.includes(lowerVariation) || lowerVariation.includes(lowerInterest)) {
        // Verifica se não é muito genérico
        if (lowerVariation.length > 2 && lowerInterest.length > 2) {
          return standardName;
        }
      }
    }

    // Verifica se o nome padrão está contido no input
    const lowerStandard = standardName.toLowerCase();
    const lowerStandardNoAccents = removeAccents(lowerStandard);
    
    if (lowerInterest.includes(lowerStandardNoAccents) || lowerStandardNoAccents.includes(lowerInterest)) {
      // Verifica se não é muito genérico
      if (lowerStandard.length > 3 && lowerInterest.length > 3) {
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
 * Normaliza uma string com múltiplas áreas de interesse separadas por vírgula
 * @param {string} interestAreasString - String com áreas separadas por vírgula
 * @returns {string} - String normalizada com áreas separadas por vírgula
 */
export function normalizeInterestAreasString(interestAreasString) {
  if (!interestAreasString || typeof interestAreasString !== 'string') {
    return '';
  }

  // Divide por vírgula, normaliza cada uma e junta novamente
  const areas = interestAreasString
    .split(',')
    .map(area => normalizeInterestArea(area.trim()))
    .filter(area => area) // Remove vazias
    .filter((area, index, self) => self.indexOf(area) === index); // Remove duplicatas

  return areas.join(', ');
}

/**
 * Obtém lista de áreas de interesse principais formatadas para selects
 * @returns {Array} - Array de objetos {id, name} para uso em selects
 */
export function getMainInterestAreasOptions() {
  return Object.keys(MAIN_INTEREST_AREAS).map((area, index) => ({
    id: index,
    name: area
  }));
}

/**
 * Verifica se uma área de interesse é uma das principais
 * @param {string} interestArea - Nome da área de interesse
 * @returns {boolean} - true se for uma área principal
 */
export function isMainInterestArea(interestArea) {
  if (!interestArea) return false;
  const normalized = normalizeInterestArea(interestArea);
  return Object.keys(MAIN_INTEREST_AREAS).includes(normalized);
}


