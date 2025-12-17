// src/utils/validation.js
// Sistema de validação de dados para o ATS

import { CANDIDATE_FIELDS, getFieldDisplayName } from '../constants';

// ============================================
// FUNÇÕES DE VALIDAÇÃO INDIVIDUAIS
// ============================================

/**
 * Valida formato de email
 */
export const validateEmail = (email) => {
  if (!email) return { valid: false, message: 'Email é obrigatório' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, message: 'Formato de email inválido' };
  }
  return { valid: true };
};

/**
 * Valida telefone brasileiro (com DDD)
 * Aceita formatos: (51) 99999-9999, 51999999999, +5551999999999
 */
export const validatePhone = (phone) => {
  if (!phone) return { valid: false, message: 'Telefone é obrigatório' };
  
  // Remove caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Verifica se tem entre 10 e 13 dígitos (com ou sem código do país)
  if (cleanPhone.length < 10 || cleanPhone.length > 13) {
    return { valid: false, message: 'Telefone deve ter entre 10 e 13 dígitos' };
  }
  
  // Verifica se começa com código válido (DDD brasileiro 11-99)
  const ddd = cleanPhone.length >= 12 ? cleanPhone.substring(2, 4) : cleanPhone.substring(0, 2);
  const dddNum = parseInt(ddd, 10);
  if (dddNum < 11 || dddNum > 99) {
    return { valid: false, message: 'DDD inválido' };
  }
  
  return { valid: true };
};

/**
 * Formata telefone para exibição
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  } else if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
};

/**
 * Valida CPF brasileiro
 */
export const validateCPF = (cpf) => {
  if (!cpf) return { valid: true }; // CPF não é obrigatório
  
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) {
    return { valid: false, message: 'CPF deve ter 11 dígitos' };
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleanCPF)) {
    return { valid: false, message: 'CPF inválido' };
  }
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let digit1 = (sum * 10) % 11;
  if (digit1 === 10) digit1 = 0;
  
  if (digit1 !== parseInt(cleanCPF[9])) {
    return { valid: false, message: 'CPF inválido' };
  }
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  let digit2 = (sum * 10) % 11;
  if (digit2 === 10) digit2 = 0;
  
  if (digit2 !== parseInt(cleanCPF[10])) {
    return { valid: false, message: 'CPF inválido' };
  }
  
  return { valid: true };
};

/**
 * Formata CPF para exibição
 */
export const formatCPF = (cpf) => {
  if (!cpf) return '';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
};

/**
 * Valida data (aceita vários formatos)
 */
export const validateDate = (date, fieldName = 'Data') => {
  if (!date) return { valid: true }; // Data não obrigatória por padrão
  
  // Tenta parsear a data
  let parsedDate;
  
  if (typeof date === 'string') {
    // Formato DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      const [day, month, year] = date.split('/');
      parsedDate = new Date(year, month - 1, day);
    }
    // Formato YYYY-MM-DD
    else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      parsedDate = new Date(date);
    }
    // Outros formatos
    else {
      parsedDate = new Date(date);
    }
  } else if (date instanceof Date) {
    parsedDate = date;
  } else if (date?.toDate) {
    parsedDate = date.toDate();
  } else if (date?.seconds) {
    parsedDate = new Date(date.seconds * 1000);
  }
  
  if (!parsedDate || isNaN(parsedDate.getTime())) {
    return { valid: false, message: `${fieldName} está em formato inválido` };
  }
  
  // Verifica se a data é razoável (entre 1900 e 2100)
  const year = parsedDate.getFullYear();
  if (year < 1900 || year > 2100) {
    return { valid: false, message: `${fieldName} está fora do intervalo válido` };
  }
  
  return { valid: true, parsed: parsedDate };
};

/**
 * Valida data de nascimento (deve ser no passado, pessoa maior de 14 anos)
 */
export const validateBirthDate = (date) => {
  if (!date) return { valid: true };
  
  const result = validateDate(date, 'Data de nascimento');
  if (!result.valid) return result;
  
  const birthDate = result.parsed;
  const today = new Date();
  
  if (birthDate > today) {
    return { valid: false, message: 'Data de nascimento não pode ser no futuro' };
  }
  
  // Calcula idade
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  if (age < 14) {
    return { valid: false, message: 'Candidato deve ter no mínimo 14 anos' };
  }
  
  if (age > 120) {
    return { valid: false, message: 'Data de nascimento parece incorreta' };
  }
  
  return { valid: true, age };
};

/**
 * Valida URL
 */
export const validateURL = (url, fieldName = 'URL') => {
  if (!url) return { valid: true }; // URL não obrigatória por padrão
  
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, message: `${fieldName} deve começar com http:// ou https://` };
    }
    return { valid: true };
  } catch {
    return { valid: false, message: `${fieldName} está em formato inválido` };
  }
};

/**
 * Valida se campo não está vazio
 */
export const validateRequired = (value, fieldName = 'Campo') => {
  if (value === null || value === undefined || value === '') {
    return { valid: false, message: `${fieldName} é obrigatório` };
  }
  if (typeof value === 'string' && !value.trim()) {
    return { valid: false, message: `${fieldName} é obrigatório` };
  }
  return { valid: true };
};

/**
 * Valida tamanho mínimo/máximo de texto
 */
export const validateLength = (value, min = 0, max = Infinity, fieldName = 'Campo') => {
  if (!value) return { valid: true };
  
  const length = value.toString().trim().length;
  
  if (length < min) {
    return { valid: false, message: `${fieldName} deve ter no mínimo ${min} caracteres` };
  }
  if (length > max) {
    return { valid: false, message: `${fieldName} deve ter no máximo ${max} caracteres` };
  }
  
  return { valid: true };
};

/**
 * Valida número
 */
export const validateNumber = (value, min = -Infinity, max = Infinity, fieldName = 'Campo') => {
  if (value === null || value === undefined || value === '') return { valid: true };
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { valid: false, message: `${fieldName} deve ser um número` };
  }
  if (num < min) {
    return { valid: false, message: `${fieldName} deve ser no mínimo ${min}` };
  }
  if (num > max) {
    return { valid: false, message: `${fieldName} deve ser no máximo ${max}` };
  }
  
  return { valid: true };
};

// ============================================
// VALIDAÇÃO COMPLETA DE CANDIDATO
// ============================================

/**
 * Valida todos os campos de um candidato
 * @param {Object} candidate - Dados do candidato
 * @param {Object} options - Opções de validação
 * @returns {Object} { valid: boolean, errors: { [field]: string }, warnings: { [field]: string } }
 */
export const validateCandidate = (candidate, options = {}) => {
  const { 
    checkRequired = true, 
    strictMode = false,
    stage = null // Se fornecido, valida campos obrigatórios para a etapa
  } = options;
  
  const errors = {};
  const warnings = {};
  
  // Campos sempre obrigatórios
  if (checkRequired) {
    const nameResult = validateRequired(candidate.fullName, 'Nome');
    if (!nameResult.valid) errors.fullName = nameResult.message;
    else {
      const lengthResult = validateLength(candidate.fullName, 2, 100, 'Nome');
      if (!lengthResult.valid) errors.fullName = lengthResult.message;
    }
  }
  
  // Email
  if (candidate.email) {
    const emailResult = validateEmail(candidate.email);
    if (!emailResult.valid) errors.email = emailResult.message;
  } else if (checkRequired) {
    errors.email = 'Email é obrigatório';
  }
  
  // Email secundário (se preenchido)
  if (candidate.email_secondary) {
    const emailResult = validateEmail(candidate.email_secondary);
    if (!emailResult.valid) errors.email_secondary = emailResult.message;
  }
  
  // Telefone
  if (candidate.phone) {
    const phoneResult = validatePhone(candidate.phone);
    if (!phoneResult.valid) errors.phone = phoneResult.message;
  } else if (checkRequired) {
    errors.phone = 'Telefone é obrigatório';
  }
  
  // Data de nascimento
  if (candidate.birthDate) {
    const birthResult = validateBirthDate(candidate.birthDate);
    if (!birthResult.valid) errors.birthDate = birthResult.message;
  }
  
  // URLs
  if (candidate.cvUrl) {
    const urlResult = validateURL(candidate.cvUrl, 'URL do currículo');
    if (!urlResult.valid) warnings.cvUrl = urlResult.message;
  }
  if (candidate.portfolioUrl) {
    const urlResult = validateURL(candidate.portfolioUrl, 'URL do portfólio');
    if (!urlResult.valid) warnings.portfolioUrl = urlResult.message;
  }
  if (candidate.photoUrl) {
    const urlResult = validateURL(candidate.photoUrl, 'URL da foto');
    if (!urlResult.valid) warnings.photoUrl = urlResult.message;
  }
  
  // Idade (se preenchida)
  if (candidate.age !== undefined && candidate.age !== null && candidate.age !== '') {
    const ageResult = validateNumber(candidate.age, 14, 120, 'Idade');
    if (!ageResult.valid) errors.age = ageResult.message;
  }
  
  // Número de filhos
  if (candidate.childrenCount !== undefined && candidate.childrenCount !== null && candidate.childrenCount !== '') {
    const childrenResult = validateNumber(candidate.childrenCount, 0, 30, 'Número de filhos');
    if (!childrenResult.valid) errors.childrenCount = childrenResult.message;
  }
  
  // Modo estrito - verifica campos adicionais
  if (strictMode) {
    // Cidade
    if (!candidate.city || !candidate.city.trim()) {
      warnings.city = 'Cidade não preenchida';
    }
    
    // Áreas de interesse
    if (!candidate.interestAreas || !candidate.interestAreas.trim()) {
      warnings.interestAreas = 'Área de interesse não preenchida';
    }
  }
  
  // Validação por etapa do funil
  if (stage) {
    const stageFields = getStageRequiredFields(stage);
    stageFields.forEach(field => {
      if (!candidate[field] || (typeof candidate[field] === 'string' && !candidate[field].trim())) {
        const displayName = getFieldDisplayName(field);
        errors[field] = `${displayName} é obrigatório para a etapa "${stage}"`;
      }
    });
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
    hasWarnings: Object.keys(warnings).length > 0
  };
};

/**
 * Retorna campos obrigatórios para uma etapa específica
 */
export const getStageRequiredFields = (stage) => {
  const stageRequirements = {
    'Inscrito': ['fullName', 'email', 'phone'],
    'Considerado': ['fullName', 'email', 'phone'],
    'Entrevista I': ['fullName', 'email', 'phone', 'city'],
    'Testes': ['fullName', 'email', 'phone', 'city', 'interestAreas'],
    'Entrevista II': ['fullName', 'email', 'phone', 'city', 'interestAreas'],
    'Seleção': ['fullName', 'email', 'phone', 'city', 'interestAreas', 'experience'],
    'Contratado': ['fullName', 'email', 'phone', 'city', 'interestAreas', 'experience'],
    'Reprovado': ['fullName', 'email', 'phone'],
    'Desistiu da vaga': ['fullName', 'email', 'phone']
  };
  
  return stageRequirements[stage] || ['fullName', 'email', 'phone'];
};

// ============================================
// VALIDAÇÃO DE VAGA
// ============================================

/**
 * Valida dados de uma vaga
 */
export const validateJob = (job) => {
  const errors = {};
  
  if (!job.title || !job.title.trim()) {
    errors.title = 'Título da vaga é obrigatório';
  } else if (job.title.length < 3) {
    errors.title = 'Título deve ter no mínimo 3 caracteres';
  }
  
  if (!job.company || !job.company.trim()) {
    errors.company = 'Empresa é obrigatória';
  }
  
  if (!job.status) {
    errors.status = 'Status é obrigatório';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

// ============================================
// VALIDAÇÃO DE IMPORTAÇÃO CSV
// ============================================

/**
 * Valida uma linha de dados importados do CSV
 * @param {Object} row - Linha de dados mapeados
 * @param {number} rowIndex - Índice da linha (para mensagens de erro)
 * @returns {Object} { valid, errors, warnings, data }
 */
export const validateImportRow = (row, rowIndex) => {
  const errors = [];
  const warnings = [];
  const sanitizedData = { ...row };
  
  // Validar e sanitizar email
  if (row.email) {
    const emailResult = validateEmail(row.email);
    if (!emailResult.valid) {
      errors.push(`Linha ${rowIndex + 1}: ${emailResult.message}`);
    } else {
      sanitizedData.email = row.email.trim().toLowerCase();
    }
  } else {
    errors.push(`Linha ${rowIndex + 1}: Email é obrigatório`);
  }
  
  // Validar nome
  if (!row.fullName || !row.fullName.trim()) {
    errors.push(`Linha ${rowIndex + 1}: Nome é obrigatório`);
  } else {
    sanitizedData.fullName = row.fullName.trim();
  }
  
  // Validar e formatar telefone
  if (row.phone) {
    const phoneResult = validatePhone(row.phone);
    if (!phoneResult.valid) {
      warnings.push(`Linha ${rowIndex + 1}: ${phoneResult.message}`);
    }
    sanitizedData.phone = row.phone.replace(/\D/g, '');
  }
  
  // Validar URLs
  ['cvUrl', 'portfolioUrl', 'photoUrl'].forEach(field => {
    if (row[field]) {
      const urlResult = validateURL(row[field]);
      if (!urlResult.valid) {
        warnings.push(`Linha ${rowIndex + 1}: ${urlResult.message}`);
      }
    }
  });
  
  // Validar data de nascimento
  if (row.birthDate) {
    const dateResult = validateBirthDate(row.birthDate);
    if (!dateResult.valid) {
      warnings.push(`Linha ${rowIndex + 1}: ${dateResult.message}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    data: sanitizedData
  };
};

/**
 * Valida batch de dados importados
 */
export const validateImportBatch = (rows) => {
  const results = rows.map((row, index) => validateImportRow(row, index));
  
  const allErrors = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);
  const validRows = results.filter(r => r.valid).map(r => r.data);
  const invalidCount = results.filter(r => !r.valid).length;
  
  return {
    valid: allErrors.length === 0,
    totalRows: rows.length,
    validRows,
    invalidCount,
    errors: allErrors,
    warnings: allWarnings,
    summary: {
      total: rows.length,
      valid: validRows.length,
      invalid: invalidCount,
      withWarnings: results.filter(r => r.warnings.length > 0).length
    }
  };
};

// ============================================
// VERIFICAÇÃO DE DUPLICATAS
// ============================================

/**
 * Verifica se um candidato é duplicado baseado no email
 * @param {string} email - Email do candidato
 * @param {Array} existingCandidates - Lista de candidatos existentes
 * @param {string} excludeId - ID a excluir da verificação (para edição)
 */
export const checkDuplicateEmail = (email, existingCandidates, excludeId = null) => {
  if (!email) return { isDuplicate: false };
  
  const normalizedEmail = email.trim().toLowerCase();
  const duplicate = existingCandidates.find(c => 
    c.email?.trim().toLowerCase() === normalizedEmail && 
    c.id !== excludeId &&
    !c.deletedAt
  );
  
  if (duplicate) {
    return {
      isDuplicate: true,
      existingCandidate: duplicate,
      message: `Já existe um candidato com este email: ${duplicate.fullName || 'Sem nome'}`
    };
  }
  
  return { isDuplicate: false };
};

/**
 * Verifica duplicatas em batch (para importação)
 */
export const checkBatchDuplicates = (newRows, existingCandidates) => {
  const duplicates = [];
  const unique = [];
  const seenEmails = new Set();
  
  newRows.forEach((row, index) => {
    const email = row.email?.trim().toLowerCase();
    
    if (!email) {
      unique.push(row);
      return;
    }
    
    // Verifica duplicata com existentes
    const existingDup = checkDuplicateEmail(email, existingCandidates);
    if (existingDup.isDuplicate) {
      duplicates.push({
        row,
        index,
        type: 'existing',
        message: existingDup.message,
        existingCandidate: existingDup.existingCandidate
      });
      return;
    }
    
    // Verifica duplicata dentro do próprio batch
    if (seenEmails.has(email)) {
      duplicates.push({
        row,
        index,
        type: 'batch',
        message: `Email duplicado dentro da importação: ${email}`
      });
      return;
    }
    
    seenEmails.add(email);
    unique.push(row);
  });
  
  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
    unique,
    summary: {
      total: newRows.length,
      unique: unique.length,
      duplicatesWithExisting: duplicates.filter(d => d.type === 'existing').length,
      duplicatesInBatch: duplicates.filter(d => d.type === 'batch').length
    }
  };
};

// ============================================
// HELPERS DE FORMATAÇÃO
// ============================================

/**
 * Gera mensagem de erro amigável
 */
export const formatValidationErrors = (errors) => {
  if (!errors || typeof errors !== 'object') return '';
  
  const errorList = Object.entries(errors)
    .map(([field, message]) => `• ${message}`)
    .join('\n');
  
  return errorList;
};

/**
 * Gera resumo de validação para exibição
 */
export const formatValidationSummary = (result) => {
  if (result.valid && !result.hasWarnings) {
    return { type: 'success', message: 'Dados válidos!' };
  }
  
  if (!result.valid) {
    const errorCount = Object.keys(result.errors).length;
    return {
      type: 'error',
      message: `${errorCount} erro(s) encontrado(s)`,
      details: formatValidationErrors(result.errors)
    };
  }
  
  if (result.hasWarnings) {
    const warningCount = Object.keys(result.warnings).length;
    return {
      type: 'warning',
      message: `${warningCount} aviso(s)`,
      details: formatValidationErrors(result.warnings)
    };
  }
};

export default {
  validateEmail,
  validatePhone,
  validateCPF,
  validateDate,
  validateBirthDate,
  validateURL,
  validateRequired,
  validateLength,
  validateNumber,
  validateCandidate,
  validateJob,
  validateImportRow,
  validateImportBatch,
  checkDuplicateEmail,
  checkBatchDuplicates,
  formatPhone,
  formatCPF,
  formatValidationErrors,
  formatValidationSummary,
  getStageRequiredFields
};



