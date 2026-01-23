import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, query, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { validateCandidate, validateEmail, validatePhone, checkDuplicateEmail } from '../utils/validation';
import { normalizeCity } from '../utils/cityNormalizer';
import { normalizeSource, getMainSourcesOptions } from '../utils/sourceNormalizer';
import { normalizeInterestAreasString, getMainInterestAreasOptions } from '../utils/interestAreaNormalizer';
import { validateBirthDate } from '../utils/validation';
import { getAllRSCities, searchRSCities } from '../utils/rsCities';
import { Loader2, CheckCircle, AlertCircle, Send, ChevronRight, ChevronLeft, Upload, Link as LinkIcon, FileText, X, Check, Info } from 'lucide-react';

const PublicCandidateForm = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  
  const [formData, setFormData] = useState({
    // Identificação e Contato
    fullName: '',
    email: '',
    email_secondary: '',
    phone: '',
    
    // Dados Pessoais
    birthDate: '',
    age: '',
    maritalStatus: '',
    childrenCount: '',
    hasLicense: '',
    city: '',
    cityCustom: '',
    photoUrl: '',
    photoFile: null,
    photoDriveUrl: '',
    photoType: 'url', // 'url', 'file', 'drive'
    
    // Formação e Experiência
    education: '',
    schoolingLevel: '',
    institution: '',
    graduationDate: '',
    isStudying: '',
    experience: '',
    courses: '',
    certifications: '',
    interestAreas: '',
    
    // Processo e Fit Cultural
    source: '',
    sourceCustom: '',
    referral: '',
    salaryExpectation: '',
    canRelocate: '',
    references: '',
    typeOfApp: '',
    freeField: '',
    
    // Anexos
    cvUrl: '',
    cvFile: null,
    cvDriveUrl: '',
    cvType: 'url', // 'url', 'file', 'drive'
    portfolioUrl: '',
    portfolioFile: null,
    portfolioDriveUrl: '',
    portfolioType: 'url' // 'url', 'file', 'drive'
  });

  const [errors, setErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({}); // Erros em tempo real
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [existingCandidates, setExistingCandidates] = useState([]);
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [showCityCustom, setShowCityCustom] = useState(false);
  const [showSourceCustom, setShowSourceCustom] = useState(false);
  const [filteredCities, setFilteredCities] = useState(getAllRSCities().slice(0, 50));
  
  const fileInputRefs = {
    photo: useRef(null),
    cv: useRef(null),
    portfolio: useRef(null)
  };

  // Carregar candidatos existentes para verificação de duplicatas
  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const q = query(collection(db, 'candidates'));
        const snapshot = await getDocs(q);
        const candidates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExistingCandidates(candidates);
      } catch (error) {
        console.error('Erro ao carregar candidatos:', error);
      }
    };
    loadCandidates();
  }, []);

  // Converter data de formato DD/MM/YYYY para YYYY-MM-DD
  const convertDateToISO = (dateStr) => {
    if (!dateStr) return '';
    
    // Se já está no formato YYYY-MM-DD, retorna como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Se está no formato DD/MM/YYYY, converte
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
        // Valida a data
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          return `${year}-${month}-${day}`;
        }
      }
    }
    
    // Tenta parsear como data válida
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return '';
  };

  // Buscar cidades quando termo de busca muda
  useEffect(() => {
    if (citySearchTerm.trim() === '') {
      setFilteredCities(getAllRSCities().slice(0, 50));
    } else {
      setFilteredCities(searchRSCities(citySearchTerm));
    }
  }, [citySearchTerm]);

  // Calcular idade automaticamente quando data de nascimento muda
  useEffect(() => {
    if (formData.birthDate) {
      // Converte para formato ISO se necessário
      const isoDate = convertDateToISO(formData.birthDate);
      if (isoDate) {
        const birthResult = validateBirthDate(isoDate);
        if (birthResult.valid && birthResult.age) {
          setFormData(prev => ({ ...prev, age: birthResult.age.toString() }));
        }
      }
    } else {
      setFormData(prev => ({ ...prev, age: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.birthDate]);

  // Validação em tempo real de email
  useEffect(() => {
    if (formData.email && formData.email.trim() !== '') {
      const emailResult = validateEmail(formData.email);
      if (!emailResult.valid) {
        setFieldErrors(prev => ({ ...prev, email: emailResult.message }));
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.email;
          return newErrors;
        });
      }
    } else {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
    }
  }, [formData.email]);

  // Validação em tempo real de telefone
  useEffect(() => {
    if (formData.phone && formData.phone.trim() !== '') {
      const phoneResult = validatePhone(formData.phone);
      if (!phoneResult.valid) {
        setFieldErrors(prev => ({ ...prev, phone: phoneResult.message }));
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.phone;
          return newErrors;
        });
      }
    } else {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
    }
  }, [formData.phone]);

  // Validação em tempo real de email secundário
  useEffect(() => {
    if (formData.email_secondary && formData.email_secondary.trim() !== '') {
      const emailResult = validateEmail(formData.email_secondary);
      if (!emailResult.valid) {
        setFieldErrors(prev => ({ ...prev, email_secondary: emailResult.message }));
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.email_secondary;
          return newErrors;
        });
      }
    } else {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.email_secondary;
        return newErrors;
      });
    }
  }, [formData.email_secondary]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Formatar data ao digitar (DD/MM/YYYY)
  const handleDateChange = (field, value) => {
    // Remove caracteres não numéricos
    let cleaned = value.replace(/\D/g, '');
    
    // Formata como DD/MM/YYYY
    if (cleaned.length > 2) {
      cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    if (cleaned.length > 5) {
      cleaned = cleaned.slice(0, 5) + '/' + cleaned.slice(5, 9);
    }
    
    // Atualiza apenas o campo de exibição (formato DD/MM/YYYY)
    setFormData(prev => ({ ...prev, [field]: cleaned }));
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Manipular upload de arquivo
  const handleFileChange = (field, file) => {
    if (!file) return;
    
    // Validação de tamanho (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setFieldErrors(prev => ({ 
        ...prev, 
        [field]: 'Arquivo muito grande. Tamanho máximo: 5MB' 
      }));
      return;
    }
    
    // Validação de formato
    const allowedTypes = {
      photo: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      cv: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      portfolio: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };
    
    const fieldType = field.includes('photo') ? 'photo' : field.includes('cv') ? 'cv' : 'portfolio';
    if (!allowedTypes[fieldType].includes(file.type)) {
      setFieldErrors(prev => ({ 
        ...prev, 
        [field]: `Formato inválido. Aceitos: ${fieldType === 'photo' ? 'JPG, PNG, WEBP' : 'PDF, DOC, DOCX'}` 
      }));
      return;
    }
    
    handleChange(field, file);
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const validateStep = (step) => {
    const stepErrors = {};
    
    switch(step) {
      case 1: // Identificação e Contato
        if (!formData.fullName || formData.fullName.trim() === '') {
          stepErrors.fullName = 'Nome completo é obrigatório';
        }
        if (!formData.email || formData.email.trim() === '') {
          stepErrors.email = 'E-mail é obrigatório';
        } else {
          const emailResult = validateEmail(formData.email);
          if (!emailResult.valid) {
            stepErrors.email = emailResult.message;
          }
        }
        if (!formData.phone || formData.phone.trim() === '') {
          stepErrors.phone = 'Telefone é obrigatório';
        } else {
          const phoneResult = validatePhone(formData.phone);
          if (!phoneResult.valid) {
            stepErrors.phone = phoneResult.message;
          }
        }
        break;
      case 2: // Dados Pessoais - sem campos obrigatórios
        break;
      case 3: // Formação e Experiência - sem campos obrigatórios
        break;
      case 4: // Processo e Fit Cultural - sem campos obrigatórios
        break;
      case 5: // Anexos - sem campos obrigatórios
        break;
    }
    
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      // Scroll para o primeiro erro
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const validateForm = () => {
    const validation = validateCandidate(formData, {
      checkRequired: true,
      strictMode: false
    });
    // Duplicata: não bloqueia mais; apenas exibimos aviso e permitimos continuar
    setErrors(validation.errors);
    return validation.valid;
  };

  // Detecta se o e-mail já está no Banco de Talentos (apenas para exibir aviso)
  const isExistingCandidate = formData.email?.trim() &&
    validateEmail(formData.email).valid &&
    checkDuplicateEmail(formData.email, existingCandidates).isDuplicate;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Rate limiting (Segurança Adicional - FIREBASE_SECURITY_FORM.md)
    const lastSubmit = localStorage.getItem('lastFormSubmit');
    if (lastSubmit) {
      const timeSinceLastSubmit = Date.now() - parseInt(lastSubmit, 10);
      if (timeSinceLastSubmit < 60000) {
        setErrors({ submit: 'Aguarde um momento antes de enviar novamente.' });
        return;
      }
    }

    if (!validateForm()) {
      setCurrentStep(1); // Volta para o primeiro passo se houver erro
      return;
    }

    setIsSubmitting(true);

    try {
      // Normalizar dados antes de enviar
      const normalizedData = {
        ...formData,
        city: showCityCustom && formData.cityCustom 
          ? normalizeCity(formData.cityCustom) 
          : formData.city 
            ? normalizeCity(formData.city) 
            : '',
        source: showSourceCustom && formData.sourceCustom
          ? normalizeSource(formData.sourceCustom)
          : formData.source
            ? normalizeSource(formData.source)
            : 'Formulário Público',
        interestAreas: formData.interestAreas ? normalizeInterestAreasString(formData.interestAreas) : '',
        birthDate: convertDateToISO(formData.birthDate),
        graduationDate: convertDateToISO(formData.graduationDate),
        // Limpar campos vazios
        email_secondary: formData.email_secondary || '',
        age: formData.age ? parseInt(formData.age) : null,
        childrenCount: formData.childrenCount ? parseInt(formData.childrenCount) : 0,
        // Metadados
        status: 'Inscrito',
        tags: ['Novo Inscrito', 'Formulário Público'],
        origin: 'public_form',
        createdBy: 'Formulário Público',
        original_timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      // Remover campos auxiliares e arquivos (por enquanto só URLs são salvas)
      delete normalizedData.cityCustom;
      delete normalizedData.sourceCustom;
      delete normalizedData.photoFile;
      delete normalizedData.cvFile;
      delete normalizedData.portfolioFile;
      delete normalizedData.photoType;
      delete normalizedData.cvType;
      delete normalizedData.portfolioType;
      delete normalizedData.photoDriveUrl;
      delete normalizedData.cvDriveUrl;
      delete normalizedData.portfolioDriveUrl;

      // Remover campos vazios
      Object.keys(normalizedData).forEach(key => {
        if (normalizedData[key] === '' || normalizedData[key] === null || normalizedData[key] === undefined) {
          delete normalizedData[key];
        }
      });

      // Enviar para Firebase
      await addDoc(collection(db, 'candidates'), normalizedData);

      localStorage.setItem('lastFormSubmit', Date.now().toString());
      setSubmitSuccess(true);
      
      // Redirecionar após 3 segundos
      setTimeout(() => {
        navigate('/apply/thank-you');
      }, 3000);

    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      setErrors({ submit: 'Erro ao enviar formulário. Por favor, tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const mainSources = getMainSourcesOptions();
  const mainInterestAreas = getMainInterestAreasOptions();

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 font-young">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <img src="/logo-young-empreendimentos.png" alt="Young Empreendimentos" className="h-12 w-auto mx-auto mb-4" />
          <CheckCircle className="w-16 h-16 text-young-orange mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Formulário Enviado com Sucesso!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Obrigado por se candidatar. Seu formulário foi recebido e será analisado pela nossa equipe.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Redirecionando...
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">© 2025 Young Empreendimentos</p>
        </div>
      </div>
    );
  }

  // Componente de progresso
  const ProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {[1, 2, 3, 4, 5].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step === currentStep 
                ? 'bg-young-orange border-young-orange text-white' 
                : step < currentStep 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
            }`}>
              {step < currentStep ? <Check size={20} /> : step}
            </div>
            {step < totalSteps && (
              <div className={`flex-1 h-1 mx-2 ${
                step < currentStep ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        Etapa {currentStep} de {totalSteps}
      </div>
    </div>
  );

  // Renderizar campo de anexo (foto, CV ou portfólio)
  const renderAttachmentField = (fieldName, label, type) => {
    const urlField = `${fieldName}Url`;
    const fileField = `${fieldName}File`;
    const driveField = `${fieldName}DriveUrl`;
    const typeField = `${fieldName}Type`;
    const currentType = formData[typeField] || 'url';
    
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
        
        {/* Seleção de tipo */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => handleChange(typeField, 'url')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentType === 'url'
                ? 'bg-young-orange text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <LinkIcon size={16} className="inline mr-1" />
            URL
          </button>
          <button
            type="button"
            onClick={() => handleChange(typeField, 'file')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentType === 'file'
                ? 'bg-young-orange text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Upload size={16} className="inline mr-1" />
            Anexar
          </button>
          <button
            type="button"
            onClick={() => handleChange(typeField, 'drive')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentType === 'drive'
                ? 'bg-young-orange text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <FileText size={16} className="inline mr-1" />
            Google Drive
          </button>
        </div>

        {/* Campo conforme tipo selecionado */}
        {currentType === 'url' && (
          <input
            type="url"
            name={urlField}
            value={formData[urlField] || ''}
            onChange={(e) => handleChange(urlField, e.target.value)}
            placeholder={`https://exemplo.com/${type === 'photo' ? 'foto.jpg' : type === 'cv' ? 'curriculo.pdf' : 'portfolio.pdf'}`}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange ${
              errors[urlField] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
          />
        )}
        
        {currentType === 'file' && (
          <div>
            <input
              ref={fileInputRefs[type]}
              type="file"
              accept={type === 'photo' ? 'image/jpeg,image/jpg,image/png,image/webp' : 'application/pdf,.doc,.docx'}
              onChange={(e) => handleFileChange(fileField, e.target.files[0])}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRefs[type].current?.click()}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-young-orange transition-colors text-gray-600 dark:text-gray-400"
            >
              {formData[fileField] ? (
                <span className="flex items-center justify-center gap-2">
                  <FileText size={16} />
                  {formData[fileField].name}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChange(fileField, null);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Upload size={16} />
                  Clique para selecionar arquivo
                </span>
              )}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {type === 'photo' ? 'Formatos: JPG, PNG, WEBP. Tamanho máximo: 5MB' : 'Formatos: PDF, DOC, DOCX. Tamanho máximo: 5MB'}
            </p>
          </div>
        )}
        
        {currentType === 'drive' && (
          <input
            type="url"
            name={driveField}
            value={formData[driveField] || ''}
            onChange={(e) => handleChange(driveField, e.target.value)}
            placeholder="Cole o link do Google Drive aqui"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange ${
              errors[driveField] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
          />
        )}
        
        {(errors[urlField] || errors[fileField] || errors[driveField] || fieldErrors[fileField]) && (
          <p className="text-red-500 text-xs mt-1">
            {errors[urlField] || errors[fileField] || errors[driveField] || fieldErrors[fileField]}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4 font-young">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src="/logo-young-empreendimentos.png" alt="Young Empreendimentos" className="h-14 w-auto" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Banco de Talentos - Young Empreendimentos
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg mb-4">
            Neste prático questionário, você vai preencher algumas informações básicas para nós da Young Empreendimentos conhecermos um pouco mais de você e direcioná-lo para as vagas do seu interesse. Será um prazer conhecê-lo!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Campos marcados com <span className="text-red-500">*</span> são obrigatórios
          </p>
        </div>

        {/* Progress Bar */}
        <ProgressBar />

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8">
          {/* Erro geral */}
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-300 text-sm">{errors.submit}</p>
            </div>
          )}

          {isExistingCandidate && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3 mb-6">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                Você já faz parte do nosso Banco de Talentos. Pode continuar mesmo assim para atualizar suas informações.
              </p>
            </div>
          )}

          {/* Step 1: Identificação e Contato */}
          {currentStep === 1 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                1. Identificação e Contato
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                Vamos começar pelas suas informações pessoais.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange ${
                      errors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                    required
                  />
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    E-mail Principal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange ${
                      errors.email || fieldErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                    required
                  />
                  {(errors.email || fieldErrors.email) && (
                    <p className="text-red-500 text-xs mt-1">{errors.email || fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    E-mail Secundário
                  </label>
                  <input
                    type="email"
                    name="email_secondary"
                    value={formData.email_secondary}
                    onChange={(e) => handleChange('email_secondary', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange ${
                      errors.email_secondary || fieldErrors.email_secondary ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                  />
                  {(errors.email_secondary || fieldErrors.email_secondary) && (
                    <p className="text-red-500 text-xs mt-1">{errors.email_secondary || fieldErrors.email_secondary}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone/WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(51) 99999-9999"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange ${
                      errors.phone || fieldErrors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                    required
                  />
                  {(errors.phone || fieldErrors.phone) && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone || fieldErrors.phone}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Step 2: Dados Pessoais */}
          {currentStep === 2 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                2. Dados Pessoais
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="text"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={(e) => handleDateChange('birthDate', e.target.value)}
                    placeholder="DD/MM/AAAA"
                    maxLength="10"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange ${
                      errors.birthDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                  />
                  {errors.birthDate && <p className="text-red-500 text-xs mt-1">{errors.birthDate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Idade
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Calculada automaticamente</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estado Civil
                  </label>
                  <select
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={(e) => handleChange('maritalStatus', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                    <option value="União Estável">União Estável</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantidade de Filhos
                  </label>
                  <select
                    name="childrenCount"
                    value={formData.childrenCount}
                    onChange={(e) => handleChange('childrenCount', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange ${
                      errors.childrenCount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                  >
                    <option value="">Selecione...</option>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                    <option value="11+">11 ou mais</option>
                  </select>
                  {errors.childrenCount && <p className="text-red-500 text-xs mt-1">{errors.childrenCount}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Possui CNH Tipo B?
                  </label>
                  <select
                    name="hasLicense"
                    value={formData.hasLicense}
                    onChange={(e) => handleChange('hasLicense', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cidade onde Reside
                  </label>
                  <div className="space-y-2">
                    {!showCityCustom ? (
                      <>
                        <input
                          type="text"
                          name="city"
                          value={citySearchTerm}
                          onChange={(e) => {
                            setCitySearchTerm(e.target.value);
                            handleChange('city', e.target.value);
                          }}
                          placeholder="Digite para buscar..."
                          list="cities-list"
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange ${
                            errors.city ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                          } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                        />
                        <datalist id="cities-list">
                          {filteredCities.map((city, idx) => (
                            <option key={idx} value={city} />
                          ))}
                        </datalist>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCityCustom(true);
                            setCitySearchTerm('');
                            handleChange('city', '');
                          }}
                          className="text-sm text-young-orange hover:underline"
                        >
                          + Adicionar outra cidade
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          name="cityCustom"
                          value={formData.cityCustom}
                          onChange={(e) => handleChange('cityCustom', e.target.value)}
                          placeholder="Digite o nome da cidade"
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange ${
                            errors.cityCustom ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                          } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCityCustom(false);
                            handleChange('cityCustom', '');
                          }}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                        >
                          ← Voltar para lista
                        </button>
                      </>
                    )}
                  </div>
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                </div>

                <div className="md:col-span-2">
                  {renderAttachmentField('photo', 'Foto (opcional)', 'photo')}
                </div>
              </div>
            </section>
          )}

          {/* Step 3: Formação e Experiência */}
          {currentStep === 3 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                3. Formação e Experiência
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Formação
                  </label>
                  <input
                    type="text"
                    name="education"
                    value={formData.education}
                    onChange={(e) => handleChange('education', e.target.value)}
                    placeholder="Ex: Engenharia de Software"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nível de Escolaridade
                  </label>
                  <select
                    name="schoolingLevel"
                    value={formData.schoolingLevel}
                    onChange={(e) => handleChange('schoolingLevel', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="Ensino Fundamental">Ensino Fundamental</option>
                    <option value="Ensino Médio">Ensino Médio</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Superior Incompleto">Superior Incompleto</option>
                    <option value="Superior Completo">Superior Completo</option>
                    <option value="Pós-Graduação">Pós-Graduação</option>
                    <option value="Mestrado">Mestrado</option>
                    <option value="Doutorado">Doutorado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Instituição de Ensino
                  </label>
                  <input
                    type="text"
                    name="institution"
                    value={formData.institution}
                    onChange={(e) => handleChange('institution', e.target.value)}
                    placeholder="Ex: Universidade Federal do Rio Grande do Sul"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data de Formatura
                  </label>
                  <input
                    type="text"
                    name="graduationDate"
                    value={formData.graduationDate}
                    onChange={(e) => handleDateChange('graduationDate', e.target.value)}
                    placeholder="DD/MM/AAAA"
                    maxLength="10"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Está Cursando Atualmente?
                  </label>
                  <select
                    name="isStudying"
                    value={formData.isStudying}
                    onChange={(e) => handleChange('isStudying', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Experiências Anteriores
                  </label>
                  <textarea
                    name="experience"
                    value={formData.experience}
                    onChange={(e) => handleChange('experience', e.target.value)}
                    rows="4"
                    placeholder="Descreva suas experiências profissionais anteriores..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cursos e Certificações Profissionais
                  </label>
                  <textarea
                    name="courses"
                    value={formData.courses}
                    onChange={(e) => handleChange('courses', e.target.value)}
                    rows="3"
                    placeholder="Liste seus cursos e certificações..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Certificações Profissionais
                  </label>
                  <input
                    type="text"
                    name="certifications"
                    value={formData.certifications}
                    onChange={(e) => handleChange('certifications', e.target.value)}
                    placeholder="Ex: AWS Certified Cloud Practitioner"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Áreas de Interesse Profissional
                  </label>
                  <input
                    type="text"
                    name="interestAreas"
                    value={formData.interestAreas}
                    onChange={(e) => handleChange('interestAreas', e.target.value)}
                    placeholder="Ex: Desenvolvimento Web, Cloud Computing, DevOps (separadas por vírgula)"
                    list="interest-areas-list"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  <datalist id="interest-areas-list">
                    {mainInterestAreas.map(area => (
                      <option key={area.id} value={area.name} />
                    ))}
                  </datalist>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Separe múltiplas áreas por vírgula
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Step 4: Processo e Fit Cultural */}
          {currentStep === 4 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                4. Processo e Fit Cultural
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Onde nos Encontrou?
                  </label>
                  {!showSourceCustom ? (
                    <>
                      <select
                        name="source"
                        value={formData.source}
                        onChange={(e) => {
                          if (e.target.value === 'outro') {
                            setShowSourceCustom(true);
                            handleChange('source', '');
                          } else {
                            handleChange('source', e.target.value);
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      >
                        <option value="">Selecione...</option>
                        {mainSources.map(source => (
                          <option key={source.id} value={source.name}>{source.name}</option>
                        ))}
                        <option value="outro">Outro (especifique)</option>
                      </select>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        name="sourceCustom"
                        value={formData.sourceCustom}
                        onChange={(e) => handleChange('sourceCustom', e.target.value)}
                        placeholder="Especifique onde nos encontrou"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowSourceCustom(false);
                          handleChange('sourceCustom', '');
                        }}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:underline mt-1"
                      >
                        ← Voltar para lista
                      </button>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Foi Indicado por Colaborador?
                  </label>
                  <input
                    type="text"
                    name="referral"
                    value={formData.referral}
                    onChange={(e) => handleChange('referral', e.target.value)}
                    placeholder="Nome do colaborador (se aplicável)"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expectativa Salarial
                  </label>
                  <input
                    type="text"
                    name="salaryExpectation"
                    value={formData.salaryExpectation}
                    onChange={(e) => handleChange('salaryExpectation', e.target.value)}
                    placeholder="Ex: R$ 8.000,00"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Disponibilidade para Mudança de Cidade?
                  </label>
                  <select
                    name="canRelocate"
                    value={formData.canRelocate}
                    onChange={(e) => handleChange('canRelocate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                    <option value="Talvez">Talvez</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Referências Profissionais
                  </label>
                  <textarea
                    name="references"
                    value={formData.references}
                    onChange={(e) => handleChange('references', e.target.value)}
                    rows="3"
                    placeholder="Nome, cargo, empresa e contato..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Candidatura
                  </label>
                  <select
                    name="typeOfApp"
                    value={formData.typeOfApp}
                    onChange={(e) => handleChange('typeOfApp', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="Vaga Específica">Vaga Específica</option>
                    <option value="Banco de Talentos">Banco de Talentos</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Campo Livre - SEJA VOCÊ!
                  </label>
                  <textarea
                    name="freeField"
                    value={formData.freeField}
                    onChange={(e) => handleChange('freeField', e.target.value)}
                    rows="4"
                    placeholder="Conte-nos sobre você, suas paixões, objetivos e o que te motiva..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-young-orange focus:border-young-orange bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Step 5: Anexos */}
          {currentStep === 5 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                5. Anexos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderAttachmentField('cv', 'Currículo', 'cv')}
                {renderAttachmentField('portfolio', 'Portfólio', 'portfolio')}
              </div>
            </section>
          )}

          {/* Navegação entre etapas */}
          <div className="flex justify-between gap-4 pt-6 mt-8 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={currentStep === 1 ? () => navigate('/') : handlePrevious}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <ChevronLeft size={20} />
              {currentStep === 1 ? 'Cancelar' : 'Anterior'}
            </button>
            
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-young-orange hover:bg-young-orange-hover text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                Próximo
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-young-orange hover:bg-young-orange-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Formulário
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-8 text-center">© 2025 Young Empreendimentos</p>
      </div>
    </div>
  );
};

export default PublicCandidateForm;
