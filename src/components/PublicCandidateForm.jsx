import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { validateCandidate, validateEmail, validatePhone, checkDuplicateEmail } from '../utils/validation';
import { normalizeCity, getMainCitiesOptions } from '../utils/cityNormalizer';
import { normalizeSource, getMainSourcesOptions } from '../utils/sourceNormalizer';
import { normalizeInterestAreasString, getMainInterestAreasOptions } from '../utils/interestAreaNormalizer';
import { validateBirthDate } from '../utils/validation';
import { Loader2, CheckCircle, AlertCircle, Send } from 'lucide-react';

const PublicCandidateForm = () => {
  const navigate = useNavigate();
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
    photoUrl: '',
    
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
    referral: '',
    salaryExpectation: '',
    canRelocate: '',
    references: '',
    typeOfApp: '',
    freeField: '',
    
    // Anexos
    cvUrl: '',
    portfolioUrl: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [existingCandidates, setExistingCandidates] = useState([]);

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

  // Calcular idade automaticamente quando data de nascimento muda
  useEffect(() => {
    if (formData.birthDate) {
      const birthResult = validateBirthDate(formData.birthDate);
      if (birthResult.valid && birthResult.age) {
        setFormData(prev => ({ ...prev, age: birthResult.age.toString() }));
      }
    }
  }, [formData.birthDate]);

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

  const validateForm = () => {
    const validation = validateCandidate(formData, {
      checkRequired: true,
      strictMode: false
    });

    // Verificar duplicata de email
    if (formData.email) {
      const duplicateCheck = checkDuplicateEmail(formData.email, existingCandidates);
      if (duplicateCheck.isDuplicate) {
        validation.valid = false;
        validation.errors.email = duplicateCheck.message;
      }
    }

    setErrors(validation.errors);
    return validation.valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll para o primeiro erro
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // Normalizar dados antes de enviar
      const normalizedData = {
        ...formData,
        city: formData.city ? normalizeCity(formData.city) : '',
        source: formData.source ? normalizeSource(formData.source) : 'Formulário Público',
        interestAreas: formData.interestAreas ? normalizeInterestAreasString(formData.interestAreas) : '',
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

      // Remover campos vazios
      Object.keys(normalizedData).forEach(key => {
        if (normalizedData[key] === '' || normalizedData[key] === null) {
          delete normalizedData[key];
        }
      });

      // Enviar para Firebase
      await addDoc(collection(db, 'candidates'), normalizedData);

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

  const mainCities = getMainCitiesOptions();
  const mainSources = getMainSourcesOptions();
  const mainInterestAreas = getMainInterestAreasOptions();

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Formulário Enviado com Sucesso!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Obrigado por se candidatar. Seu formulário foi recebido e será analisado pela nossa equipe.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Redirecionando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Cadastro de Candidatos
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Preencha o formulário abaixo para se candidatar às nossas vagas
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Campos marcados com <span className="text-red-500">*</span> são obrigatórios
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 space-y-8">
          {/* Erro geral */}
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-300 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Seção 1: Identificação e Contato */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              1. Identificação e Contato
            </h2>
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
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                  required
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
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
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email_secondary ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                />
                {errors.email_secondary && <p className="text-red-500 text-xs mt-1">{errors.email_secondary}</p>}
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
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                  required
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>
            </div>
          </section>

          {/* Seção 2: Dados Pessoais */}
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
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                <input
                  type="number"
                  name="childrenCount"
                  value={formData.childrenCount}
                  onChange={(e) => handleChange('childrenCount', e.target.value)}
                  min="0"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.childrenCount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                />
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Ex: Porto Alegre/RS"
                  list="cities-list"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.city ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                />
                <datalist id="cities-list">
                  {mainCities.map(city => (
                    <option key={city.id} value={city.name} />
                  ))}
                </datalist>
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL da Foto (opcional)
                </label>
                <input
                  type="url"
                  name="photoUrl"
                  value={formData.photoUrl}
                  onChange={(e) => handleChange('photoUrl', e.target.value)}
                  placeholder="https://exemplo.com/foto.jpg"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.photoUrl ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                />
                {errors.photoUrl && <p className="text-red-500 text-xs mt-1">{errors.photoUrl}</p>}
              </div>
            </div>
          </section>

          {/* Seção 3: Formação e Experiência */}
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data de Formatura
                </label>
                <input
                  type="date"
                  name="graduationDate"
                  value={formData.graduationDate}
                  onChange={(e) => handleChange('graduationDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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

          {/* Seção 4: Processo e Fit Cultural */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              4. Processo e Fit Cultural
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Onde nos Encontrou?
                </label>
                <input
                  type="text"
                  name="source"
                  value={formData.source}
                  onChange={(e) => handleChange('source', e.target.value)}
                  placeholder="Ex: LinkedIn, Facebook, Instagram..."
                  list="sources-list"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
                <datalist id="sources-list">
                  {mainSources.map(source => (
                    <option key={source.id} value={source.name} />
                  ))}
                </datalist>
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                />
              </div>
            </div>
          </section>

          {/* Seção 5: Anexos */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              5. Anexos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL do Currículo
                </label>
                <input
                  type="url"
                  name="cvUrl"
                  value={formData.cvUrl}
                  onChange={(e) => handleChange('cvUrl', e.target.value)}
                  placeholder="https://exemplo.com/curriculo.pdf"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.cvUrl ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                />
                {errors.cvUrl && <p className="text-red-500 text-xs mt-1">{errors.cvUrl}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL do Portfólio
                </label>
                <input
                  type="url"
                  name="portfolioUrl"
                  value={formData.portfolioUrl}
                  onChange={(e) => handleChange('portfolioUrl', e.target.value)}
                  placeholder="https://exemplo.com/portfolio"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.portfolioUrl ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                />
                {errors.portfolioUrl && <p className="text-red-500 text-xs mt-1">{errors.portfolioUrl}</p>}
              </div>
            </div>
          </section>

          {/* Botão de Envio */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicCandidateForm;
