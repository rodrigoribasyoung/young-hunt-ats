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

export const JOB_STATUSES = ['Aberta', 'Preenchida', 'Cancelada', 'Fechada'];

export const STATUS_COLORS = {
  'Inscrito': 'bg-slate-700 text-slate-200 border-slate-600',
  'Considerado': 'bg-blue-900/40 text-blue-300 border-blue-700',
  'Entrevista I': 'bg-cyan-900/40 text-cyan-300 border-cyan-700',
  'Testes': 'bg-purple-900/40 text-purple-300 border-purple-700',
  'Entrevista II': 'bg-indigo-900/40 text-indigo-300 border-indigo-700',
  'Seleção': 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  
  // Status de Fechamento
  'Contratado': 'bg-green-900/40 text-green-300 border-green-700',
  'Reprovado': 'bg-red-900/40 text-red-300 border-red-700',
  'Desistiu da vaga': 'bg-slate-800 text-slate-400 border-slate-600'
};

// Mapeamento EXATO das colunas do seu CSV para as variáveis do Sistema
export const CSV_FIELD_MAPPING_OPTIONS = [
  // ... (Mantenha o restante das opções de CSV igual ao anterior)
  // Identificação e Contato
  { label: 'Nome completo:', value: 'fullName' },
  { label: 'E-mail principal:', value: 'email' },
  { label: 'Endereço de e-mail', value: 'email_secondary' },
  { label: 'Nº telefone celular / Whatsapp:', value: 'phone' },
  { label: 'Cidade onde reside:', value: 'city' },
  
  // Dados Pessoais
  { label: 'Data de Nascimento:', value: 'birthDate' },
  { label: 'Idade', value: 'age' },
  { label: 'Estado civil:', value: 'maritalStatus' },
  { label: 'Se tem filhos, quantos?', value: 'childrenCount' },
  { label: 'Nos envie uma foto atual que você goste:', value: 'photoUrl' },
  { label: 'Você possui CNH tipo B?', value: 'hasLicense' },
  
  // Profissional e Acadêmico
  { label: 'Formação:', value: 'education' },
  { label: 'Nível de escolaridade:', value: 'schoolingLevel' },
  { label: 'Instituição de ensino:', value: 'institution' },
  { label: 'Data de formatura:', value: 'graduationDate' },
  { label: 'Em caso de curso superior, está cursando neste momento?', value: 'isStudying' },
  { label: 'Experiências anteriores:', value: 'experience' },
  { label: 'Cursos e certificações profissionais.', value: 'courses' },
  { label: 'Certificações profissionais:', value: 'certifications' },
  { label: 'Áreas de interesse profissional', value: 'interestAreas' },
  
  // Links
  { label: 'Anexar currículo:', value: 'cvUrl' },
  { label: 'Portfólio de trabalho:', value: 'portfolioUrl' },
  
  // Perguntas de Filtro e Fit Cultural
  { label: 'Onde você nos encontrou?', value: 'source' },
  { label: 'Você foi indicado por algum colaborador da Young? Se sim, quem?', value: 'referral' },
  { label: 'Qual seria sua expectativa salarial?', value: 'salaryExpectation' },
  { label: 'Teria disponibilidade para mudança de cidade?', value: 'canRelocate' },
  { label: 'Referências profissionais:', value: 'references' },
  { label: 'Você está se candidatando a uma vaga específica...?', value: 'typeOfApp' },
  { label: 'Campo Livre, SEJA VOCÊ!', value: 'freeField' },
  
  // Metadados
  { label: 'Carimbo de data/hora', value: 'original_timestamp' },
  { label: 'COD', value: 'external_id' }
];