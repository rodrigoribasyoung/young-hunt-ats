import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Briefcase, Settings, Plus, Search, 
  FileText, MapPin, Filter, Trophy, Menu, X, LogOut, Loader2, Edit3, Trash2,
  Building2, Mail, Check, Ban, UserMinus, CheckSquare, Square, Kanban, List,
  CalendarCheck, AlertCircle, UserPlus, Moon, Sun, ChevronLeft, ChevronRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

// Firebase Imports
import { initializeApp } from "firebase/app";
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut 
} from "firebase/auth";
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, serverTimestamp, query, orderBy, writeBatch, getDocs 
} from "firebase/firestore";

// Component Imports
import TransitionModal from './components/modals/TransitionModal';
import SettingsPage from './components/SettingsPage';
import CsvImportModal from './components/modals/CsvImportModal';
import JobCandidatesModal from './components/modals/JobsCandidateModal';
import { useTheme } from './ThemeContext';

import { PIPELINE_STAGES, STATUS_COLORS, JOB_STATUSES, CSV_FIELD_MAPPING_OPTIONS, ALL_STATUSES, CLOSING_STATUSES, STAGE_REQUIRED_FIELDS } from './constants';
import { normalizeCity, getMainCitiesOptions } from './utils/cityNormalizer';
import { normalizeSource, getMainSourcesOptions } from './utils/sourceNormalizer';
import { normalizeInterestArea, normalizeInterestAreasString, getMainInterestAreasOptions } from './utils/interestAreaNormalizer';

const COLORS = ['#fe5009', '#00bcbc', '#fb923c', '#22d3ee', '#f87171', '#8884d8', '#82ca9d']; 

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- COMPONENTES AUXILIARES ---

// Dashboard com Gráficos
const Dashboard = ({ filteredJobs, filteredCandidates, onOpenCandidates }) => {
  // Dados para gráficos
  const statusData = useMemo(() => {
    const counts = {};
    PIPELINE_STAGES.forEach(stage => {
      counts[stage] = filteredCandidates.filter(c => (c.status || 'Inscrito') === stage).length;
    });
    counts['Contratado'] = filteredCandidates.filter(c => c.status === 'Contratado').length;
    counts['Reprovado'] = filteredCandidates.filter(c => c.status === 'Reprovado').length;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredCandidates]);

  const areaData = useMemo(() => {
    const areas = {};
    filteredCandidates.forEach(c => {
      if (c.interestAreas) {
        areas[c.interestAreas] = (areas[c.interestAreas] || 0) + 1;
      }
    });
    return Object.entries(areas).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [filteredCandidates]);

  const cityData = useMemo(() => {
    const cities = {};
    filteredCandidates.forEach(c => {
      if (c.city) {
        cities[c.city] = (cities[c.city] || 0) + 1;
      }
    });
    return Object.entries(cities).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [filteredCandidates]);

  const originData = useMemo(() => {
    const origins = {};
    filteredCandidates.forEach(c => {
      if (c.source) origins[c.source] = (origins[c.source] || 0) + 1;
    });
    return Object.entries(origins).slice(0,5).map(([name,value])=>({name,value}));
  }, [filteredCandidates]);

  const missingReturnCount = useMemo(() => {
    return filteredCandidates.filter(c => (c.status === 'Seleção' || c.status === 'Selecionado') && !c.returnSent).length;
  }, [filteredCandidates]);

  const jobStats = {
    open: filteredJobs.filter(j => j.status === 'Aberta').length,
    filled: filteredJobs.filter(j => j.status === 'Preenchida').length,
    closed: filteredJobs.filter(j => j.status === 'Fechada').length,
  };

  const candidateStats = {
    total: filteredCandidates.length,
    hired: filteredCandidates.filter(c => c.status === 'Contratado').length,
    rejected: filteredCandidates.filter(c => c.status === 'Reprovado').length,
    active: filteredCandidates.filter(c => PIPELINE_STAGES.includes(c.status || 'Inscrito')).length,
  };

  return (
    <div className="text-white space-y-6 overflow-y-auto h-full pb-6">
      <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
      
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => onOpenCandidates && onOpenCandidates(filteredCandidates)} className="cursor-pointer bg-gradient-to-br from-blue-900/30 to-blue-800/10 p-6 rounded-xl border border-blue-700/30 hover:scale-[1.01] transition-transform">
          <h3 className="text-slate-400 text-sm font-semibold">Total de Candidatos</h3>
          <p className="text-3xl font-bold text-blue-300 mt-2">{candidateStats.total}</p>
          <p className="text-xs text-slate-500 mt-1">{candidateStats.active} em processo</p>
        </div>
        <div onClick={() => onOpenCandidates && onOpenCandidates(filteredCandidates.filter(c=>c.status==='Contratado'))} className="cursor-pointer bg-gradient-to-br from-green-900/30 to-green-800/10 p-6 rounded-xl border border-green-700/30 hover:scale-[1.01] transition-transform">
          <h3 className="text-slate-400 text-sm font-semibold">Contratados</h3>
          <p className="text-3xl font-bold text-green-300 mt-2">{candidateStats.hired}</p>
          <p className="text-xs text-slate-500 mt-1">Taxa: {candidateStats.total > 0 ? ((candidateStats.hired / candidateStats.total) * 100).toFixed(1) : 0}%</p>
        </div>
        <div onClick={() => onOpenCandidates && onOpenCandidates(filteredJobs.filter(j=>j.status==='Aberta').flatMap(j=>filteredCandidates.filter(c=>c.jobId===j.id)))} className="cursor-pointer bg-gradient-to-br from-orange-900/30 to-orange-800/10 p-6 rounded-xl border border-orange-700/30 hover:scale-[1.01] transition-transform">
          <h3 className="text-slate-400 text-sm font-semibold">Vagas Abertas</h3>
          <p className="text-3xl font-bold text-orange-300 mt-2">{jobStats.open}</p>
          <p className="text-xs text-slate-500 mt-1">{jobStats.filled} preenchidas</p>
        </div>
        <div onClick={() => onOpenCandidates && onOpenCandidates(filteredCandidates.filter(c=>c.status==='Reprovado'))} className="cursor-pointer bg-gradient-to-br from-red-900/30 to-red-800/10 p-6 rounded-xl border border-red-700/30 hover:scale-[1.01] transition-transform">
          <h3 className="text-slate-400 text-sm font-semibold">Reprovados</h3>
          <p className="text-3xl font-bold text-red-300 mt-2">{candidateStats.rejected}</p>
          <p className="text-xs text-slate-500 mt-1">Taxa: {candidateStats.total > 0 ? ((candidateStats.rejected / candidateStats.total) * 100).toFixed(1) : 0}%</p>
        </div>

      </div>
      {/* Card rápido: falta dar retorno */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div onClick={() => onOpenCandidates && onOpenCandidates(filteredCandidates.filter(c => (c.status === 'Seleção' || c.status === 'Selecionado') && !c.returnSent))} className="cursor-pointer bg-brand-card p-4 rounded-xl border border-brand-border">
          <div className="text-slate-400 text-sm">Faltam dar retorno</div>
          <div className="text-2xl font-bold text-brand-orange mt-2">{missingReturnCount}</div>
          <div className="text-xs text-slate-500 mt-1">Candidatos selecionados sem confirmação</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Status */}
        <div className="bg-brand-card p-6 rounded-xl border border-brand-border">
          <h3 className="font-bold text-lg text-white mb-4">Distribuição por Status</h3>
          {statusData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 24, left: 180, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" width={170} tick={{ fontSize: 12 }}/>
                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0'}}/>
                <Bar dataKey="value" fill="#fe5009" radius={[0, 8, 8, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-slate-500">Sem dados</div>
          )}
        </div>

        {/* Top 5 Áreas de Interesse */}
        <div className="bg-brand-card p-6 rounded-xl border border-brand-border">
          <h3 className="font-bold text-lg text-white mb-4">Principais Áreas de Interesse</h3>
          {areaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={areaData} cx="50%" cy="50%" labelLine={false} label={({name, value}) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
                  {areaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0'}}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500">Sem dados</div>
          )}
        </div>

        {/* Origem dos Candidatos (Top) */}
        <div className="bg-brand-card p-6 rounded-xl border border-brand-border">
          <h3 className="font-bold text-lg text-white mb-4">Origem dos Candidatos</h3>
          {originData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={originData} cx="50%" cy="50%" labelLine={false} label={({name, value}) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
                  {originData.map((entry, index) => (
                    <Cell key={`cell-origin-${index}`} fill={COLORS[index % COLORS.length]}/>
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0'}}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500">Sem dados</div>
          )}
        </div>

        {/* Top 5 Cidades */}
        <div className="bg-brand-card p-6 rounded-xl border border-brand-border">
          <h3 className="font-bold text-lg text-white mb-4">Candidatos por Cidade</h3>
          {cityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cityData} layout="vertical" margin={{top: 5, right: 30, left: 200, bottom: 5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                <XAxis type="number" stroke="#94a3b8"/>
                <YAxis type="category" dataKey="name" stroke="#94a3b8" width={190} tick={{fontSize: 12}}/>
                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0'}}/>
                <Bar dataKey="value" fill="#00bcbc" radius={[0, 8, 8, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500">Sem dados</div>
          )}
        </div>

        {/* Status de Vagas */}
        <div className="bg-brand-card p-6 rounded-xl border border-brand-border">
          <h3 className="font-bold text-lg text-white mb-4">Status das Vagas</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Abertas', value: jobStats.open },
                  { name: 'Preenchidas', value: jobStats.filled },
                  { name: 'Fechadas', value: jobStats.closed }
                ]}
                cx="50%"
                cy="48%"
                labelLine={false}
                label={({name, value}) => `${name}: ${value}`}
                outerRadius={110}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#fe5009"/>
                <Cell fill="#00bcbc"/>
                <Cell fill="#64748b"/>
              </Pie>
              <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0'}}/>
              <Legend verticalAlign="bottom" height={32} wrapperStyle={{ color: '#e2e8f0', fontSize: 12 }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// --- LOGIN ---
const LoginScreen = ({ onLogin }) => (
  <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
    <div className="bg-brand-card p-8 rounded-xl border border-brand-border shadow-2xl max-w-md w-full text-center">
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-brand-orange/10 rounded-full border border-brand-orange/20">
          <Trophy size={48} className="text-brand-orange" />
        </div>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2 font-sans">YoungTalents</h1>
      <button onClick={onLogin} className="w-full bg-white text-slate-900 py-3.5 px-4 rounded-lg font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-3 shadow-lg mt-6">
        Entrar com Google
      </button>
    </div>
  </div>
);

// --- SIDEBAR FILTROS AVANÇADOS ---
const FILTER_STORAGE_KEY = 'yt-filters';

const FilterSidebar = ({ isOpen, onClose, filters, setFilters, clearFilters, options, candidates = [] }) => {
  const [searchTexts, setSearchTexts] = React.useState({
    city: '',
    interestAreas: '',
    source: ''
  });
  const [showCustomPeriod, setShowCustomPeriod] = React.useState(filters.createdAtPreset === 'custom');
  
  React.useEffect(() => {
    setShowCustomPeriod(filters.createdAtPreset === 'custom');
  }, [filters.createdAtPreset]);
  
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

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-96 bg-brand-card border-l border-brand-border z-50 p-6 shadow-2xl transform transition-transform duration-300 overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-white text-lg flex items-center gap-2"><Filter size={20}/> Filtros Avançados</h3>
          <button onClick={onClose}><X className="text-slate-400 hover:text-white" /></button>
        </div>
        
        <div className="space-y-6 flex-1 custom-scrollbar overflow-y-auto pr-2">
          {/* Período */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-orange uppercase">Período</label>
            <select
              className="w-full bg-brand-dark border border-brand-border rounded p-3 text-sm text-white outline-none focus:border-brand-orange"
              value={filters.createdAtPreset || 'all'}
              onChange={e => {
                const value = e.target.value;
                setFilters({...filters, createdAtPreset: value, customDateStart: '', customDateEnd: ''});
                setShowCustomPeriod(value === 'custom');
              }}
            >
              <option value="all">Qualquer data</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="custom">Período personalizado</option>
            </select>
            {showCustomPeriod && (
              <div className="space-y-2 mt-2">
                <input
                  type="date"
                  className="w-full bg-brand-dark border border-brand-border rounded p-2 text-sm text-white outline-none focus:border-brand-orange"
                  value={filters.customDateStart || ''}
                  onChange={e => setFilters({...filters, customDateStart: e.target.value})}
                  placeholder="Data inicial"
                />
                <input
                  type="date"
                  className="w-full bg-brand-dark border border-brand-border rounded p-2 text-sm text-white outline-none focus:border-brand-orange"
                  value={filters.customDateEnd || ''}
                  onChange={e => setFilters({...filters, customDateEnd: e.target.value})}
                  placeholder="Data final"
                />
              </div>
            )}
          </div>

          {/* Status (Etapa da Pipeline) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-orange uppercase">Status (Etapa)</label>
            <select
              className="w-full bg-brand-dark border border-brand-border rounded p-3 text-sm text-white outline-none focus:border-brand-orange"
              value={filters.status || 'all'}
              onChange={e => setFilters({...filters, status: e.target.value})}
            >
              <option value="all">Todas as etapas</option>
              {PIPELINE_STAGES.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
              {CLOSING_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-orange uppercase">Vaga Vinculada</label>
            <select className="w-full bg-brand-dark border border-brand-border rounded p-3 text-sm text-white outline-none focus:border-brand-orange" value={filters.jobId} onChange={e => setFilters({...filters, jobId: e.target.value})}>
               <option value="all">Todas as Vagas</option>{options.jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>

           {dynamicFilters.map(field => {
             // Prefer options from system lists, fallback to deriving from candidates
             let optionsList = [];
             if(field.value === 'city') {
               optionsList = (options.cities && options.cities.length>0) 
                 ? options.cities.map(c=>({id:c.id,name:c.name})) 
                 : Array.from(new Set(candidates.map(x=>x.city).filter(Boolean))).map((n,i)=>({id:i,name:n}));
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
             const needsSearch = ['city', 'interestAreas', 'source'].includes(field.value);

             return (
               <div key={field.value} className="space-y-2">
                 <label className="text-xs font-bold text-slate-400 uppercase">{field.label.replace(':', '')}</label>
                 {needsSearch && (
                   <input
                     type="text"
                     className="w-full bg-brand-dark border border-brand-border rounded p-2 text-sm text-white outline-none focus:border-brand-cyan mb-2"
                     placeholder={`Buscar ${field.label.replace(':', '').toLowerCase()}...`}
                     value={searchTexts[field.value] || ''}
                     onChange={e => setSearchTexts({...searchTexts, [field.value]: e.target.value})}
                   />
                 )}
                 {hasOptions ? (
                   <select 
                     className="w-full bg-brand-dark border border-brand-border rounded p-3 text-sm text-white outline-none focus:border-brand-orange" 
                     value={filters[field.value] || 'all'} 
                     onChange={e => setFilters({...filters, [field.value]: e.target.value})}
                   >
                     <option value="all">Todos</option>
                     {optionsList.map(o => <option key={o.id || o.name} value={o.name}>{o.name}</option>)}
                   </select>
                 ) : isBoolean ? (
                   <select className="w-full bg-brand-dark border border-brand-border rounded p-3 text-sm text-white outline-none focus:border-brand-orange" value={filters[field.value] || 'all'} onChange={e => setFilters({...filters, [field.value]: e.target.value})}>
                     <option value="all">Todos</option><option value="Sim">Sim</option><option value="Não">Não</option>
                   </select>
                 ) : (
                   <input type="text" className="w-full bg-brand-dark border border-brand-border rounded p-3 text-sm text-white outline-none focus:border-brand-orange" placeholder={`Filtrar...`} value={filters[field.value] || ''} onChange={e => setFilters({...filters, [field.value]: e.target.value})}/>
                 )}
               </div>
             );
           })}
        </div>

        <div className="mt-8 pt-4 border-t border-brand-border flex flex-col gap-3">
          <button onClick={onClose} className="w-full bg-brand-orange text-white py-3 rounded font-bold hover:bg-orange-600">Aplicar Filtros</button>
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
            className="flex-1 text-brand-cyan hover:text-white py-2 text-sm"
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
  const getRouteFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page') || 'pipeline';
    return {
      page,
      modal: params.get('modal') || null,
      id: params.get('id') || null,
      settingsTab: params.get('settingsTab') || (page === 'settings' ? 'campos' : null)
    };
  };

  const updateURL = (updates) => {
    const params = new URLSearchParams(window.location.search);
    Object.keys(updates).forEach(key => {
      if (updates[key]) {
        params.set(key, updates[key]);
      } else {
        params.delete(key);
      }
    });
    const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({}, '', newURL);
  };

  const [route, setRoute] = useState(getRouteFromURL());
  const activeTab = route.page;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Sincronizar URL com mudanças de rota e inicializar settingsTab se necessário
  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRouteFromURL());
    };
    window.addEventListener('popstate', handlePopState);
    
    // Inicializar URL se não houver parâmetros
    if (!window.location.search) {
      updateURL({ page: activeTab });
    }
    
    // Inicializar settingsTab na URL se estiver na página de settings
    if (activeTab === 'settings' && !route.settingsTab) {
      updateURL({ page: activeTab, settingsTab: 'campos' });
      setRoute(prev => ({ ...prev, settingsTab: 'campos' }));
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setActiveTab = (tab) => {
    updateURL({ page: tab });
    setRoute(prev => ({ ...prev, page: tab }));
  };
  
  // Dados
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [cities, setCities] = useState([]);
  const [interestAreas, setInterestAreas] = useState([]);
  const [roles, setRoles] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [schooling, setSchooling] = useState([]);
  const [marital, setMarital] = useState([]);
  const [tags, setTags] = useState([]);

  // Modais - sincronizados com URL
  const isJobModalOpen = route.modal === 'job';
  const isCsvModalOpen = route.modal === 'csv';
  const viewingJob = route.modal === 'job-candidates' && route.id ? jobs.find(j => j.id === route.id) : null;
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [pendingTransition, setPendingTransition] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [dashboardModalCandidates, setDashboardModalCandidates] = useState(null);

  // Helpers para abrir modais com URL
  const openJobModal = (job = null) => {
    setEditingJob(job);
    updateURL({ modal: 'job', id: job?.id || '' });
    setRoute(prev => ({ ...prev, modal: 'job', id: job?.id || '' }));
  };

  const closeJobModal = () => {
    setEditingJob(null);
    updateURL({ modal: null, id: null });
    setRoute(prev => ({ ...prev, modal: null, id: null }));
  };

  const openCsvModal = () => {
    updateURL({ modal: 'csv' });
    setRoute(prev => ({ ...prev, modal: 'csv' }));
  };

  const closeCsvModal = () => {
    updateURL({ modal: null });
    setRoute(prev => ({ ...prev, modal: null }));
  };

  const openJobCandidatesModal = (job) => {
    updateURL({ modal: 'job-candidates', id: job?.id || '' });
    setRoute(prev => ({ ...prev, modal: 'job-candidates', id: job?.id || '' }));
  };

  const closeJobCandidatesModal = () => {
    updateURL({ modal: null, id: null });
    setRoute(prev => ({ ...prev, modal: null, id: null }));
  };
  
  // Filtro Global
  const initialFilters = { 
    jobId: 'all', company: 'all', city: 'all', interestArea: 'all',
    cnh: 'all', marital: 'all', origin: 'all', schooling: 'all',
    createdAtPreset: 'all'
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

  useEffect(() => { return onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); }); }, []);
  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { console.error(e); } };

  // Sync Data
  useEffect(() => {
    if (!user) return;
    const unsubs = [
      onSnapshot(query(collection(db, 'jobs')), s => setJobs(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'candidates')), s => setCandidates(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'companies')), s => setCompanies(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'cities')), s => setCities(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'interest_areas')), s => setInterestAreas(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'origins')), s => setOrigins(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'schooling_levels')), s => setSchooling(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'marital_statuses')), s => setMarital(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'tags')), s => setTags(s.docs.map(d => ({id:d.id, ...d.data()})))),
    ];
    return () => unsubs.forEach(u => u());
  }, [user]);

  const handleSaveGeneric = async (col, d, closeFn) => {
    setIsSaving(true);
    try {
      const payload = { ...d, updatedAt: serverTimestamp() };
      
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
      
      if (!d.id) payload.createdAt = serverTimestamp();
      if (d.id) await updateDoc(doc(db, col, d.id), payload);
      else await addDoc(collection(db, col), payload);
      if(closeFn) closeFn();
      showToast('Salvo com sucesso', 'success');
    } catch(e) { showToast(`Erro ao salvar: ${e.message}`, 'error'); } finally { setIsSaving(false); }
  };

  const computeMissingFields = (candidate, nextStatus) => {
    const required = STAGE_REQUIRED_FIELDS[nextStatus] || [];
    return required.filter((field) => {
      const value = candidate[field];
      return value === undefined || value === null || value === '';
    });
  };

  // --- LÓGICA DE MOVIMENTO DE CARDS COM VALIDAÇÃO ---
  const handleDragEnd = (cId, newStage) => {
    const candidate = candidates.find(c => c.id === cId);
    if (!candidate || candidate.status === newStage || !ALL_STATUSES.includes(newStage)) return;

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
    updateDoc(doc(db, 'candidates', cId), { status: newStage, updatedAt: serverTimestamp() });
    showToast('Status atualizado', 'success');
  };

  const handleCloseStatus = (cId, status) => {
     handleDragEnd(cId, status); // Reutiliza a lógica do DragEnd para acionar o modal se necessário
  };

  // Filtra candidatos baseado nos filtros da Sidebar (Avançados)
  const filteredCandidates = useMemo(() => {
    let data = [...candidates];
    const nowSeconds = Math.floor(Date.now() / 1000);
    const preset = filters.createdAtPreset || 'all';
    const presetToSeconds = {
      '7d': 7 * 24 * 60 * 60,
      '30d': 30 * 24 * 60 * 60,
      '90d': 90 * 24 * 60 * 60,
    };
    Object.keys(filters).forEach(key => {
       if(filters[key] !== 'all' && filters[key] !== '') {
          if (key === 'createdAtPreset') return;
          data = data.filter(c => c[key] === filters[key]);
       }
    });
    if (preset !== 'all') {
      const delta = presetToSeconds[preset];
      if (delta) {
        data = data.filter(c => {
          const ts = c.createdAt?.seconds || c.createdAt?._seconds;
          if (!ts) return false;
          return ts >= nowSeconds - delta;
        });
      }
    }
    return data;
  }, [candidates, filters]);

  const optionsProps = { jobs, companies, cities, interestAreas, roles, origins, schooling, marital, tags };

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-brand-dark text-brand-cyan"><Loader2 className="animate-spin mr-2"/> Carregando...</div>;
  if (!user) return <LoginScreen onLogin={handleGoogleLogin} />;

  return (
    <div className="flex min-h-screen bg-brand-dark font-sans text-slate-200 overflow-hidden">
      
      {/* SIDEBAR PRINCIPAL */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-brand-card border-r border-brand-border flex flex-col transition-transform ${isSidebarOpen?'translate-x-0':'-translate-x-full'} lg:translate-x-0`}>
        <div className="p-6 border-b border-brand-border flex items-center justify-between">
           <div className="flex items-center gap-2 font-bold text-xl text-white"><Trophy size={24} className="text-brand-orange"/> YoungTalents</div>
           <button onClick={()=>setIsSidebarOpen(false)} className="lg:hidden"><X/></button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
           {[{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'pipeline', label: 'Pipeline de Talentos', icon: Filter }, { id: 'jobs', label: 'Gestão de Vagas', icon: Briefcase }, { id: 'candidates', label: 'Banco de Talentos', icon: Users }, { id: 'settings', label: 'Configurações', icon: Settings }].map(i => (
             <button key={i.id} onClick={() => { setActiveTab(i.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-colors ${activeTab === i.id ? 'bg-brand-orange text-white shadow-lg' : 'text-slate-400 hover:bg-brand-hover hover:text-white'}`}>
               <i.icon size={18}/> {i.label}
             </button>
           ))}
        </nav>
        <div className="p-4 border-t border-brand-border bg-brand-dark/30 flex items-center justify-between">
           <div className="text-xs text-slate-400 truncate w-32">{user.email}</div>
           <button onClick={()=>signOut(auth)}><LogOut size={16} className="text-red-400 hover:text-red-300"/></button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden lg:pl-64">
        <header className="h-16 border-b border-brand-border bg-brand-card flex items-center justify-between px-4 z-20">
           <div className="flex items-center gap-2">
             <button onClick={()=>setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-brand-hover rounded transition-colors">
               {isSidebarOpen ? <ChevronLeft size={20} className="text-slate-400"/> : <Menu size={20} className="text-slate-400"/>}
             </button>
             <h2 className="text-lg font-bold text-white ml-2 lg:ml-0">
                {activeTab === 'pipeline' ? 'Pipeline de Talentos' : activeTab === 'jobs' ? 'Gestão de Vagas' : activeTab === 'candidates' ? 'Banco de Talentos' : activeTab === 'settings' ? 'Configurações' : 'Dashboard'}
             </h2>
           </div>
           <div className="flex items-center gap-3">
              <button onClick={() => setIsFilterSidebarOpen(true)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-brand-cyan font-bold px-3 py-1.5 rounded border border-slate-700 hover:border-brand-cyan transition-colors">
                 <Filter size={16}/> Filtros Avançados
              </button>
              <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-brand-cyan rounded border border-slate-700 hover:border-brand-cyan transition-colors">
                 {isDark ? <Sun size={18}/> : <Moon size={18}/>}
              </button>
           </div>
        </header>

        <div className="flex-1 overflow-hidden bg-brand-dark relative">
           {activeTab === 'dashboard' && <div className="p-6 overflow-y-auto h-full"><Dashboard filteredJobs={jobs} filteredCandidates={filteredCandidates} onOpenCandidates={setDashboardModalCandidates} /></div>}
           {activeTab === 'pipeline' && <PipelineView candidates={filteredCandidates} jobs={jobs} companies={companies} onDragEnd={handleDragEnd} onEdit={setEditingCandidate} onCloseStatus={handleCloseStatus} />}
           {activeTab === 'jobs' && <div className="p-6 overflow-y-auto h-full"><JobsList jobs={jobs} candidates={candidates} onAdd={()=>openJobModal({})} onEdit={(j)=>openJobModal(j)} onDelete={(id)=>deleteDoc(doc(db,'jobs',id))} onToggleStatus={handleSaveGeneric} onFilterPipeline={()=>{setFilters({...filters, jobId: 'mock_id'}); setActiveTab('pipeline')}} onViewCandidates={openJobCandidatesModal}/></div>}
           {activeTab === 'candidates' && <div className="p-6 overflow-y-auto h-full"><CandidatesList candidates={filteredCandidates} jobs={jobs} onAdd={()=>setEditingCandidate({})} onEdit={setEditingCandidate} onDelete={(id)=>deleteDoc(doc(db,'candidates',id))}/></div>}
           {activeTab === 'settings' && <div className="p-0 h-full"><SettingsPage {...optionsProps} onOpenCsvModal={openCsvModal} activeSettingsTab={route.settingsTab} onSettingsTabChange={(tab) => { updateURL({ settingsTab: tab }); setRoute(prev => ({ ...prev, settingsTab: tab })); }} onShowToast={showToast} /></div>}
        </div>
      </div>

      <FilterSidebar isOpen={isFilterSidebarOpen} onClose={() => setIsFilterSidebarOpen(false)} filters={filters} setFilters={setFilters} clearFilters={() => setFilters(initialFilters)} options={optionsProps} candidates={candidates} />

      {/* MODAIS GLOBAIS - CORRIGIDO PASSAGEM DE PROPS */}
      {isJobModalOpen && <JobModal isOpen={isJobModalOpen} job={editingJob} onClose={closeJobModal} onSave={d => handleSaveGeneric('jobs', d, closeJobModal)} options={optionsProps} isSaving={isSaving} />}
      {editingCandidate && <CandidateModal candidate={editingCandidate} onClose={() => setEditingCandidate(null)} onSave={d => handleSaveGeneric('candidates', d, () => setEditingCandidate(null))} options={optionsProps} isSaving={isSaving} />}
      
      {/* CORREÇÃO IMPORTANTE: Passando todas as props necessárias para o TransitionModal */}
      {pendingTransition && (
        <TransitionModal 
          transition={pendingTransition} 
          onClose={() => setPendingTransition(null)} 
          onConfirm={d => {
            const payload = {
              id: pendingTransition.candidate.id,
              ...d,
              status: pendingTransition.toStage,
              updatedAt: serverTimestamp()
            };
            if (pendingTransition.isConclusion) {
              payload.closedAt = serverTimestamp();
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
                    batch.update(candidateRef, {
                      ...candidateData,
                      updatedAt: serverTimestamp()
                    });
                    updated++;
                    batchOps++;
                  } else if (importMode === 'duplicate') {
                    const candidateRef = doc(collection(db, 'candidates'));
                    batch.set(candidateRef, {
                      ...candidateData,
                      createdAt: serverTimestamp(),
                      imported: true
                    });
                    duplicated++;
                    batchOps++;
                  }
                } else {
                  // Novo candidato
                  const candidateRef = doc(collection(db, 'candidates'));
                  batch.set(candidateRef, {
                    ...candidateData,
                    createdAt: serverTimestamp(),
                    imported: true
                  });
                  imported++;
                  batchOps++;
                }
              }

              if (batchOps > 0) {
                await batch.commit();
              }
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
      <JobCandidatesModal isOpen={!!viewingJob} onClose={closeJobCandidatesModal} job={viewingJob} candidates={candidates.filter(c => c.jobId === viewingJob?.id)} />
      {dashboardModalCandidates && (
        <JobCandidatesModal isOpen={true} onClose={() => setDashboardModalCandidates(null)} job={{ title: 'Resultados do Dashboard' }} candidates={dashboardModalCandidates} />
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
  );
}

// --- PIPELINE VIEW ---
const PipelineView = ({ candidates, jobs, onDragEnd, onEdit, onCloseStatus, companies }) => {
  const [viewMode, setViewMode] = useState('kanban'); 
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleCounts, setVisibleCounts] = useState(PIPELINE_STAGES.reduce((acc, stage) => ({...acc, [stage]: 20}), {}));
  const [localSearch, setLocalSearch] = useState('');
  const [localSort, setLocalSort] = useState('recent');
  const [statusFilter, setStatusFilter] = useState('active'); // active, hired, rejected
  const [pipelineStatusFilter, setPipelineStatusFilter] = useState('all'); // Filtro específico por etapa
  const [jobFilter, setJobFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  useEffect(() => setSelectedIds([]), [candidates]);

  const handleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleSelectAll = () => selectedIds.length === candidates.length ? setSelectedIds([]) : setSelectedIds(candidates.map(c => c.id));
  const loadMore = (stage) => setVisibleCounts(prev => ({ ...prev, [stage]: prev[stage] + 20 }));

  const processedData = useMemo(() => {
     let data = [...candidates];
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
       data = data.filter(c => c.city === cityFilter);
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
         if (localSort === 'recent') return (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0);
         if (localSort === 'oldest') return (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0);
         if (localSort === 'az') return (a.fullName||'').localeCompare(b.fullName||'');
         if (localSort === 'za') return (b.fullName||'').localeCompare(a.fullName||'');
         return 0;
     });
     return data;
  }, [candidates, statusFilter, localSearch, localSort, pipelineStatusFilter, jobFilter, companyFilter, cityFilter, jobs]);

  return (
     <div className="flex flex-col h-full relative">
        <div className="px-6 py-3 border-b border-brand-border flex flex-wrap gap-4 justify-between items-center bg-brand-dark">
           <div className="flex gap-3 items-center flex-wrap">
              <div className="flex bg-brand-card p-1 rounded-lg border border-brand-border">
                 <button onClick={() => setViewMode('kanban')} className={`p-2 rounded ${viewMode==='kanban' ? 'bg-brand-dark text-brand-cyan' : 'text-slate-400'}`}><Kanban size={16}/></button>
                 <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode==='list' ? 'bg-brand-dark text-brand-cyan' : 'text-slate-400'}`}><List size={16}/></button>
              </div>
              <input className="bg-brand-card border border-brand-border rounded px-3 py-1.5 text-sm text-white outline-none focus:border-brand-cyan w-48" placeholder="Buscar..." value={localSearch} onChange={e=>setLocalSearch(e.target.value)}/>
              <select className="bg-brand-card border border-brand-border rounded px-3 py-1.5 text-sm text-white outline-none" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                 <option value="active">Em Andamento</option><option value="hired">Contratados</option><option value="rejected">Reprovados</option><option value="all">Todos</option>
              </select>
              {viewMode === 'list' && (
                <>
                  <select className="bg-brand-card border border-brand-border rounded px-3 py-1.5 text-sm text-white outline-none" value={pipelineStatusFilter} onChange={e=>setPipelineStatusFilter(e.target.value)}>
                    <option value="all">Todas as Etapas</option>
                    {PIPELINE_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                  </select>
                  <select className="bg-brand-card border border-brand-border rounded px-3 py-1.5 text-sm text-white outline-none" value={jobFilter} onChange={e=>setJobFilter(e.target.value)}>
                    <option value="all">Todas as Vagas</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                  <select className="bg-brand-card border border-brand-border rounded px-3 py-1.5 text-sm text-white outline-none" value={companyFilter} onChange={e=>setCompanyFilter(e.target.value)}>
                    <option value="all">Todas as Empresas</option>
                    {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <select className="bg-brand-card border border-brand-border rounded px-3 py-1.5 text-sm text-white outline-none" value={cityFilter} onChange={e=>setCityFilter(e.target.value)}>
                    <option value="all">Todas as Cidades</option>
                    {Array.from(new Set(candidates.map(c => c.city).filter(Boolean))).sort().map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </>
              )}
              <select className="bg-brand-card border border-brand-border rounded px-3 py-1.5 text-sm text-white outline-none" value={localSort} onChange={e=>setLocalSort(e.target.value)}>
                 <option value="recent">Mais Recentes</option><option value="oldest">Mais Antigos</option><option value="az">A-Z</option><option value="za">Z-A</option>
              </select>
           </div>
           <div className="text-xs text-slate-500">{processedData.length} talentos</div>
        </div>
        <div className="flex-1 overflow-hidden">
           {viewMode === 'kanban' ? (
              <div className="h-full overflow-x-auto p-2 custom-scrollbar"><div className="flex gap-2 h-full min-w-max">
                 {PIPELINE_STAGES.map(stage => (
                    <KanbanColumn key={stage} stage={stage} allCandidates={processedData.filter(c => (c.status || 'Inscrito') === stage)} limit={visibleCounts[stage]} onLoadMore={() => loadMore(stage)} jobs={jobs} onDragEnd={onDragEnd} onEdit={onEdit} onCloseStatus={onCloseStatus} selectedIds={selectedIds} onSelect={handleSelect} />
                 ))}
              </div></div>
           ) : (
              <div className="h-full overflow-y-auto p-4 custom-scrollbar">
                 <table className="w-full text-left text-sm text-slate-300"><thead className="bg-brand-card text-white font-bold sticky top-0 z-10 shadow-sm"><tr><th className="p-4 w-10"><input type="checkbox" className="accent-brand-orange" checked={selectedIds.length>0 && selectedIds.length===processedData.length} onChange={handleSelectAll}/></th><th className="p-4">Nome</th><th className="p-4">Status</th><th className="p-4">Vaga</th><th className="p-4">Ações</th></tr></thead><tbody className="divide-y divide-brand-border bg-brand-card/20">{processedData.slice(0, itemsPerPage).map(c => (<tr key={c.id} className="hover:bg-brand-card/50"><td className="p-4"><input type="checkbox" className="accent-brand-orange" checked={selectedIds.includes(c.id)} onChange={() => handleSelect(c.id)}/></td><td className="p-4 font-bold text-white cursor-pointer" onClick={() => onEdit(c)}>{c.fullName}</td><td className="p-4"><span className={`px-2 py-0.5 rounded text-xs border ${STATUS_COLORS[c.status]}`}>{c.status}</span></td><td className="p-4 text-xs">{jobs.find(j=>j.id===c.jobId)?.title}</td><td className="p-4"><button onClick={() => onEdit(c)}><Edit3 size={16}/></button></td></tr>))}</tbody></table>
              </div>
           )}
        </div>
     </div>
  );
};

const KanbanColumn = ({ stage, allCandidates, limit, onLoadMore, jobs, onDragEnd, onEdit, onCloseStatus, selectedIds, onSelect }) => {
  const [columnColor, setColumnColor] = useState(() => {
    const saved = localStorage.getItem(`kanban-color-${stage}`);
    return saved || STATUS_COLORS[stage];
  });
  
  const displayedCandidates = allCandidates.slice(0, limit);
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
      <div className="w-[240px] flex-shrink-0 flex flex-col bg-brand-card/40 border border-brand-border rounded-xl h-full backdrop-blur-sm" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
         <div className={`p-2 border-b border-brand-border flex justify-between items-center rounded-t-xl ${columnColor} relative group`}>
           <span className="font-bold text-xs uppercase break-words">{stage}</span>
           <span className="bg-black/20 px-2 py-0.5 rounded text-xs font-mono">{allCandidates.length}</span>
           <div className="absolute top-full left-0 right-0 bg-brand-card border border-brand-border rounded-b-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
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
         </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">{displayedCandidates.map(c => {
          const candidateJob = jobs.find(j => j.id === c.jobId);
          return (
          <div key={c.id} draggable onDragStart={(e) => handleDragStart(e, c.id)} onClick={() => onEdit(c)} className={`bg-brand-card p-3 rounded-lg border hover:border-brand-cyan cursor-grab shadow-sm group relative ${selectedIds.includes(c.id) ? 'border-brand-orange bg-brand-orange/5' : 'border-brand-border'}`}>
            <div className={`absolute top-2 left-2 z-20 ${selectedIds.includes(c.id)?'opacity-100':'opacity-0 group-hover:opacity-100'}`} onClick={e=>e.stopPropagation()}><input type="checkbox" className="accent-brand-orange" checked={selectedIds.includes(c.id)} onChange={()=>onSelect(c.id)}/></div>
            
            {/* Cabeçalho com resumo */}
            <div className="pl-6 mb-2 border-b border-brand-border/50 pb-2">
              <h4 className="font-bold text-white text-sm break-words mb-1">{c.fullName}</h4>
              <div className="text-xs space-y-0.5">
                {candidateJob && (
                  <div className="text-brand-cyan flex items-center gap-1">
                    <Briefcase size={10}/> <span className="break-words">{candidateJob.title}</span>
                  </div>
                )}
                <div className="text-slate-300 flex items-center gap-1">
                  <span className={`px-1.5 py-0.5 rounded text-xs border ${STATUS_COLORS[c.status] || 'bg-slate-700 text-slate-200 border-slate-600'}`}>{c.status || 'Inscrito'}</span>
                </div>
                {c.city && (
                  <div className="text-slate-400 flex items-center gap-1">
                    <MapPin size={10}/> <span className="break-words">{c.city}</span>
                  </div>
                )}
                {c.interestAreas && (
                  <div className="text-slate-400 flex items-center gap-1">
                    <Building2 size={10}/> <span className="break-words">{c.interestAreas}</span>
                  </div>
                )}
                {candidateJob && candidateJob.company && (
                  <div className="text-slate-400 flex items-center gap-1">
                    <Building2 size={10}/> <span className="break-words">{candidateJob.company}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-1 pl-6">
              <div className="text-xs text-slate-400 truncate flex gap-1"><Mail size={10}/> {c.email || 'N/D'}</div>
              <div className="text-xs text-slate-400 truncate flex gap-1">📞 {c.phone || 'N/D'}</div>
              {c.score && <div className="text-xs text-brand-orange font-bold">Match: {c.score}%</div>}
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-brand-card shadow-lg rounded border border-brand-border z-30">
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
        )})}{allCandidates.length > limit && <button onClick={onLoadMore} className="w-full py-2 text-xs text-slate-400 dashed border border-slate-700 hover:bg-brand-card">Carregar mais</button>}</div>
      </div>
   );
};

const JobsList = ({ jobs, candidates, onAdd, onEdit, onToggleStatus, onViewCandidates }) => (
  <div className="space-y-6"><div className="flex justify-between"><h2 className="text-2xl font-bold text-white">Vagas</h2><button onClick={onAdd} className="bg-brand-orange text-white px-4 py-2 rounded flex items-center gap-2"><Plus size={18}/> Nova</button></div>
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{jobs.map(j => (<div key={j.id} className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-lg group hover:border-brand-cyan/50"><div className="flex justify-between mb-4"><select className="text-xs px-2 py-1 rounded border bg-transparent outline-none cursor-pointer text-brand-cyan border-brand-cyan/30" value={j.status} onChange={(e) => onToggleStatus('jobs', {id: j.id, status: e.target.value})} onClick={(e) => e.stopPropagation()}>{JOB_STATUSES.map(s => <option key={s} value={s} className="bg-brand-card">{s}</option>)}</select><button onClick={() => onEdit(j)} className="text-slate-400 hover:text-white opacity-0 group-hover:opacity-100"><Edit3 size={16}/></button></div><h3 className="font-bold text-lg text-white mb-1">{j.title}</h3><p className="text-sm text-slate-400 mb-4">{j.company}</p><div className="border-t border-brand-border pt-4 flex justify-between items-center"><p className="text-xs text-slate-500 cursor-pointer hover:text-brand-cyan" onClick={() => onViewCandidates(j)}>{candidates.filter(c => c.jobId === j.id).length} candidatos</p></div></div>))}</div></div>
);

const CandidatesList = ({ candidates, jobs, onAdd, onEdit, onDelete }) => {
  const [localSearch, setLocalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('fullName');
  const [sortOrder, setSortOrder] = useState('asc');

  // Filtrar por busca
  const filtered = useMemo(() => {
    let data = [...candidates];
    if (localSearch) {
      const search = localSearch.toLowerCase();
      data = data.filter(c => 
        c.fullName?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.phone?.toLowerCase().includes(search) ||
        c.city?.toLowerCase().includes(search) ||
        c.source?.toLowerCase().includes(search) ||
        c.interestAreas?.toLowerCase().includes(search) ||
        c.education?.toLowerCase().includes(search) ||
        c.schoolingLevel?.toLowerCase().includes(search)
      );
    }
    // Ordenar
    data.sort((a, b) => {
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
        <h2 className="text-2xl font-bold text-white">Banco de Talentos</h2>
        <button onClick={onAdd} className="bg-brand-cyan text-brand-dark font-bold px-4 py-2 rounded flex items-center gap-2">
          <UserPlus size={18}/> Adicionar
        </button>
      </div>

      {/* Barra de Busca e Controles */}
      <div className="bg-brand-card rounded-lg border border-brand-border p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input 
            type="text" 
            placeholder="Buscar por nome, email, telefone, cidade, fonte, área..."
            className="w-full bg-brand-dark border border-brand-border rounded px-3 py-2 text-sm text-white outline-none focus:border-brand-cyan"
            value={localSearch}
            onChange={e => {setLocalSearch(e.target.value); setCurrentPage(1);}}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Itens por página:</label>
          <select 
            className="bg-brand-dark border border-brand-border rounded px-2 py-1.5 text-xs text-white"
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
        <div className="text-xs text-slate-400">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-brand-card rounded-xl border border-brand-border shadow-lg overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="bg-brand-hover text-slate-200 font-medium sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 cursor-pointer hover:bg-brand-hover/80" onClick={() => toggleSort('fullName')}>
                  <div className="flex items-center gap-1 text-xs">Nome {sortField === 'fullName' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-brand-hover/80" onClick={() => toggleSort('email')}>
                  <div className="flex items-center gap-1 text-xs">Email {sortField === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-brand-hover/80" onClick={() => toggleSort('phone')}>
                  <div className="flex items-center gap-1 text-xs">Telefone {sortField === 'phone' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-brand-hover/80" onClick={() => toggleSort('city')}>
                  <div className="flex items-center gap-1 text-xs">Cidade {sortField === 'city' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-brand-hover/80" onClick={() => toggleSort('source')}>
                  <div className="flex items-center gap-1 text-xs">Fonte {sortField === 'source' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-brand-hover/80" onClick={() => toggleSort('interestAreas')}>
                  <div className="flex items-center gap-1 text-xs">Áreas {sortField === 'interestAreas' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-4 py-3 text-xs">Formação</th>
                <th className="px-4 py-3 cursor-pointer hover:bg-brand-hover/80" onClick={() => toggleSort('schoolingLevel')}>
                  <div className="flex items-center gap-1 text-xs">Escolaridade {sortField === 'schoolingLevel' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-4 py-3 text-xs">CNH</th>
                <th className="px-4 py-3 cursor-pointer hover:bg-brand-hover/80" onClick={() => toggleSort('status')}>
                  <div className="flex items-center gap-1 text-xs">Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-4 py-3 text-right text-xs">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {paginatedCandidates.length > 0 ? (
                paginatedCandidates.map(c => (
                  <tr key={c.id} className="hover:bg-brand-hover/50 cursor-pointer" onClick={() => onEdit(c)}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-white text-sm">{c.fullName || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-400 truncate max-w-[200px]" title={c.email}>{c.email || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-400">{c.phone || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-400">{c.city || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-brand-cyan truncate max-w-[150px]" title={c.source}>{c.source || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-brand-cyan truncate max-w-[150px]" title={c.interestAreas}>{c.interestAreas || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-400 truncate max-w-[150px]" title={c.education}>{c.education || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-400 truncate max-w-[120px]" title={c.schoolingLevel}>{c.schoolingLevel || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        {c.hasLicense === 'Sim' || c.hasLicense === true ? (
                          <span className="text-green-400">✓ Sim</span>
                        ) : c.hasLicense === 'Não' || c.hasLicense === false ? (
                          <span className="text-red-400">✗ Não</span>
                        ) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs border ${STATUS_COLORS[c.status] || 'bg-slate-700 text-slate-200 border-slate-600'}`}>
                        {c.status || 'Sem Status'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={(e) => {e.stopPropagation(); onEdit(c);}} className="text-blue-400 hover:text-blue-300" title="Editar">
                          <Edit3 size={16}/>
                        </button>
                        <button onClick={(e) => {e.stopPropagation(); onDelete(c.id);}} className="text-red-500 hover:text-red-400" title="Excluir">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="px-6 py-8 text-center text-slate-500">
                    Nenhum candidato encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="bg-brand-dark/50 border-t border-brand-border px-6 py-3 flex justify-between items-center">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-brand-card disabled:opacity-50 text-sm hover:bg-brand-hover"
            >
              ← Anterior
            </button>
            <div className="text-xs text-slate-400">
              Página {currentPage} de {totalPages}
            </div>
            <button 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded bg-brand-card disabled:opacity-50 text-sm hover:bg-brand-hover"
            >
              Próxima →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MODAIS COM CORREÇÃO DE PERFORMANCE (INPUTS FORA) ---

const InputField = ({ label, field, value, onChange, type="text" }) => (
  <div className="mb-3">
    <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">{label}</label>
    <input type={type} className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white outline-none focus:border-brand-orange" value={value||''} onChange={e => onChange(field, e.target.value)} />
  </div>
);

const JobModal = ({ isOpen, job, onClose, onSave, options, isSaving }) => {
  const [d, setD] = useState(job?.id ? {...job} : { title: '', company: '', location: '', status: 'Aberta' });
  if (!isOpen) return null;
  return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div className="bg-brand-card rounded-xl w-full max-w-md border border-brand-border p-6"><h3 className="font-bold text-lg text-white mb-4">{d.id ? 'Editar' : 'Nova'} Vaga</h3><input className="w-full bg-brand-dark border border-brand-border p-2 rounded mb-3 text-white" placeholder="Título" value={d.title} onChange={e=>setD({...d, title:e.target.value})}/><select className="w-full bg-brand-dark border border-brand-border p-2 rounded mb-3 text-white" value={d.company} onChange={e=>setD({...d, company:e.target.value})}><option value="">Empresa...</option>{options.companies.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select><select className="w-full bg-brand-dark border border-brand-border p-2 rounded mb-6 text-white" value={d.location} onChange={e=>setD({...d, location:e.target.value})}><option value="">Local...</option>{options.cities.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select><div className="flex justify-end gap-2"><button onClick={onClose} className="text-slate-400 px-4">Cancelar</button><button onClick={()=>onSave(d)} disabled={isSaving} className="bg-brand-orange text-white px-4 py-2 rounded">Salvar</button></div></div></div>);
};

const CandidateModal = ({ candidate, onClose, onSave, options, isSaving }) => {
  // Normaliza cidade ao carregar candidato
  const normalizedCandidate = candidate?.city ? { ...candidate, city: normalizeCity(candidate.city) } : candidate;
  const [d, setD] = useState({ ...normalizedCandidate });
  const [activeSection, setActiveSection] = useState('pessoal');
  
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
    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 dark:bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-brand-card dark:bg-brand-card rounded-xl w-full max-w-4xl h-[90vh] flex flex-col border border-brand-border dark:border-brand-border text-white dark:text-white">
        <div className="px-6 py-4 border-b border-brand-border dark:border-brand-border flex justify-between bg-brand-dark/50 dark:bg-brand-dark/50">
          <div><h3 className="font-bold text-xl">{d.id?'Editar':'Novo'} Candidato</h3></div>
          <button onClick={onClose}><X/></button>
        </div>
        <div className="flex border-b border-brand-border dark:border-brand-border">
          {['pessoal', 'profissional', 'processo', 'adicional'].map(tab => (
            <button key={tab} onClick={() => setActiveSection(tab)} className={`flex-1 py-3 px-4 text-sm font-bold uppercase ${activeSection === tab ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-slate-500 dark:text-slate-500'}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="p-8 overflow-y-auto flex-1 bg-brand-dark dark:bg-brand-dark">
          {activeSection === 'pessoal' && (
            <div className="grid grid-cols-2 gap-6">
              <InputField label="Nome Completo" field="fullName" value={d.fullName} onChange={handleInputChange}/>
              <InputField label="Email Principal" field="email" value={d.email} onChange={handleInputChange}/>
              <InputField label="Email Secundário" field="email_secondary" value={d.email_secondary} onChange={handleInputChange}/>
              <InputField label="Telefone/Celular" field="phone" value={d.phone} onChange={handleInputChange}/>
              <div className="mb-3">
                <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Cidade</label>
                <select className="w-full bg-brand-dark dark:bg-brand-dark border border-brand-border dark:border-brand-border p-2.5 rounded text-white dark:text-white outline-none focus:border-brand-orange" value={d.city || ''} onChange={e=>handleInputChange('city', e.target.value)}>
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
                <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Estado Civil</label>
                <select className="w-full bg-brand-dark dark:bg-brand-dark border border-brand-border dark:border-brand-border p-2.5 rounded text-white dark:text-white outline-none focus:border-brand-orange" value={d.maritalStatus || ''} onChange={e=>setD({...d, maritalStatus:e.target.value})}>
                  <option value="">Selecione...</option>
                  {options.marital && options.marital.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <InputField label="Quantidade de Filhos" field="childrenCount" type="number" value={d.childrenCount} onChange={handleInputChange}/>
              <InputField label="URL da Foto" field="photoUrl" value={d.photoUrl} onChange={handleInputChange}/>
              <div className="mb-3">
                <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Possui CNH Tipo B?</label>
                <select className="w-full bg-brand-dark dark:bg-brand-dark border border-brand-border dark:border-brand-border p-2.5 rounded text-white dark:text-white outline-none focus:border-brand-orange" value={d.hasLicense || ''} onChange={e=>setD({...d, hasLicense:e.target.value})}>
                  <option value="">Selecione...</option>
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              </div>
            </div>
          )}
          {activeSection === 'profissional' && (
            <div className="grid grid-cols-2 gap-6">
              <InputField label="Formação" field="education" value={d.education} onChange={handleInputChange}/>
              <div className="mb-3">
                <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Nível de Escolaridade</label>
                <select className="w-full bg-brand-dark dark:bg-brand-dark border border-brand-border dark:border-brand-border p-2.5 rounded text-white dark:text-white outline-none focus:border-brand-orange" value={d.schoolingLevel || ''} onChange={e=>setD({...d, schoolingLevel:e.target.value})}>
                  <option value="">Selecione...</option>
                  {options.schooling && options.schooling.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <InputField label="Instituição de Ensino" field="institution" value={d.institution} onChange={handleInputChange}/>
              <InputField label="Data de Formatura" field="graduationDate" type="date" value={d.graduationDate} onChange={handleInputChange}/>
              <div className="mb-3">
                <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Está Cursando Atualmente?</label>
                <select className="w-full bg-brand-dark dark:bg-brand-dark border border-brand-border dark:border-brand-border p-2.5 rounded text-white dark:text-white outline-none focus:border-brand-orange" value={d.isStudying || ''} onChange={e=>setD({...d, isStudying:e.target.value})}>
                  <option value="">Selecione...</option>
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Área de Interesse</label>
                <select className="w-full bg-brand-dark dark:bg-brand-dark border border-brand-border dark:border-brand-border p-2.5 rounded text-white dark:text-white outline-none focus:border-brand-orange" value={d.interestAreas || ''} onChange={e=>handleInputChange('interestAreas', e.target.value)}>
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
                <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Experiências Anteriores</label>
                <textarea className="w-full bg-brand-dark dark:bg-brand-dark border border-brand-border dark:border-brand-border p-2.5 rounded text-white dark:text-white outline-none focus:border-brand-orange h-24" value={d.experience || ''} onChange={e=>setD({...d, experience:e.target.value})} placeholder="Descreva as experiências profissionais..."/>
              </div>
              <div className="mb-3 col-span-2">
                <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Cursos e Certificações</label>
                <textarea className="w-full bg-brand-dark dark:bg-brand-dark border border-brand-border dark:border-brand-border p-2.5 rounded text-white dark:text-white outline-none focus:border-brand-orange h-20" value={d.courses || ''} onChange={e=>setD({...d, courses:e.target.value})} placeholder="Liste cursos e certificações..."/>
              </div>
              <InputField label="Link CV" field="cvUrl" value={d.cvUrl} onChange={handleInputChange}/>
              <InputField label="Link Portfolio" field="portfolioUrl" value={d.portfolioUrl} onChange={handleInputChange}/>
            </div>
          )}
          {activeSection === 'processo' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="mb-3">
                <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Status</label>
                <select className="w-full bg-brand-dark dark:bg-brand-dark border border-brand-border dark:border-brand-border p-2.5 rounded text-white dark:text-white outline-none focus:border-brand-orange" value={d.status || ''} onChange={e=>setD({...d, status:e.target.value})}>
                  <option value="">Selecione...</option>
                  {ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Onde encontrou (Fonte)</label>
                <select className="w-full bg-brand-dark dark:bg-brand-dark border border-brand-border dark:border-brand-border p-2.5 rounded text-white dark:text-white outline-none focus:border-brand-orange" value={d.source || ''} onChange={e=>handleInputChange('source', e.target.value)}>
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
                <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Disponibilidade para Mudança de Cidade?</label>
                <select className="w-full bg-brand-dark dark:bg-brand-dark border border-brand-border dark:border-brand-border p-2.5 rounded text-white dark:text-white outline-none focus:border-brand-orange" value={d.canRelocate || ''} onChange={e=>setD({...d, canRelocate:e.target.value})}>
                  <option value="">Selecione...</option>
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              </div>
              <div className="mb-3 col-span-2">
                <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Referências Profissionais</label>
                <textarea className="w-full bg-brand-dark dark:bg-brand-dark border border-brand-border dark:border-brand-border p-2.5 rounded text-white dark:text-white outline-none focus:border-brand-orange h-20" value={d.references || ''} onChange={e=>setD({...d, references:e.target.value})} placeholder="Liste referências profissionais..."/>
              </div>
            </div>
          )}
          {activeSection === 'adicional' && (
            <div className="grid grid-cols-2 gap-6">
              <InputField label="Tipo de Candidatura" field="typeOfApp" value={d.typeOfApp} onChange={handleInputChange}/>
              <div className="mb-3 col-span-2">
                <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Campo Livre</label>
                <textarea className="w-full bg-brand-dark dark:bg-brand-dark border border-brand-border dark:border-brand-border p-2.5 rounded text-white dark:text-white outline-none focus:border-brand-orange h-32" value={d.freeField || ''} onChange={e=>setD({...d, freeField:e.target.value})} placeholder="Informações adicionais..."/>
              </div>
              <InputField label="ID Externo" field="external_id" value={d.external_id} onChange={handleInputChange}/>
              <InputField label="Timestamp Original" field="original_timestamp" value={d.original_timestamp} onChange={handleInputChange}/>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-brand-border dark:border-brand-border flex justify-end gap-2">
          <button onClick={onClose} className="px-6 py-2 text-slate-400 dark:text-slate-400">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving} className="bg-brand-orange text-white px-8 py-2 rounded">Salvar</button>
        </div>
      </div>
    </div>
  );
};