// src/components/ui/ValidatedInput.jsx
// Componente de input com validação visual integrada

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

/**
 * Input com validação visual
 * @param {Object} props
 * @param {string} props.label - Label do campo
 * @param {string} props.value - Valor atual
 * @param {function} props.onChange - Handler de mudança
 * @param {string} props.type - Tipo do input (text, email, tel, url, number, date)
 * @param {string} props.placeholder - Placeholder
 * @param {boolean} props.required - Se é obrigatório
 * @param {function} props.validate - Função de validação customizada (value) => { valid, message }
 * @param {string} props.error - Erro externo (do formulário pai)
 * @param {string} props.warning - Warning externo
 * @param {string} props.hint - Dica/ajuda
 * @param {boolean} props.disabled - Se está desabilitado
 * @param {boolean} props.showValidation - Se mostra validação em tempo real
 * @param {string} props.className - Classes adicionais
 */
export const ValidatedInput = ({
  label,
  value = '',
  onChange,
  type = 'text',
  placeholder,
  required = false,
  validate,
  error: externalError,
  warning: externalWarning,
  hint,
  disabled = false,
  showValidation = true,
  className = '',
  ...props
}) => {
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState('');
  const [internalWarning, setInternalWarning] = useState('');
  const [isValid, setIsValid] = useState(false);

  // Validação interna
  useEffect(() => {
    if (!touched || !showValidation) return;
    
    // Reset
    setInternalError('');
    setInternalWarning('');
    setIsValid(false);
    
    // Validação de campo obrigatório
    if (required && (!value || (typeof value === 'string' && !value.trim()))) {
      setInternalError(`${label || 'Este campo'} é obrigatório`);
      return;
    }
    
    // Validação customizada
    if (validate && value) {
      const result = validate(value);
      if (!result.valid) {
        if (result.isWarning) {
          setInternalWarning(result.message);
        } else {
          setInternalError(result.message);
          return;
        }
      }
    }
    
    // Validações por tipo
    if (value && type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        setInternalError('Formato de email inválido');
        return;
      }
    }
    
    if (value && type === 'tel') {
      const cleanPhone = value.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 13) {
        setInternalError('Telefone deve ter entre 10 e 13 dígitos');
        return;
      }
    }
    
    if (value && type === 'url') {
      try {
        new URL(value.startsWith('http') ? value : `https://${value}`);
      } catch {
        setInternalWarning('URL pode estar em formato inválido');
      }
    }
    
    // Se passou todas as validações e tem valor
    if (value) {
      setIsValid(true);
    }
  }, [value, touched, required, validate, type, label, showValidation]);

  const error = externalError || internalError;
  const warning = externalWarning || internalWarning;
  const showError = touched && error;
  const showWarning = touched && warning && !error;
  const showSuccess = touched && isValid && !error && !warning && value;

  const inputClasses = `
    w-full px-3 py-2 rounded-lg border text-sm transition-all outline-none
    ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' : 'bg-white dark:bg-gray-900'}
    ${showError ? 'border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900' : ''}
    ${showWarning ? 'border-yellow-500 focus:ring-2 focus:ring-yellow-200 dark:focus:ring-yellow-900' : ''}
    ${showSuccess ? 'border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900' : ''}
    ${!showError && !showWarning && !showSuccess ? 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900' : ''}
    text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
    ${className}
  `.trim();

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
          {...props}
        />
        
        {/* Ícone de status */}
        {showValidation && touched && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {showError && <AlertCircle size={16} className="text-red-500" />}
            {showWarning && <Info size={16} className="text-yellow-500" />}
            {showSuccess && <CheckCircle size={16} className="text-green-500" />}
          </div>
        )}
      </div>
      
      {/* Mensagens */}
      {showError && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
      {showWarning && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
          <Info size={12} /> {warning}
        </p>
      )}
      {hint && !showError && !showWarning && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  );
};

/**
 * Textarea com validação
 */
export const ValidatedTextarea = ({
  label,
  value = '',
  onChange,
  placeholder,
  required = false,
  validate,
  error: externalError,
  hint,
  disabled = false,
  rows = 3,
  maxLength,
  className = '',
  ...props
}) => {
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState('');

  useEffect(() => {
    if (!touched) return;
    setInternalError('');
    
    if (required && (!value || !value.trim())) {
      setInternalError(`${label || 'Este campo'} é obrigatório`);
      return;
    }
    
    if (validate && value) {
      const result = validate(value);
      if (!result.valid) {
        setInternalError(result.message);
      }
    }
  }, [value, touched, required, validate, label]);

  const error = externalError || internalError;
  const showError = touched && error;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={`
          w-full px-3 py-2 rounded-lg border text-sm transition-all outline-none resize-none
          ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' : 'bg-white dark:bg-gray-900'}
          ${showError ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}
          text-gray-900 dark:text-white placeholder-gray-400
          ${className}
        `}
        {...props}
      />
      
      <div className="flex justify-between items-center">
        {showError ? (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        ) : hint ? (
          <p className="text-xs text-gray-500">{hint}</p>
        ) : <span />}
        
        {maxLength && (
          <span className={`text-xs ${value.length > maxLength * 0.9 ? 'text-yellow-500' : 'text-gray-400'}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Select com validação
 */
export const ValidatedSelect = ({
  label,
  value = '',
  onChange,
  options = [],
  placeholder = 'Selecione...',
  required = false,
  error: externalError,
  disabled = false,
  className = '',
  ...props
}) => {
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState('');

  useEffect(() => {
    if (!touched) return;
    setInternalError('');
    
    if (required && !value) {
      setInternalError(`${label || 'Este campo'} é obrigatório`);
    }
  }, [value, touched, required, label]);

  const error = externalError || internalError;
  const showError = touched && error;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 rounded-lg border text-sm transition-all outline-none
          ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' : 'bg-white dark:bg-gray-900'}
          ${showError ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}
          text-gray-900 dark:text-white
          ${className}
        `}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value || opt} value={opt.value || opt}>
            {opt.label || opt}
          </option>
        ))}
      </select>
      
      {showError && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
};

/**
 * Resumo de validação do formulário
 */
export const ValidationSummary = ({ errors = {}, warnings = {}, className = '' }) => {
  const errorCount = Object.keys(errors).length;
  const warningCount = Object.keys(warnings).length;
  
  if (errorCount === 0 && warningCount === 0) return null;
  
  return (
    <div className={`rounded-lg p-4 space-y-3 ${className}`}>
      {errorCount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-medium mb-2">
            <AlertCircle size={16} />
            {errorCount} erro(s) encontrado(s)
          </div>
          <ul className="text-sm text-red-600 dark:text-red-400 space-y-1 ml-6">
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>• {message}</li>
            ))}
          </ul>
        </div>
      )}
      
      {warningCount > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 font-medium mb-2">
            <Info size={16} />
            {warningCount} aviso(s)
          </div>
          <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1 ml-6">
            {Object.entries(warnings).map(([field, message]) => (
              <li key={field}>• {message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ValidatedInput;




