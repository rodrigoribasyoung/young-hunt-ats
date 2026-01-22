import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Briefcase, Settings, Plus, Search, 
  FileText, MapPin, Filter, Trophy, Menu, X, LogOut, Loader2, Edit3, Trash2,
  Building2, Mail, Check, Ban, UserMinus, CheckSquare, Square, Kanban, List,
  CalendarCheck, AlertCircle, UserPlus, Moon, Sun, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ExternalLink,
  MessageSquare, History, ArrowRight, Palette, Copy, Info, BarChart3, HelpCircle, Clock
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

// Firebase Imports
import { auth, db } from "./firebase";
import { 
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut 
} from "firebase/auth";
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, serverTimestamp, query, orderBy, writeBatch, getDocs 
} from "firebase/firestore";

// Component Imports
import TransitionModal from './components/modals/TransitionModal';
import SettingsPage from './components/SettingsPage';
import InterviewModal from './components/modals/InterviewModal';
import CsvImportModal from './components/modals/CsvImportModal';
import JobCandidatesModal from './components/modals/JobsCandidateModal';
import DashboardCandidatesModal from './components/modals/DashboardCandidatesModal';
import ApplicationsPage from './components/ApplicationsPage';
import ReportsPage from './components/ReportsPage';
import HelpPage from './components/HelpPage';
import CandidateProfilePage from './components/CandidateProfilePage';
import DiagnosticPage from './components/DiagnosticPage';
import PublicCandidateForm from './components/PublicCandidateForm';
import ThankYouPage from './components/ThankYouPage';
import { useTheme } from './ThemeContext';

import { PIPELINE_STAGES, STATUS_COLORS, JOB_STATUSES, CSV_FIELD_MAPPING_OPTIONS, ALL_STATUSES, CLOSING_STATUSES, STAGE_REQUIRED_FIELDS, CANDIDATE_FIELDS, getFieldDisplayName, REJECTION_REASONS } from './constants';
import { getTimestampSeconds, getCandidateTimestamp } from './utils/timestampUtils';
import { validateCandidate, validateEmail, validatePhone, checkDuplicateEmail, formatValidationErrors } from './utils/validation';
import { normalizeCity, getMainCitiesOptions } from './utils/cityNormalizer';
import { normalizeSource, getMainSourcesOptions } from './utils/sourceNormalizer';
import { normalizeInterestArea, normalizeInterestAreasString, getMainInterestAreasOptions } from './utils/interestAreaNormalizer';
import { calculateMatchScore, findMatchingJobs, findMatchingCandidates, getMatchBadgeColor, getMatchBadgeText } from './utils/matching';

// Material Design Colors (Google)
const MATERIAL_COLORS = [
  '#4285F4', // Google Blue
  '#34A853', // Google Green
  '#FBBC04', // Google Yellow
  '#EA4335', // Google Red
  '#9C27B0', // Purple
  '#FF9800', // Orange
  '#00BCD4', // Cyan
  '#E91E63', // Pink
  '#3F51B5', // Indigo
  '#009688', // Teal
];

const COLORS = MATERIAL_COLORS;

// --- COMPONENTES AUXILIARES ---

// Dashboard com Gráficos
const Dashboard = ({ 
  filteredJobs, 
  filteredCandidates, 
  onOpenCandidates, 
  statusMovements = [], 
  applications: applicationsProp = [], 
  onViewJob, 
  interviews = [], 
  onScheduleInterview 
}) => {
  // Garante que sempre exista uma variável local `applications`
  const applications = applicationsProp || [];
  const [periodFilter, setPeriodFilter] = useState('today'); // Filtro de período para gráficos (padrão: Hoje)
  const [showCustomPeriod, setShowCustomPeriod] = useState(false);
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  
  // Filtrar candidatos por período para scorecards (usa getCandidateTimestamp: original_timestamp prioridade, depois createdAt)
  const filteredCandidatesByPeriod = useMemo(() => {
    if (periodFilter === 'all') return filteredCandidates;
    if (periodFilter === 'custom' && customDateStart && customDateEnd) {
      const startDate = new Date(customDateStart).getTime() / 1000;
      const endDate = new Date(customDateEnd).getTime() / 1000 + 86400;
      return filteredCandidates.filter(c => {
        const ts = getCandidateTimestamp(c);
        if (!ts) return false;
        return ts >= startDate && ts <= endDate;
      });
    }
    
    const now = Date.now() / 1000;
    const periods = {
      'today': 1 * 24 * 60 * 60,
      '7d': 7 * 24 * 60 * 60,
      '30d': 30 * 24 * 60 * 60,
      '90d': 90 * 24 * 60 * 60
    };
    
    const cutoff = now - (periods[periodFilter] || 0);
    
    return filteredCandidates.filter(c => {
      const ts = getCandidateTimestamp(c);
      if (!ts) return false;
      return ts >= cutoff;
    });
  }, [filteredCandidates, periodFilter, customDateStart, customDateEnd]);

  // Filtrar statusMovements por período
  const filteredMovements = useMemo(() => {
    if (!periodFilter || periodFilter === 'all') return statusMovements;
    if (periodFilter === 'custom' && customDateStart && customDateEnd) {
      const startDate = new Date(customDateStart).getTime();
      const endDate = new Date(customDateEnd).getTime() + 86400000;
      return statusMovements.filter(m => {
        const ts = m.timestamp?.seconds || m.timestamp?._seconds || 0;
        const timestampMs = ts * 1000;
        return timestampMs >= startDate && timestampMs <= endDate;
      });
    }
    
    const now = Date.now();
    const periods = {
      'today': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };
    
    const cutoff = now - (periods[periodFilter] || 0);
    
    return statusMovements.filter(m => {
      const ts = m.timestamp?.seconds || m.timestamp?._seconds || 0;
      return ts * 1000 >= cutoff;
    });
  }, [statusMovements, periodFilter, customDateStart, customDateEnd]);
  
  // Próximas entrevistas (apenas futuras e não canceladas)
  const upcomingInterviews = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return interviews
      .filter(i => {
        if (i.status === 'Cancelada' || i.status === 'Realizada') return false;
        const interviewDate = new Date(i.date);
        return interviewDate >= today;
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
      })
      .slice(0, 5); // Mostrar apenas as 5 próximas
  }, [interviews]);
  // Dados para gráficos - ordenados por status do pipeline (usando candidatos filtrados por período)
  const statusData = useMemo(() => {
    const counts = {};
    PIPELINE_STAGES.forEach(stage => {
      counts[stage] = filteredCandidatesByPeriod.filter(c => (c.status || 'Inscrito') === stage).length;
    });
    counts['Contratado'] = filteredCandidatesByPeriod.filter(c => c.status === 'Contratado').length;
    counts['Reprovado'] = filteredCandidatesByPeriod.filter(c => c.status === 'Reprovado').length;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredCandidatesByPeriod]);

  // Calcular taxas de conversão BASEADAS NAS MOVIMENTAÇÕES REAIS
  // Conta quantos candidatos fizeram a transição de uma etapa para outra
  const conversionRates = useMemo(() => {
    const stages = [...PIPELINE_STAGES, 'Contratado'];
    const rates = [];
    
    // Se temos movimentações registradas, usa elas para calcular (com filtro de período)
    if (filteredMovements.length > 0) {
      for (let i = 0; i < stages.length - 1; i++) {
        const fromStage = stages[i];
        const toStage = stages[i + 1];
        
        // Conta movimentações que SAÍRAM desta etapa (filtradas por período)
        const movedFrom = filteredMovements.filter(m => m.previousStatus === fromStage).length;
        // Conta movimentações que foram PARA a próxima etapa (filtradas por período)
        const movedTo = filteredMovements.filter(m => m.previousStatus === fromStage && m.newStatus === toStage).length;
        
        // Também considera os que estão atualmente nesta etapa (usando candidatos filtrados por período)
        const currentInStage = filteredCandidatesByPeriod.filter(c => (c.status || 'Inscrito') === fromStage).length;
        const totalPassed = movedFrom + currentInStage;
        
        const rate = totalPassed > 0 ? ((movedTo / totalPassed) * 100).toFixed(1) : 0;
        
        rates.push({
          from: fromStage,
          to: toStage,
          rate: parseFloat(rate),
          fromCount: totalPassed,
          toCount: movedTo,
          hasMovements: true
        });
      }
    } else {
      // Fallback: cálculo simplificado baseado no status atual (menos preciso)
      for (let i = 0; i < stages.length - 1; i++) {
        const current = filteredCandidatesByPeriod.filter(c => c.status === stages[i]).length;
        const next = filteredCandidatesByPeriod.filter(c => c.status === stages[i + 1]).length;
        const rate = current > 0 ? ((next / current) * 100).toFixed(1) : 0;
        rates.push({
          from: stages[i],
          to: stages[i + 1],
          rate: parseFloat(rate),
          fromCount: current,
          toCount: next,
          hasMovements: false
        });
      }
    }
    return rates;
  }, [filteredCandidatesByPeriod, filteredMovements]);

  // Total de movimentações registradas (para mostrar indicador)
  const totalMovements = filteredMovements.length;

  // Dados com taxas de conversão para o gráfico de status
  const statusDataWithConversion = useMemo(() => {
    return statusData.map((item, index) => {
      const conversionRate = conversionRates.find(r => r.from === item.name);
      return {
        ...item,
        conversion: conversionRate ? `${conversionRate.rate}%` : null,
        conversionValue: conversionRate ? conversionRate.rate : null
      };
    });
  }, [statusData, conversionRates]);

  const areaData = useMemo(() => {
    const areas = {};
    // Usar filteredCandidates quando período é 'all' ou quando não há dados no período filtrado
    const candidatesToUse = periodFilter === 'all' || filteredCandidatesByPeriod.length === 0 
      ? filteredCandidates 
      : filteredCandidatesByPeriod;
    candidatesToUse.forEach(c => {
      if (c.interestAreas) {
        // Dividir áreas por vírgula e contar individualmente
        const areasList = c.interestAreas.split(',').map(a => a.trim()).filter(a => a);
        areasList.forEach(area => {
          areas[area] = (areas[area] || 0) + 1;
        });
      }
    });
    const total = candidatesToUse.length;
    return Object.entries(areas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ 
        name, 
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : 0
      }));
  }, [filteredCandidatesByPeriod, filteredCandidates, periodFilter]);

  // Cidades ordenadas do maior para o menor
  const cityData = useMemo(() => {
    const cities = {};
    // Usar filteredCandidates quando período é 'all' ou quando não há dados no período filtrado
    const candidatesToUse = periodFilter === 'all' || filteredCandidatesByPeriod.length === 0 
      ? filteredCandidates 
      : filteredCandidatesByPeriod;
    candidatesToUse.forEach(c => {
      if (c.city) {
        cities[c.city] = (cities[c.city] || 0) + 1;
      }
    });
    return Object.entries(cities)
      .sort((a, b) => b[1] - a[1]) // Ordenar do maior para o menor
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [filteredCandidatesByPeriod, filteredCandidates, periodFilter]);

  const originData = useMemo(() => {
    const origins = {};
    // Usar filteredCandidates quando período é 'all' ou quando não há dados no período filtrado
    const candidatesToUse = periodFilter === 'all' || filteredCandidatesByPeriod.length === 0 
      ? filteredCandidates 
      : filteredCandidatesByPeriod;
    candidatesToUse.forEach(c => {
      if (c.source) origins[c.source] = (origins[c.source] || 0) + 1;
    });
    const total = candidatesToUse.length;
    return Object.entries(origins)
      .sort((a, b) => b[1] - a[1])
      .slice(0,5)
      .map(([name, value]) => ({ 
        name, 
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : 0
      }));
  }, [filteredCandidatesByPeriod, filteredCandidates, periodFilter]);

  const missingReturnCount = useMemo(() => {
    return filteredCandidatesByPeriod.filter(c => {
      const isSelectionStage = c.status === 'Seleção' || c.status === 'Selecionado';
      const needsReturn = !c.returnSent || c.returnSent === 'Pendente' || c.returnSent === 'Não';
      return isSelectionStage && needsReturn;
    }).length;
  }, [filteredCandidates]);

  const jobStats = {
    open: filteredJobs.filter(j => j.status === 'Aberta').length,
    filled: filteredJobs.filter(j => j.status === 'Preenchida').length,
    closed: filteredJobs.filter(j => j.status === 'Fechada').length,
  };

  const candidateStats = {
    total: filteredCandidatesByPeriod.length,
    hired: filteredCandidatesByPeriod.filter(c => c.status === 'Contratado').length,
    rejected: filteredCandidatesByPeriod.filter(c => c.status === 'Reprovado').length,
    active: filteredCandidatesByPeriod.filter(c => PIPELINE_STAGES.includes(c.status || 'Inscrito')).length,
  };

  // Taxa de conversão geral (Inscrito -> Contratado)
  const overallConversionRate = candidateStats.total > 0 
    ? ((candidateStats.hired / candidateStats.total) * 100).toFixed(1) 
    : 0;

  // Label customizado para donut - apenas número e %
  const renderDonutLabel = ({ value, percentage }) => {
    return `${value} (${percentage}%)`;
  };

  // Tooltip customizado com melhor contraste para light e dark mode
  const tooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)', // slate-900 com opacidade
    border: '2px solid #3b82f6', // blue-500
    borderRadius: '8px', 
    color: '#f1f5f9', // slate-100 - texto claro
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '500'
  };

  // Estados para controlar visibilidade das séries (legendas clicáveis)
  const [visibleAreaSeries, setVisibleAreaSeries] = useState(new Set());
  const [visibleOriginSeries, setVisibleOriginSeries] = useState(new Set());

  // Função para gerar gradientes SVG
  const generateGradient = (id, color1, color2) => {
    return (
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color1} stopOpacity={1} />
          <stop offset="100%" stopColor={color2} stopOpacity={1} />
        </linearGradient>
      </defs>
    );
  };

  // Função para obter cor com gradiente ou sólida
  const getGradientColor = (baseColor, index) => {
    const gradients = {
      '#4285F4': ['#4285F4', '#1a56db'], // Blue
      '#34A853': ['#34A853', '#15803d'], // Green
      '#FBBC04': ['#FBBC04', '#d97706'], // Yellow
      '#EA4335': ['#EA4335', '#dc2626'], // Red
      '#00BCD4': ['#00BCD4', '#0891b2'], // Cyan
      '#9C27B0': ['#9C27B0', '#7c3aed'], // Purple
    };
    const [light, dark] = gradients[baseColor] || [baseColor, baseColor];
    return `url(#gradient-${index})`;
  };

  return (
    <div className="text-gray-900 dark:text-white space-y-6 overflow-y-auto h-full pb-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Período:</label>
          <select
            value={periodFilter}
            onChange={e => {
              const value = e.target.value;
              setPeriodFilter(value);
              setShowCustomPeriod(value === 'custom');
              if (value !== 'custom') {
                setCustomDateStart('');
                setCustomDateEnd('');
              }
            }}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="today">Hoje</option>
            <option value="all">Todo o período</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="custom">Período personalizado</option>
          </select>
          {showCustomPeriod && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDateStart}
                onChange={e => setCustomDateStart(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
                placeholder="Data inicial"
              />
              <span className="text-gray-600 dark:text-gray-400">até</span>
              <input
                type="date"
                value={customDateEnd}
                onChange={e => setCustomDateEnd(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
                placeholder="Data final"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* KPIs Principais - Material Design Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => onOpenCandidates && onOpenCandidates(filteredCandidates)} className="cursor-pointer bg-gradient-to-br from-[#4285F4]/20 to-[#4285F4]/10 p-6 rounded-xl border border-[#4285F4]/30 hover:scale-[1.01] transition-transform shadow-lg hover:shadow-[#4285F4]/20">
          <h3 className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Total de Candidatos</h3>
          <p className="text-3xl font-bold text-[#4285F4] mt-2">{candidateStats.total}</p>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">{candidateStats.active} em processo</p>
        </div>
        <div onClick={() => onOpenCandidates && onOpenCandidates(filteredCandidates.filter(c=>c.status==='Contratado'))} className="cursor-pointer bg-gradient-to-br from-[#34A853]/20 to-[#34A853]/10 p-6 rounded-xl border border-[#34A853]/30 hover:scale-[1.01] transition-transform shadow-lg hover:shadow-[#34A853]/20">
          <h3 className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Contratados</h3>
          <p className="text-3xl font-bold text-[#34A853] mt-2">{candidateStats.hired}</p>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Taxa geral: {overallConversionRate}%</p>
        </div>
        <div onClick={() => onOpenCandidates && onOpenCandidates(filteredJobs.filter(j=>j.status==='Aberta').flatMap(j=>filteredCandidates.filter(c=>c.jobId===j.id)))} className="cursor-pointer bg-gradient-to-br from-[#FBBC04]/20 to-[#FBBC04]/10 p-6 rounded-xl border border-[#FBBC04]/30 hover:scale-[1.01] transition-transform shadow-lg hover:shadow-[#FBBC04]/20">
          <h3 className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Vagas Abertas</h3>
          <p className="text-3xl font-bold text-[#FBBC04] mt-2">{jobStats.open}</p>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">{jobStats.filled} preenchidas</p>
        </div>
        <div onClick={() => onOpenCandidates && onOpenCandidates(filteredCandidates.filter(c=>c.status==='Reprovado'))} className="cursor-pointer bg-gradient-to-br from-[#EA4335]/20 to-[#EA4335]/10 p-6 rounded-xl border border-[#EA4335]/30 hover:scale-[1.01] transition-transform shadow-lg hover:shadow-[#EA4335]/20">
          <h3 className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Reprovados</h3>
          <p className="text-3xl font-bold text-[#EA4335] mt-2">{candidateStats.rejected}</p>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Taxa: {candidateStats.total > 0 ? ((candidateStats.rejected / candidateStats.total) * 100).toFixed(1) : 0}%</p>
        </div>
        </div>

      {/* Taxas de Conversão entre Etapas */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Taxas de Conversão por Etapa</h3>
          <div className={`text-xs px-2 py-1 rounded ${totalMovements > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
            {totalMovements > 0 ? (
              <span className="flex items-center gap-1">
                <Check size={12}/> Baseado em {totalMovements} movimentações reais
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertCircle size={12}/> Dados estimados (mova candidatos para gerar histórico)
              </span>
            )}
      </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {conversionRates.map((rate, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
              <span className="text-xs text-gray-600 dark:text-gray-300">{rate.from}</span>
              <ArrowRight size={12} className="text-gray-400"/>
              <span className="text-xs text-gray-600 dark:text-gray-300">{rate.to}</span>
              <span className={`text-sm font-bold ${rate.rate >= 50 ? 'text-green-500' : rate.rate >= 25 ? 'text-yellow-500' : 'text-red-500'}`}>
                {rate.rate}%
              </span>
              <span className="text-xs text-gray-500">({rate.toCount}/{rate.fromCount})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Card rápido: falta dar retorno */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div onClick={() => {
          if (onOpenCandidates) {
            setDashboardModalTitle('Faltam dar retorno');
            onOpenCandidates(filteredCandidates.filter(c => {
              const isSelectionStage = c.status === 'Seleção' || c.status === 'Selecionado';
              const needsReturn = !c.returnSent || c.returnSent === 'Pendente' || c.returnSent === 'Não';
              return isSelectionStage && needsReturn;
            }));
          }
        }} className="cursor-pointer bg-gradient-to-br from-[#9C27B0]/20 to-[#9C27B0]/10 p-4 rounded-xl border border-[#9C27B0]/30 hover:scale-[1.01] transition-transform shadow-lg hover:shadow-[#9C27B0]/20">
          <div className="text-gray-700 dark:text-gray-300 text-sm">Faltam dar retorno</div>
          <div className="text-2xl font-bold text-[#9C27B0] mt-2">{missingReturnCount}</div>
          <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">Candidatos selecionados sem confirmação</div>
        </div>
      </div>

      {/* Próximas Entrevistas */}
      {upcomingInterviews.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CalendarCheck className="text-purple-500" size={20}/> Próximas Entrevistas
          </h3>
          <div className="space-y-3">
            {upcomingInterviews.map(interview => {
              const interviewDate = new Date(interview.date);
              const isToday = interviewDate.toDateString() === new Date().toDateString();
              const isTomorrow = interviewDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
              
              return (
                <div 
                  key={interview.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    isToday 
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700' 
                      : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center ${
                      isToday ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      <span className="text-xs font-medium">
                        {interviewDate.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase()}
                      </span>
                      <span className="text-lg font-bold">{interviewDate.getDate()}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {interview.candidateName}
                        {isToday && <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-0.5 rounded">HOJE</span>}
                        {isTomorrow && <span className="ml-2 text-xs bg-yellow-500 text-white px-2 py-0.5 rounded">AMANHÃ</span>}
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {interview.type} {interview.jobTitle && `• ${interview.jobTitle}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 dark:text-white">{interview.time}</div>
                    <div className="text-xs text-gray-500">
                      {interview.isOnline ? 'Online' : `${interview.location || 'Presencial'}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vagas com Candidaturas */}
      {applications.length > 0 && filteredJobs.filter(j => j.status === 'Aberta').length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Vagas Abertas - Candidaturas</h3>
          <div className="space-y-3">
            {filteredJobs.filter(j => j.status === 'Aberta').map(job => {
              const jobApps = applications.filter(a => a.jobId === job.id);
              const hired = jobApps.filter(a => a.status === 'Contratado').length;
              const inProcess = jobApps.filter(a => PIPELINE_STAGES.includes(a.status)).length;
              const rejected = jobApps.filter(a => a.status === 'Reprovado').length;
              
              return (
                <div 
                  key={job.id} 
                  onClick={() => onViewJob && onViewJob(job)}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 cursor-pointer transition-colors"
                >
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{job.title}</h4>
                    <p className="text-xs text-gray-500">{job.company} {job.city && `• ${job.city}`}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{jobApps.length}</div>
                      <div className="text-xs text-gray-500">total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-600">{inProcess}</div>
                      <div className="text-xs text-gray-500">em processo</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{hired}</div>
                      <div className="text-xs text-gray-500">contratados</div>
                    </div>
                    {rejected > 0 && (
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-500">{rejected}</div>
                        <div className="text-xs text-gray-500">reprovados</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6">
        {/* Distribuição por Status com Taxa de Conversão */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Distribuição por Status (com Taxa de Conversão)</h3>
          {statusData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={statusDataWithConversion} layout="vertical" margin={{ top: 5, right: 80, left: 180, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradient-status" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#4285F4" stopOpacity={1} />
                    <stop offset="100%" stopColor="#1a56db" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" width={170} tick={{ fontSize: 12 }}/>
                <Tooltip 
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                  formatter={(value, name, props) => {
                    const conv = props.payload.conversion;
                    return [
                      <span key="v">{value} candidatos{conv ? ` (→ ${conv} conversão)` : ''}</span>,
                      'Quantidade'
                    ];
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="url(#gradient-status)" 
                  radius={[0, 8, 8, 0]}
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={800}
                  label={{ 
                    position: 'right', 
                    fill: '#94a3b8', 
                    fontSize: 11,
                    formatter: (value, entry) => {
                      const item = statusDataWithConversion.find(d => d.value === value);
                      return item?.conversion ? `${value} (${item.conversion})` : value;
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[380px] flex items-center justify-center text-gray-500">Sem dados</div>
          )}
        </div>

        {/* Top 5 Áreas de Interesse - DONUT */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Principais Áreas de Interesse</h3>
          {areaData.length > 0 && areaData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <defs>
                  {areaData.filter(d => d.value > 0).map((entry, index) => {
                    const baseColor = COLORS[index % COLORS.length];
                    const gradients = {
                      '#4285F4': ['#4285F4', '#1a56db'],
                      '#34A853': ['#34A853', '#15803d'],
                      '#FBBC04': ['#FBBC04', '#d97706'],
                      '#EA4335': ['#EA4335', '#dc2626'],
                      '#00BCD4': ['#00BCD4', '#0891b2'],
                    };
                    const [light, dark] = gradients[baseColor] || [baseColor, baseColor];
                    return (
                      <linearGradient key={`gradient-area-${index}`} id={`gradient-area-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={light} stopOpacity={1} />
                        <stop offset="100%" stopColor={dark} stopOpacity={1} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <Pie 
                  data={areaData.filter(d => d.value > 0 && (visibleAreaSeries.size === 0 || visibleAreaSeries.has(d.name)))} 
                  cx="50%" 
                  cy="45%" 
                  innerRadius={60}
                  outerRadius={100} 
                  fill="#8884d8" 
                  dataKey="value"
                  labelLine={false}
                  label={({ value, percentage }) => `${value} (${percentage}%)`}
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={800}
                >
                  {areaData.filter(d => d.value > 0).map((entry, index) => {
                    const isVisible = visibleAreaSeries.size === 0 || visibleAreaSeries.has(entry.name);
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isVisible ? `url(#gradient-area-${index})` : '#e5e7eb'}
                        opacity={isVisible ? 1 : 0.3}
                      />
                    );
                  })}
                </Pie>
                <Tooltip 
                  contentStyle={tooltipStyle}
                  formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, name]}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={50} 
                  wrapperStyle={{ fontSize: 11, cursor: 'pointer' }}
                  onClick={(e) => {
                    const name = e.value;
                    setVisibleAreaSeries(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(name)) {
                        newSet.delete(name);
                      } else {
                        newSet.add(name);
                      }
                      return newSet;
                    });
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">Sem dados</div>
          )}
        </div>

        {/* Origem dos Candidatos - DONUT */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Origem dos Candidatos</h3>
          {originData.length > 0 && originData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <defs>
                  {originData.filter(d => d.value > 0).map((entry, index) => {
                    const baseColor = COLORS[index % COLORS.length];
                    const gradients = {
                      '#4285F4': ['#4285F4', '#1a56db'],
                      '#34A853': ['#34A853', '#15803d'],
                      '#FBBC04': ['#FBBC04', '#d97706'],
                      '#EA4335': ['#EA4335', '#dc2626'],
                      '#00BCD4': ['#00BCD4', '#0891b2'],
                    };
                    const [light, dark] = gradients[baseColor] || [baseColor, baseColor];
                    return (
                      <linearGradient key={`gradient-origin-${index}`} id={`gradient-origin-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={light} stopOpacity={1} />
                        <stop offset="100%" stopColor={dark} stopOpacity={1} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <Pie 
                  data={originData.filter(d => d.value > 0 && (visibleOriginSeries.size === 0 || visibleOriginSeries.has(d.name)))} 
                  cx="50%" 
                  cy="45%" 
                  innerRadius={60}
                  outerRadius={100} 
                  fill="#8884d8" 
                  dataKey="value"
                  labelLine={false}
                  label={({ value, percentage }) => `${value} (${percentage}%)`}
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={800}
                >
                  {originData.filter(d => d.value > 0).map((entry, index) => {
                    const isVisible = visibleOriginSeries.size === 0 || visibleOriginSeries.has(entry.name);
                    return (
                      <Cell 
                        key={`cell-origin-${index}`} 
                        fill={isVisible ? `url(#gradient-origin-${index})` : '#e5e7eb'}
                        opacity={isVisible ? 1 : 0.3}
                      />
                    );
                  })}
                </Pie>
                <Tooltip 
                  contentStyle={tooltipStyle}
                  formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, name]}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={50} 
                  wrapperStyle={{ fontSize: 11, cursor: 'pointer' }}
                  onClick={(e) => {
                    const name = e.value;
                    setVisibleOriginSeries(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(name)) {
                        newSet.delete(name);
                      } else {
                        newSet.add(name);
                      }
                      return newSet;
                    });
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">Sem dados</div>
          )}
        </div>

        {/* Top 5 Cidades - Ordenado do maior para o menor */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Candidatos por Cidade (Top 5)</h3>
          {cityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cityData} layout="vertical" margin={{top: 5, right: 30, left: 200, bottom: 5}}>
                <defs>
                  <linearGradient id="gradient-city" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00BCD4" stopOpacity={1} />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                <XAxis type="number" stroke="#94a3b8"/>
                <YAxis type="category" dataKey="name" stroke="#94a3b8" width={190} tick={{fontSize: 12}}/>
                <Tooltip 
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="url(#gradient-city)" 
                  radius={[0, 8, 8, 0]}
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={800}
                  label={{ 
                    position: 'inside', 
                    fill: '#ffffff', 
                    fontSize: 12,
                    fontWeight: 'bold',
                    formatter: (value) => value
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">Sem dados</div>
          )}
        </div>

        {/* Status de Vagas - Barras Verticais */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Status das Vagas</h3>
          {jobStats.open > 0 || jobStats.filled > 0 || jobStats.closed > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart 
                data={[
                  { name: 'Abertas', value: jobStats.open, fill: '#FBBC04' },
                  { name: 'Preenchidas', value: jobStats.filled, fill: '#34A853' },
                  { name: 'Fechadas', value: jobStats.closed, fill: '#9E9E9E' }
                ]} 
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="gradient-jobs-open" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FBBC04" stopOpacity={1} />
                    <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="gradient-jobs-filled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34A853" stopOpacity={1} />
                    <stop offset="100%" stopColor="#15803d" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="gradient-jobs-closed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9E9E9E" stopOpacity={1} />
                    <stop offset="100%" stopColor="#6b7280" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }}/>
                <YAxis stroke="#94a3b8"/>
                <Tooltip 
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                />
                <Bar 
                  dataKey="value"
                  radius={[8, 8, 0, 0]}
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={800}
                  label={{ position: 'top', fill: '#94a3b8', fontSize: 14, fontWeight: 'bold' }}
                >
                  <Cell fill="url(#gradient-jobs-open)"/>
                  <Cell fill="url(#gradient-jobs-filled)"/>
                  <Cell fill="url(#gradient-jobs-closed)"/>
                </Bar>
              </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-500">Sem dados</div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- LOGIN ---
const LoginScreen = ({ onLogin, onEmailLogin, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onEmailLogin(email, password);
    } catch (err) {
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await onForgotPassword(forgotPasswordEmail);
      setSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Erro ao enviar email de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl max-w-md w-full">
        {/* Logo Young */}
        <div className="flex justify-center mb-6">
          <img 
            src="/logo-young-empreendimentos.png" 
            alt="Young Empreendimentos" 
            className="h-16 w-auto"
          />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">Young Talents ATS</h1>
        <p className="text-gray-700 dark:text-gray-300 text-sm mb-6 text-center">Sistema de Gestão de Talentos</p>

        {!showForgotPassword ? (
          <>
            {/* Formulário de Login com Email/Senha */}
            <form onSubmit={handleEmailSubmit} className="space-y-4 mb-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline w-full text-right"
              >
                Esqueci minha senha
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-bold transition-all shadow-lg"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            {/* Divisor */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">ou</span>
              </div>
            </div>

            {/* Botão Google */}
            <button 
              onClick={onLogin} 
              className="w-full bg-[#FF5722] hover:bg-[#E64A19] text-white py-3.5 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Entrar com Google
            </button>
          </>
        ) : (
          <>
            {/* Formulário de Recuperação de Senha */}
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail('');
                  setError('');
                  setSuccess('');
                }}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
              >
                <ChevronLeft size={16} />
                Voltar para login
              </button>

              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Recuperar Senha</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Digite seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-400">
                  {success}
                </div>
              )}

              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  E-mail
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-bold transition-all shadow-lg"
              >
                {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </button>
            </form>
          </>
        )}
        
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-6 text-center">© 2025 Young Empreendimentos</p>
      </div>
    </div>
  );
};

// --- SIDEBAR FILTROS AVANÇADOS ---
const FILTER_STORAGE_KEY = 'yt-filters';

const FilterSidebar = ({ isOpen, onClose, filters, setFilters, clearFilters, options, candidates = [] }) => {
  const [searchTexts, setSearchTexts] = React.useState({
    city: '',
    interestAreas: '',
    source: '',
    schoolingLevel: '',
    tags: ''
  });
  const [showCustomPeriod, setShowCustomPeriod] = React.useState(filters.createdAtPreset === 'custom');
  const [expandedFilters, setExpandedFilters] = React.useState({});
  const [lastSearchTexts, setLastSearchTexts] = React.useState({});
  
  React.useEffect(() => {
    setShowCustomPeriod(filters.createdAtPreset === 'custom');
  }, [filters.createdAtPreset]);

  // Pré-selecionar automaticamente resultados filtrados quando há busca
  React.useEffect(() => {
    const fieldsWithSearch = ['city', 'interestAreas', 'source', 'schoolingLevel', 'tags'];
    const timeouts = [];
    
    fieldsWithSearch.forEach(field => {
      const searchText = searchTexts[field];
      const lastSearch = lastSearchTexts[field];
      
      // Só pré-seleciona se o texto mudou e há resultados
      if (searchText && searchText !== lastSearch && searchText.length > 0) {
        // Aguarda um pequeno delay para evitar múltiplas atualizações
        const timeoutId = setTimeout(() => {
          // Busca as opções filtradas
          let filteredOptions = [];
          
          if (field === 'city') {
            const allOptions = (options.cities && options.cities.length > 0) 
              ? options.cities.map(c => ({id: c.id, name: c.name})) 
              : Array.from(new Set(candidates.map(x => x.city).filter(Boolean))).map((n, i) => ({id: i, name: n}));
            filteredOptions = filterBySearch(sortAlphabetically(allOptions), searchText);
          } else if (field === 'interestAreas') {
            const allOptions = (options.interestAreas && options.interestAreas.length > 0) 
              ? options.interestAreas.map(i => ({id: i.id, name: i.name})) 
              : Array.from(new Set(candidates.map(x => x.interestAreas).filter(Boolean))).map((n, i) => ({id: i, name: n}));
            filteredOptions = filterBySearch(sortAlphabetically(allOptions), searchText);
          } else if (field === 'source') {
            const allOptions = (options.origins && options.origins.length > 0) 
              ? options.origins.map(o => ({id: o.id, name: o.name})) 
              : Array.from(new Set(candidates.map(x => x.source).filter(Boolean))).map((n, i) => ({id: i, name: n}));
            filteredOptions = filterBySearch(sortAlphabetically(allOptions), searchText);
          } else if (field === 'schoolingLevel') {
            const allOptions = (options.schooling && options.schooling.length > 0) 
              ? options.schooling.map(s => ({id: s.id, name: s.name})) 
              : Array.from(new Set(candidates.map(x => x.schoolingLevel).filter(Boolean))).map((n, i) => ({id: i, name: n}));
            filteredOptions = filterBySearch(sortAlphabetically(allOptions), searchText);
          } else if (field === 'tags') {
            const allTags = new Set();
            candidates.forEach(c => {
              if (c.tags && Array.isArray(c.tags)) {
                c.tags.forEach(tag => allTags.add(tag));
              }
              if (c.importTag) allTags.add(c.importTag);
            });
            const allOptions = sortAlphabetically(Array.from(allTags).map((t, i) => ({ id: i, name: t })));
            filteredOptions = filterBySearch(allOptions, searchText);
          }
          
          // Pré-seleciona os resultados filtrados
          if (filteredOptions.length > 0) {
            const matchingNames = filteredOptions.map(o => o.name);
            const currentValues = Array.isArray(filters[field]) ? filters[field] : (filters[field] && filters[field] !== 'all' ? [filters[field]] : []);
            const newValues = [...new Set([...currentValues, ...matchingNames])];
            setFilters(prev => ({
              ...prev,
              [field]: newValues.length > 0 ? newValues : 'all'
            }));
          }
          
          setLastSearchTexts(prev => ({ ...prev, [field]: searchText }));
        }, 500); // Delay de 500ms para evitar múltiplas atualizações
        
        timeouts.push(timeoutId);
      }
    });
    
    return () => {
      timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, [searchTexts, filters, options, candidates, lastSearchTexts]);
  
  if (!isOpen) return null;
  
  const dynamicFilters = CSV_FIELD_MAPPING_OPTIONS.filter(opt => 
    ['city', 'interestAreas', 'schoolingLevel', 'source', 'maritalStatus', 'hasLicense'].includes(opt.value)
  );

  // Função para ordenar alfabeticamente
  const sortAlphabetically = (arr) => {
    return [...arr].sort((a, b) => {
      const nameA = (a.name || a).toLowerCase();
      const nameB = (b.name || b).toLowerCase();
      return nameA.localeCompare(nameB, 'pt-BR');
    });
  };

  // Função para filtrar por texto de busca
  const filterBySearch = (optionsList, searchText) => {
    if (!searchText) return optionsList;
    const lowerSearch = searchText.toLowerCase();
    return optionsList.filter(opt => {
      const name = (opt.name || opt).toLowerCase();
      return name.includes(lowerSearch);
    });
  };

  // Função para gerenciar seleção múltipla
  const handleMultiSelect = (field, value) => {
    const currentValues = Array.isArray(filters[field]) ? filters[field] : (filters[field] && filters[field] !== 'all' ? [filters[field]] : []);
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    setFilters({
      ...filters,
      [field]: newValues.length > 0 ? newValues : 'all'
    });
  };

  // Função para marcar todos os resultados filtrados
  const handleSelectAllFiltered = (field, filteredOptions) => {
    const matchingNames = filteredOptions.map(o => o.name);
    const currentValues = Array.isArray(filters[field]) ? filters[field] : (filters[field] && filters[field] !== 'all' ? [filters[field]] : []);
    const newValues = [...new Set([...currentValues, ...matchingNames])];
    setFilters({
      ...filters,
      [field]: newValues.length > 0 ? newValues : 'all'
    });
  };

  // Função para desmarcar todos os resultados filtrados
  const handleDeselectAllFiltered = (field, filteredOptions) => {
    const matchingNames = filteredOptions.map(o => o.name);
    const currentValues = Array.isArray(filters[field]) ? filters[field] : (filters[field] && filters[field] !== 'all' ? [filters[field]] : []);
    const newValues = currentValues.filter(v => !matchingNames.includes(v));
    setFilters({
      ...filters,
      [field]: newValues.length > 0 ? newValues : 'all'
    });
  };

  // Função para verificar se todos os resultados filtrados estão selecionados
  const areAllFilteredSelected = (field, filteredOptions) => {
    if (!filteredOptions || filteredOptions.length === 0) return false;
    const currentValues = Array.isArray(filters[field]) ? filters[field] : (filters[field] && filters[field] !== 'all' ? [filters[field]] : []);
    const matchingNames = filteredOptions.map(o => o.name);
    return matchingNames.every(name => currentValues.includes(name));
  };

  // Função para verificar se um valor está selecionado
  const isSelected = (field, value) => {
    if (filters[field] === 'all' || !filters[field]) return false;
    if (Array.isArray(filters[field])) {
      return filters[field].includes(value);
    }
    return filters[field] === value;
  };

  // Função para toggle de expansão
  const toggleExpanded = (field) => {
    setExpandedFilters(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 z-50 p-6 shadow-2xl transform transition-transform duration-300 overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2"><Filter size={20}/> Filtros Avançados</h3>
          <button onClick={onClose}><X className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" /></button>
        </div>
        
        {/* Filtros Ativos - Badges */}
        {(() => {
          const activeFilters = [];
          Object.keys(filters).forEach(key => {
            if (key === 'createdAtPreset' && filters[key] !== 'all' && filters[key] !== '7d') {
              activeFilters.push({ key, label: `Período: ${filters[key] === 'today' ? 'Hoje' : filters[key] === 'yesterday' ? 'Ontem' : filters[key] === '7d' ? '7 dias' : filters[key] === '30d' ? '30 dias' : filters[key] === '90d' ? '90 dias' : filters[key] === 'custom' ? 'Personalizado' : filters[key]}` });
            } else if (key === 'customDateStart' || key === 'customDateEnd') {
              // Já tratado no createdAtPreset
            } else if (filters[key] && filters[key] !== 'all' && key !== 'createdAtPreset') {
              if (Array.isArray(filters[key]) && filters[key].length > 0) {
                activeFilters.push({ key, label: `${key === 'status' ? 'Status' : key === 'jobId' ? 'Vaga' : key === 'interestAreas' ? 'Áreas' : key === 'city' ? 'Cidade' : key === 'source' ? 'Fonte' : key === 'schoolingLevel' ? 'Escolaridade' : key === 'maritalStatus' ? 'Estado Civil' : key === 'hasLicense' ? 'CNH' : key === 'tags' ? 'Tags' : key}: ${filters[key].length} selecionado(s)` });
              } else if (!Array.isArray(filters[key])) {
                activeFilters.push({ key, label: `${key === 'status' ? 'Status' : key === 'jobId' ? 'Vaga' : key === 'interestAreas' ? 'Áreas' : key === 'city' ? 'Cidade' : key === 'source' ? 'Fonte' : key === 'schoolingLevel' ? 'Escolaridade' : key === 'maritalStatus' ? 'Estado Civil' : key === 'hasLicense' ? 'CNH' : key === 'tags' ? 'Tags' : key}: ${filters[key]}` });
              }
            }
          });
          
          if (activeFilters.length === 0) return null;
          
          return (
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Filtros Ativos:</div>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((filter, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs">
                    <span>{filter.label}</span>
                    <button
                      onClick={() => {
                        if (filter.key === 'createdAtPreset') {
                          setFilters({...filters, [filter.key]: 'all', customDateStart: '', customDateEnd: ''});
                        } else {
                          setFilters({...filters, [filter.key]: 'all'});
                        }
                      }}
                      className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                    >
                      <X size={12}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
        
        <div className="space-y-6 flex-1 custom-scrollbar overflow-y-auto pr-2">
          {/* Período - Data de Cadastro Original */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Período (Data Cadastro Original)</label>
            <select
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={filters.createdAtPreset || 'all'}
              onChange={e => {
                const value = e.target.value;
                setFilters({...filters, createdAtPreset: value, customDateStart: '', customDateEnd: ''});
                setShowCustomPeriod(value === 'custom');
              }}
            >
              <option value="all">Qualquer data</option>
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="custom">Período personalizado</option>
            </select>
            {showCustomPeriod && (
              <div className="space-y-2 mt-2">
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">Data inicial</label>
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={filters.customDateStart || ''}
                    onChange={e => setFilters({...filters, customDateStart: e.target.value})}
                  />
          </div>
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">Data final</label>
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={filters.customDateEnd || ''}
                    onChange={e => setFilters({...filters, customDateEnd: e.target.value})}
                  />
                </div>
                <p className="text-xs text-slate-500 italic">Usa a data original de cadastro do candidato</p>
              </div>
            )}
          </div>

          {/* SEPARAÇÃO: FILTROS DE VAGA (DEMANDA) */}
          <div className="pt-4 border-t-2 border-orange-500/30 dark:border-orange-400/30">
            <h4 className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              Filtros de Vaga (Demanda)
            </h4>
            
            {/* Vaga */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">Vaga</label>
                <button
                  onClick={() => toggleExpanded('jobId')}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {expandedFilters.jobId ? 'Recolher' : 'Expandir'}
                </button>
              </div>
              {expandedFilters.jobId ? (
                <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 space-y-1">
                  <label className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.jobId === 'all' || !filters.jobId || (Array.isArray(filters.jobId) && filters.jobId.length === 0)}
                      onChange={() => setFilters({...filters, jobId: 'all'})}
                      className="accent-blue-600 dark:accent-blue-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">Todas as Vagas</span>
                  </label>
                  {options.jobs.map(j => (
                    <label key={j.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={isSelected('jobId', j.id)}
                        onChange={() => handleMultiSelect('jobId', j.id)}
                        className="accent-blue-600 dark:accent-blue-500"
                      />
                      <span className="text-sm text-white">{j.title}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <select className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={Array.isArray(filters.jobId) ? filters.jobId[0] || 'all' : (filters.jobId || 'all')} onChange={e => setFilters({...filters, jobId: e.target.value === 'all' ? 'all' : [e.target.value]})}>
                 <option value="all">Todas as Vagas</option>{options.jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
              )}
            </div>
          </div>

          {/* SEPARAÇÃO: FILTROS DE CANDIDATO (PERFIL) */}
          <div className="pt-4 border-t-2 border-blue-500/30 dark:border-blue-400/30">
            <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Filtros de Candidato (Perfil)
            </h4>

          {/* Status (Etapa da Pipeline) - Seleção Múltipla */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Status (Etapa)</label>
              <button
                onClick={() => toggleExpanded('status')}
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {expandedFilters.status ? 'Recolher' : 'Expandir'}
              </button>
            </div>
            {expandedFilters.status ? (
              <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 space-y-1">
                <label className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={filters.status === 'all' || !filters.status || (Array.isArray(filters.status) && filters.status.length === 0)}
                    onChange={() => setFilters({...filters, status: 'all'})}
                    className="accent-blue-600 dark:accent-blue-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">Todas as etapas</span>
                </label>
                {PIPELINE_STAGES.map(stage => (
                  <label key={stage} className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={isSelected('status', stage)}
                      onChange={() => handleMultiSelect('status', stage)}
                      className="accent-blue-600 dark:accent-blue-500"
                    />
                    <span className="text-sm text-white">{stage}</span>
                  </label>
                ))}
                {CLOSING_STATUSES.map(status => (
                  <label key={status} className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected('status', status)}
                      onChange={() => handleMultiSelect('status', status)}
                      className="accent-blue-600 dark:accent-blue-500"
                    />
                    <span className="text-sm text-white">{status}</span>
                  </label>
                ))}
              </div>
            ) : (
              <select
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={Array.isArray(filters.status) ? filters.status[0] || 'all' : (filters.status || 'all')}
                onChange={e => setFilters({...filters, status: e.target.value === 'all' ? 'all' : [e.target.value]})}
              >
                <option value="all">Todas as etapas</option>
                {PIPELINE_STAGES.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
                {CLOSING_STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Vaga Vinculada</label>
              <button
                onClick={() => toggleExpanded('jobId')}
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-white"
              >
                {expandedFilters.jobId ? 'Recolher' : 'Expandir'}
              </button>
            </div>
            {expandedFilters.jobId ? (
              <div className="max-h-48 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 space-y-1">
                <label className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.jobId === 'all' || !filters.jobId || (Array.isArray(filters.jobId) && filters.jobId.length === 0)}
                    onChange={() => setFilters({...filters, jobId: 'all'})}
                    className="accent-blue-600 dark:accent-blue-500"
                  />
                  <span className="text-sm text-white">Todas as Vagas</span>
                </label>
                {options.jobs.map(j => (
                  <label key={j.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected('jobId', j.id)}
                      onChange={() => handleMultiSelect('jobId', j.id)}
                      className="accent-blue-600 dark:accent-blue-500"
                    />
                    <span className="text-sm text-white">{j.title}</span>
                  </label>
                ))}
              </div>
            ) : (
              <select className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={Array.isArray(filters.jobId) ? filters.jobId[0] || 'all' : (filters.jobId || 'all')} onChange={e => setFilters({...filters, jobId: e.target.value === 'all' ? 'all' : [e.target.value]})}>
               <option value="all">Todas as Vagas</option>{options.jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            )}
          </div>

           {dynamicFilters.map(field => {
             // Prefer options from system lists, fallback to deriving from candidates
             let optionsList = [];
             if(field.value === 'city') {
               // Prioriza cidades dos candidatos
               const candidateCities = Array.from(new Set(candidates.map(x => x.city).filter(Boolean))).map((n, i) => ({id: `candidate_${i}`, name: n}));
               const optionCities = (options.cities && options.cities.length > 0) 
                 ? options.cities.map(c => ({id: c.id, name: c.name})) 
                 : [];
               // Combina, priorizando cidades dos candidatos e removendo duplicatas
               const allOptionsMap = new Map();
               candidateCities.forEach(c => allOptionsMap.set(c.name.toLowerCase(), c));
               optionCities.forEach(c => {
                 if (!allOptionsMap.has(c.name.toLowerCase())) {
                   allOptionsMap.set(c.name.toLowerCase(), c);
                 }
               });
               optionsList = Array.from(allOptionsMap.values());
               optionsList = sortAlphabetically(optionsList);
               optionsList = filterBySearch(optionsList, searchTexts.city);
             }
             else if(field.value === 'interestAreas') {
               optionsList = (options.interestAreas && options.interestAreas.length>0) 
                 ? options.interestAreas.map(i=>({id:i.id,name:i.name})) 
                 : Array.from(new Set(candidates.map(x=>x.interestAreas).filter(Boolean))).map((n,i)=>({id:i,name:n}));
               optionsList = sortAlphabetically(optionsList);
               optionsList = filterBySearch(optionsList, searchTexts.interestAreas);
             }
             else if(field.value === 'schoolingLevel') {
               optionsList = (options.schooling && options.schooling.length>0) 
                 ? options.schooling.map(s=>({id:s.id,name:s.name})) 
                 : Array.from(new Set(candidates.map(x=>x.schoolingLevel).filter(Boolean))).map((n,i)=>({id:i,name:n}));
               optionsList = sortAlphabetically(optionsList);
               optionsList = filterBySearch(optionsList, searchTexts.schoolingLevel || '');
             }
             else if(field.value === 'source') {
               optionsList = (options.origins && options.origins.length>0) 
                 ? options.origins.map(o=>({id:o.id,name:o.name})) 
                 : Array.from(new Set(candidates.map(x=>x.source).filter(Boolean))).map((n,i)=>({id:i,name:n}));
               optionsList = sortAlphabetically(optionsList);
               optionsList = filterBySearch(optionsList, searchTexts.source);
             }
             else if(field.value === 'maritalStatus') {
               optionsList = (options.marital && options.marital.length>0) 
                 ? options.marital.map(m=>({id:m.id,name:m.name})) 
                 : Array.from(new Set(candidates.map(x=>x.maritalStatus).filter(Boolean))).map((n,i)=>({id:i,name:n}));
               optionsList = sortAlphabetically(optionsList);
             }
             
             const hasOptions = optionsList.length > 0;
             const isBoolean = ['hasLicense', 'isStudying', 'canRelocate'].includes(field.value);
             const needsSearch = ['city', 'interestAreas', 'source', 'schoolingLevel'].includes(field.value);

             return (
               <div key={field.value} className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                 <label className="text-sm font-semibold text-gray-900 dark:text-white block">{field.label.replace(':', '')}</label>
                 
                 {needsSearch ? (
                   <>
                     <div className="relative">
                       <input
                         type="text"
                         className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                         placeholder={`Digite para buscar ${field.label.replace(':', '').toLowerCase()}...`}
                         value={searchTexts[field.value] || ''}
                         onChange={e => {
                           const searchValue = e.target.value;
                           setSearchTexts({...searchTexts, [field.value]: searchValue});
                         }}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' && searchTexts[field.value] && optionsList.length > 0) {
                             e.preventDefault();
                             handleSelectAllFiltered(field.value, optionsList);
                           }
                         }}
                       />
                       {searchTexts[field.value] && (
                         <button
                           onClick={() => setSearchTexts({...searchTexts, [field.value]: ''})}
                           className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                         >
                           <X size={16} />
                         </button>
                       )}
                     </div>
                     
                     {optionsList.length > 0 && (
                       <>
                         <div className="flex gap-2 mb-2">
                           <button
                             onClick={() => handleSelectAllFiltered(field.value, optionsList)}
                             className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                               areAllFilteredSelected(field.value, optionsList)
                                 ? 'bg-green-500 hover:bg-green-600 text-white'
                                 : 'bg-blue-500 hover:bg-blue-600 text-white'
                             }`}
                           >
                             {areAllFilteredSelected(field.value, optionsList) ? '✓ Todos' : `Marcar Todos (${optionsList.length})`}
                           </button>
                           <button
                             onClick={() => handleDeselectAllFiltered(field.value, optionsList)}
                             className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors"
                           >
                             Desmarcar
                           </button>
                         </div>
                         
                         <div className="max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
                           <label className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-gray-800 rounded cursor-pointer transition-colors">
                             <input
                               type="checkbox"
                               checked={filters[field.value] === 'all' || !filters[field.value] || (Array.isArray(filters[field.value]) && filters[field.value].length === 0)}
                               onChange={() => setFilters({...filters, [field.value]: 'all'})}
                               className="accent-blue-600 dark:accent-blue-500 w-4 h-4"
                             />
                             <span className="text-sm text-gray-900 dark:text-white font-medium">Todos</span>
                           </label>
                           {optionsList.map(o => (
                             <label key={o.id || o.name} className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-gray-800 rounded cursor-pointer transition-colors">
                               <input
                                 type="checkbox"
                                 checked={isSelected(field.value, o.name)}
                                 onChange={() => handleMultiSelect(field.value, o.name)}
                                 className="accent-blue-600 dark:accent-blue-500 w-4 h-4"
                               />
                               <span className="text-sm text-gray-900 dark:text-white">{o.name}</span>
                             </label>
                           ))}
                         </div>
                       </>
                     )}
                     {searchTexts[field.value] && optionsList.length === 0 && (
                       <p className="text-xs text-gray-500 dark:text-gray-400 italic">Nenhum resultado encontrado</p>
                     )}
                   </>
                 ) : hasOptions ? (
                   <div className="max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
                     <label className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-gray-800 rounded cursor-pointer transition-colors">
                       <input
                         type="checkbox"
                         checked={filters[field.value] === 'all' || !filters[field.value] || (Array.isArray(filters[field.value]) && filters[field.value].length === 0)}
                         onChange={() => setFilters({...filters, [field.value]: 'all'})}
                         className="accent-blue-600 dark:accent-blue-500 w-4 h-4"
                       />
                       <span className="text-sm text-gray-900 dark:text-white font-medium">Todos</span>
                     </label>
                     {optionsList.map(o => (
                       <label key={o.id || o.name} className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-gray-800 rounded cursor-pointer transition-colors">
                         <input
                           type="checkbox"
                           checked={isSelected(field.value, o.name)}
                           onChange={() => handleMultiSelect(field.value, o.name)}
                           className="accent-blue-600 dark:accent-blue-500 w-4 h-4"
                         />
                         <span className="text-sm text-gray-900 dark:text-white">{o.name}</span>
                       </label>
                     ))}
                   </div>
                 ) : isBoolean ? (
                   <div className="space-y-2">
                     <label className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors">
                       <input
                         type="checkbox"
                         checked={filters[field.value] === 'all' || !filters[field.value] || (Array.isArray(filters[field.value]) && filters[field.value].length === 0)}
                         onChange={() => setFilters({...filters, [field.value]: 'all'})}
                         className="accent-blue-600 dark:accent-blue-500 w-4 h-4"
                       />
                       <span className="text-sm text-gray-900 dark:text-white font-medium">Todos</span>
                     </label>
                     <label className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors">
                       <input
                         type="checkbox"
                         checked={isSelected(field.value, 'Sim')}
                         onChange={() => handleMultiSelect(field.value, 'Sim')}
                         className="accent-blue-600 dark:accent-blue-500 w-4 h-4"
                       />
                       <span className="text-sm text-gray-900 dark:text-white">Sim</span>
                     </label>
                     <label className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors">
                       <input
                         type="checkbox"
                         checked={isSelected(field.value, 'Não')}
                         onChange={() => handleMultiSelect(field.value, 'Não')}
                         className="accent-blue-600 dark:accent-blue-500 w-4 h-4"
                       />
                       <span className="text-sm text-gray-900 dark:text-white">Não</span>
                     </label>
                   </div>
                 ) : (
                   <input 
                     type="text" 
                     className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" 
                     placeholder={`Filtrar...`} 
                     value={filters[field.value] || ''} 
                     onChange={e => setFilters({...filters, [field.value]: e.target.value})}
                   />
                 )}
               </div>
             );
           })}

          {/* Filtro por Tags */}
          {(() => {
            // Coleta todas as tags únicas dos candidatos
            const allTags = new Set();
            candidates.forEach(c => {
              if (c.tags && Array.isArray(c.tags)) {
                c.tags.forEach(tag => allTags.add(tag));
              }
              if (c.importTag) allTags.add(c.importTag);
            });
            const tagsList = sortAlphabetically(Array.from(allTags).map((t, i) => ({ id: i, name: t })));
            const filteredTags = filterBySearch(tagsList, searchTexts.tags || '');

            if (tagsList.length === 0) return null;

            return (
              <div className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                <label className="text-sm font-semibold text-gray-900 dark:text-white block">Tags</label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Digite para buscar tags..."
                    value={searchTexts.tags || ''}
                    onChange={e => {
                      const searchValue = e.target.value;
                      setSearchTexts({...searchTexts, tags: searchValue});
                      
                      // Pré-selecionar automaticamente os resultados filtrados
                      if (searchValue && filteredTags.length > 0) {
                        const matchingNames = filteredTags.map(t => t.name);
                        const currentValues = Array.isArray(filters.tags) ? filters.tags : (filters.tags && filters.tags !== 'all' ? [filters.tags] : []);
                        const newValues = [...new Set([...currentValues, ...matchingNames])];
                        setFilters({
                          ...filters,
                          tags: newValues.length > 0 ? newValues : 'all'
                        });
                      }
                    }}
                  />
                  {searchTexts.tags && (
                    <button
                      onClick={() => setSearchTexts({...searchTexts, tags: ''})}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {filteredTags.length > 0 && (
                  <>
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => handleSelectAllFiltered('tags', filteredTags)}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                          areAllFilteredSelected('tags', filteredTags)
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        {areAllFilteredSelected('tags', filteredTags) ? '✓ Todos' : `Marcar Todos (${filteredTags.length})`}
                      </button>
                      <button
                        onClick={() => handleDeselectAllFiltered('tags', filteredTags)}
                        className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors"
                      >
                        Desmarcar
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
                      <label className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-gray-800 rounded cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={filters.tags === 'all' || !filters.tags || (Array.isArray(filters.tags) && filters.tags.length === 0)}
                          onChange={() => setFilters({...filters, tags: 'all'})}
                          className="accent-blue-600 dark:accent-blue-500 w-4 h-4"
                        />
                        <span className="text-sm text-gray-900 dark:text-white font-medium">Todas as Tags</span>
                      </label>
                      {filteredTags.map(t => (
                        <label key={t.id || t.name} className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-gray-800 rounded cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={isSelected('tags', t.name)}
                            onChange={() => handleMultiSelect('tags', t.name)}
                            className="accent-blue-600 dark:accent-blue-500 w-4 h-4"
                          />
                          <span className="text-sm text-gray-900 dark:text-white">{t.name}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
                {searchTexts.tags && filteredTags.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">Nenhum resultado encontrado</p>
                )}
              </div>
            );
          })()}
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-3">
          <button onClick={onClose} className="w-full bg-blue-600 text-white py-3 rounded font-medium hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors">Aplicar Filtros</button>
        <div className="flex gap-2">
          <button onClick={clearFilters} className="flex-1 text-slate-400 hover:text-white py-2 text-sm">Limpar Tudo</button>
          <button
            onClick={() => {
              try {
                localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
              } catch (e) {
                console.warn('Erro ao salvar filtros', e);
              }
            }}
            className="flex-1 text-gray-600 dark:text-gray-400 hover:text-white py-2 text-sm"
          >
            Salvar Filtros
          </button>
        </div>
        </div>
      </div>
    </>
  );
};

// --- APP PRINCIPAL ---
export default function App() {
  const { isDark, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Sistema de Rotas usando URL
  const location = useLocation();
  const navigate = useNavigate();
  
  // Mapear pathname para activeTab
  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path === '/' || path === '') return 'dashboard';
    const slug = path.replace(/^\//, '').split('/')[0];
    const validTabs = ['dashboard', 'pipeline', 'candidates', 'jobs', 'applications', 'companies', 'positions', 'sectors', 'cities', 'reports', 'help', 'settings', 'diagnostic'];
    return validTabs.includes(slug) ? slug : 'dashboard';
  };

  const [route, setRoute] = useState({
    page: getActiveTabFromPath(),
    modal: new URLSearchParams(location.search).get('modal') || null,
    id: new URLSearchParams(location.search).get('id') || null,
    settingsTab: new URLSearchParams(location.search).get('settingsTab') || null
  });
  
  const activeTab = route.page;
  
  // Sincronizar com mudanças de URL
  useEffect(() => {
    const newTab = getActiveTabFromPath();
    const params = new URLSearchParams(location.search);
    setRoute({
      page: newTab,
      modal: params.get('modal') || null,
      id: params.get('id') || null,
      settingsTab: params.get('settingsTab') || null
    });
  }, [location.pathname, location.search]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Para ocultar menu em desktop

  // Inicializar URL se necessário
  useEffect(() => {
    // Redirecionar rota raiz para dashboard (apenas uma vez)
    if (location.pathname === '/' || location.pathname === '') {
      navigate('/dashboard', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Inicializar settingsTab na URL se estiver na página de settings
  useEffect(() => {
    if (activeTab === 'settings' && !route.settingsTab) {
      const params = new URLSearchParams(location.search);
      params.set('settingsTab', 'campos');
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
      setRoute(prev => ({ ...prev, settingsTab: 'campos' }));
    }
  }, [activeTab, route.settingsTab, location.pathname, location.search, navigate]);

  const setActiveTab = (tab) => {
    // Navegar para a slug direta
    navigate(`/${tab}`, { replace: true });
    setRoute(prev => ({ ...prev, page: tab }));
  };
  
  // Dados
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [cities, setCities] = useState([]);
  const [interestAreas, setInterestAreas] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [schooling, setSchooling] = useState([]);
  const [marital, setMarital] = useState([]);
  const [tags, setTags] = useState([]);
  const [statusMovements, setStatusMovements] = useState([]); // Log de movimentações de status
  const [applications, setApplications] = useState([]); // Candidaturas formais (candidato-vaga)
  const [interviews, setInterviews] = useState([]); // Agendamentos de entrevistas
  const [userRoles, setUserRoles] = useState([]); // Roles de usuários do sistema
  const [activityLog, setActivityLog] = useState([]); // Log de atividades para admin
  
  // Role do usuário atual (admin, recruiter, viewer)
  const currentUserRole = useMemo(() => {
    if (!user?.email) return 'viewer';
    const userRoleDoc = userRoles.find(r => r.email === user.email);
    return userRoleDoc?.role || 'admin'; // Primeiro usuário é admin por padrão
  }, [user, userRoles]);
  
  // Verificar permissões
  const hasPermission = (action) => {
    const permissions = {
      admin: ['all'],
      recruiter: ['view', 'edit_candidates', 'move_pipeline', 'schedule_interviews', 'add_notes'],
      viewer: ['view']
    };
    const userPerms = permissions[currentUserRole] || [];
    return userPerms.includes('all') || userPerms.includes(action);
  };

  // Modais - sincronizados com URL
  const isJobModalOpen = route.modal === 'job';
  const isCsvModalOpen = route.modal === 'csv';
  const viewingJob = route.modal === 'job-candidates' && route.id ? jobs.find(j => j.id === route.id) : null;
  const [editingCandidate, setEditingCandidate] = useState(null);
  
  // Função para abrir perfil do candidato (redireciona para página dedicada)
  const openCandidateProfile = (candidate) => {
    if (candidate?.id) {
      navigate(`/candidate/${candidate.id}`);
    } else if (typeof candidate === 'string') {
      // Se for apenas o ID
      navigate(`/candidate/${candidate}`);
    }
  };
  const [editingJob, setEditingJob] = useState(null);
  const [pendingTransition, setPendingTransition] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [dashboardModalCandidates, setDashboardModalCandidates] = useState(null);
  const [dashboardModalTitle, setDashboardModalTitle] = useState('');
  const [highlightedCandidateId, setHighlightedCandidateId] = useState(null);
  const [interviewModalData, setInterviewModalData] = useState(null); // { candidate, job, application }

  // Helpers para abrir modais com URL
  const openJobModal = (job = null) => {
    setEditingJob(job);
    const params = new URLSearchParams(location.search);
    params.set('modal', 'job');
    if (job?.id) params.set('id', job.id);
    navigate(`${location.pathname}?${params.toString()}`);
    setRoute(prev => ({ ...prev, modal: 'job', id: job?.id || '' }));
  };

  const closeJobModal = () => {
    setEditingJob(null);
    navigate(location.pathname);
    setRoute(prev => ({ ...prev, modal: null, id: null }));
  };

  const openCsvModal = () => {
    const params = new URLSearchParams(location.search);
    params.set('modal', 'csv');
    navigate(`${location.pathname}?${params.toString()}`);
    setRoute(prev => ({ ...prev, modal: 'csv' }));
  };

  const closeCsvModal = () => {
    navigate(location.pathname);
    setRoute(prev => ({ ...prev, modal: null }));
  };

  const openJobCandidatesModal = (job) => {
    const params = new URLSearchParams(location.search);
    params.set('modal', 'job-candidates');
    if (job?.id) params.set('id', job.id);
    navigate(`${location.pathname}?${params.toString()}`);
    setRoute(prev => ({ ...prev, modal: 'job-candidates', id: job?.id || '' }));
  };

  const closeJobCandidatesModal = () => {
    navigate(location.pathname);
    setRoute(prev => ({ ...prev, modal: null, id: null }));
  };
  
  // Filtro Global
  // IMPORTANTE: createdAtPreset = 'all' para NÃO limitar por padrão aos últimos 7 dias.
  // Isso garante que todo o histórico de candidatos (ex: 2600+) apareça no Banco de Talentos,
  // a menos que o usuário ative filtros de período manualmente.
  const initialFilters = { 
    jobId: 'all',
    company: 'all',
    city: 'all',
    interestArea: 'all',
    cnh: 'all',
    marital: 'all',
    origin: 'all',
    schooling: 'all',
    createdAtPreset: 'all',
    tags: 'all'
  };
  const [filters, setFilters] = useState(() => {
    try {
      const stored = localStorage.getItem(FILTER_STORAGE_KEY);
      if (stored) return { ...initialFilters, ...JSON.parse(stored) };
    } catch (e) {
      console.warn('Erro ao carregar filtros salvos', e);
    }
    return initialFilters;
  });
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => { 
    try {
      const unsubscribe = onAuthStateChanged(auth, (u) => { 
        setUser(u); 
        setAuthLoading(false); 
      }, (error) => {
        console.error('[Auth] Erro ao verificar estado de autenticação:', error);
        setAuthLoading(false);
      });
      return unsubscribe;
    } catch (error) {
      console.error('[Auth] Erro ao configurar listener de autenticação:', error);
      setAuthLoading(false);
    }
  }, []);
  const handleEmailLogin = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast('Login realizado com sucesso!', 'success');
    } catch (error) {
      let errorMessage = 'Erro ao fazer login.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Senha incorreta.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
      }
      throw new Error(errorMessage);
    }
  };

  const handleForgotPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      showToast('Email de recuperação enviado!', 'success');
    } catch (error) {
      let errorMessage = 'Erro ao enviar email de recuperação.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido.';
      }
      throw new Error(errorMessage);
    }
  };

  const handleGoogleLogin = async () => { 
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try { 
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;
      
      // Auto-registrar/atualizar perfil do usuário no primeiro login
      if (loggedUser) {
        setTimeout(async () => {
          try {
            // Verificar se o usuário já existe em userRoles
            const q = query(collection(db, 'userRoles'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const existingRoles = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const existingRole = existingRoles.find(r => r.email === loggedUser.email);
            
            // Verificar se o usuário tem permissão para acessar o sistema
            // Se não existe na lista de userRoles e não é o primeiro usuário, negar acesso
            const isFirstUser = existingRoles.length === 0;
            
            if (!existingRole && !isFirstUser) {
              // Usuário não autorizado - fazer logout
              await signOut(auth);
              showToast('Acesso negado. Entre em contato com o administrador para solicitar acesso.', 'error');
              return;
            }
            
            if (existingRole) {
              // Atualizar nome e foto do Google se diferentes
              if (existingRole.name !== loggedUser.displayName || existingRole.photo !== loggedUser.photoURL) {
                await updateDoc(doc(db, 'userRoles', existingRole.id), {
                  name: loggedUser.displayName || existingRole.name,
                  photo: loggedUser.photoURL || existingRole.photo,
                  lastLogin: serverTimestamp()
                });
              }
            } else {
              // Criar registro para primeiro usuário (admin)
              await addDoc(collection(db, 'userRoles'), {
                email: loggedUser.email,
                name: loggedUser.displayName || '',
                photo: loggedUser.photoURL || '',
                role: 'admin', // Primeiro usuário é admin
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
              });
            }
            
            // Registrar atividade de login
            await addDoc(collection(db, 'activityLog'), {
              type: 'login',
              description: `${loggedUser.displayName || loggedUser.email} fez login no sistema`,
              entityType: 'user',
              entityId: loggedUser.uid,
              metadata: { method: 'google' },
              userEmail: loggedUser.email,
              userName: loggedUser.displayName || loggedUser.email,
              userPhoto: loggedUser.photoURL || null,
              timestamp: serverTimestamp(),
              createdAt: serverTimestamp()
            });
          } catch (err) {
            console.error('Erro ao registrar login:', err);
          }
        }, 500);
      }
    } catch (e) { 
      console.error(e);

      // Tratamento específico para bloqueio de popup
      if (e.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectError) {
          console.error('Erro no login com redirecionamento:', redirectError);

          if (typeof showToast === 'function') {
            showToast('Seu navegador bloqueou o popup de login. Permita pop-ups ou tente outro navegador.', 'error');
          }
        }
      } else {
        if (typeof showToast === 'function') {
          showToast('Erro ao fazer login com Google. Tente novamente mais tarde.', 'error');
        }
      }
    } 
  };

  // Sync Data
  useEffect(() => {
    if (!user) return;
    const unsubs = [
      onSnapshot(query(collection(db, 'jobs')), s => setJobs(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(
        query(collection(db, 'candidates')),
        s => {
          const docs = s.docs.map(d => ({ id: d.id, ...d.data() }));
          setCandidates(docs);
        }
      ),
      onSnapshot(query(collection(db, 'companies')), s => setCompanies(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'cities')), s => setCities(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'interest_areas')), s => setInterestAreas(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'positions')), s => setRoles(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'sectors')), s => setSectors(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'origins')), s => setOrigins(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'schooling_levels')), s => setSchooling(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'marital_statuses')), s => setMarital(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'tags')), s => setTags(s.docs.map(d => ({id:d.id, ...d.data()})))),
      // Log de movimentações de status para calcular taxas de conversão
      onSnapshot(query(collection(db, 'statusMovements')), s => setStatusMovements(s.docs.map(d => ({id:d.id, ...d.data()})))),
      // Candidaturas formais (candidato-vaga)
      onSnapshot(query(collection(db, 'applications')), s => setApplications(s.docs.map(d => ({id:d.id, ...d.data()})))),
      // Agendamentos de entrevistas
      onSnapshot(query(collection(db, 'interviews')), s => setInterviews(s.docs.map(d => ({id:d.id, ...d.data()})))),
      // Roles de usuários
      onSnapshot(query(collection(db, 'userRoles')), s => setUserRoles(s.docs.map(d => ({id:d.id, ...d.data()})))),
      // Log de atividades (últimas 200)
      onSnapshot(query(collection(db, 'activityLog'), orderBy('timestamp', 'desc')), s => setActivityLog(s.docs.slice(0, 200).map(d => ({id:d.id, ...d.data()})))),
    ];
    return () => unsubs.forEach(u => u());
  }, [user]);

  const handleSaveGeneric = async (col, d, closeFn) => {
    setIsSaving(true);
    try {
      const payload = { ...d, updatedAt: serverTimestamp() };
      
      // Adiciona histórico de edição/criação e metadados
      if (user && user.email) {
        if (!d.id) {
          // Novo candidato criado manualmente
          payload.createdBy = user.email;
          payload.createdAt = serverTimestamp();
          payload.origin = 'manual'; // Origem: criado manualmente pelo usuário
          payload.responsibleUser = user.email; // Usuário responsável
          if (!payload.tags) {
            payload.tags = [];
          }
        } else {
          payload.updatedBy = user.email;
          payload.updatedAt = serverTimestamp();
        }
      }
      
      // Normaliza campos específicos se for collection de candidatos
      if (col === 'candidates') {
        if (payload.city) {
          payload.city = normalizeCity(payload.city);
        }
        if (payload.source) {
          payload.source = normalizeSource(payload.source);
        }
        if (payload.interestAreas) {
          payload.interestAreas = normalizeInterestAreasString(payload.interestAreas);
        }
      }
      
      if (d.id) {
        await updateDoc(doc(db, col, d.id), payload);
      } else {
        const docRef = await addDoc(collection(db, col), payload);
        // Se for candidato, redireciona para a página de perfil
        if (col === 'candidates' && closeFn) {
          closeFn();
          navigate(`/candidate/${docRef.id}`);
          showToast('Candidato criado com sucesso', 'success');
          return;
        }
      }
      if(closeFn) closeFn();
      showToast('Salvo com sucesso', 'success');
    } catch(e) { showToast(`Erro ao salvar: ${e.message}`, 'error'); } finally { setIsSaving(false); }
  };

  const handleDeleteGeneric = async (col, id) => {
    if (!window.confirm('Tem certeza que deseja excluir este item?')) return;
    
    try {
      setIsSaving(true);
      const docRef = doc(db, col, id);
      
      // Registra histórico antes de deletar
      if (user && user.email) {
        await updateDoc(docRef, {
          deletedBy: user.email,
          deletedAt: serverTimestamp()
        });
      }
      
      // Registra ação no histórico
      await recordActionHistory({
        action: 'exclusão',
        collection: col,
        recordsAffected: 1,
        details: { id }
      });
      
      // Deleta o documento
      await deleteDoc(docRef);
      showToast('Excluído com sucesso', 'success');
    } catch(e) {
      showToast(`Erro ao excluir: ${e.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Função para registrar histórico de ações
  const recordActionHistory = async ({ action, col, recordsAffected, details = {} }) => {
    if (!user || !user.email) return;
    
    try {
      await addDoc(collection(db, 'actionHistory'), {
        action,
        collection: col,
        recordsAffected,
        userEmail: user.email,
        userName: user.displayName || user.email,
        userPhoto: user.photoURL || null,
        timestamp: serverTimestamp(),
        details,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao registrar histórico:', error);
      // Não interrompe a operação principal se o histórico falhar
    }
  };

  // Função para registrar atividades gerais do sistema (log completo)
  const recordActivity = async (activityType, description, entityType = null, entityId = null, metadata = {}) => {
    if (!user || !user.email) return;
    
    try {
      await addDoc(collection(db, 'activityLog'), {
        type: activityType, // 'login', 'create', 'update', 'delete', 'move', 'import', 'export', 'schedule', etc.
        description,
        entityType, // 'candidate', 'job', 'application', 'interview', 'user', etc.
        entityId,
        metadata,
        userEmail: user.email,
        userName: user.displayName || user.email,
        userPhoto: user.photoURL || null,
        userRole: currentUserRole,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao registrar atividade:', error);
    }
  };

  // Função para registrar log de movimentação de status do candidato
  const recordStatusMovement = async (candidateId, candidateName, previousStatus, newStatus) => {
    if (!user || !user.email) return;
    
    const isClosingStatus = CLOSING_STATUSES.includes(newStatus);
    
    try {
      await addDoc(collection(db, 'statusMovements'), {
        candidateId,
        candidateName: candidateName || 'Candidato',
        previousStatus: previousStatus || 'Inscrito',
        newStatus,
        isClosingStatus,
        userEmail: user.email,
        userName: user.displayName || user.email,
        userPhoto: user.photoURL || null,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      
      // Registrar também no log de atividades
      await recordActivity('move', `${candidateName} movido de "${previousStatus || 'Inscrito'}" para "${newStatus}"`, 'candidate', candidateId, { previousStatus: previousStatus || 'Inscrito', newStatus, isClosingStatus });
      
      console.log(`[Log] Movimentação registrada: ${candidateName} de "${previousStatus || 'Inscrito'}" para "${newStatus}"`);
    } catch (error) {
      console.error('Erro ao registrar movimentação de status:', error);
      // Não interrompe a operação principal se o log falhar
    }
  };

  // ======= SISTEMA DE CANDIDATURAS (APPLICATIONS) =======
  
  // Criar nova candidatura (candidato se candidata a uma vaga)
  const createApplication = async (candidateId, jobId) => {
    if (!user || !user.email) return null;
    
    // Verifica se já existe candidatura
    const existingApp = applications.find(a => a.candidateId === candidateId && a.jobId === jobId);
    if (existingApp) {
      showToast('Candidato já está vinculado a esta vaga', 'info');
      return existingApp;
    }
    
    const candidate = candidates.find(c => c.id === candidateId);
    const job = jobs.find(j => j.id === jobId);
    
    try {
      const appData = {
        candidateId,
        candidateName: candidate?.fullName || 'Candidato',
        candidateEmail: candidate?.email || '',
        jobId,
        jobTitle: job?.title || 'Vaga',
        jobCompany: job?.company || '',
        status: 'Inscrito', // Status inicial na vaga
        appliedAt: serverTimestamp(),
        lastActivity: serverTimestamp(), // Atualizado automaticamente
        rating: 0, // Qualificação 1-5 estrelas
        closedAt: null,
        closedReason: null,
        createdBy: user.email,
        createdAt: serverTimestamp(),
        notes: []
      };
      
      const docRef = await addDoc(collection(db, 'applications'), appData);
      showToast(`${candidate?.fullName} vinculado à vaga ${job?.title}`, 'success');
      return { id: docRef.id, ...appData };
    } catch (error) {
      console.error('Erro ao criar candidatura:', error);
      showToast('Erro ao vincular candidato à vaga', 'error');
      return null;
    }
  };
  
  // Atualizar status da candidatura
  const updateApplicationStatus = async (applicationId, newStatus, notes = '') => {
    if (!user || !user.email) return;
    
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;
    
    try {
      const updateData = {
        status: newStatus,
        lastActivity: serverTimestamp(), // Atualiza atividade automaticamente
        updatedAt: serverTimestamp(),
        updatedBy: user.email
      };
      
      // Se for status de fechamento, marca data de fechamento
      if (CLOSING_STATUSES.includes(newStatus)) {
        updateData.closedAt = serverTimestamp();
        updateData.closedReason = newStatus;
      }
      
      await updateDoc(doc(db, 'applications', applicationId), updateData);
      
      // Registra movimentação específica da candidatura
      await addDoc(collection(db, 'statusMovements'), {
        candidateId: app.candidateId,
        candidateName: app.candidateName,
        jobId: app.jobId,
        jobTitle: app.jobTitle,
        applicationId,
        previousStatus: app.status,
        newStatus,
        isClosingStatus: CLOSING_STATUSES.includes(newStatus),
        userEmail: user.email,
        userName: user.displayName || user.email,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      
      showToast('Status da candidatura atualizado', 'success');
    } catch (error) {
      console.error('Erro ao atualizar candidatura:', error);
      showToast('Erro ao atualizar candidatura', 'error');
    }
  };
  
  // Remover candidatura
  const removeApplication = async (applicationId) => {
    if (!window.confirm('Remover este candidato da vaga?')) return;
    
    try {
      await deleteDoc(doc(db, 'applications', applicationId));
      showToast('Candidato removido da vaga', 'success');
    } catch (error) {
      console.error('Erro ao remover candidatura:', error);
      showToast('Erro ao remover candidatura', 'error');
    }
  };
  
  // Adicionar nota à candidatura
  const addApplicationNote = async (applicationId, noteText) => {
    if (!user || !user.email || !noteText.trim()) return;
    
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;
    
    try {
      const existingNotes = app.notes || [];
      const newNote = {
        text: noteText.trim(),
        timestamp: new Date().toISOString(),
        userEmail: user.email,
        userName: user.displayName || user.email
      };
      
      await updateDoc(doc(db, 'applications', applicationId), {
        notes: [newNote, ...existingNotes],
        updatedAt: serverTimestamp()
      });
      
      showToast('Nota adicionada', 'success');
    } catch (error) {
      console.error('Erro ao adicionar nota:', error);
      showToast('Erro ao adicionar nota', 'error');
    }
  };

  // ======= SISTEMA DE AGENDAMENTO DE ENTREVISTAS =======
  
  // Criar agendamento de entrevista
  const scheduleInterview = async (data) => {
    if (!user || !user.email) return null;
    if (!hasPermission('schedule_interviews') && !hasPermission('all')) {
      showToast('Sem permissão para agendar entrevistas', 'error');
      return null;
    }
    
    try {
      const interviewData = {
        candidateId: data.candidateId,
        candidateName: data.candidateName || '',
        candidateEmail: data.candidateEmail || '',
        jobId: data.jobId || null,
        jobTitle: data.jobTitle || '',
        applicationId: data.applicationId || null,
        type: data.type || 'Entrevista', // Entrevista, Teste, Dinâmica
        date: data.date, // YYYY-MM-DD
        time: data.time, // HH:MM
        duration: data.duration || 60, // minutos
        location: data.location || '', // Local físico ou link
        isOnline: data.isOnline || false,
        meetingLink: data.meetingLink || '',
        interviewers: data.interviewers || [], // emails dos entrevistadores
        notes: data.notes || '',
        status: 'Agendada', // Agendada, Confirmada, Realizada, Cancelada, NoShow
        createdBy: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'interviews'), interviewData);
      
      // Registrar atividade
      await recordActivity('schedule', `Entrevista agendada para ${data.candidateName} em ${data.date} às ${data.time}`, 'interview', docRef.id, { candidateId: data.candidateId, jobId: data.jobId, date: data.date, time: data.time });
      
      showToast('Entrevista agendada com sucesso!', 'success');
      return { id: docRef.id, ...interviewData };
    } catch (error) {
      console.error('Erro ao agendar entrevista:', error);
      showToast('Erro ao agendar entrevista', 'error');
      return null;
    }
  };
  
  // Atualizar status da entrevista
  const updateInterviewStatus = async (interviewId, newStatus, feedback = '') => {
    if (!user || !user.email) return;
    
    try {
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: user.email
      };
      
      if (feedback) {
        updateData.feedback = feedback;
      }
      
      if (newStatus === 'Realizada') {
        updateData.completedAt = serverTimestamp();
      }
      
      await updateDoc(doc(db, 'interviews', interviewId), updateData);
      showToast('Status da entrevista atualizado', 'success');
    } catch (error) {
      console.error('Erro ao atualizar entrevista:', error);
      showToast('Erro ao atualizar entrevista', 'error');
    }
  };
  
  // Cancelar entrevista
  const cancelInterview = async (interviewId, reason = '') => {
    if (!window.confirm('Cancelar esta entrevista?')) return;
    
    try {
      await updateDoc(doc(db, 'interviews', interviewId), {
        status: 'Cancelada',
        cancelReason: reason,
        cancelledAt: serverTimestamp(),
        cancelledBy: user?.email
      });
      showToast('Entrevista cancelada', 'success');
    } catch (error) {
      console.error('Erro ao cancelar entrevista:', error);
      showToast('Erro ao cancelar entrevista', 'error');
    }
  };
  
  // ======= GERENCIAMENTO DE USUÁRIOS E ROLES =======
  
  // Adicionar/atualizar role de usuário
  const setUserRole = async (email, role, userName = '') => {
    if (!hasPermission('all')) {
      showToast('Apenas administradores podem gerenciar usuários', 'error');
      return;
    }
    
    try {
      const existingRole = userRoles.find(r => r.email === email);
      
      if (existingRole) {
        await updateDoc(doc(db, 'userRoles', existingRole.id), {
          role,
          name: userName || existingRole.name || '',
          updatedAt: serverTimestamp(),
          updatedBy: user?.email
        });
        
        // Registrar atividade
        await recordActivity('user_update', `Permissão de ${email} alterada para ${role}`, 'user', existingRole.id, { email, role, previousRole: existingRole.role });
      } else {
        const docRef = await addDoc(collection(db, 'userRoles'), {
          email,
          role,
          name: userName || '',
          createdAt: serverTimestamp(),
          createdBy: user?.email
        });
        
        // Registrar atividade
        await recordActivity('user_create', `Usuário ${email} adicionado como ${role}`, 'user', docRef.id, { email, role });
      }
      
      showToast(`Permissão de ${email} atualizada para ${role}`, 'success');
    } catch (error) {
      console.error('Erro ao definir role:', error);
      showToast('Erro ao atualizar permissão', 'error');
    }
  };
  
  // Remover usuário
  const removeUserRole = async (roleId) => {
    if (!hasPermission('all')) {
      showToast('Apenas administradores podem gerenciar usuários', 'error');
      return;
    }
    
    if (!window.confirm('Remover acesso deste usuário?')) return;
    
    try {
      await deleteDoc(doc(db, 'userRoles', roleId));
      showToast('Acesso removido', 'success');
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      showToast('Erro ao remover acesso', 'error');
    }
  };

  const computeMissingFields = (candidate, nextStatus) => {
    const required = STAGE_REQUIRED_FIELDS[nextStatus] || [];
    return required.filter((field) => {
      const value = candidate[field];
      return value === undefined || value === null || value === '';
    });
  };

  // --- LÓGICA DE MOVIMENTO DE CARDS COM VALIDAÇÃO ---
  const handleDragEnd = async (cId, newStage) => {
    const candidate = candidates.find(c => c.id === cId);
    if (!candidate || candidate.status === newStage || !ALL_STATUSES.includes(newStage)) return;

    // Validar se precisa de candidatura (a partir de "Considerado")
    // IMPORTANTE: Usar apenas applications como fonte de verdade, não candidate.jobId
    const stagesRequiringApplication = PIPELINE_STAGES.slice(PIPELINE_STAGES.indexOf('Considerado'));
    const needsApplication = stagesRequiringApplication.includes(newStage);
    if (needsApplication) {
      const candidateApplications = applications.filter(a => a.candidateId === cId);
      if (candidateApplications.length === 0) {
        showToast('É necessário vincular o candidato a uma vaga antes de avançar para esta etapa. Use o botão "Vincular a Vaga" no perfil do candidato.', 'error');
        return;
      }
    }

    const missingFields = computeMissingFields(candidate, newStage);
    const isConclusion = CLOSING_STATUSES.includes(newStage);

    // Para conclusões ou quando há campos obrigatórios faltando, abre modal
    if (isConclusion || missingFields.length > 0) {
      setPendingTransition({
        candidate,
        toStage: newStage,
        missingFields,
        isConclusion
      });
      return;
    }

    // Movimentação direta quando não há pendências
    const previousStatus = candidate.status || 'Inscrito';
    await updateDoc(doc(db, 'candidates', cId), { status: newStage, updatedAt: serverTimestamp() });
    
    // Registra log de movimentação
    await recordStatusMovement(cId, candidate.fullName, previousStatus, newStage);
    
    // Sincroniza status em TODAS as aplicações do candidato (não apenas fechamento)
    const candidateApplications = applications.filter(app => app.candidateId === cId);
    if (candidateApplications.length > 0) {
      const batch = writeBatch(db);
      candidateApplications.forEach(app => {
        const appRef = doc(db, 'applications', app.id);
        const updateData = {
          status: newStage,
          lastActivity: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // Se for status de fechamento, adiciona campos de fechamento
        if (CLOSING_STATUSES.includes(newStage)) {
          updateData.closedAt = serverTimestamp();
          updateData.closedReason = newStage;
        }
        
        batch.update(appRef, updateData);
      });
      await batch.commit();
    }
    
    showToast('Status atualizado', 'success');
  };

  const handleCloseStatus = (cId, status) => {
     handleDragEnd(cId, status); // Reutiliza a lógica do DragEnd para acionar o modal se necessário
  };

  // Filtra candidatos baseado nos filtros da Sidebar (Avançados)
  const filteredCandidates = useMemo(() => {
    // Filtrar registros deletados (soft delete)
    let data = candidates.filter(c => !c.deletedAt);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const preset = filters.createdAtPreset || 'all';
    const presetToSeconds = {
      'today': 1 * 24 * 60 * 60,
      'yesterday': 2 * 24 * 60 * 60,
      '7d': 7 * 24 * 60 * 60,
      '30d': 30 * 24 * 60 * 60,
      '90d': 90 * 24 * 60 * 60,
    };

    Object.keys(filters).forEach(key => {
       if(filters[key] !== 'all' && filters[key] !== '') {
          if (key === 'createdAtPreset' || key === 'customDateStart' || key === 'customDateEnd' || key === 'tags') return;
          
          // Suporta arrays para seleção múltipla
          if (Array.isArray(filters[key])) {
            if (filters[key].length > 0) {
              data = data.filter(c => filters[key].includes(c[key]));
            }
          } else {
          data = data.filter(c => c[key] === filters[key]);
          }
       }
    });
    
    // Filtro por tags (seleção múltipla)
    if (filters.tags && filters.tags !== 'all' && Array.isArray(filters.tags) && filters.tags.length > 0) {
      data = data.filter(c => {
        if (!c.tags || !Array.isArray(c.tags)) return false;
        return filters.tags.some(tag => c.tags.includes(tag));
      });
    }
    
    // Filtro por período - USANDO DATA DE CADASTRO ORIGINAL
    if (preset === 'custom' && filters.customDateStart && filters.customDateEnd) {
      const startDate = new Date(filters.customDateStart).getTime() / 1000;
      const endDate = new Date(filters.customDateEnd).getTime() / 1000 + 86400; // +1 dia para incluir o dia final
      data = data.filter(c => {
        const ts = getCandidateTimestamp(c);
        if (!ts) return false;
        return ts >= startDate && ts <= endDate;
      });
    } else if (preset === 'today') {
      // Hoje: do início do dia até agora
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const startTs = todayStart.getTime() / 1000;
      data = data.filter(c => {
        const ts = getCandidateTimestamp(c);
        if (!ts) return false;
        return ts >= startTs;
      });
    } else if (preset === 'yesterday') {
      // Ontem: do início de ontem até o início de hoje
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const startTs = yesterdayStart.getTime() / 1000;
      const endTs = todayStart.getTime() / 1000;
      data = data.filter(c => {
        const ts = getCandidateTimestamp(c);
        if (!ts) return false;
        return ts >= startTs && ts < endTs;
      });
    } else if (preset !== 'all') {
      const delta = presetToSeconds[preset];
      if (delta) {
        data = data.filter(c => {
          const ts = getCandidateTimestamp(c);
          if (!ts) return false;
          return ts >= nowSeconds - delta;
        });
      }
    }
    return data;
  }, [candidates, filters]);

  const optionsProps = { jobs, companies, cities, interestAreas, roles, origins, schooling, marital, tags, userRoles, user };

  // Verificar se Firebase foi inicializado corretamente
  if (!auth || !db) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-w-md">
          <AlertCircle className="mx-auto mb-4 text-red-600 dark:text-red-400" size={48} />
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Erro de Configuração</h2>
          <p className="text-red-700 dark:text-red-300 mb-4">
            Firebase não foi inicializado corretamente. Verifique as variáveis de ambiente no Vercel.
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Abra o console do navegador (F12) para mais detalhes.
          </p>
        </div>
      </div>
    );
  }

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400"><Loader2 className="animate-spin mr-2"/> Carregando...</div>;
  
  // Rotas públicas (acessíveis sem autenticação)
  return (
    <Routes>
      <Route path="/apply" element={<PublicCandidateForm />} />
      <Route path="/apply/thank-you" element={<ThankYouPage />} />
      
      {/* Rotas protegidas - requerem autenticação */}
      {!user ? (
        <Route path="*" element={<LoginScreen onLogin={handleGoogleLogin} onEmailLogin={handleEmailLogin} onForgotPassword={handleForgotPassword} />} />
      ) : (
        <>
          <Route path="/candidate/:id" element={
        <CandidateProfilePage
          candidates={candidates}
          jobs={jobs}
          companies={companies}
          applications={applications}
          interviews={interviews}
          statusMovements={statusMovements}
          onUpdateCandidate={(updatedCandidate) => {
            // Atualiza o candidato na lista local se necessário
            const index = candidates.findIndex(c => c.id === updatedCandidate.id);
            if (index >= 0) {
              // A atualização já foi feita no Firestore, apenas sincroniza localmente se necessário
            }
          }}
          onCreateApplication={createApplication}
          onScheduleInterview={(candidate) => setInterviewModalData({ candidate })}
          onStatusChange={handleDragEnd}
        />
      } />
      <Route path="*" element={
    <div className="flex min-h-screen bg-white dark:bg-gray-900 font-sans text-slate-200 overflow-hidden">
      
      {/* SIDEBAR PRINCIPAL */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${!isSidebarCollapsed ? 'lg:translate-x-0' : 'lg:-translate-x-full'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <img 
               src="/logo-young-empreendimentos-caixa.png" 
               alt="Young" 
               className="h-10 w-10 rounded-lg"
             />
             <div>
               <div className="font-bold text-gray-900 dark:text-white text-sm">Young Talents</div>
               <div className="text-xs text-gray-500 dark:text-gray-400">ATS</div>
             </div>
           </div>
           <button onClick={()=>setIsSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><X/></button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
           {/* Dashboard */}
           <button onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg dark:bg-blue-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}`}>
             <LayoutDashboard size={18}/> Dashboard
           </button>
           
           {/* Pipeline */}
           <button onClick={() => { setActiveTab('pipeline'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'pipeline' ? 'bg-blue-600 text-white shadow-lg dark:bg-blue-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}`}>
             <Kanban size={18}/> Pipeline
           </button>
           
           {/* Banco de Talentos */}
           <button onClick={() => { setActiveTab('candidates'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'candidates' ? 'bg-blue-600 text-white shadow-lg dark:bg-blue-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}`}>
             <Users size={18}/> Banco de Talentos
           </button>
           
           {/* Vagas - com submenu */}
           <div>
             <button onClick={() => { setActiveTab(activeTab === 'jobs' ? 'jobs' : 'jobs'); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${['jobs', 'applications', 'companies', 'positions', 'sectors', 'cities'].includes(activeTab) ? 'bg-blue-600 text-white shadow-lg dark:bg-blue-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}`}>
               <div className="flex items-center gap-3">
                 <Briefcase size={18}/> Vagas
               </div>
               <ChevronRight size={16} className={`transition-transform ${['jobs', 'applications', 'companies', 'positions', 'sectors', 'cities'].includes(activeTab) ? 'rotate-90' : ''}`}/>
             </button>
             {['jobs', 'applications', 'companies', 'positions', 'sectors', 'cities'].includes(activeTab) && (
               <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-300 dark:border-gray-600 pl-4">
                 <button onClick={() => { setActiveTab('jobs'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'jobs' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                   Vagas
                 </button>
                 <button onClick={() => { setActiveTab('applications'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'applications' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                   Candidaturas
                 </button>
                 <button onClick={() => { setActiveTab('companies'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'companies' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                   Empresas
                 </button>
                 <button onClick={() => { setActiveTab('positions'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'positions' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                   Cargos
                 </button>
                 <button onClick={() => { setActiveTab('sectors'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'sectors' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                   Setores
                 </button>
                 <button onClick={() => { setActiveTab('cities'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'cities' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                   Cidades
                 </button>
               </div>
             )}
           </div>
           
           {/* Relatórios */}
           <button onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'reports' ? 'bg-blue-600 text-white shadow-lg dark:bg-blue-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}`}>
             <BarChart3 size={18}/> Relatórios
           </button>
           
           {/* Configurações */}
           <button onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg dark:bg-blue-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}`}>
             <Settings size={18}/> Configurações
           </button>

           {/* Diagnóstico */}
           <button onClick={() => { setActiveTab('diagnostic'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'diagnostic' ? 'bg-blue-600 text-white shadow-lg dark:bg-blue-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}`}>
             <AlertCircle size={18}/> Diagnóstico
           </button>
           
           {/* Ajuda */}
           <button onClick={() => { setActiveTab('help'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'help' ? 'bg-blue-600 text-white shadow-lg dark:bg-blue-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}`}>
             <HelpCircle size={18}/> Ajuda
           </button>
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 flex items-center justify-between">
           <div className="text-xs text-slate-400 truncate w-32">{user.email}</div>
           <button onClick={()=>signOut(auth)}><LogOut size={16} className="text-red-400 hover:text-red-300"/></button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${!isSidebarCollapsed ? 'lg:pl-64' : 'lg:pl-0'}`}>
        <header className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between px-4 z-20">
           <div className="flex items-center gap-2">
             {/* Botão mobile */}
             <button 
               onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
               className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
             >
               <Menu size={20} className="text-gray-600 dark:text-gray-400"/>
             </button>
             {/* Botão desktop - ocultar/mostrar menu */}
             <button 
               onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
               className="hidden lg:flex p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
               title={isSidebarCollapsed ? 'Mostrar menu' : 'Ocultar menu'}
             >
               {isSidebarCollapsed ? <Menu size={20} className="text-gray-600 dark:text-gray-400"/> : <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400"/>}
             </button>
           <h2 className="text-lg font-bold text-gray-900 dark:text-white ml-2">
              {activeTab === 'pipeline' ? 'Pipeline de Talentos' : activeTab === 'candidates' ? 'Banco de Talentos' : activeTab === 'jobs' ? 'Gestão de Vagas' : activeTab === 'applications' ? 'Candidaturas' : activeTab === 'settings' ? 'Configurações' : activeTab === 'diagnostic' ? 'Diagnóstico' : activeTab === 'reports' ? 'Relatórios' : activeTab === 'help' ? 'Ajuda' : 'Dashboard'}
           </h2>
           </div>
           <div className="flex items-center gap-3">
              <button onClick={() => setIsFilterSidebarOpen(true)} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                 <Filter size={16}/> Filtros
              </button>
              <button onClick={toggleTheme} className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded border border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                 {isDark ? <Sun size={18}/> : <Moon size={18}/>}
              </button>
           </div>
        </header>

        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900 relative">
           {activeTab === 'dashboard' && <div className="p-6 overflow-y-auto h-full"><Dashboard filteredJobs={jobs} filteredCandidates={filteredCandidates} onOpenCandidates={setDashboardModalCandidates} statusMovements={statusMovements} applications={applications} onViewJob={openJobCandidatesModal} interviews={interviews} onScheduleInterview={(candidate) => setInterviewModalData({ candidate })} /></div>}
           {activeTab === 'pipeline' && <PipelineView candidates={filteredCandidates} jobs={jobs} companies={companies} onDragEnd={handleDragEnd} onEdit={openCandidateProfile} onCloseStatus={handleCloseStatus} applications={applications} interviews={interviews} forceViewMode="kanban" highlightedCandidateId={highlightedCandidateId} />}
           {activeTab === 'candidates' && <TalentBankView candidates={filteredCandidates} jobs={jobs} companies={companies} onEdit={openCandidateProfile} applications={applications} onStatusChange={handleDragEnd} />}
           {activeTab === 'jobs' && <div className="p-6 overflow-y-auto h-full"><JobsList jobs={jobs} candidates={candidates} companies={companies} onAdd={()=>openJobModal({})} onEdit={(j)=>openJobModal(j)} onDelete={(id)=>handleDeleteGeneric('jobs', id)} onToggleStatus={handleSaveGeneric} onFilterPipeline={()=>{setFilters({...filters, jobId: 'mock_id'}); setActiveTab('candidates')}} onViewCandidates={openJobCandidatesModal}/></div>}
           {activeTab === 'applications' && <ApplicationsPage applications={applications} candidates={candidates} jobs={jobs} companies={companies} onUpdateApplicationStatus={updateApplicationStatus} onRemoveApplication={removeApplication} onAddApplicationNote={addApplicationNote} onEditCandidate={openCandidateProfile} onViewJob={openJobCandidatesModal} onCreateApplication={createApplication} />}
           {activeTab === 'companies' && <MasterDataManager collection="companies" title="Empresas" fields={[{key: 'name', label: 'Nome', required: true}]} onSave={handleSaveGeneric} onDelete={handleDeleteGeneric} items={companies} onShowToast={showToast} />}
           {activeTab === 'positions' && <MasterDataManager collection="positions" title="Cargos" fields={[{key: 'name', label: 'Nome', required: true}, {key: 'level', label: 'Nível', required: false}]} onSave={handleSaveGeneric} onDelete={handleDeleteGeneric} items={roles} onShowToast={showToast} />}
           {activeTab === 'sectors' && <MasterDataManager collection="sectors" title="Setores" fields={[{key: 'name', label: 'Nome', required: true}]} onSave={handleSaveGeneric} onDelete={handleDeleteGeneric} items={sectors} onShowToast={showToast} />}
           {activeTab === 'cities' && <MasterDataManager collection="cities" title="Cidades" fields={[{key: 'name', label: 'Nome', required: true}]} onSave={handleSaveGeneric} onDelete={handleDeleteGeneric} items={cities} onShowToast={showToast} />}
           {activeTab === 'reports' && <ReportsPage candidates={candidates} jobs={jobs} applications={applications} statusMovements={statusMovements} />}
           {activeTab === 'help' && <HelpPage />}
           {activeTab === 'diagnostic' && <div className="p-6 overflow-y-auto h-full"><DiagnosticPage candidates={candidates} /></div>}
           {activeTab === 'settings' && <div className="p-0 h-full"><SettingsPage {...optionsProps} onOpenCsvModal={openCsvModal} activeSettingsTab={route.settingsTab} onSettingsTabChange={(tab) => { const params = new URLSearchParams(location.search); params.set('settingsTab', tab); navigate(`${location.pathname}?${params.toString()}`); setRoute(prev => ({ ...prev, settingsTab: tab })); }} onShowToast={showToast} userRoles={userRoles} currentUserRole={currentUserRole} onSetUserRole={setUserRole} onRemoveUserRole={removeUserRole} currentUserEmail={user?.email} currentUserName={user?.displayName} currentUserPhoto={user?.photoURL} activityLog={activityLog} candidateFields={CANDIDATE_FIELDS} /></div>}
        </div>
      </div>

      <FilterSidebar isOpen={isFilterSidebarOpen} onClose={() => setIsFilterSidebarOpen(false)} filters={filters} setFilters={setFilters} clearFilters={() => setFilters(initialFilters)} options={optionsProps} candidates={candidates} />

      {/* MODAIS GLOBAIS - CORRIGIDO PASSAGEM DE PROPS */}
      {isJobModalOpen && <JobModal isOpen={isJobModalOpen} job={editingJob} onClose={closeJobModal} onSave={d => handleSaveGeneric('jobs', d, closeJobModal)} options={optionsProps} isSaving={isSaving} candidates={candidates} />}
      {editingCandidate && <CandidateModal 
        candidate={editingCandidate} 
        onClose={() => setEditingCandidate(null)} 
        onSave={d => handleSaveGeneric('candidates', d, () => setEditingCandidate(null))} 
        options={optionsProps} 
        isSaving={isSaving} 
        statusMovements={statusMovements}
        interviews={interviews}
        onScheduleInterview={(candidate) => setInterviewModalData({ candidate })}
        allCandidates={candidates}
        applications={applications}
        onCreateApplication={createApplication}
        jobs={jobs}
        onAddNote={async (candidateId, noteText) => {
          const candidateRef = doc(db, 'candidates', candidateId);
          const candidateDoc = candidates.find(c => c.id === candidateId);
          const existingNotes = candidateDoc?.notes || [];
          const newNote = {
            text: noteText,
            timestamp: new Date().toISOString(),
            userEmail: user?.email || 'unknown',
            userName: user?.displayName || user?.email || 'Usuário'
          };
          await updateDoc(candidateRef, {
            notes: [newNote, ...existingNotes],
            updatedAt: serverTimestamp()
          });
          showToast('Nota adicionada', 'success');
        }}
        onAdvanceStage={async (candidate, newStage) => {
          const missingFields = computeMissingFields(candidate, newStage);
          const isConclusion = CLOSING_STATUSES.includes(newStage);
          if (isConclusion || missingFields.length > 0) {
            setPendingTransition({ candidate, toStage: newStage, missingFields, isConclusion });
          } else {
            const previousStatus = candidate.status || 'Inscrito';
            await updateDoc(doc(db, 'candidates', candidate.id), { status: newStage, updatedAt: serverTimestamp() });
            await recordStatusMovement(candidate.id, candidate.fullName, previousStatus, newStage);
            
            // Sincroniza status nas aplicações se for status de fechamento
            if (CLOSING_STATUSES.includes(newStage)) {
              const candidateApplications = applications.filter(app => app.candidateId === candidate.id);
              if (candidateApplications.length > 0) {
                const batch = writeBatch(db);
                candidateApplications.forEach(app => {
                  const appRef = doc(db, 'applications', app.id);
                  batch.update(appRef, {
                    status: newStage,
                    updatedAt: serverTimestamp(),
                    closedAt: serverTimestamp(),
                    closedReason: newStage
                  });
                });
                await batch.commit();
              }
            }
            
            showToast('Status atualizado', 'success');
          }
        }} 
      />}
      
      {/* CORREÇÃO IMPORTANTE: Passando todas as props necessárias para o TransitionModal */}
      {pendingTransition && (
        <TransitionModal 
          transition={pendingTransition} 
          onClose={() => setPendingTransition(null)} 
          onConfirm={async d => {
            const payload = {
              id: pendingTransition.candidate.id,
              ...d,
              status: pendingTransition.toStage,
              updatedAt: serverTimestamp()
            };
            if (pendingTransition.isConclusion) {
              payload.closedAt = serverTimestamp();
            }
            
            // Registra log de movimentação ANTES de salvar
            const previousStatus = pendingTransition.candidate.status || 'Inscrito';
            await recordStatusMovement(
              pendingTransition.candidate.id, 
              pendingTransition.candidate.fullName || d.fullName, 
              previousStatus, 
              pendingTransition.toStage
            );
            
            // Sincroniza status nas aplicações se for status de fechamento
            if (CLOSING_STATUSES.includes(pendingTransition.toStage)) {
              const candidateApplications = applications.filter(app => app.candidateId === pendingTransition.candidate.id);
              const batch = writeBatch(db);
              
              candidateApplications.forEach(app => {
                const appRef = doc(db, 'applications', app.id);
                batch.update(appRef, {
                  status: pendingTransition.toStage,
                  updatedAt: serverTimestamp(),
                  closedAt: serverTimestamp(),
                  closedReason: pendingTransition.toStage
                });
              });
              
              if (candidateApplications.length > 0) {
                await batch.commit();
              }
            }
            
            handleSaveGeneric('candidates', payload, () => setPendingTransition(null));
          }} 
          cities={cities} 
          interestAreas={interestAreas}
          schooling={schooling}
          marital={marital}
          origins={origins}
        />
      )}
      
      <CsvImportModal 
        isOpen={isCsvModalOpen} 
        onClose={closeCsvModal}
        existingCandidates={candidates}
        onImportData={async (candidatesData, importMode) => {
          setIsSaving(true);
          try {
            const BATCH_SIZE = 400; // Limite do Firestore é 500, usamos 400 para segurança
            let imported = 0;
            let skipped = 0;
            let updated = 0;
            let duplicated = 0;

            // Processa em lotes
            for (let i = 0; i < candidatesData.length; i += BATCH_SIZE) {
              const batch = writeBatch(db);
              const chunk = candidatesData.slice(i, i + BATCH_SIZE);
              let batchOps = 0;

              for (const candidateData of chunk) {
                const email = candidateData.email?.toLowerCase().trim();
                if (!email) {
                  skipped++;
                  continue;
                }

                // Busca candidato existente por email
                const existingCandidate = candidates.find(c => 
                  c.email?.toLowerCase().trim() === email
                );

                if (existingCandidate) {
                  if (importMode === 'skip') {
                    skipped++;
                    continue;
                  } else if (importMode === 'overwrite') {
                    const candidateRef = doc(db, 'candidates', existingCandidate.id);
                    const updateData = {
                      ...candidateData,
                      updatedAt: serverTimestamp()
                    };
                    if (user && user.email) {
                      updateData.updatedBy = user.email;
                    }
                    batch.update(candidateRef, updateData);
                    updated++;
                    batchOps++;
                  } else if (importMode === 'duplicate') {
                    const candidateRef = doc(collection(db, 'candidates'));
                    const duplicateData = {
                      ...candidateData,
                      createdAt: serverTimestamp(),
                      origin: 'csv_import', // Origem: importado via CSV
                      imported: true
                    };
                    if (user && user.email) {
                      duplicateData.createdBy = user.email;
                      duplicateData.responsibleUser = user.email;
                    }
                    if (!duplicateData.tags) {
                      duplicateData.tags = [];
                    }
                    if (candidateData.importTag) {
                      if (!duplicateData.tags.includes(candidateData.importTag)) {
                        duplicateData.tags.push(candidateData.importTag);
                      }
                    }
                    batch.set(candidateRef, duplicateData);
                    duplicated++;
                    batchOps++;
                  }
                } else {
                  // Novo candidato
                  const candidateRef = doc(collection(db, 'candidates'));
                  const newCandidateData = {
                    ...candidateData,
                    createdAt: serverTimestamp(),
                    origin: 'csv_import', // Origem: importado via CSV
                    imported: true
                  };
                  if (user && user.email) {
                    newCandidateData.createdBy = user.email;
                    newCandidateData.responsibleUser = user.email; // Usuário responsável
                  }
                  // Garante que tags seja um array
                  if (!newCandidateData.tags) {
                    newCandidateData.tags = [];
                  }
                  // Adiciona tag de importação se houver
                  if (candidateData.importTag) {
                    if (!newCandidateData.tags.includes(candidateData.importTag)) {
                      newCandidateData.tags.push(candidateData.importTag);
                    }
                  }
                  batch.set(candidateRef, newCandidateData);
                  imported++;
                  batchOps++;
                }
              }

              if (batchOps > 0) {
                await batch.commit();
              }
            }
            
            // Registra histórico da importação
            const totalAffected = imported + updated + duplicated;
            if (totalAffected > 0) {
              await recordActionHistory({
                action: 'importação_csv',
                collection: 'candidates',
                recordsAffected: totalAffected,
                details: {
                  imported,
                  updated,
                  duplicated,
                  skipped,
                  importMode,
                  totalProcessed: candidatesData.length
                }
              });
            }
            
            const message = `Importação concluída! ${imported} novos, ${updated} atualizados, ${duplicated} duplicados, ${skipped} ignorados.`;
            showToast(message, 'success');
            closeCsvModal();
          } catch (error) {
            console.error('Erro na importação:', error);
            showToast(`Erro ao importar: ${error.message}`, 'error');
          } finally {
            setIsSaving(false);
          }
        }} 
      />
      <JobCandidatesModal 
        isOpen={!!viewingJob} 
        onClose={closeJobCandidatesModal} 
        job={viewingJob} 
        candidates={candidates}
        applications={applications}
        onCreateApplication={createApplication}
        onUpdateApplicationStatus={updateApplicationStatus}
        onRemoveApplication={removeApplication}
        onAddApplicationNote={addApplicationNote}
        onEditCandidate={openCandidateProfile}
      />
      <DashboardCandidatesModal 
        isOpen={!!dashboardModalCandidates} 
        onClose={() => {
          setDashboardModalCandidates(null);
          setDashboardModalTitle('');
        }} 
        title={dashboardModalTitle || 'Candidatos do Dashboard'}
        candidates={dashboardModalCandidates || []}
        onViewProfile={openCandidateProfile}
        onViewPipeline={(candidate) => {
          setHighlightedCandidateId(candidate.id);
          setActiveTab('pipeline');
          // Scroll para o candidato destacado será feito no PipelineView
        }}
      />
      
      {/* Modal de Agendamento de Entrevista */}
      {interviewModalData && (
        <InterviewModal
          isOpen={true}
          onClose={() => setInterviewModalData(null)}
          onSchedule={scheduleInterview}
          candidate={interviewModalData.candidate}
          job={interviewModalData.job}
          application={interviewModalData.application}
        />
      )}
      
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[70] px-4 py-3 rounded-lg shadow-lg border text-sm ${
          toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40' :
          toast.type === 'error' ? 'bg-red-500/20 text-red-200 border-red-500/40' :
          'bg-slate-800 text-slate-200 border-slate-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
      } />
        </>
      )}
    </Routes>
  );
}

// --- PIPELINE VIEW ---
const PipelineView = ({ candidates, jobs, onDragEnd, onEdit, onCloseStatus, companies, applications = [], interviews = [], forceViewMode = null, highlightedCandidateId = null }) => {
  const [viewMode, setViewMode] = useState(forceViewMode || 'kanban'); 
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [kanbanItemsPerPage, setKanbanItemsPerPage] = useState(10); // Itens por coluna no kanban
  const [selectedIds, setSelectedIds] = useState([]);
  const [localSearch, setLocalSearch] = useState('');
  const [localSort, setLocalSort] = useState('recent');
  const [statusFilter, setStatusFilter] = useState('active'); // active, hired, rejected
  const [pipelineStatusFilter, setPipelineStatusFilter] = useState('all'); // Filtro específico por etapa
  const [jobFilter, setJobFilter] = useState('all');
  
  // Scroll para o candidato destacado quando ele aparecer
  useEffect(() => {
    if (highlightedCandidateId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`candidate-${highlightedCandidateId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Remove o destaque após 5 segundos
          setTimeout(() => {
            // O destaque será removido quando highlightedCandidateId mudar
          }, 5000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [highlightedCandidateId]);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [showColorPicker, setShowColorPicker] = useState(false); // Para mostrar/ocultar o seletor de cores

  useEffect(() => {
    setSelectedIds([]);
    setCurrentPage(1); // Reset página ao mudar filtros
  }, [candidates, statusFilter, localSearch, localSort, pipelineStatusFilter, jobFilter, companyFilter, cityFilter]);

  const handleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleSelectAll = () => selectedIds.length === processedData.length ? setSelectedIds([]) : setSelectedIds(processedData.map(c => c.id));

  const processedData = useMemo(() => {
     // Filtrar registros deletados (soft delete)
     let data = Array.isArray(candidates) ? candidates.filter(c => !c.deletedAt) : [];
     if (statusFilter === 'active') data = data.filter(c => PIPELINE_STAGES.includes(c.status) || !c.status);
     else if (statusFilter === 'hired') data = data.filter(c => c.status === 'Contratado');
     else if (statusFilter === 'rejected') data = data.filter(c => c.status === 'Reprovado');
     else if (statusFilter === 'withdrawn') data = data.filter(c => c.status === 'Desistiu da vaga');
     
     // Filtros adicionais para modo lista
     if (pipelineStatusFilter !== 'all') {
       data = data.filter(c => (c.status || 'Inscrito') === pipelineStatusFilter);
     }
     if (jobFilter !== 'all') {
       data = data.filter(c => c.jobId === jobFilter);
     }
     if (companyFilter !== 'all') {
       const job = jobs.find(j => j.id === jobFilter);
       if (job) {
         data = data.filter(c => c.jobId === jobFilter);
       } else {
         // Filtra por empresa da vaga
         const companyJobs = jobs.filter(j => j.company === companyFilter).map(j => j.id);
         data = data.filter(c => companyJobs.includes(c.jobId));
       }
     }
     if (cityFilter !== 'all') {
       // Normaliza cidade para comparação case-insensitive usando a função de normalização
       const normalizedFilter = normalizeCity(cityFilter).toLowerCase().trim();
       data = data.filter(c => {
         if (!c.city) return false;
         const normalizedCity = normalizeCity(c.city).toLowerCase().trim();
         return normalizedCity === normalizedFilter || c.city === cityFilter;
       });
     }
     
     if (localSearch) {
         const s = localSearch.toLowerCase();
         data = data.filter(c => 
           c.fullName?.toLowerCase().includes(s) ||
           c.email?.toLowerCase().includes(s) ||
           c.city?.toLowerCase().includes(s) ||
           c.interestAreas?.toLowerCase().includes(s) ||
           jobs.find(j => j.id === c.jobId)?.title?.toLowerCase().includes(s)
         );
     }
    data.sort((a, b) => {
        if (localSort === 'recent') return (getCandidateTimestamp(b) || 0) - (getCandidateTimestamp(a) || 0);
        if (localSort === 'oldest') return (getCandidateTimestamp(a) || 0) - (getCandidateTimestamp(b) || 0);
        if (localSort === 'az') return (a.fullName||'').localeCompare(b.fullName||'');
        if (localSort === 'za') return (b.fullName||'').localeCompare(a.fullName||'');
        return 0;
    });
     return data;
  }, [candidates, statusFilter, localSearch, localSort, pipelineStatusFilter, jobFilter, companyFilter, cityFilter, jobs, applications, interviews]);
  
  // Dados paginados para modo lista
  const paginatedListData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return processedData.slice(start, end);
  }, [processedData, currentPage, itemsPerPage]);
  
  // Estado para controlar quantos itens mostrar por coluna no kanban (paginação "ver mais")
  const [kanbanDisplayCounts, setKanbanDisplayCounts] = useState(() => {
    const saved = localStorage.getItem('kanban_display_counts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  // Salvar contadores no localStorage
  useEffect(() => {
    localStorage.setItem('kanban_display_counts', JSON.stringify(kanbanDisplayCounts));
  }, [kanbanDisplayCounts]);

  // Dados paginados para modo kanban (por coluna) - usando "ver mais"
  const kanbanDataByStage = useMemo(() => {
    const byStage = {};
    PIPELINE_STAGES.forEach(stage => {
      const stageCandidates = Array.isArray(processedData) 
        ? processedData.filter(c => (c.status || 'Inscrito') === stage)
        : [];
      const displayCount = kanbanDisplayCounts[stage] || kanbanItemsPerPage;
      byStage[stage] = {
        all: stageCandidates || [],
        displayed: (stageCandidates || []).slice(0, displayCount),
        total: (stageCandidates || []).length,
        displayCount: displayCount
      };
    });
    return byStage;
  }, [processedData, kanbanItemsPerPage, kanbanDisplayCounts]);

  // Função para carregar mais itens em uma coluna
  const loadMoreInStage = (stage, amount = kanbanItemsPerPage) => {
    setKanbanDisplayCounts(prev => ({
      ...prev,
      [stage]: (prev[stage] || kanbanItemsPerPage) + amount
    }));
  };

  // Função para resetar contador de uma coluna
  const resetStageCount = (stage) => {
    setKanbanDisplayCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[stage];
      return newCounts;
    });
  };
  
  const totalPages = Math.ceil((processedData?.length || 0) / itemsPerPage);
  const kanbanTotalPages = Math.ceil(
    Math.max(
      ...PIPELINE_STAGES.map(s => kanbanDataByStage[s]?.total || 0),
      0
    ) / kanbanItemsPerPage
  ) || 1;

  return (
     <div className="flex flex-col h-full relative">
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 justify-between items-center bg-white dark:bg-gray-900">
           <div className="flex gap-3 items-center flex-wrap">
              {!forceViewMode && (
                <div className="flex bg-brand-card p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                   <button onClick={() => setViewMode('kanban')} className={`p-2 rounded ${viewMode==='kanban' ? 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400' : 'text-slate-400'}`}><Kanban size={16}/></button>
                   <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode==='list' ? 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400' : 'text-slate-400'}`}><List size={16}/></button>
                </div>
              )}
              <input className="bg-brand-card border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-white outline-none focus:border-brand-cyan w-48" placeholder="Buscar..." value={localSearch} onChange={e=>setLocalSearch(e.target.value)}/>
              <select className="bg-brand-card border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-white outline-none" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                 <option value="active">Em Andamento</option><option value="hired">Contratados</option><option value="rejected">Reprovados</option><option value="withdrawn">Desistências</option><option value="all">Todos</option>
              </select>
              {viewMode === 'list' && (
                <>
                  <select className="bg-brand-card border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-white outline-none" value={pipelineStatusFilter} onChange={e=>setPipelineStatusFilter(e.target.value)}>
                    <option value="all">Todas as Etapas</option>
                    {PIPELINE_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                  </select>
                  <select className="bg-brand-card border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-white outline-none" value={jobFilter} onChange={e=>setJobFilter(e.target.value)}>
                    <option value="all">Todas as Vagas</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                  <select className="bg-brand-card border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-white outline-none" value={companyFilter} onChange={e=>setCompanyFilter(e.target.value)}>
                    <option value="all">Todas as Empresas</option>
                    {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <select className="bg-brand-card border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-white outline-none" value={cityFilter} onChange={e=>setCityFilter(e.target.value)}>
                    <option value="all">Todas as Cidades</option>
                    {Array.from(new Set(candidates.map(c => c.city).filter(Boolean))).sort().map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </>
              )}
              <select className="bg-brand-card border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-white outline-none" value={localSort} onChange={e=>setLocalSort(e.target.value)}>
                 <option value="recent">Mais Recentes</option>
                 <option value="oldest">Mais Antigos</option>
                 <option value="az">A-Z</option>
                 <option value="za">Z-A</option>
                 <option value="rating">⭐ Mais Qualificados</option>
                 <option value="applied">Inscritos Primeiro</option>
                 <option value="appliedLast">Inscritos Último</option>
                 <option value="nextTask">Próxima Tarefa</option>
              </select>
           </div>
           <div className="flex items-center gap-4">
           <div className="text-xs text-slate-500">{processedData.length} talentos</div>
             {viewMode === 'list' && (
               <select
                 className="bg-brand-card border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-brand-cyan"
                 value={itemsPerPage}
                 onChange={e => {
                   setItemsPerPage(Number(e.target.value));
                   setCurrentPage(1);
                 }}
               >
                 <option value={10}>10 por página</option>
                 <option value={25}>25 por página</option>
                 <option value={50}>50 por página</option>
                 <option value={100}>100 por página</option>
               </select>
             )}
             {viewMode === 'kanban' && (
              <>
               <select
                 className="bg-brand-card border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-brand-cyan"
                 value={kanbanItemsPerPage}
                 onChange={e => {
                   setKanbanItemsPerPage(Number(e.target.value));
                   setCurrentPage(1);
                 }}
               >
                 <option value={5}>5 por coluna</option>
                 <option value={10}>10 por coluna</option>
                 <option value={15}>15 por coluna</option>
                 <option value={20}>20 por coluna</option>
               </select>
               <button
                 onClick={() => setShowColorPicker(!showColorPicker)}
                 className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded border transition-colors ${
                   showColorPicker 
                     ? 'bg-brand-orange text-white border-brand-orange' 
                     : 'bg-brand-card border-gray-200 dark:border-gray-700 text-slate-400 hover:text-white hover:border-brand-cyan'
                 }`}
                 title="Personalizar cores das colunas"
               >
                 🎨 Cores
               </button>
              </>
             )}
        </div>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
           {viewMode === 'kanban' ? (
              <div className="flex-1 overflow-x-auto p-2 custom-scrollbar">
                <div className="flex gap-2 h-full min-w-max">
                 {PIPELINE_STAGES.map(stage => (
                    <KanbanColumn 
                      key={stage} 
                      stage={stage} 
                      allCandidates={kanbanDataByStage[stage]?.all || []}
                      displayedCandidates={kanbanDataByStage[stage]?.displayed || []}
                      total={kanbanDataByStage[stage]?.total || 0}
                      displayCount={kanbanDataByStage[stage]?.displayCount || kanbanItemsPerPage}
                      jobs={jobs}
                      applications={applications}
                      allJobs={jobs}
                      onDragEnd={onDragEnd} 
                      onEdit={onEdit} 
                      onCloseStatus={onCloseStatus}
                      selectedIds={selectedIds}
                      onSelect={handleSelect}
                      showColorPicker={showColorPicker}
                      onLoadMore={(amount) => loadMoreInStage(stage, amount)}
                      onReset={() => resetStageCount(stage)}
                      kanbanItemsPerPage={kanbanItemsPerPage}
                    />
                 ))}
                </div>
              </div>
           ) : (
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                 <table className="w-full text-left text-sm text-slate-300">
                   <thead className="bg-brand-card text-white font-bold sticky top-0 z-10 shadow-sm">
                     <tr>
                       <th className="p-4 w-10"><input type="checkbox" className="accent-blue-600 dark:accent-blue-500" checked={selectedIds.length>0 && selectedIds.length===processedData.length} onChange={handleSelectAll}/></th>
                       <th className="p-4 w-12"></th>
                       <th className="p-4">Nome</th>
                       <th className="p-4 min-w-[160px]">Status</th>
                       <th className="p-4">Candidatura</th>
                       <th className="p-4">Vaga</th>
                       <th className="p-4">Empresa</th>
                       <th className="p-4">Cidade</th>
                       <th className="p-4">Email</th>
                       <th className="p-4">Telefone</th>
                       <th className="p-4">Área</th>
                       <th className="p-4">CNH</th>
                       <th className="p-4">Fonte</th>
                       <th className="p-4">Data de Criação</th>
                       <th className="p-4">Ações</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-brand-border bg-brand-card/20">
                     {paginatedListData.map(c => {
                       // USAR APENAS applications como fonte de verdade
                       const candidateApplications = applications.filter(a => a.candidateId === c.id);
                       const primaryApplication = candidateApplications[0]; // Primeira candidatura como principal
                      const ts = getCandidateTimestamp(c);
                      const isNew = (ts && ts > 0) && ((Date.now() / 1000 - ts) / (24 * 60 * 60)) <= 7;
                       const hasApplication = candidateApplications.length > 0;
                       const isInscrito = (c.status || 'Inscrito') === 'Inscrito';
                       const needsApplication = !isInscrito && !hasApplication; // A partir de Considerado precisa ter candidatura
                       
                       return (
                         <tr key={c.id} className={`hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${needsApplication ? 'bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-500' : ''}`}>
                           <td className="p-4"><input type="checkbox" className="accent-blue-600 dark:accent-blue-500" checked={selectedIds.includes(c.id)} onChange={() => handleSelect(c.id)}/></td>
                           <td className="p-4">
                             <div className="flex items-center gap-2">
                               <span className="font-bold text-white dark:text-white cursor-pointer break-words" onClick={() => onEdit(c)}>{c.fullName || 'Sem nome'}</span>
                             </div>
                           </td>
                           <td className="p-4 min-w-[160px]">
                             {onDragEnd ? (
                               <select
                                 value={c.status || 'Inscrito'}
                                 onChange={(e) => onDragEnd(c.id, e.target.value)}
                                 className={`px-2 py-1 rounded text-xs border font-medium cursor-pointer transition-colors ${STATUS_COLORS[c.status] || 'bg-slate-700 text-slate-200 border-slate-600'} hover:opacity-80`}
                                 onClick={(e) => e.stopPropagation()}
                               >
                                 {ALL_STATUSES.map(status => (
                                   <option key={status} value={status} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                     {status}
                                   </option>
                                 ))}
                               </select>
                             ) : (
                               <span className={`px-2 py-0.5 rounded text-xs border break-words ${STATUS_COLORS[c.status] || 'bg-slate-700 text-slate-200 border-slate-600'}`}>{c.status || 'Inscrito'}</span>
                             )}
                           </td>
                           <td className="p-4">
                             {hasApplication ? (
                               <div className="flex flex-col gap-1">
                                 <span className="text-xs text-green-700 dark:text-green-300 font-medium">
                                   ✓ {candidateApplications.length > 1 ? `${candidateApplications.length} candidaturas` : 'Vinculado'}
                                 </span>
                                 {primaryApplication && (
                                   <span className="text-xs text-gray-700 dark:text-gray-300">{primaryApplication.jobTitle}</span>
                                 )}
                               </div>
                             ) : isInscrito ? (
                               <span className="text-xs text-gray-600 dark:text-gray-400">Sem candidatura</span>
                             ) : (
                               <span className="text-xs text-red-700 dark:text-red-300 font-medium">⚠ Precisa vincular</span>
                             )}
                           </td>
                           <td className="p-4 text-xs break-words">{primaryApplication?.jobTitle || 'N/A'}</td>
                           <td className="p-4 text-xs break-words">{primaryApplication?.jobCompany || 'N/A'}</td>
                           <td className="p-4 text-xs break-words">{c.city || 'N/A'}</td>
                           <td className="p-4 text-xs break-words truncate max-w-[200px] text-gray-700 dark:text-gray-300" title={c.email}>{c.email || 'N/A'}</td>
                           <td className="p-4 text-xs break-words text-gray-700 dark:text-gray-300">{c.phone || 'N/A'}</td>
                           <td className="p-4 text-xs break-words truncate max-w-[150px] text-gray-700 dark:text-gray-300" title={c.interestAreas}>{c.interestAreas || 'N/A'}</td>
                           <td className="p-4 text-xs text-gray-700 dark:text-gray-300">{c.hasLicense === 'Sim' ? '✓' : c.hasLicense === 'Não' ? '✗' : 'N/A'}</td>
                           <td className="p-4 text-xs break-words truncate max-w-[120px] text-gray-700 dark:text-gray-300" title={c.source}>{c.source || 'N/A'}</td>
                           <td className="p-4 text-xs text-gray-700 dark:text-gray-300">
                             {(() => {
                               const ts = getCandidateTimestamp(c);
                               if (!ts) return 'N/A';
                               return new Date(ts * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                             })()}
                           </td>
                           <td className="p-4"><button onClick={() => onEdit(c)} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Edit3 size={16}/></button></td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
              </div>
           )}
           
           {/* Paginação */}
           {processedData.length > 0 && (
             <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-brand-card flex items-center justify-between">
               <div className="text-xs text-slate-400">
                 Mostrando {viewMode === 'list' 
                   ? `${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, processedData.length)} de ${processedData.length} talentos`
                   : `${(currentPage - 1) * kanbanItemsPerPage + 1} - ${Math.min(currentPage * kanbanItemsPerPage, Math.max(...PIPELINE_STAGES.map(s => kanbanDataByStage[s]?.total || 0)))} de ${processedData.length} talentos`
                 }
               </div>
               <div className="flex items-center gap-2">
                 <button
                   onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                   disabled={currentPage === 1}
                   className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${
                     currentPage === 1
                       ? 'bg-brand-card text-slate-600 cursor-not-allowed'
                       : 'bg-white dark:bg-gray-900 text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                   }`}
                 >
                   <ChevronLeft size={16} className="inline"/>
                 </button>
                 <span className="px-4 py-1.5 text-sm text-slate-300">
                   Página {currentPage} de {viewMode === 'list' ? totalPages : kanbanTotalPages}
                 </span>
                 <button
                   onClick={() => setCurrentPage(Math.min(viewMode === 'list' ? totalPages : kanbanTotalPages, currentPage + 1))}
                   disabled={currentPage >= (viewMode === 'list' ? totalPages : kanbanTotalPages)}
                   className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${
                     currentPage >= (viewMode === 'list' ? totalPages : kanbanTotalPages)
                       ? 'bg-brand-card text-slate-600 cursor-not-allowed'
                       : 'bg-white dark:bg-gray-900 text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                   }`}
                 >
                   <ChevronRight size={16} className="inline"/>
                 </button>
               </div>
             </div>
           )}
        </div>
     </div>
  );
};

const KanbanColumn = ({ stage, allCandidates, displayedCandidates, total, displayCount, jobs, applications = [], onDragEnd, onEdit, onCloseStatus, selectedIds, onSelect, showColorPicker, onLoadMore, onReset, highlightedCandidateId = null, allJobs = [], kanbanItemsPerPage = 10 }) => {
  const [columnColor, setColumnColor] = useState(() => {
    const saved = localStorage.getItem(`kanban-color-${stage}`);
    return saved || STATUS_COLORS[stage];
  });
  const handleDrop = (e) => { e.preventDefault(); const cId = e.dataTransfer.getData("text/plain"); if (cId) onDragEnd(cId, stage); };
  const handleDragStart = (e, cId) => { try { e.dataTransfer.setData("text/plain", cId); e.dataTransfer.effectAllowed = 'move'; } catch(err){ console.warn('dragStart err', err); } };
  
  const handleColorChange = (color) => {
    setColumnColor(color);
    localStorage.setItem(`kanban-color-${stage}`, color);
  };
  
  const presetColors = [
    'bg-slate-700 text-slate-200 border-slate-600',
    'bg-blue-900/40 text-blue-300 border-blue-700',
    'bg-cyan-900/40 text-cyan-300 border-cyan-700',
    'bg-purple-900/40 text-purple-300 border-purple-700',
    'bg-indigo-900/40 text-indigo-300 border-indigo-700',
    'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    'bg-green-900/40 text-green-300 border-green-700',
    'bg-red-900/40 text-red-300 border-red-700',
    'bg-orange-900/40 text-orange-300 border-orange-700',
    'bg-pink-900/40 text-pink-300 border-pink-700'
  ];
  
   return (
      <div className="w-[320px] flex-shrink-0 flex flex-col bg-brand-card/40 border border-gray-200 dark:border-gray-700 rounded-xl h-full backdrop-blur-sm" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
         <div className={`p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center rounded-t-xl ${columnColor} relative`}>
           <span className="font-bold text-xs uppercase break-words">{stage}</span>
           <span className="bg-black/20 px-2 py-0.5 rounded text-xs font-mono">{total}</span>
           {/* Seletor de cor só aparece quando o botão "Cores" está ativo */}
           {showColorPicker && (
             <div className="absolute top-full left-0 right-0 bg-brand-card border border-gray-200 dark:border-gray-700 rounded-b-lg p-2 z-50 shadow-lg">
               <div className="text-xs text-slate-400 mb-1">Cor da coluna:</div>
               <div className="grid grid-cols-5 gap-1">
                 {presetColors.map((color, idx) => (
                   <button
                     key={idx}
                     onClick={() => handleColorChange(color)}
                     className={`h-6 rounded border-2 ${color} ${columnColor === color ? 'ring-2 ring-brand-orange' : ''}`}
                     title={color}
                   />
                 ))}
               </div>
             </div>
           )}
         </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {displayedCandidates.length > 0 ? displayedCandidates.map(c => {
          // USAR APENAS applications como fonte de verdade
          const candidateApplications = applications.filter(a => a.candidateId === c.id);
          const primaryApplication = candidateApplications[0];
          const primaryJob = primaryApplication ? jobs.find(j => j.id === primaryApplication.jobId) : null;
          
          // Calcular matches para este candidato
          const matchingJobs = allJobs && allJobs.length > 0 ? findMatchingJobs(c, allJobs) : [];
          const topMatch = matchingJobs.length > 0 ? matchingJobs[0] : null;
          
          const ts = getCandidateTimestamp(c);
          const isNew = (ts && ts > 0) && ((Date.now() / 1000 - ts) / (24 * 60 * 60)) <= 7;
          return (
          <div key={c.id} id={`candidate-${c.id}`} draggable onDragStart={(e) => handleDragStart(e, c.id)} onClick={() => onEdit(c)} className={`bg-brand-card p-3 rounded-lg border hover:border-brand-cyan cursor-grab shadow-sm group relative ${selectedIds.includes(c.id) ? 'border-brand-orange bg-brand-orange/5' : 'border-gray-200 dark:border-gray-700'} ${isNew ? 'border-l-4 border-l-green-500' : ''} ${highlightedCandidateId === c.id ? 'ring-4 ring-yellow-400 ring-opacity-75 animate-pulse border-yellow-400' : ''}`}>
            <div className={`absolute top-2 left-2 z-20 ${selectedIds.includes(c.id)?'opacity-100':'opacity-0 group-hover:opacity-100'}`} onClick={e=>e.stopPropagation()}><input type="checkbox" className="accent-blue-600 dark:accent-blue-500" checked={selectedIds.includes(c.id)} onChange={()=>onSelect(c.id)}/></div>
            
            {/* Cabeçalho com resumo */}
            <div className="mb-2 border-b border-gray-200 dark:border-gray-700/50 pb-2 pl-6">
              <h4 className="font-bold text-gray-900 dark:text-white text-sm break-words mb-1">{c.fullName}</h4>
              <div className="text-xs space-y-0.5">
                {primaryJob && (
                  <div className="text-blue-700 dark:text-blue-300 flex items-center gap-1 font-medium">
                    <Briefcase size={10}/> <span className="break-words">{primaryJob.title}</span>
                    {candidateApplications.length > 1 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px]">
                        +{candidateApplications.length - 1}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1 flex-wrap">
                  {onDragEnd ? (
                    <select
                      value={c.status || 'Inscrito'}
                      onChange={(e) => {
                        e.stopPropagation();
                        onDragEnd(c.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`px-1.5 py-0.5 rounded text-xs border font-medium cursor-pointer transition-colors text-white ${STATUS_COLORS[c.status] || 'bg-slate-700 border-slate-600'} hover:opacity-80`}
                    >
                      {ALL_STATUSES.map(status => (
                        <option key={status} value={status} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`px-1.5 py-0.5 rounded text-xs border ${STATUS_COLORS[c.status] || 'bg-slate-700 text-slate-200 border-slate-600'}`}>{c.status || 'Inscrito'}</span>
                  )}
                  {matchingJobs && matchingJobs.length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded text-xs border font-medium ${getMatchBadgeColor(topMatch?.matchLevel || 'low')}`} title={`${matchingJobs.length} vaga(s) com match. Melhor match: ${topMatch?.matchScore || 0}%`}>
                      {matchingJobs.length} match
                    </span>
                  )}
                </div>
                {c.city && (
                  <div className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <MapPin size={10}/> <span className="break-words">{c.city}</span>
                  </div>
                )}
                {c.interestAreas && (
                  <div className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Building2 size={10}/> <span className="break-words">{c.interestAreas}</span>
                  </div>
                )}
                {primaryJob && primaryJob.company && (
                  <div className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Building2 size={10}/> <span className="break-words">{primaryJob.company}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-1 pl-6">
              <div className="text-xs text-slate-400 truncate flex gap-1"><Mail size={10}/> {c.email || 'N/D'}</div>
              <div className="text-xs text-slate-400 truncate flex gap-1">📞 {c.phone || 'N/D'}</div>
              {c.score && <div className="text-xs text-blue-600 dark:text-blue-400 font-bold">Match: {c.score}%</div>}
              {(() => {
                const ts = getCandidateTimestamp(c);
                if (!ts) return null;
                const date = new Date(ts * 1000);
                return (
                  <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1.5">
                    {isNew && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Candidato novo (últimos 7 dias)"></div>}
                    <Clock size={10}/> {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                );
              })()}
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-brand-card shadow-lg rounded border border-gray-200 dark:border-gray-700 z-30">
              <button onClick={(e)=>{e.stopPropagation();onEdit(c)}} className="p-1.5 hover:text-blue-400 hover:bg-blue-500/20" title="Editar">
                <Edit3 size={14}/>
              </button>
              <button onClick={(e)=>{e.stopPropagation();onCloseStatus(c.id,'Contratado')}} className="p-1.5 hover:text-green-400 hover:bg-green-500/20" title="Contratar">
                <Check size={14}/>
              </button>
              <button onClick={(e)=>{e.stopPropagation();onCloseStatus(c.id,'Reprovado')}} className="p-1.5 hover:text-red-400 hover:bg-red-500/20" title="Reprovar">
                <Ban size={14}/>
              </button>
          </div>
          </div>
        )}) : (
          <div className="text-center py-8 text-slate-500 text-xs">Nenhum candidato nesta etapa</div>
        )}
        </div>
        {/* Botões de paginação */}
        {displayedCandidates.length < total && (
          <div className="p-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadMore(10);
                }}
                className="flex-1 px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                +10
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadMore(25);
                }}
                className="flex-1 px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                +25
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadMore(50);
                }}
                className="flex-1 px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                +50
              </button>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLoadMore(total - displayedCandidates.length);
              }}
              className="w-full px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors"
            >
              Ver tudo ({total - displayedCandidates.length} restantes)
            </button>
          </div>
        )}
        {/* Botão "Mostrar menos" se houver mais itens exibidos que o padrão */}
        {displayCount > (kanbanItemsPerPage || 10) && displayedCandidates.length >= displayCount && (
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Mostrar menos
            </button>
          </div>
        )}
      </div>
   );
};

// --- BANCO DE TALENTOS (TABELA COMPLETA) ---
const TalentBankView = ({ candidates, jobs, companies, onEdit, applications = [], onStatusChange }) => {
  const [itemsPerPage, setItemsPerPage] = useState(10); // Padrão alterado para 10
  const [currentPage, setCurrentPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [localSort, setLocalSort] = useState('recent');
  const [selectedIds, setSelectedIds] = useState([]);
  const [dateFilter, setDateFilter] = useState('all'); // Filtro de data de criação
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false); // Painel de filtros colapsável

  const processedData = useMemo(() => {
    let data = candidates.filter(c => !c.deletedAt);
    
    // Filtro por data de criação
    if (dateFilter !== 'all') {
      const now = Date.now() / 1000;
      if (dateFilter === 'custom' && customDateStart && customDateEnd) {
        const startDate = new Date(customDateStart).getTime() / 1000;
        const endDate = new Date(customDateEnd).getTime() / 1000 + 86400;
        data = data.filter(c => {
          const ts = getCandidateTimestamp(c);
          if (!ts) return false;
          return ts >= startDate && ts <= endDate;
        });
      } else {
        const periods = {
          'today': 1 * 24 * 60 * 60,
          '7d': 7 * 24 * 60 * 60,
          '30d': 30 * 24 * 60 * 60,
          '90d': 90 * 24 * 60 * 60
        };
        const cutoff = now - (periods[dateFilter] || 0);
        data = data.filter(c => {
          const ts = getCandidateTimestamp(c);
          if (!ts) return false;
          return ts >= cutoff;
        });
      }
    }
    
    if (localSearch) {
      const s = localSearch.toLowerCase();
      data = data.filter(c => 
        c.fullName?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.phone?.toLowerCase().includes(s) ||
        c.city?.toLowerCase().includes(s) ||
        c.interestAreas?.toLowerCase().includes(s) ||
        c.source?.toLowerCase().includes(s)
      );
    }
    
    data.sort((a, b) => {
      if (localSort === 'recent') {
        const tsA = getCandidateTimestamp(a) || 0;
        const tsB = getCandidateTimestamp(b) || 0;
        return tsB - tsA;
      }
      if (localSort === 'oldest') {
        const tsA = getCandidateTimestamp(a) || 0;
        const tsB = getCandidateTimestamp(b) || 0;
        return tsA - tsB;
      }
      if (localSort === 'az') return (a.fullName||'').localeCompare(b.fullName||'');
      if (localSort === 'za') return (b.fullName||'').localeCompare(a.fullName||'');
      return 0;
    });
    
    return data;
  }, [candidates, localSearch, localSort, dateFilter, customDateStart, customDateEnd]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return processedData.slice(start, end);
  }, [processedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (dateFilter !== 'all') count++;
    if (localSearch) count++;
    return count;
  }, [dateFilter, localSearch]);

  // Verificar se candidato é novo (menos de 7 dias)
  const isCandidateNew = (c) => {
    const ts = getCandidateTimestamp(c);
    if (!ts) return false;
    const daysAgo = (Date.now() / 1000 - ts) / (24 * 60 * 60);
    return daysAgo <= 7;
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-hidden bg-white dark:bg-gray-900">
      {/* Header com busca e controles principais */}
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Banco de Talentos</h2>
            {/* Contador de resultados */}
            <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
              {processedData.length} {processedData.length === 1 ? 'candidato' : 'candidatos'}
              {activeFiltersCount > 0 && (
                <span className="ml-2 text-xs">
                  ({activeFiltersCount} {activeFiltersCount === 1 ? 'filtro ativo' : 'filtros ativos'})
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Busca global */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded pl-10 pr-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 w-64"
                placeholder="Buscar em todo o cadastro..."
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
              />
            </div>
            {/* Ordenação */}
            <select
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
              value={localSort}
              onChange={e => setLocalSort(e.target.value)}
            >
              <option value="recent">Mais Recentes</option>
              <option value="oldest">Mais Antigos</option>
              <option value="az">A-Z</option>
              <option value="za">Z-A</option>
            </select>
            {/* Paginação */}
            <select
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
              value={itemsPerPage}
              onChange={e => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
              <option value={500}>500 por página</option>
              <option value={1000}>1000 por página</option>
              <option value={5000}>5000 por página</option>
            </select>
            {/* Botão de filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-blue-600 text-white border border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-500'
              }`}
            >
              <Filter size={16} />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="bg-white/20 dark:bg-gray-900/30 px-2 py-0.5 rounded-full text-xs">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Painel de Filtros Expandido - Melhorado com mais espaçamento */}
        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="space-y-6">
              {/* Seção: Filtros de Data */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarCheck size={18} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Filtros de Data</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Período de Criação
                    </label>
                    <select
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={dateFilter}
                      onChange={e => {
                        setDateFilter(e.target.value);
                        if (e.target.value !== 'custom') {
                          setCustomDateStart('');
                          setCustomDateEnd('');
                        }
                      }}
                    >
                      <option value="all">Todas as datas</option>
                      <option value="today">Hoje</option>
                      <option value="7d">Últimos 7 dias</option>
                      <option value="30d">Últimos 30 dias</option>
                      <option value="90d">Últimos 90 dias</option>
                      <option value="custom">Período personalizado</option>
                    </select>
                  </div>
                  {dateFilter === 'custom' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                        Período Personalizado
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data inicial</label>
                          <input
                            type="date"
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            value={customDateStart}
                            onChange={e => setCustomDateStart(e.target.value)}
                          />
                        </div>
                        <span className="text-gray-400 dark:text-gray-500 text-sm mt-6">até</span>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data final</label>
                          <input
                            type="date"
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            value={customDateEnd}
                            onChange={e => setCustomDateEnd(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção: Ações */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setDateFilter('all');
                    setCustomDateStart('');
                    setCustomDateEnd('');
                    setLocalSearch('');
                  }}
                  className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium shadow-sm"
                >
                  Limpar Todos os Filtros
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
            <tr>
              <th className="p-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700 w-10">
                <input type="checkbox" className="accent-blue-600 dark:accent-blue-500" />
              </th>
              <th className="p-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700 w-12"></th>
              <th className="p-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700">Nome</th>
              <th className="p-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700 min-w-[160px]">Status</th>
              <th className="p-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700">Email</th>
              <th className="p-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700">Telefone</th>
              <th className="p-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700">Cidade</th>
              <th className="p-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700">CNH</th>
              <th className="p-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700">Área de Interesse</th>
              <th className="p-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700">Fonte</th>
              <th className="p-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700">Data Cadastro</th>
              <th className="p-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700">Estado Civil</th>
              <th className="p-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedData.map(c => {
              const isNew = isCandidateNew(c);
              return (
                <tr 
                  key={c.id} 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    isNew ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500' : ''
                  }`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      className="accent-blue-600 dark:accent-blue-500"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => setSelectedIds(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                    />
                  </td>
                  <td className="p-3 text-center">
                    {isNew && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mx-auto" title="Candidato novo (últimos 7 dias)"></div>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" onClick={() => onEdit(c)}>
                      {c.fullName || 'Sem nome'}
                    </span>
                  </td>
                  <td className="p-3 min-w-[160px]">
                    {onStatusChange ? (
                      <select
                        value={c.status || 'Inscrito'}
                        onChange={(e) => onStatusChange(c.id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs border font-medium cursor-pointer transition-colors ${STATUS_COLORS[c.status] || 'bg-slate-700 text-slate-200 border-slate-600'} hover:opacity-80`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ALL_STATUSES.map(status => (
                          <option key={status} value={status} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-xs border whitespace-nowrap ${STATUS_COLORS[c.status] || 'bg-slate-700 text-slate-200 border-slate-600'}`}>
                        {c.status || 'Inscrito'}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{c.email || 'N/A'}</td>
                  <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{c.phone || 'N/A'}</td>
                  <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{c.city || 'N/A'}</td>
                  <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{c.hasLicense === 'Sim' ? '✓' : c.hasLicense === 'Não' ? '✗' : 'N/A'}</td>
                  <td className="p-3 text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]" title={c.interestAreas}>{c.interestAreas || 'N/A'}</td>
                  <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{c.source || 'N/A'}</td>
                  <td className="p-3 text-sm text-gray-700 dark:text-gray-300">
                    {(() => {
                      const ts = getCandidateTimestamp(c);
                      if (!ts) return 'N/A';
                      return new Date(ts * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    })()}
                  </td>
                  <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{c.maritalStatus || 'N/A'}</td>
                  <td className="p-3">
                    <button onClick={() => onEdit(c)} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <Edit3 size={16}/>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, processedData.length)} de {processedData.length} candidatos
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Anterior
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const JobsList = ({ jobs, candidates, onAdd, onEdit, onToggleStatus, onViewCandidates, companies }) => {
  const [activeTab, setActiveTab] = useState('status');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  
  // Agrupar vagas por status
  const jobsByStatus = useMemo(() => {
    const grouped = {};
    JOB_STATUSES.forEach(status => {
      grouped[status] = jobs.filter(j => j.status === status);
    });
    return grouped;
  }, [jobs]);
  
  // Agrupar vagas por cidade
  const jobsByCity = useMemo(() => {
    const grouped = {};
    jobs.forEach(job => {
      const city = job.city || 'Sem cidade';
      if (!grouped[city]) grouped[city] = [];
      grouped[city].push(job);
    });
    return grouped;
  }, [jobs]);
  
  // Agrupar vagas por empresa
  const jobsByCompany = useMemo(() => {
    const grouped = {};
    jobs.forEach(job => {
      const company = job.company || 'Sem empresa';
      if (!grouped[company]) grouped[company] = [];
      grouped[company].push(job);
    });
    return grouped;
  }, [jobs]);
  
  // Agrupar vagas por período
  const jobsByPeriod = useMemo(() => {
    const now = Date.now() / 1000;
    const periods = {
      'Hoje': [],
      'Esta Semana': [],
      'Este Mês': [],
      'Últimos 3 Meses': [],
      'Anteriores': []
    };
    
    jobs.forEach(job => {
      const ts = job.createdAt?.seconds || job.createdAt?._seconds || 0;
      const daysAgo = (now - ts) / (24 * 60 * 60);
      
      if (daysAgo < 1) periods['Hoje'].push(job);
      else if (daysAgo < 7) periods['Esta Semana'].push(job);
      else if (daysAgo < 30) periods['Este Mês'].push(job);
      else if (daysAgo < 90) periods['Últimos 3 Meses'].push(job);
      else periods['Anteriores'].push(job);
    });
    
    return periods;
  }, [jobs]);
  
  // Filtrar vagas baseado na aba ativa
  const filteredJobs = useMemo(() => {
    // Filtrar registros deletados (soft delete)
    const activeJobs = jobs.filter(j => !j.deletedAt);
    
    if (activeTab === 'status') {
      if (statusFilter === 'all') return activeJobs;
      return activeJobs.filter(j => j.status === statusFilter);
    } else if (activeTab === 'city') {
      if (cityFilter === 'all') return activeJobs;
      return activeJobs.filter(j => (j.city || 'Sem cidade') === cityFilter);
    } else if (activeTab === 'company') {
      if (companyFilter === 'all') return activeJobs;
      return activeJobs.filter(j => (j.company || 'Sem empresa') === companyFilter);
    } else if (activeTab === 'period') {
      if (periodFilter === 'all') return activeJobs;
      // Recalcular jobsByPeriod apenas com jobs ativos
      const activeJobsByPeriod = {};
      activeJobs.forEach(j => {
        const ts = j.createdAt?.seconds || j.createdAt?._seconds;
        if (ts) {
          const date = new Date(ts * 1000);
          const monthYear = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
          if (!activeJobsByPeriod[monthYear]) activeJobsByPeriod[monthYear] = [];
          activeJobsByPeriod[monthYear].push(j);
        }
      });
      return activeJobsByPeriod[periodFilter] || [];
    }
    return activeJobs;
  }, [activeTab, statusFilter, cityFilter, companyFilter, periodFilter, jobs, jobsByPeriod]);
  
  // Calcular matches para todas as vagas abertas
  const jobMatches = useMemo(() => {
    const matches = {};
    const openJobs = jobs.filter(j => j.status === 'Aberta' && !j.deletedAt);
    openJobs.forEach(job => {
      const matchingCandidates = findMatchingCandidates(job, candidates);
      matches[job.id] = {
        count: matchingCandidates.length,
        topMatch: matchingCandidates[0] || null,
        allMatches: matchingCandidates
      };
    });
    return matches;
  }, [jobs, candidates]);

  const renderJobCard = (j) => {
    const matchInfo = jobMatches[j.id] || { count: 0, topMatch: null, allMatches: [] };
    return (
    <div key={j.id} className="bg-brand-card p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg group hover:border-brand-cyan/50 transition-colors">
      <div className="flex justify-between mb-4">
        <div className="flex items-center gap-2">
          <select 
            className="text-xs px-2 py-1 rounded border bg-transparent outline-none cursor-pointer text-gray-600 dark:text-gray-400 border-brand-cyan/30 hover:bg-brand-cyan/10 transition-colors" 
            value={j.status} 
            onChange={(e) => onToggleStatus('jobs', {id: j.id, status: e.target.value})} 
            onClick={(e) => e.stopPropagation()}
          >
            {JOB_STATUSES.map(s => <option key={s} value={s} className="bg-brand-card">{s}</option>)}
          </select>
          {j.status === 'Aberta' && matchInfo.count > 0 && (
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getMatchBadgeColor(matchInfo.topMatch?.matchLevel || 'low')}`}>
              {matchInfo.count} match{matchInfo.count !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
        <button onClick={() => onEdit(j)} className="text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <Edit3 size={16}/>
        </button>
      </div>
      <h3 className="font-bold text-lg text-white mb-1 break-words">{j.title}</h3>
      <p className="text-sm text-slate-400 mb-2 break-words">{j.company}</p>
      <div className="space-y-1 mb-4">
        {j.city && <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={12}/> {j.city}</p>}
        {j.interestArea && <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1"><Briefcase size={12}/> {j.interestArea}</p>}
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between items-center">
        <p 
          className="text-xs text-slate-500 cursor-pointer hover:text-gray-600 dark:text-gray-400 transition-colors" 
          onClick={(e) => {
            e.stopPropagation();
            if (onViewCandidates) onViewCandidates(j);
          }}
        >
          {candidates.filter(c => c.jobId === j.id).length} candidatos
        </p>
      </div>
    </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Header com botão centralizado */}
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Vagas</h2>
        <button 
          onClick={onAdd} 
          className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors font-medium shadow-lg hover:shadow-xl"
        >
          <Plus size={20}/> Abrir Vaga
        </button>
      </div>
      
      {/* Dropdown de visualização */}
      <div className="flex gap-3 items-center">
        <label className="text-sm font-medium text-gray-300">Visualizar por:</label>
        <select
          className="bg-brand-card border border-gray-200 dark:border-gray-700 rounded px-4 py-2 text-sm text-white outline-none focus:border-brand-cyan min-w-[180px]"
          value={activeTab}
          onChange={e => {
            setActiveTab(e.target.value);
            // Resetar filtros ao mudar de aba
            setStatusFilter('all');
            setCityFilter('all');
            setCompanyFilter('all');
            setPeriodFilter('all');
          }}
        >
          <option value="status">Por Status</option>
          <option value="city">Por Cidade</option>
          <option value="company">Por Empresa</option>
          <option value="period">Por Período</option>
        </select>
      </div>
      
      {/* Filtros por aba */}
      <div className="flex gap-3 items-center flex-wrap">
        {activeTab === 'status' && (
          <select
            className="bg-brand-card border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-white outline-none focus:border-brand-cyan"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Todas as vagas</option>
            {JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {activeTab === 'city' && (
          <select
            className="bg-brand-card border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-white outline-none focus:border-brand-cyan"
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
          >
            <option value="all">Todas as cidades</option>
            {Array.from(new Set(jobs.map(j => j.city).filter(Boolean))).sort().map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        )}
        {activeTab === 'company' && (
          <select
            className="bg-brand-card border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-white outline-none focus:border-brand-cyan"
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
          >
            <option value="all">Todas as empresas</option>
            {Array.from(new Set(jobs.map(j => j.company).filter(Boolean))).sort().map(company => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>
        )}
        {activeTab === 'period' && (
          <select
            className="bg-brand-card border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-white outline-none focus:border-brand-cyan"
            value={periodFilter}
            onChange={e => setPeriodFilter(e.target.value)}
          >
            <option value="all">Todos os períodos</option>
            {Object.keys(jobsByPeriod).map(period => (
              <option key={period} value={period}>{period} ({jobsByPeriod[period].length})</option>
            ))}
          </select>
        )}
      </div>
      
      {/* Conteúdo agrupado ou filtrado */}
      {activeTab === 'status' && statusFilter === 'all' ? (
        <div className="space-y-8">
          {JOB_STATUSES.map(status => (
            jobsByStatus[status] && jobsByStatus[status].length > 0 && (
              <div key={status}>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  {status} <span className="text-sm text-slate-400 font-normal">({jobsByStatus[status].length})</span>
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {jobsByStatus[status].map(renderJobCard)}
                </div>
              </div>
            )
          ))}
        </div>
      ) : activeTab === 'city' && cityFilter === 'all' ? (
        <div className="space-y-8">
          {Object.keys(jobsByCity).sort().map(city => (
            jobsByCity[city].length > 0 && (
              <div key={city}>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <MapPin size={18}/> {city} <span className="text-sm text-slate-400 font-normal">({jobsByCity[city].length})</span>
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {jobsByCity[city].map(renderJobCard)}
                </div>
              </div>
            )
          ))}
        </div>
      ) : activeTab === 'company' && companyFilter === 'all' ? (
        <div className="space-y-8">
          {Object.keys(jobsByCompany).sort().map(company => (
            jobsByCompany[company].length > 0 && (
              <div key={company}>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Building2 size={18}/> {company} <span className="text-sm text-slate-400 font-normal">({jobsByCompany[company].length})</span>
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {jobsByCompany[company].map(renderJobCard)}
                </div>
              </div>
            )
          ))}
        </div>
      ) : activeTab === 'period' && periodFilter === 'all' ? (
        <div className="space-y-8">
          {Object.keys(jobsByPeriod).map(period => (
            jobsByPeriod[period].length > 0 && (
              <div key={period}>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  {period} <span className="text-sm text-slate-400 font-normal">({jobsByPeriod[period].length})</span>
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {jobsByPeriod[period].map(renderJobCard)}
                </div>
              </div>
            )
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.length > 0 ? filteredJobs.map(renderJobCard) : (
            <div className="col-span-full text-center py-12 text-slate-500">
              Nenhuma vaga encontrada
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CandidatesList = ({ candidates, jobs, onAdd, onEdit, onDelete }) => {
  const [localSearch, setLocalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('fullName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Todas as colunas disponíveis - usando nomes visuais do CANDIDATE_FIELDS
  const ALL_COLUMNS = useMemo(() => {
    const defaultColumns = ['fullName', 'email', 'phone', 'city', 'hasLicense', 'interestAreas', 'source', 'original_timestamp', 'status', 'maritalStatus'];
    return CANDIDATE_FIELDS.map(f => ({
      key: f.key,
      label: f.displayName,
      csvLabel: f.csvLabel, // Nome original do CSV para referência
      default: defaultColumns.includes(f.key)
    }));
  }, []);

  // Colunas visíveis - carregar do localStorage ou usar default
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('candidates_visible_columns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return ALL_COLUMNS.filter(c => c.default).map(c => c.key);
      }
    }
    return ALL_COLUMNS.filter(c => c.default).map(c => c.key);
  });

  // Salvar colunas visíveis no localStorage
  useEffect(() => {
    localStorage.setItem('candidates_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const toggleColumn = (key) => {
    setVisibleColumns(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const selectAllColumns = () => setVisibleColumns(ALL_COLUMNS.map(c => c.key));
  const selectDefaultColumns = () => setVisibleColumns(ALL_COLUMNS.filter(c => c.default).map(c => c.key));

  // Função para renderizar o conteúdo de cada célula
  const renderCellContent = (c, key) => {
    const formatDate = (value) => {
      if (!value) return 'N/A';
      try {
        let date;
        if (typeof value === 'string') {
          date = new Date(value);
        } else if (value.toDate) {
          date = value.toDate();
        } else if (value.seconds || value._seconds) {
          date = new Date((value.seconds || value._seconds) * 1000);
        } else {
          date = new Date(value);
        }
        return !isNaN(date.getTime()) 
          ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : 'N/A';
      } catch {
        return 'N/A';
      }
    };

    const formatDateOnly = (value) => {
      if (!value) return 'N/A';
      try {
        const date = new Date(value);
        return !isNaN(date.getTime()) 
          ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : 'N/A';
      } catch {
        return 'N/A';
      }
    };

    const renderBoolField = (value, trueText = '✓ Sim', falseText = '✗ Não') => {
      if (value === 'Sim' || value === true) {
        return <span className="text-green-600 dark:text-green-400">{trueText}</span>;
      } else if (value === 'Não' || value === false) {
        return <span className="text-red-600 dark:text-red-400">{falseText}</span>;
      }
      return <span className="text-gray-500">N/A</span>;
    };

    const renderUrl = (url, label = 'Ver') => {
      if (!url) return <span className="text-gray-500">N/A</span>;
      return (
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          onClick={e => e.stopPropagation()}
          className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
        >
          {label} ↗
        </a>
      );
    };

    const renderTruncated = (value, maxWidth = '150px') => {
      if (!value) return <span className="text-gray-500">N/A</span>;
      return (
        <div className="text-xs text-gray-700 dark:text-gray-300 truncate" style={{ maxWidth }} title={value}>
          {value}
        </div>
      );
    };

    switch (key) {
      case 'fullName':
        return <div className="font-semibold text-gray-900 dark:text-white text-sm">{c.fullName || 'N/A'}</div>;
      case 'email':
        return <div className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[200px]" title={c.email}>{c.email || 'N/A'}</div>;
      case 'email_secondary':
        return <div className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[200px]" title={c.email_secondary}>{c.email_secondary || 'N/A'}</div>;
      case 'phone':
        return <div className="text-xs text-gray-600 dark:text-gray-300">{c.phone || 'N/A'}</div>;
      case 'city':
        return <div className="text-xs text-gray-600 dark:text-gray-300">{c.city || 'N/A'}</div>;
      case 'source':
        return <div className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate max-w-[150px]" title={c.source}>{c.source || 'N/A'}</div>;
      case 'interestAreas':
        return <div className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate max-w-[150px]" title={c.interestAreas}>{c.interestAreas || 'N/A'}</div>;
      case 'education':
        return renderTruncated(c.education);
      case 'schoolingLevel':
        return renderTruncated(c.schoolingLevel, '120px');
      case 'institution':
        return renderTruncated(c.institution);
      case 'hasLicense':
        return <div className="text-xs">{renderBoolField(c.hasLicense)}</div>;
      case 'status':
        return (
          <span className={`px-2 py-1 rounded text-xs border font-medium whitespace-nowrap ${STATUS_COLORS[c.status] || 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'}`}>
            {c.status || 'Sem Status'}
          </span>
        );
      case 'original_timestamp': {
        const ts = getCandidateTimestamp(c);
        if (!ts) return <div className="text-xs text-gray-500">N/A</div>;
        const d = new Date(ts * 1000);
        return <div className="text-xs text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">{!isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</div>;
      }
      case 'birthDate':
        return <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDateOnly(c.birthDate)}</div>;
      case 'age':
        return <div className="text-xs text-gray-600 dark:text-gray-400">{c.age || 'N/A'}</div>;
      case 'maritalStatus':
        return <div className="text-xs text-gray-600 dark:text-gray-400">{c.maritalStatus || 'N/A'}</div>;
      case 'childrenCount':
        return <div className="text-xs text-gray-600 dark:text-gray-400">{c.childrenCount || 'N/A'}</div>;
      case 'graduationDate':
        return <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDateOnly(c.graduationDate)}</div>;
      case 'isStudying':
        return <div className="text-xs">{renderBoolField(c.isStudying)}</div>;
      case 'experience':
        return renderTruncated(c.experience, '200px');
      case 'courses':
        return renderTruncated(c.courses);
      case 'certifications':
        return renderTruncated(c.certifications);
      case 'cvUrl':
        return renderUrl(c.cvUrl, 'CV');
      case 'portfolioUrl':
        return renderUrl(c.portfolioUrl, 'Portfolio');
      case 'photoUrl':
        return c.photoUrl ? (
          <a href={c.photoUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
            Ver Foto ↗
          </a>
        ) : <span className="text-gray-500">N/A</span>;
      case 'referral':
        return renderTruncated(c.referral);
      case 'salaryExpectation':
        return renderTruncated(c.salaryExpectation, '120px');
      case 'canRelocate':
        return <div className="text-xs">{renderBoolField(c.canRelocate)}</div>;
      case 'references':
        return renderTruncated(c.references, '200px');
      case 'typeOfApp':
        return renderTruncated(c.typeOfApp);
      case 'freeField':
        return renderTruncated(c.freeField, '200px');
      case 'external_id':
        return <div className="text-xs text-gray-500 font-mono">{c.external_id || 'N/A'}</div>;
      default:
        return <div className="text-xs text-gray-600 dark:text-gray-400">{c[key] || 'N/A'}</div>;
    }
  };

  // Filtrar por busca
  const filtered = useMemo(() => {
    let data = [...candidates];
    if (localSearch) {
      const search = localSearch.toLowerCase();
      data = data.filter(c => 
        c.fullName?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.email_secondary?.toLowerCase().includes(search) ||
        c.phone?.toLowerCase().includes(search) ||
        c.city?.toLowerCase().includes(search) ||
        c.source?.toLowerCase().includes(search) ||
        c.interestAreas?.toLowerCase().includes(search) ||
        c.education?.toLowerCase().includes(search) ||
        c.schoolingLevel?.toLowerCase().includes(search) ||
        c.institution?.toLowerCase().includes(search) ||
        c.experience?.toLowerCase().includes(search) ||
        c.courses?.toLowerCase().includes(search) ||
        c.certifications?.toLowerCase().includes(search) ||
        c.referral?.toLowerCase().includes(search) ||
        c.salaryExpectation?.toLowerCase().includes(search) ||
        c.references?.toLowerCase().includes(search) ||
        c.typeOfApp?.toLowerCase().includes(search) ||
        c.freeField?.toLowerCase().includes(search) ||
        c.external_id?.toLowerCase().includes(search) ||
        c.maritalStatus?.toLowerCase().includes(search)
      );
    }
    // Ordenar
    data.sort((a, b) => {
      if (sortField === 'original_timestamp') {
        const aTs = (getCandidateTimestamp(a) || 0) * 1000;
        const bTs = (getCandidateTimestamp(b) || 0) * 1000;
        return sortOrder === 'asc' ? aTs - bTs : bTs - aTs;
      }
      if (sortField === 'birthDate') {
        const aDate = a.birthDate ? new Date(a.birthDate) : new Date(0);
        const bDate = b.birthDate ? new Date(b.birthDate) : new Date(0);
        return sortOrder === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
      }
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [candidates, localSearch, sortField, sortOrder]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedCandidates = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Banco de Talentos</h2>
        <button onClick={onAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded flex items-center gap-2 transition-colors dark:bg-blue-500 dark:hover:bg-blue-600">
          <UserPlus size={18}/> Adicionar
        </button>
      </div>

      {/* Barra de Busca e Controles */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap gap-4 items-center shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <input 
            type="text" 
            placeholder="Buscar por nome, email, telefone, cidade, fonte, área..."
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={localSearch}
            onChange={e => {setLocalSearch(e.target.value); setCurrentPage(1);}}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Itens:</label>
          <select 
            className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs text-gray-900 dark:text-white"
            value={itemsPerPage}
            onChange={e => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
          >
            <Settings size={14}/> Colunas ({visibleColumns.length}/{ALL_COLUMNS.length})
          </button>
          {showColumnSelector && (
            <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 w-80 max-h-96 overflow-y-auto">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800">
                <span className="text-sm font-bold text-gray-900 dark:text-white">Colunas Visíveis</span>
                <div className="flex gap-2">
                  <button onClick={selectAllColumns} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Todas</button>
                  <button onClick={selectDefaultColumns} className="text-xs text-gray-500 hover:underline">Padrão</button>
                  <button onClick={() => setShowColumnSelector(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                    <X size={16}/>
                  </button>
                </div>
              </div>
              <div className="p-2 grid grid-cols-2 gap-1">
                {ALL_COLUMNS.map(col => (
                  <label key={col.key} className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={visibleColumns.includes(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium sticky top-0 z-10">
              <tr>
                {ALL_COLUMNS.filter(col => visibleColumns.includes(col.key)).map(col => (
                  <th 
                    key={col.key}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                    onClick={() => toggleSort(col.key)}
                  >
                    <div className="flex items-center gap-1 text-xs font-semibold">
                      {col.label} {sortField === col.key && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                </th>
                ))}
                <th className="px-3 py-2 text-right text-xs font-semibold sticky right-0 bg-gray-100 dark:bg-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedCandidates.length > 0 ? (
                paginatedCandidates.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors" onClick={() => onEdit(c)}>
                    {ALL_COLUMNS.filter(col => visibleColumns.includes(col.key)).map(col => (
                      <td key={col.key} className="px-3 py-2">
                        {renderCellContent(c, col.key)}
                    </td>
                    ))}
                    <td className="px-3 py-2 text-right sticky right-0 bg-white dark:bg-gray-800">
                      <div className="flex gap-2 justify-end">
                        <button onClick={(e) => {e.stopPropagation(); onEdit(c);}} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" title="Editar">
                          <Edit3 size={16}/>
                        </button>
                        <button onClick={(e) => {e.stopPropagation(); onDelete(c.id);}} className="text-red-600 dark:text-red-500 hover:text-red-800 dark:hover:text-red-400" title="Excluir">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Nenhum candidato encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-3 flex justify-between items-center">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Mostrando{' '}
              {String((currentPage - 1) * itemsPerPage + 1)}
              {' - '}
              {String(Math.min(currentPage * itemsPerPage, filtered.length))}
              {' de '}
              {String(filtered.length)} candidatos
            </div>
            <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <ChevronLeft size={16} className="inline"/> Anterior
            </button>
              <span className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300">
              Página {currentPage} de {totalPages}
              </span>
            <button 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  currentPage === totalPages
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Próxima <ChevronRight size={16} className="inline"/>
            </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MODAIS COM CORREÇÃO DE PERFORMANCE (INPUTS FORA) ---

const InputField = ({ label, field, value, onChange, type="text" }) => (
  <div className="mb-3">
    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">{label}</label>
    <input
      type={type}
      className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      value={value || ''}
      onChange={e => onChange(field, e.target.value)}
    />
  </div>
);

// Componente para campos de URL (CV, Foto, Portfolio) - mostra como link clicável
const UrlField = ({ label, field, value, onChange, placeholder = "Cole a URL aqui..." }) => {
  const [isEditing, setIsEditing] = useState(!value);
  const [editValue, setEditValue] = useState(value || '');

  useEffect(() => {
    setEditValue(value || '');
    setIsEditing(!value);
  }, [value]);

  const handleSave = () => {
    onChange(field, editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const isValidUrl = (url) => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  if (isEditing) {
    return (
      <div className="mb-3">
        <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1.5">{label}</label>
        <div className="flex gap-2">
          <input
            type="url"
            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            placeholder={placeholder}
            onKeyPress={e => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <button
            onClick={handleSave}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            title="Salvar"
          >
            <Check size={16}/>
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            title="Cancelar"
          >
            <X size={16}/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        {value && isValidUrl(value) ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:underline truncate transition-colors"
            title={`Clique para abrir | Botão direito para copiar: ${value}`}
            onContextMenu={(e) => {
              // Permite copiar URL com botão direito (comportamento nativo do navegador)
              // O usuário pode clicar com botão direito e escolher "Copiar endereço do link"
            }}
          >
            <span className="flex items-center gap-2">
              <ExternalLink size={14} className="flex-shrink-0"/>
              <span className="truncate">{value.length > 50 ? value.substring(0, 50) + '...' : value}</span>
            </span>
          </a>
        ) : value ? (
          <div className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 truncate">
            {value.length > 50 ? value.substring(0, 50) + '...' : value}
          </div>
        ) : (
          <div className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-400 dark:text-gray-500 italic">
            Nenhum link cadastrado
          </div>
        )}
        <button
          onClick={() => setIsEditing(true)}
          className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
          title="Editar URL"
        >
          <Edit3 size={16}/>
        </button>
        {value && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await navigator.clipboard.writeText(value);
                // Feedback visual temporário
                const btn = e.currentTarget;
                const originalText = btn.title;
                btn.title = 'URL copiada!';
                btn.className = btn.className.replace('bg-gray-200 dark:bg-gray-700', 'bg-green-500 dark:bg-green-600').replace('text-gray-700 dark:text-gray-300', 'text-white');
                setTimeout(() => {
                  btn.title = originalText;
                  btn.className = btn.className.replace('bg-green-500 dark:bg-green-600', 'bg-gray-200 dark:bg-gray-700').replace('text-white', 'text-gray-700 dark:text-gray-300');
                }, 2000);
              } catch (err) {
                alert('Erro ao copiar URL. Use o botão direito do mouse no link.');
              }
            }}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            title="Copiar URL"
          >
            <FileText size={16}/>
          </button>
        )}
      </div>
    </div>
  );
};

const JobModal = ({ isOpen, job, onClose, onSave, options, isSaving, candidates = [] }) => {
  const [d, setD] = useState(() => {
    if (job?.id) {
      return { ...job };
    }
    return { 
      title: '', 
      code: '',
      company: '', 
      city: '', 
      interestArea: '',
      sector: '',
      position: '',
      function: '',
      status: 'Aberta',
      contractType: 'CLT',
      workModel: 'Presencial',
      vacancies: 1,
      priority: 'Média',
      description: '',
      requirements: '',
      benefits: '',
      salaryRange: '',
      workload: '',
      deadline: '',
      recruiter: '',
      hiringManager: ''
    };
  });
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyCity, setNewCompanyCity] = useState('');
  const [showNewCity, setShowNewCity] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [showNewSector, setShowNewSector] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [showNewPosition, setShowNewPosition] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [newPositionLevel, setNewPositionLevel] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  // Estados para dados relacionados (setores, cargos, funções)
  const [sectors, setSectors] = useState([]);
  const [positions, setPositions] = useState([]);
  const [functions, setFunctions] = useState([]);

  useEffect(() => {
    if (job?.id) {
      setD({ ...job });
    } else {
      setD({ 
        title: '', code: '', company: '', city: '', interestArea: '',
        sector: '', position: '', function: '',
        status: 'Aberta', contractType: 'CLT', workModel: 'Presencial',
        vacancies: 1, priority: 'Média',
        description: '', requirements: '', benefits: '', salaryRange: '',
        workload: '', deadline: '', recruiter: '', hiringManager: ''
      });
    }
    setShowNewCompany(false);
    setShowNewCity(false);
    setShowNewSector(false);
    setShowNewPosition(false);
    setShowOptionalFields(false);
    // Auto-preenche cidade quando empresa é selecionada
    if (!job?.id && d.company) {
      const selectedCompany = options.companies.find(c => c.name === d.company);
      if (selectedCompany?.city && !d.city) {
        setD(prev => ({...prev, city: selectedCompany.city}));
      }
    }
  }, [job, isOpen, d.company, options.companies]);

  // Carregar setores, cargos e funções
  useEffect(() => {
    const unsubSectors = onSnapshot(query(collection(db, 'sectors'), orderBy('name', 'asc')), 
      s => setSectors(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubPositions = onSnapshot(query(collection(db, 'positions'), orderBy('name', 'asc')), 
      s => setPositions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubFunctions = onSnapshot(query(collection(db, 'functions'), orderBy('name', 'asc')), 
      s => setFunctions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubSectors(); unsubPositions(); unsubFunctions(); };
  }, []);

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      alert('Digite o nome da empresa');
      return;
    }
    try {
      const newCompany = {
        name: newCompanyName.trim(),
        city: newCompanyCity || '',
        createdAt: serverTimestamp(),
        createdBy: options.user?.email || 'system'
      };
      await addDoc(collection(db, 'companies'), newCompany);
      setD({...d, company: newCompanyName.trim(), city: newCompanyCity || d.city});
      setShowNewCompany(false);
      setNewCompanyName('');
      setNewCompanyCity('');
      alert('Empresa criada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      alert('Erro ao criar empresa');
    }
  };

  const handleCreateCity = async () => {
    if (!newCityName.trim()) {
      alert('Digite o nome da cidade');
      return;
    }
    try {
      const newCity = {
        name: newCityName.trim(),
        createdAt: serverTimestamp(),
        createdBy: options.user?.email || 'system'
      };
      await addDoc(collection(db, 'cities'), newCity);
      setD({...d, city: newCityName.trim()});
      setShowNewCity(false);
      setNewCityName('');
      alert('Cidade criada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar cidade:', error);
      alert('Erro ao criar cidade');
    }
  };

  const handleCreateSector = async () => {
    if (!newSectorName.trim()) {
      alert('Digite o nome do setor');
      return;
    }
    try {
      const newSector = {
        name: newSectorName.trim(),
        createdAt: serverTimestamp(),
        createdBy: options.user?.email || 'system'
      };
      await addDoc(collection(db, 'sectors'), newSector);
      setD({...d, sector: newSectorName.trim()});
      setShowNewSector(false);
      setNewSectorName('');
      alert('Setor criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar setor:', error);
      alert('Erro ao criar setor');
    }
  };

  const handleCreatePosition = async () => {
    if (!newPositionName.trim()) {
      alert('Digite o nome do cargo');
      return;
    }
    try {
      const newPosition = {
        name: newPositionName.trim(),
        level: newPositionLevel || '',
        createdAt: serverTimestamp(),
        createdBy: options.user?.email || 'system'
      };
      await addDoc(collection(db, 'positions'), newPosition);
      setD({...d, position: newPositionName.trim()});
      setShowNewPosition(false);
      setNewPositionName('');
      setNewPositionLevel('');
      alert('Cargo criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar cargo:', error);
      alert('Erro ao criar cargo');
    }
  };

  // Auto-preenche cidade quando empresa muda
  useEffect(() => {
    if (d.company && !d.city) {
      const selectedCompany = options.companies.find(c => c.name === d.company);
      if (selectedCompany?.city) {
        setD(prev => ({...prev, city: selectedCompany.city}));
      }
    }
  }, [d.company, options.companies]);

  // Buscar cidades únicas dos candidatos cadastrados
  const candidateCities = useMemo(() => {
    const citiesSet = new Set();
    candidates.forEach(c => {
      if (c.city && c.city.trim()) {
        citiesSet.add(c.city.trim());
      }
    });
    return Array.from(citiesSet).sort();
  }, [candidates]);
  
  // Buscar áreas de interesse únicas dos candidatos cadastrados
  const candidateInterestAreas = useMemo(() => {
    const areasSet = new Set();
    candidates.forEach(c => {
      if (c.interestAreas) {
        // interestAreas pode ser string separada por vírgula ou array
        const areas = typeof c.interestAreas === 'string' 
          ? c.interestAreas.split(',').map(a => a.trim()).filter(Boolean)
          : Array.isArray(c.interestAreas) ? c.interestAreas : [];
        areas.forEach(area => {
          if (area && area.trim()) {
            areasSet.add(area.trim());
          }
        });
      }
    });
    return Array.from(areasSet).sort();
  }, [candidates]);

  if (!isOpen) return null;

  // Lista de usuários para seleção de recrutador
  const availableRecruiters = options.userRoles || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] border border-gray-200 dark:border-gray-700 flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">{d.id ? 'Editar' : 'Nova'} Vaga</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">
            <X size={20}/>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Campos Principais em Destaque */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">Informações Principais</h4>
            
            {/* Empresa */}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Empresa *</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={d.company || ''}
                  onChange={e => setD({...d, company: e.target.value})}
                >
                  <option value="">Selecione uma empresa...</option>
                  {options.companies.map(c => (
                    <option key={c.id} value={c.name}>{c.name} {c.city ? `- ${c.city}` : ''}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewCompany(!showNewCompany)}
                  className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                >
                  <Plus size={16} className="inline mr-1"/> Nova
                </button>
              </div>
              {showNewCompany && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
                    placeholder="Nome da empresa/unidade"
                    value={newCompanyName}
                    onChange={e => setNewCompanyName(e.target.value)}
                  />
                  <select
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
                    value={newCompanyCity}
                    onChange={e => setNewCompanyCity(e.target.value)}
                  >
                    <option value="">Cidade (opcional)</option>
                    {options.cities.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={handleCreateCompany} className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700">Criar</button>
                    <button onClick={() => setShowNewCompany(false)} className="px-3 py-1.5 text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-200">Cancelar</button>
                  </div>
                </div>
              )}
            </div>

            {/* Cidade (auto-preenchida da empresa) */}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Cidade *</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={d.city || ''}
                  onChange={e => setD({...d, city: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  {candidateCities.length > 0 && (
                    <optgroup label="Cidades dos Candidatos">
                      {candidateCities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </optgroup>
                  )}
                  {options.cities && options.cities.length > 0 && (
                    <optgroup label="Cidades Cadastradas">
                      {options.cities.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button
                  onClick={() => setShowNewCity(!showNewCity)}
                  className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                >
                  <Plus size={16} className="inline mr-1"/> Nova
                </button>
              </div>
              {showNewCity && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
                    placeholder="Nome da cidade"
                    value={newCityName}
                    onChange={e => setNewCityName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleCreateCity} className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700">Criar</button>
                    <button onClick={() => setShowNewCity(false)} className="px-3 py-1.5 text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-200">Cancelar</button>
                  </div>
                </div>
              )}
            </div>

            {/* Setor */}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Setor</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={d.sector || ''}
                  onChange={e => setD({...d, sector: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  {sectors.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewSector(!showNewSector)}
                  className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                >
                  <Plus size={16} className="inline mr-1"/> Novo
                </button>
              </div>
              {showNewSector && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
                    placeholder="Nome do setor"
                    value={newSectorName}
                    onChange={e => setNewSectorName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleCreateSector} className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700">Criar</button>
                    <button onClick={() => setShowNewSector(false)} className="px-3 py-1.5 text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-200">Cancelar</button>
                  </div>
                </div>
              )}
            </div>

            {/* Cargo */}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Cargo</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={d.position || ''}
                  onChange={e => setD({...d, position: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.name}>{p.name} {p.level ? `(${p.level})` : ''}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewPosition(!showNewPosition)}
                  className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                >
                  <Plus size={16} className="inline mr-1"/> Novo
                </button>
              </div>
              {showNewPosition && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
                    placeholder="Nome do cargo"
                    value={newPositionName}
                    onChange={e => setNewPositionName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
                    placeholder="Nível (opcional, ex: Júnior, Pleno, Sênior)"
                    value={newPositionLevel}
                    onChange={e => setNewPositionLevel(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleCreatePosition} className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700">Criar</button>
                    <button onClick={() => setShowNewPosition(false)} className="px-3 py-1.5 text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-200">Cancelar</button>
                  </div>
                </div>
              )}
            </div>

            {/* Prazo */}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Prazo para Preenchimento</label>
              <input
                type="date"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={d.deadline || ''}
                onChange={e => setD({...d, deadline: e.target.value})}
              />
            </div>

            {/* Observações */}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Observações</label>
              <textarea
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-24 resize-none"
                placeholder="Informações adicionais sobre a vaga..."
                value={d.description || ''}
                onChange={e => setD({...d, description: e.target.value})}
              />
            </div>

            {/* Recrutador Responsável */}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Recrutador Responsável</label>
              <select
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={d.recruiter || ''}
                onChange={e => setD({...d, recruiter: e.target.value})}
              >
                <option value="">Selecione um recrutador...</option>
                {availableRecruiters.map(u => (
                  <option key={u.email} value={u.name || u.email}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Campos Opcionais Colapsados */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              onClick={() => setShowOptionalFields(!showOptionalFields)}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {showOptionalFields ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              Campos Opcionais
            </button>
            
            {showOptionalFields && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Código da Vaga</label>
                    <input
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Ex: VAG-2024-001"
                      value={d.code || ''}
                      onChange={e => setD({...d, code: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Status</label>
                    <select
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={d.status || 'Aberta'}
                      onChange={e => setD({...d, status: e.target.value})}
                    >
                      {JOB_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Área de Interesse</label>
                    <select
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={d.interestArea || ''}
                      onChange={e => setD({...d, interestArea: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      {candidateInterestAreas.length > 0 && (
                        <optgroup label="Áreas dos Candidatos">
                          {candidateInterestAreas.map(area => (
                            <option key={area} value={area}>{area}</option>
                          ))}
                        </optgroup>
                      )}
                      {options.interestAreas && options.interestAreas.length > 0 && (
                        <optgroup label="Áreas Cadastradas">
                          {options.interestAreas.map(area => (
                            <option key={area.id} value={area.name}>{area.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Função</label>
                    <select
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={d.function || ''}
                      onChange={e => setD({...d, function: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      {functions.map(f => (
                        <option key={f.id} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Nº de Vagas</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={d.vacancies || 1}
                      onChange={e => setD({...d, vacancies: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Prioridade</label>
                    <select
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={d.priority || 'Média'}
                      onChange={e => setD({...d, priority: e.target.value})}
                    >
                      <option value="Alta">🔴 Alta</option>
                      <option value="Média">🟡 Média</option>
                      <option value="Baixa">🟢 Baixa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Tipo de Contrato</label>
                    <select
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={d.contractType || 'CLT'}
                      onChange={e => setD({...d, contractType: e.target.value})}
                    >
                      <option value="CLT">CLT</option>
                      <option value="PJ">PJ</option>
                      <option value="Estágio">Estágio</option>
                      <option value="Temporário">Temporário</option>
                      <option value="Trainee">Trainee</option>
                      <option value="Freelancer">Freelancer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Modelo de Trabalho</label>
                    <select
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={d.workModel || 'Presencial'}
                      onChange={e => setD({...d, workModel: e.target.value})}
                    >
                      <option value="Presencial">Presencial</option>
                      <option value="Híbrido">Híbrido</option>
                      <option value="Remoto">Remoto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Carga Horária</label>
                    <input
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Ex: 44h semanais"
                      value={d.workload || ''}
                      onChange={e => setD({...d, workload: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Faixa Salarial</label>
                    <input
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Ex: R$ 3.000 - R$ 5.000"
                      value={d.salaryRange || ''}
                      onChange={e => setD({...d, salaryRange: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Gestor Contratante</label>
                    <input
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Nome do gestor"
                      value={d.hiringManager || ''}
                      onChange={e => setD({...d, hiringManager: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Requisitos</label>
                  <textarea
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-24 resize-none"
                    placeholder="Requisitos e qualificações..."
                    value={d.requirements || ''}
                    onChange={e => setD({...d, requirements: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Benefícios</label>
                  <textarea
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-20 resize-none"
                    placeholder="VT, VR, Plano de Saúde..."
                    value={d.benefits || ''}
                    onChange={e => setD({...d, benefits: e.target.value})}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 bg-gray-50 dark:bg-gray-900/50">
          <button onClick={onClose} className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Cancelar</button>
          <button
            onClick={() => {
              if (!d.company || !d.city) {
                alert('Preencha os campos obrigatórios: Empresa e Cidade');
                return;
              }
              // Gera título automaticamente se não houver
              if (!d.title && d.position && d.company) {
                d.title = `${d.position} - ${d.company}`;
              } else if (!d.title) {
                d.title = `Vaga - ${d.company}`;
              }
              onSave(d);
            }}
            disabled={isSaving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CandidateModal = ({ candidate, onClose, onSave, options, isSaving, onAdvanceStage, statusMovements = [], onAddNote, interviews = [], onScheduleInterview, allCandidates = [], applications = [], onCreateApplication, jobs = [] }) => {
  // Normaliza cidade ao carregar candidato
  const normalizedCandidate = candidate?.city ? { ...candidate, city: normalizeCity(candidate.city) } : candidate;
  const [d, setD] = useState({ ...normalizedCandidate });
  const [activeSection, setActiveSection] = useState('pessoal');
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [validationWarnings, setValidationWarnings] = useState({});
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  
  // Filtrar movimentações deste candidato
  const candidateMovements = useMemo(() => {
    if (!candidate?.id) return [];
    return statusMovements
      .filter(m => m.candidateId === candidate.id)
      .sort((a, b) => {
        const timeA = a.timestamp?.seconds || a.timestamp?._seconds || 0;
        const timeB = b.timestamp?.seconds || b.timestamp?._seconds || 0;
        return timeB - timeA; // Mais recente primeiro
      });
  }, [statusMovements, candidate?.id]);
  
  // Notas do candidato
  const candidateNotes = useMemo(() => {
    return (d.notes || []).sort((a, b) => {
      const timeA = a.timestamp?.seconds || a.timestamp?._seconds || new Date(a.timestamp).getTime() / 1000 || 0;
      const timeB = b.timestamp?.seconds || b.timestamp?._seconds || new Date(b.timestamp).getTime() / 1000 || 0;
      return timeB - timeA;
    });
  }, [d.notes]);
  
  // Entrevistas do candidato
  const candidateInterviews = useMemo(() => {
    if (!candidate?.id) return [];
    return interviews
      .filter(i => i.candidateId === candidate.id)
      .sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));
  }, [interviews, candidate?.id]);
  
  // Determina próxima etapa disponível
  const getCurrentStageIndex = () => {
    const currentStatus = d.status || 'Inscrito';
    return PIPELINE_STAGES.indexOf(currentStatus);
  };
  
  const getNextStages = () => {
    const currentIndex = getCurrentStageIndex();
    if (currentIndex === -1 || currentIndex >= PIPELINE_STAGES.length - 1) {
      return CLOSING_STATUSES; // Se já está na última etapa, mostra apenas status de fechamento
    }
    return [PIPELINE_STAGES[currentIndex + 1], ...CLOSING_STATUSES];
  };
  
  const handleInputChange = (field, value) => {
    // Normaliza campos específicos quando o usuário digita
    if (field === 'city' && value) {
      value = normalizeCity(value);
    } else if (field === 'source' && value) {
      value = normalizeSource(value);
    } else if (field === 'interestAreas' && value) {
      value = normalizeInterestAreasString(value);
    }
    setD(prev => ({...prev, [field]: value}));
  };
  
  const handleSave = () => {
    // Validação antes de salvar
    const validation = validateCandidate(d, { 
      checkRequired: true,
      strictMode: false,
      stage: d.status 
    });
    
    // Verificar duplicata de email (apenas para novos candidatos ou se email mudou)
    if (d.email) {
      const duplicateCheck = checkDuplicateEmail(d.email, allCandidates, d.id);
      if (duplicateCheck.isDuplicate) {
        validation.valid = false;
        validation.errors.email = duplicateCheck.message;
      }
    }
    
    setValidationErrors(validation.errors);
    setValidationWarnings(validation.warnings);
    
    if (!validation.valid) {
      setShowValidationSummary(true);
      // Rolar para o topo do modal para mostrar erros
      return;
    }
    
    // Garante que os campos estão normalizados antes de salvar
    const dataToSave = { ...d };
    if (dataToSave.city) {
      dataToSave.city = normalizeCity(dataToSave.city);
    }
    if (dataToSave.source) {
      dataToSave.source = normalizeSource(dataToSave.source);
    }
    if (dataToSave.interestAreas) {
      dataToSave.interestAreas = normalizeInterestAreasString(dataToSave.interestAreas);
    }
    
    // Limpar erros e salvar
    setShowValidationSummary(false);
    onSave(dataToSave);
  };
  
  const handleAddNote = async () => {
    if (!newNote.trim() || !onAddNote) return;
    setSavingNote(true);
    try {
      await onAddNote(d.id, newNote.trim());
      // Atualiza localmente para feedback imediato
      const newNoteObj = {
        text: newNote.trim(),
        timestamp: new Date().toISOString(),
        userEmail: 'current_user', // Será substituído pelo App
        userName: 'Você'
      };
      setD(prev => ({
        ...prev,
        notes: [newNoteObj, ...(prev.notes || [])]
      }));
      setNewNote('');
    } catch (e) {
      console.error('Erro ao adicionar nota:', e);
    } finally {
      setSavingNote(false);
    }
  };
  
  // Formatar data de timestamp
  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    let date;
    if (ts.seconds || ts._seconds) {
      date = new Date((ts.seconds || ts._seconds) * 1000);
    } else if (ts.toDate) {
      date = ts.toDate();
    } else {
      date = new Date(ts);
    }
    return date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 dark:bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-brand-card dark:bg-brand-card rounded-xl w-full max-w-4xl h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between bg-brand-card dark:bg-brand-card">
          <div><h3 className="font-bold text-xl text-white">{d.id?'Editar':'Novo'} Candidato</h3></div>
          <button onClick={onClose}><X/></button>
        </div>
        
        {/* Resumo de Validação */}
        {showValidationSummary && Object.keys(validationErrors).length > 0 && (
          <div className="mx-6 mt-4 bg-red-900/30 border border-red-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-300 font-bold mb-2">
              <AlertCircle size={18}/> {Object.keys(validationErrors).length} erro(s) encontrado(s)
            </div>
            <ul className="text-sm text-red-400 space-y-1 ml-6">
              {Object.entries(validationErrors).map(([field, message]) => (
                <li key={field}>• {message}</li>
              ))}
            </ul>
          </div>
        )}
        {showValidationSummary && Object.keys(validationWarnings).length > 0 && Object.keys(validationErrors).length === 0 && (
          <div className="mx-6 mt-4 bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-300 font-bold mb-2">
              <Info size={18}/> {Object.keys(validationWarnings).length} aviso(s)
            </div>
            <ul className="text-sm text-yellow-400 space-y-1 ml-6">
              {Object.entries(validationWarnings).map(([field, message]) => (
                <li key={field}>• {message}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex border-b border-gray-200 dark:border-gray-700 dark:border-gray-200 dark:border-gray-700">
          {['pessoal', 'profissional', 'processo', 'etapas', 'histórico', 'adicional'].map(tab => (
            <button key={tab} onClick={() => setActiveSection(tab)} className={`flex-1 py-3 px-4 text-sm font-bold uppercase ${activeSection === tab ? 'text-blue-600 dark:text-blue-400 border-b-2 border-brand-orange' : 'text-slate-500 dark:text-slate-500'}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="p-8 overflow-y-auto flex-1 bg-white dark:bg-gray-900">
          {activeSection === 'pessoal' && (
            <>
              {/* Menu de Avanço de Etapa - Destaque */}
              {d.id && onAdvanceStage && (
                <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-2 border-blue-500/50 rounded-lg p-4 mb-6">
                  <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <Trophy size={18} className="text-yellow-400"/> Avançar Etapa do Processo
                  </label>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      value=""
                      onChange={(e) => {
                        if (e.target.value && onAdvanceStage) {
                          onAdvanceStage(d, e.target.value);
                        }
                        e.target.value = '';
                      }}
                    >
                      <option value="">Selecione a próxima etapa...</option>
                      {getNextStages().map(stage => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                    <div className="text-xs text-slate-300 self-center px-2">
                      Etapa atual: <span className="font-bold text-blue-300">{d.status || 'Inscrito'}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-6">
                <InputField label="Nome Completo" field="fullName" value={d.fullName} onChange={handleInputChange}/>
                <InputField label="Email Principal" field="email" value={d.email} onChange={handleInputChange}/>
                <InputField label="Email Secundário" field="email_secondary" value={d.email_secondary} onChange={handleInputChange}/>
                <InputField label="Telefone/Celular" field="phone" value={d.phone} onChange={handleInputChange}/>
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Cidade</label>
                <select className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2.5 rounded text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={d.city || ''} onChange={e=>handleInputChange('city', e.target.value)}>
                  <option value="">Selecione...</option>
                  <optgroup label="Cidades Principais">
                    {getMainCitiesOptions().map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </optgroup>
                  {options.cities && options.cities.length > 0 && (
                    <optgroup label="Outras Cidades">
                      {options.cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </optgroup>
                  )}
                </select>
                <p className="text-xs text-slate-400 mt-1">Digite ou selecione - será normalizado automaticamente</p>
              </div>
              <InputField label="Data de Nascimento" field="birthDate" type="date" value={d.birthDate} onChange={handleInputChange}/>
              <InputField label="Idade" field="age" type="number" value={d.age} onChange={handleInputChange}/>
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Estado Civil</label>
                <select className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2.5 rounded text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={d.maritalStatus || ''} onChange={e=>setD({...d, maritalStatus:e.target.value})}>
                  <option value="">Selecione...</option>
                  {options.marital && options.marital.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <InputField label="Quantidade de Filhos" field="childrenCount" type="number" value={d.childrenCount} onChange={handleInputChange}/>
              <UrlField label="URL da Foto" field="photoUrl" value={d.photoUrl} onChange={handleInputChange} placeholder="Cole a URL da foto aqui..."/>
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Possui CNH Tipo B?</label>
                <select className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2.5 rounded text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={d.hasLicense || ''} onChange={e=>setD({...d, hasLicense:e.target.value})}>
                  <option value="">Selecione...</option>
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              </div>
              </div>
            </>
          )}
          {activeSection === 'profissional' && (
            <div className="grid grid-cols-2 gap-6">
              <InputField label="Formação" field="education" value={d.education} onChange={handleInputChange}/>
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Nível de Escolaridade</label>
                <select className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2.5 rounded text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={d.schoolingLevel || ''} onChange={e=>setD({...d, schoolingLevel:e.target.value})}>
                  <option value="">Selecione...</option>
                  {options.schooling && options.schooling.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <InputField label="Instituição de Ensino" field="institution" value={d.institution} onChange={handleInputChange}/>
              <InputField label="Data de Formatura" field="graduationDate" type="date" value={d.graduationDate} onChange={handleInputChange}/>
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Está Cursando Atualmente?</label>
                <select className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2.5 rounded text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={d.isStudying || ''} onChange={e=>setD({...d, isStudying:e.target.value})}>
                  <option value="">Selecione...</option>
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Área de Interesse</label>
                <select className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2.5 rounded text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={d.interestAreas || ''} onChange={e=>handleInputChange('interestAreas', e.target.value)}>
                  <option value="">Selecione...</option>
                  <optgroup label="Áreas Principais">
                    {getMainInterestAreasOptions().map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                  </optgroup>
                  {options.interestAreas && options.interestAreas.length > 0 && (
                    <optgroup label="Outras Áreas">
                      {options.interestAreas.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                    </optgroup>
                  )}
                </select>
                <p className="text-xs text-slate-400 mt-1">Digite ou selecione - será normalizado automaticamente</p>
              </div>
              <div className="mb-3 col-span-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Experiências Anteriores</label>
                <textarea className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2.5 rounded text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-24" value={d.experience || ''} onChange={e=>setD({...d, experience:e.target.value})} placeholder="Descreva as experiências profissionais..."/>
              </div>
              <div className="mb-3 col-span-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Cursos e Certificações</label>
                <textarea className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2.5 rounded text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-20" value={d.courses || ''} onChange={e=>setD({...d, courses:e.target.value})} placeholder="Liste cursos e certificações..."/>
              </div>
              <UrlField label="Link CV" field="cvUrl" value={d.cvUrl} onChange={handleInputChange} placeholder="Cole a URL do currículo aqui..."/>
              <UrlField label="Link Portfolio" field="portfolioUrl" value={d.portfolioUrl} onChange={handleInputChange} placeholder="Cole a URL do portfólio aqui..."/>
            </div>
          )}
          {activeSection === 'processo' && (
            <div className="grid grid-cols-2 gap-6">
              {/* Candidaturas Vinculadas */}
              <div className="mb-3 col-span-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-bold text-gray-900 dark:text-white uppercase">Candidaturas Vinculadas</label>
                    {onCreateApplication && (
                      <button
                        onClick={async () => {
                          // Abre modal simples para selecionar vaga
                          const availableJobs = (options.jobs || jobs || []).filter(j => j.status === 'Aberta');
                          if (availableJobs.length === 0) {
                            window.alert('Não há vagas abertas disponíveis.');
                            return;
                          }
                          const jobList = availableJobs.map((j, idx) => 
                            `${idx + 1}. ${j.title} - ${j.company}${j.city ? ` (${j.city})` : ''}`
                          ).join('\n');
                          const jobId = window.prompt(`Selecione uma vaga:\n\n${jobList}\n\nDigite o número da vaga:`);
                          if (jobId && candidate?.id) {
                            const selectedJob = availableJobs[parseInt(jobId) - 1];
                            if (selectedJob) {
                              await onCreateApplication(candidate.id, selectedJob.id);
                              window.alert('Candidatura criada com sucesso!');
                            } else {
                              window.alert('Número inválido.');
                            }
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <Plus size={16}/> Vincular a Nova Vaga
                      </button>
                    )}
                  </div>
                  {(() => {
                    const candidateApplications = applications.filter(a => a.candidateId === candidate?.id);
                    if (candidateApplications.length === 0) {
                      return (
                        <div className="text-center py-4 text-gray-600 dark:text-gray-400 text-sm">
                          <p>Nenhuma candidatura vinculada ainda.</p>
                          <p className="text-xs mt-1">Clique em "Vincular a Nova Vaga" para criar uma candidatura.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {candidateApplications.map(app => {
                          const job = (options.jobs || jobs || []).find(j => j.id === app.jobId);
                          return (
                            <div key={app.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-900 dark:text-white text-sm">
                                    {job?.title || app.jobTitle || 'Vaga não encontrada'}
                                  </h5>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {job?.company || app.jobCompany || ''} {job?.city ? `• ${job.city}` : ''}
                                  </p>
                                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs border ${STATUS_COLORS[app.status] || 'bg-slate-700 text-slate-200 border-slate-600'}`}>
                                    {app.status || 'Inscrito'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Onde encontrou (Fonte)</label>
                <select className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2.5 rounded text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={d.source || ''} onChange={e=>handleInputChange('source', e.target.value)}>
                  <option value="">Selecione...</option>
                  <optgroup label="Origens Principais">
                    {getMainSourcesOptions().map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                  </optgroup>
                  {options.origins && options.origins.length > 0 && (
                    <optgroup label="Outras Origens">
                      {options.origins.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                    </optgroup>
                  )}
                </select>
                <p className="text-xs text-slate-400 mt-1">Digite ou selecione - será normalizado automaticamente</p>
              </div>
              <InputField label="Indicação (Quem indicou?)" field="referral" value={d.referral} onChange={handleInputChange}/>
              <InputField label="Expectativa Salarial" field="salaryExpectation" value={d.salaryExpectation} onChange={handleInputChange}/>
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Disponibilidade para Mudança de Cidade?</label>
                <select className="w-full bg-white dark:bg-gray-900 dark:bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:border-gray-200 dark:border-gray-700 p-2.5 rounded text-white dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={d.canRelocate || ''} onChange={e=>setD({...d, canRelocate:e.target.value})}>
                  <option value="">Selecione...</option>
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              </div>
              <div className="mb-3 col-span-2">
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Referências Profissionais</label>
                <textarea className="w-full bg-white dark:bg-gray-900 dark:bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:border-gray-200 dark:border-gray-700 p-2.5 rounded text-white dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-20" value={d.references || ''} onChange={e=>setD({...d, references:e.target.value})} placeholder="Liste referências profissionais..."/>
              </div>
              
              {/* Entrevistas Agendadas */}
              <div className="col-span-2 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <CalendarCheck size={18} className="text-purple-400"/> Entrevistas Agendadas
                  </h4>
                  {onScheduleInterview && d.id && (
                    <button
                      type="button"
                      onClick={() => onScheduleInterview(d)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={14}/> Agendar
                    </button>
                  )}
                </div>
                {candidateInterviews.length > 0 ? (
                  <div className="space-y-2">
                    {candidateInterviews.map(interview => {
                      const interviewDate = new Date(interview.date);
                      const isPast = interviewDate < new Date();
                      return (
                        <div key={interview.id} className={`p-3 rounded-lg border ${
                          interview.status === 'Cancelada' ? 'bg-red-900/20 border-red-800' :
                          interview.status === 'Realizada' ? 'bg-green-900/20 border-green-800' :
                          isPast ? 'bg-yellow-900/20 border-yellow-800' :
                          'bg-gray-900/50 border-gray-600'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-white text-sm">{interview.type}</div>
                              <div className="text-xs text-gray-400">
                                {interviewDate.toLocaleDateString('pt-BR')} às {interview.time}
                                {interview.duration && ` (${interview.duration}min)`}
                              </div>
                              {interview.jobTitle && <div className="text-xs text-gray-500">Vaga: {interview.jobTitle}</div>}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              interview.status === 'Agendada' ? 'bg-blue-600 text-white' :
                              interview.status === 'Confirmada' ? 'bg-green-600 text-white' :
                              interview.status === 'Realizada' ? 'bg-gray-600 text-white' :
                              interview.status === 'Cancelada' ? 'bg-red-600 text-white' :
                              'bg-yellow-600 text-white'
                            }`}>
                              {interview.status}
                            </span>
                          </div>
                          {interview.isOnline && interview.meetingLink && (
                            <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mt-1 inline-block">
                              Link da reunião
                            </a>
                          )}
                          {!interview.isOnline && interview.location && (
                            <div className="text-xs text-gray-400 mt-1">{interview.location}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4 text-sm">
                    Nenhuma entrevista agendada
                  </div>
                )}
              </div>
            </div>
          )}
          {activeSection === 'etapas' && (
            <div className="space-y-6">
              {/* Status atual */}
              <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs text-gray-400 uppercase">Status Atual</label>
                    <div className="text-xl font-bold text-white">{d.status || 'Inscrito'}</div>
                  </div>
                  {d.id && onAdvanceStage && (
                    <select
                      className="bg-gray-800 border border-gray-600 px-4 py-2 rounded-lg text-white text-sm font-medium"
                      value=""
                      onChange={(e) => {
                        if (e.target.value && onAdvanceStage) {
                          onAdvanceStage(d, e.target.value);
                        }
                        e.target.value = '';
                      }}
                    >
                      <option value="">Avançar para...</option>
                      {getNextStages().map(stage => (
                        <option key={stage} value={stage}>{stage}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* 1ª Entrevista */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center text-xs">1</span>
                  1ª Entrevista (RH)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Data e Hora</label>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={d.interview1Date || ''}
                      onChange={e => setD({...d, interview1Date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Status</label>
                    <select 
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={d.interview1Status || ''}
                      onChange={e => setD({...d, interview1Status: e.target.value})}
                    >
                      <option value="">Não realizada</option>
                      <option value="Agendada">Agendada</option>
                      <option value="Realizada">Realizada</option>
                      <option value="Cancelada">Cancelada</option>
                      <option value="NoShow">No-show</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Observações</label>
                    <textarea 
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-20"
                      value={d.interview1Notes || ''}
                      onChange={e => setD({...d, interview1Notes: e.target.value})}
                      placeholder="Anotações sobre a entrevista..."
                    />
                  </div>
                </div>
              </div>

              {/* Testes */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs">T</span>
                  Testes
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Resultado</label>
                    <select 
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={d.testResults || ''}
                      onChange={e => setD({...d, testResults: e.target.value})}
                    >
                      <option value="">Não realizado</option>
                      <option value="Aprovado">Aprovado</option>
                      <option value="Aprovado com ressalvas">Aprovado com ressalvas</option>
                      <option value="Reprovado">Reprovado</option>
                      <option value="Não aplicável">Não aplicável</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Data do Teste</label>
                    <input 
                      type="date" 
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={d.testDate || ''}
                      onChange={e => setD({...d, testDate: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Observações dos Testes</label>
                    <textarea 
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-20"
                      value={d.testNotes || ''}
                      onChange={e => setD({...d, testNotes: e.target.value})}
                      placeholder="Detalhes sobre os testes realizados..."
                    />
                  </div>
                </div>
              </div>

              {/* 2ª Entrevista */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-xs">2</span>
                  2ª Entrevista (Gestor)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Data e Hora</label>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={d.interview2Date || ''}
                      onChange={e => setD({...d, interview2Date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Status</label>
                    <select 
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={d.interview2Status || ''}
                      onChange={e => setD({...d, interview2Status: e.target.value})}
                    >
                      <option value="">Não realizada</option>
                      <option value="Agendada">Agendada</option>
                      <option value="Realizada">Realizada</option>
                      <option value="Cancelada">Cancelada</option>
                      <option value="NoShow">No-show</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Observações</label>
                    <textarea 
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-20"
                      value={d.interview2Notes || ''}
                      onChange={e => setD({...d, interview2Notes: e.target.value})}
                      placeholder="Anotações sobre a entrevista com gestor..."
                    />
                  </div>
                </div>
              </div>

              {/* Retorno */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-xs">✓</span>
                  Retorno ao Candidato
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Retorno Dado?</label>
                    <select 
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={d.returnSent || ''}
                      onChange={e => setD({...d, returnSent: e.target.value})}
                    >
                      <option value="">Não informado</option>
                      <option value="Sim">Sim, retorno dado</option>
                      <option value="Não">Não, ainda não dado</option>
                      <option value="Pendente">Pendente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Data do Retorno</label>
                    <input 
                      type="date" 
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={d.returnDate || ''}
                      onChange={e => setD({...d, returnDate: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Observações do Retorno</label>
                    <textarea 
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2.5 rounded text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-20"
                      value={d.returnNotes || ''}
                      onChange={e => setD({...d, returnNotes: e.target.value})}
                      placeholder="Detalhes sobre o retorno dado ao candidato..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeSection === 'histórico' && (
            <div className="space-y-6">
              {/* Seção de Notas/Comentários */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                  <MessageSquare size={18} className="text-blue-400"/> Notas e Comentários
                </h4>
                
                {/* Adicionar nova nota */}
                <div className="flex gap-2 mb-4">
                  <textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Adicione uma nota, feedback de entrevista, observação..."
                    className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-white resize-none h-20 outline-none focus:border-blue-500"
                    disabled={savingNote}
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || savingNote}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 rounded-lg font-medium text-sm transition-colors self-end h-10"
                  >
                    {savingNote ? '...' : 'Adicionar'}
                  </button>
                </div>
                
                {/* Lista de notas */}
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {candidateNotes.length > 0 ? candidateNotes.map((note, idx) => (
                    <div key={idx} className="bg-gray-900/50 rounded-lg p-3 border-l-4 border-blue-500">
                      <p className="text-sm text-gray-200 whitespace-pre-wrap">{note.text}</p>
                      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                        <span>{note.userName || note.userEmail || 'Usuário'}</span>
                        <span>{formatTimestamp(note.timestamp)}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 py-4 text-sm">
                      Nenhuma nota adicionada ainda
                    </div>
                  )}
                </div>
              </div>
              
              {/* Timeline de Movimentações */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                  <History size={18} className="text-green-400"/> Histórico de Movimentações
                </h4>
                
                <div className="relative">
                  {candidateMovements.length > 0 ? (
                    <div className="space-y-4">
                      {candidateMovements.map((movement, idx) => (
                        <div key={movement.id || idx} className="flex gap-4">
                          {/* Linha vertical */}
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full ${
                              movement.isClosingStatus 
                                ? movement.newStatus === 'Contratado' ? 'bg-green-500' : 'bg-red-500'
                                : 'bg-blue-500'
                            }`}/>
                            {idx < candidateMovements.length - 1 && (
                              <div className="w-0.5 h-full bg-gray-600 mt-1"/>
                            )}
                          </div>
                          
                          {/* Conteúdo */}
                          <div className="flex-1 pb-4">
                            <p className="text-sm text-gray-200 mb-1">
                              <span className="font-semibold text-white">{movement.userName || movement.userEmail || 'Usuário'}</span>
                              {' moveu de '}
                              <span className="font-medium text-blue-400">{movement.previousStatus || 'Inscrito'}</span>
                              {' para '}
                              <span className={`font-medium ${
                                movement.newStatus === 'Contratado' ? 'text-green-400' :
                                movement.newStatus === 'Reprovado' ? 'text-red-400' :
                                'text-cyan-400'
                              }`}>
                                {movement.newStatus}
                              </span>
                              {movement.jobTitle && (
                                <>
                                  {' na vaga '}
                                  <span className="font-medium text-purple-400">{movement.jobTitle}</span>
                                </>
                              )}
                            </p>
                            <div className="mt-1 text-xs text-gray-500">
                              {formatTimestamp(movement.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-6 text-sm">
                      <History size={32} className="mx-auto mb-2 opacity-50"/>
                      Nenhuma movimentação registrada
                      <p className="text-xs mt-1">As movimentações serão registradas a partir de agora</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Informações de Criação/Atualização */}
              <div className="bg-gray-800/30 rounded-lg p-3 text-xs text-gray-500 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-gray-400">Criado em:</span>
                  {formatTimestamp(d.createdAt)} {d.createdBy && `por ${d.createdBy}`}
                </div>
                <div>
                  <span className="block text-gray-400">Última atualização:</span>
                  {formatTimestamp(d.updatedAt)} {d.updatedBy && `por ${d.updatedBy}`}
                </div>
              </div>
            </div>
          )}
          {activeSection === 'adicional' && (
            <div className="grid grid-cols-2 gap-6">
              <InputField label="Tipo de Candidatura" field="typeOfApp" value={d.typeOfApp} onChange={handleInputChange}/>
              <div className="mb-3 col-span-2">
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">Campo Livre</label>
                <textarea className="w-full bg-white dark:bg-gray-900 dark:bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:border-gray-200 dark:border-gray-700 p-2.5 rounded text-white dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-32" value={d.freeField || ''} onChange={e=>setD({...d, freeField:e.target.value})} placeholder="Informações adicionais..."/>
              </div>
              <InputField label="ID Externo" field="external_id" value={d.external_id} onChange={handleInputChange}/>
              <InputField label="Timestamp Original" field="original_timestamp" value={d.original_timestamp} onChange={handleInputChange}/>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 dark:border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-6 py-2 text-slate-400 dark:text-slate-400">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving} className="bg-brand-orange text-white px-8 py-2 rounded">Salvar</button>
        </div>
      </div>
    </div>
  );
};

// --- MASTER DATA MANAGER ---
const MasterDataManager = ({ collection, title, fields, items, onSave, onDelete, onShowToast }) => {
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter(item => 
      fields.some(f => {
        const value = item[f.key] || '';
        return String(value).toLowerCase().includes(s);
      })
    );
  }, [items, search, fields]);

  const handleSave = async () => {
    if (!formData[fields[0].key]) {
      onShowToast('Preencha os campos obrigatórios', 'error');
      return;
    }
    await onSave(collection, formData, () => {
      setEditing(null);
      setFormData({});
    });
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <button
          onClick={() => { setEditing({}); setFormData({}); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18}/> Novo
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-900">
            <tr>
              {fields.map(f => (
                <th key={f.key} className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                {fields.map(f => (
                  <td key={f.key} className="px-4 py-3 text-gray-900 dark:text-white">
                    {item[f.key] || '-'}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setEditing(item); setFormData(item); }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <Edit3 size={16}/>
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja excluir?')) {
                          onDelete(collection, item.id);
                        }
                      }}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editing.id ? 'Editar' : 'Novo'} {title}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={formData[f.key] || ''}
                    onChange={e => setFormData({...formData, [f.key]: e.target.value})}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                    required={f.required}
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => { setEditing(null); setFormData({}); }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};