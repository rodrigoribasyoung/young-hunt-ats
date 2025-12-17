// src/constants.js

// Etapas Visuais do Kanban (O fluxo ativo)
export const PIPELINE_STAGES = [
  'Inscrito', 
  'Considerado', 
  'Entrevista I', 
  'Testes', 
  'Entrevista II', 
  'Seleção' // Equivalente ao antigo 'Selecionado', ajustado conforme seu pedido
];

// Status que encerram o processo (Gatilhos)
export const CLOSING_STATUSES = [
  'Contratado', 
  'Reprovado', 
  'Desistiu da vaga'
];

// Todos os status possíveis (para validação e cores)
export const ALL_STATUSES = [...PIPELINE_STAGES, ...CLOSING_STATUSES];

// Campos obrigatórios por etapa/fechamento do funil
// Baseado no processo:
// Considerado → verificar Cidade, CNH
// Entrevista I → Áreas interesse, Formação, Exp. Ant., Estado civil, Onde encontrou + Data entrevista
// Testes → Dados dos testes
// Entrevista II → Data 2ª entrevista
// Seleção/Contratado → Retorno dado
export const STAGE_REQUIRED_FIELDS = {
  'Considerado': ['fullName', 'email', 'phone', 'city', 'hasLicense'],
  'Entrevista I': ['fullName', 'email', 'phone', 'city', 'hasLicense', 'interestAreas', 'education', 'experience', 'maritalStatus', 'source', 'interview1Date'],
  'Testes': ['fullName', 'email', 'phone', 'city', 'interestAreas', 'interview1Date', 'testResults'],
  'Entrevista II': ['fullName', 'email', 'phone', 'city', 'interestAreas', 'interview1Date', 'testResults', 'interview2Date', 'managerFeedback'],
  'Seleção': ['fullName', 'email', 'phone', 'city', 'interestAreas', 'experience', 'interview1Date', 'interview2Date'],
  'Contratado': ['fullName', 'email', 'phone', 'city', 'interestAreas', 'experience', 'source', 'returnSent'],
  'Reprovado': ['fullName', 'email', 'phone', 'returnSent', 'rejectionReason'],
  'Desistiu da vaga': ['fullName', 'email', 'phone']
};

export const JOB_STATUSES = ['Aberta', 'Preenchida', 'Cancelada', 'Fechada'];

export const STATUS_COLORS = {
  'Inscrito': 'bg-gray-600 dark:bg-gray-700 text-white dark:text-gray-100 border-gray-500 dark:border-gray-600 font-medium',
  'Considerado': 'bg-blue-500 dark:bg-blue-600 text-white border-blue-600 dark:border-blue-700 font-medium',
  'Entrevista I': 'bg-cyan-500 dark:bg-cyan-600 text-white border-cyan-600 dark:border-cyan-700 font-medium',
  'Testes': 'bg-purple-500 dark:bg-purple-600 text-white border-purple-600 dark:border-purple-700 font-medium',
  'Entrevista II': 'bg-indigo-500 dark:bg-indigo-600 text-white border-indigo-600 dark:border-indigo-700 font-medium',
  'Seleção': 'bg-yellow-500 dark:bg-yellow-600 text-white border-yellow-600 dark:border-yellow-700 font-medium',
  
  // Status de Fechamento
  'Contratado': 'bg-green-500 dark:bg-green-600 text-white border-green-600 dark:border-green-700 font-medium',
  'Reprovado': 'bg-red-500 dark:bg-red-600 text-white border-red-600 dark:border-red-700 font-medium',
  'Desistiu da vaga': 'bg-gray-500 dark:bg-gray-600 text-white border-gray-600 dark:border-gray-700 font-medium'
};

// Mapeamento de campos do candidato
// - key: nome do campo no sistema (Firebase)
// - csvLabel: nome exato da coluna no CSV/Sheets/Forms (para importação)
// - displayName: nome visual para exibição nas tabelas e formulários
// - type: tipo do campo para renderização
// - category: categoria para organização nos formulários
export const CANDIDATE_FIELDS = [
  // Identificação e Contato
  { key: 'fullName', csvLabel: 'Nome completo:', displayName: 'Nome', type: 'text', category: 'pessoal', required: true },
  { key: 'email', csvLabel: 'E-mail principal:', displayName: 'Email', type: 'email', category: 'pessoal', required: true },
  { key: 'email_secondary', csvLabel: 'Endereço de e-mail', displayName: 'Email Secundário', type: 'email', category: 'pessoal' },
  { key: 'phone', csvLabel: 'Nº telefone celular / Whatsapp:', displayName: 'Telefone', type: 'phone', category: 'pessoal', required: true },
  { key: 'city', csvLabel: 'Cidade onde reside:', displayName: 'Cidade', type: 'select', category: 'pessoal' },
  
  // Dados Pessoais
  { key: 'birthDate', csvLabel: 'Data de Nascimento:', displayName: 'Data Nasc.', type: 'date', category: 'pessoal' },
  { key: 'age', csvLabel: 'Idade', displayName: 'Idade', type: 'number', category: 'pessoal' },
  { key: 'maritalStatus', csvLabel: 'Estado civil:', displayName: 'Estado Civil', type: 'select', category: 'pessoal' },
  { key: 'childrenCount', csvLabel: 'Se tem filhos, quantos?', displayName: 'Filhos', type: 'number', category: 'pessoal' },
  { key: 'photoUrl', csvLabel: 'Nos envie uma foto atual que você goste:', displayName: 'Foto', type: 'url', category: 'pessoal' },
  { key: 'hasLicense', csvLabel: 'Você possui CNH tipo B?', displayName: 'CNH', type: 'boolean', category: 'pessoal' },
  
  // Profissional e Acadêmico
  { key: 'education', csvLabel: 'Formação:', displayName: 'Formação', type: 'text', category: 'profissional' },
  { key: 'schoolingLevel', csvLabel: 'Nível de escolaridade:', displayName: 'Escolaridade', type: 'select', category: 'profissional' },
  { key: 'institution', csvLabel: 'Instituição de ensino:', displayName: 'Instituição', type: 'text', category: 'profissional' },
  { key: 'graduationDate', csvLabel: 'Data de formatura:', displayName: 'Formatura', type: 'date', category: 'profissional' },
  { key: 'isStudying', csvLabel: 'Em caso de curso superior, está cursando neste momento?', displayName: 'Cursando', type: 'boolean', category: 'profissional' },
  { key: 'experience', csvLabel: 'Experiências anteriores:', displayName: 'Experiência', type: 'textarea', category: 'profissional' },
  { key: 'courses', csvLabel: 'Cursos e certificações profissionais.', displayName: 'Cursos', type: 'textarea', category: 'profissional' },
  { key: 'certifications', csvLabel: 'Certificações profissionais:', displayName: 'Certificações', type: 'textarea', category: 'profissional' },
  { key: 'interestAreas', csvLabel: 'Áreas de interesse profissional', displayName: 'Área de Interesse', type: 'select', category: 'profissional' },
  
  // Links
  { key: 'cvUrl', csvLabel: 'Anexar currículo:', displayName: 'CV', type: 'url', category: 'links' },
  { key: 'portfolioUrl', csvLabel: 'Portfólio de trabalho:', displayName: 'Portfólio', type: 'url', category: 'links' },
  
  // Processo Seletivo - Dados Iniciais
  { key: 'source', csvLabel: 'Onde você nos encontrou?', displayName: 'Fonte', type: 'select', category: 'processo' },
  { key: 'referral', csvLabel: 'Você foi indicado por algum colaborador da Young? Se sim, quem?', displayName: 'Indicação', type: 'text', category: 'processo' },
  { key: 'salaryExpectation', csvLabel: 'Qual seria sua expectativa salarial?', displayName: 'Pretensão Salarial', type: 'text', category: 'processo' },
  { key: 'canRelocate', csvLabel: 'Teria disponibilidade para mudança de cidade?', displayName: 'Disponível p/ Mudança', type: 'boolean', category: 'processo' },
  { key: 'references', csvLabel: 'Referências profissionais:', displayName: 'Referências', type: 'textarea', category: 'processo' },
  { key: 'typeOfApp', csvLabel: 'Você está se candidatando a uma vaga específica...?', displayName: 'Tipo de Candidatura', type: 'text', category: 'processo' },
  
  // Processo Seletivo - Acompanhamento das Etapas
  { key: 'interview1Date', csvLabel: 'Data 1ª Entrevista', displayName: 'Data 1ª Entrevista', type: 'datetime', category: 'etapas' },
  { key: 'interview1Notes', csvLabel: 'Observações 1ª Entrevista', displayName: 'Obs. 1ª Entrevista', type: 'textarea', category: 'etapas' },
  { key: 'testResults', csvLabel: 'Resultados dos Testes', displayName: 'Resultado Testes', type: 'text', category: 'etapas' },
  { key: 'testNotes', csvLabel: 'Observações dos Testes', displayName: 'Obs. Testes', type: 'textarea', category: 'etapas' },
  { key: 'interview2Date', csvLabel: 'Data 2ª Entrevista', displayName: 'Data 2ª Entrevista', type: 'datetime', category: 'etapas' },
  { key: 'interview2Notes', csvLabel: 'Observações 2ª Entrevista', displayName: 'Obs. 2ª Entrevista', type: 'textarea', category: 'etapas' },
  { key: 'returnSent', csvLabel: 'Retorno Dado', displayName: 'Retorno Dado', type: 'boolean', category: 'etapas' },
  { key: 'returnDate', csvLabel: 'Data do Retorno', displayName: 'Data Retorno', type: 'date', category: 'etapas' },
  { key: 'returnNotes', csvLabel: 'Observações do Retorno', displayName: 'Obs. Retorno', type: 'textarea', category: 'etapas' },
  
  { key: 'freeField', csvLabel: 'Campo Livre, SEJA VOCÊ!', displayName: 'Observações Gerais', type: 'textarea', category: 'adicional' },
  
  // Metadados
  { key: 'original_timestamp', csvLabel: 'Carimbo de data/hora', displayName: 'Data Cadastro', type: 'datetime', category: 'sistema' },
  { key: 'external_id', csvLabel: 'COD', displayName: 'Código Externo', type: 'text', category: 'sistema' },
  { key: 'status', csvLabel: 'Status', displayName: 'Status', type: 'select', category: 'sistema' },
  { key: 'tags', csvLabel: 'Tags', displayName: 'Tags', type: 'tags', category: 'sistema' },
  { key: 'jobId', csvLabel: 'Vaga', displayName: 'Vaga', type: 'select', category: 'sistema' },
  { key: 'createdAt', csvLabel: 'Criado em', displayName: 'Importado em', type: 'datetime', category: 'sistema' },
];

// Helper para obter nome visual do campo
export const getFieldDisplayName = (key) => {
  const field = CANDIDATE_FIELDS.find(f => f.key === key);
  return field?.displayName || key;
};

// Helper para obter nome CSV do campo
export const getFieldCsvLabel = (key) => {
  const field = CANDIDATE_FIELDS.find(f => f.key === key);
  return field?.csvLabel || key;
};

// Mapeamento legado para compatibilidade com importação CSV
export const CSV_FIELD_MAPPING_OPTIONS = CANDIDATE_FIELDS.map(f => ({
  label: f.csvLabel,
  value: f.key
}));

// Campos da Vaga
export const JOB_FIELDS = [
  // Identificação
  { key: 'title', csvLabel: 'Título', displayName: 'Título da Vaga', type: 'text', required: true, category: 'identificacao' },
  { key: 'code', csvLabel: 'Código', displayName: 'Código', type: 'text', category: 'identificacao' },
  
  // Localização e Estrutura
  { key: 'company', csvLabel: 'Empresa', displayName: 'Empresa/Unidade', type: 'select', required: true, category: 'estrutura' },
  { key: 'city', csvLabel: 'Cidade da vaga', displayName: 'Cidade', type: 'select', required: true, category: 'estrutura' },
  { key: 'interestArea', csvLabel: 'Área de interesse', displayName: 'Área', type: 'select', category: 'estrutura' },
  { key: 'sector', csvLabel: 'Setor', displayName: 'Setor', type: 'select', category: 'estrutura' },
  { key: 'position', csvLabel: 'Cargo', displayName: 'Cargo', type: 'select', category: 'estrutura' },
  { key: 'function', csvLabel: 'Função', displayName: 'Função', type: 'select', category: 'estrutura' },
  
  // Detalhes da Vaga
  { key: 'description', csvLabel: 'Descrição', displayName: 'Descrição', type: 'textarea', category: 'detalhes' },
  { key: 'requirements', csvLabel: 'Requisitos', displayName: 'Requisitos', type: 'textarea', category: 'detalhes' },
  { key: 'benefits', csvLabel: 'Benefícios', displayName: 'Benefícios', type: 'textarea', category: 'detalhes' },
  { key: 'salary', csvLabel: 'Faixa salarial', displayName: 'Salário', type: 'text', category: 'detalhes' },
  { key: 'workModel', csvLabel: 'Modelo de trabalho', displayName: 'Modelo', type: 'select', category: 'detalhes' }, // Presencial, Híbrido, Remoto
  { key: 'workload', csvLabel: 'Carga horária', displayName: 'Carga Horária', type: 'text', category: 'detalhes' },
  { key: 'contractType', csvLabel: 'Tipo de contrato', displayName: 'Tipo Contrato', type: 'select', category: 'detalhes' }, // CLT, PJ, Estágio, etc
  
  // Gestão
  { key: 'vacancies', csvLabel: 'Número de vagas', displayName: 'Nº Vagas', type: 'number', category: 'gestao' },
  { key: 'priority', csvLabel: 'Prioridade', displayName: 'Prioridade', type: 'select', category: 'gestao' }, // Alta, Média, Baixa
  { key: 'deadline', csvLabel: 'Prazo', displayName: 'Prazo', type: 'date', category: 'gestao' },
  { key: 'recruiter', csvLabel: 'Recrutador responsável', displayName: 'Recrutador', type: 'text', category: 'gestao' },
  { key: 'hiringManager', csvLabel: 'Gestor contratante', displayName: 'Gestor', type: 'text', category: 'gestao' },
  { key: 'status', csvLabel: 'Status', displayName: 'Status', type: 'select', required: true, category: 'gestao' },
  
  // Metadados
  { key: 'createdAt', csvLabel: 'Criado em', displayName: 'Criado em', type: 'datetime', category: 'sistema' },
  { key: 'updatedAt', csvLabel: 'Atualizado em', displayName: 'Atualizado em', type: 'datetime', category: 'sistema' },
];

// Campos da Candidatura (Application) - Vínculo Candidato + Vaga
export const APPLICATION_FIELDS = [
  // Identificação
  { key: 'candidateId', displayName: 'Candidato', type: 'reference', required: true },
  { key: 'candidateName', displayName: 'Nome do Candidato', type: 'text' },
  { key: 'candidateEmail', displayName: 'Email do Candidato', type: 'email' },
  { key: 'jobId', displayName: 'Vaga', type: 'reference', required: true },
  { key: 'jobTitle', displayName: 'Título da Vaga', type: 'text' },
  
  // Dados da Vaga (snapshot no momento da candidatura)
  { key: 'company', displayName: 'Empresa/Unidade', type: 'text' },
  { key: 'city', displayName: 'Cidade da Vaga', type: 'text' },
  { key: 'area', displayName: 'Área', type: 'text' },
  { key: 'sector', displayName: 'Setor', type: 'text' },
  { key: 'position', displayName: 'Cargo', type: 'text' },
  { key: 'function', displayName: 'Função', type: 'text' },
  
  // Status e Progresso
  { key: 'status', displayName: 'Status', type: 'select', required: true }, // Inscrito, Considerado, etc
  { key: 'appliedAt', displayName: 'Data da Candidatura', type: 'datetime' },
  { key: 'source', displayName: 'Origem', type: 'text' }, // Como chegou à vaga
  
  // Notas e Observações
  { key: 'notes', displayName: 'Notas', type: 'array' },
  { key: 'rating', displayName: 'Avaliação', type: 'number' }, // 1-5 estrelas
  { key: 'feedback', displayName: 'Feedback Final', type: 'textarea' },
];

// Modelos de trabalho
export const WORK_MODELS = ['Presencial', 'Híbrido', 'Remoto'];

// Tipos de contrato
export const CONTRACT_TYPES = ['CLT', 'PJ', 'Estágio', 'Temporário', 'Freelancer', 'Trainee'];

// Prioridades
export const PRIORITIES = ['Alta', 'Média', 'Baixa'];