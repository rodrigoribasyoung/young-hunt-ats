import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Briefcase, Settings, Plus, Search, 
  FileText, MapPin, ChevronRight, CheckCircle, Filter, 
  UserPlus, Trophy, Menu, X, LogOut, Lock, Loader2, Edit3, Trash2,
  Building2, Tag, Mail, Save, AlertTriangle, UploadCloud, 
  Calendar, Phone, DollarSign, SortAsc, SortDesc, Eye, CheckSquare, XSquare,
  Clock, TrendingUp, AlertCircle, CalendarCheck
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
  onSnapshot, serverTimestamp, query, orderBy, writeBatch 
} from "firebase/firestore";

// Component Imports
import TransitionModal from './components/modals/TransitionModal';
import SettingsPage from './components/SettingsPage';
import CsvImportModal from './components/modals/CsvImportModal';
import JobCandidatesModal from './components/modals/JobsCandidateModal';

import { PIPELINE_STAGES, STATUS_COLORS, JOB_STATUSES } from './constants';

const COLORS = ['#fe5009', '#00bcbc', '#fb923c', '#22d3ee', '#f87171', '#8884d8', '#82ca9d']; 

const firebaseConfig = {
  apiKey: "AIzaSyD54i_1mQdEbS3ePMxhCkN2bhezjcq7xEg",
  authDomain: "young-talents-ats.firebaseapp.com",
  projectId: "young-talents-ats",
  storageBucket: "young-talents-ats.firebasestorage.app",
  messagingSenderId: "436802511318",
  appId: "436802511318:web:c7f103e4b09344f9bf4477"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- COMPONENTES AUXILIARES ---

const LoginScreen = ({ onLogin }) => (
  <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
    <div className="bg-brand-card p-8 rounded-xl border border-brand-border shadow-2xl max-w-md w-full text-center">
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-brand-orange/10 rounded-full border border-brand-orange/20">
          <Trophy size={48} className="text-brand-orange" />
        </div>
      </div>
      
      <h1 className="text-3xl font-bold text-white mb-2 font-sans">Young Talents ATS</h1>
      <p className="text-slate-400 mb-8">
        Sistema de gestão de recrutamento e seleção.
        Faça login para continuar.
      </p>

      <button
        onClick={onLogin}
        className="w-full bg-white text-slate-900 py-3.5 px-4 rounded-lg font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-3 shadow-lg"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Entrar com Google
      </button>
    </div>
  </div>
);

const FilterSidebar = ({ isOpen, onClose, filters, setFilters, clearFilters, options }) => {
  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-80 bg-brand-card border-l border-brand-border z-50 p-6 shadow-2xl transform transition-transform duration-300 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-white text-lg flex items-center gap-2"><Filter size={20}/> Filtros Avançados</h3>
          <button onClick={onClose}><X className="text-slate-400 hover:text-white" /></button>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-cyan uppercase">Vaga & Empresa</label>
            <select className="w-full bg-brand-dark border border-brand-border rounded p-2 text-sm text-white" value={filters.jobId} onChange={e => setFilters({...filters, jobId: e.target.value})}>
               <option value="all">Todas as Vagas</option>{options.jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <select className="w-full bg-brand-dark border border-brand-border rounded p-2 text-sm text-white" value={filters.company} onChange={e => setFilters({...filters, company: e.target.value})}>
               <option value="all">Todas as Empresas</option>{options.companies.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-2 pt-4 border-t border-brand-border">
            <label className="text-xs font-bold text-brand-cyan uppercase">Dados do Candidato</label>
            <select className="w-full bg-brand-dark border border-brand-border rounded p-2 text-sm text-white" value={filters.city} onChange={e => setFilters({...filters, city: e.target.value})}>
               <option value="all">Todas as Cidades</option>{options.cities.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <select className="w-full bg-brand-dark border border-brand-border rounded p-2 text-sm text-white" value={filters.interestArea} onChange={e => setFilters({...filters, interestArea: e.target.value})}>
               <option value="all">Todas Áreas de Interesse</option>{options.interestAreas.map(i=><option key={i.id} value={i.name}>{i.name}</option>)}
            </select>
            <select className="w-full bg-brand-dark border border-brand-border rounded p-2 text-sm text-white" value={filters.schooling} onChange={e => setFilters({...filters, schooling: e.target.value})}>
               <option value="all">Qualquer Escolaridade</option>{options.schooling.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-2 pt-4 border-t border-brand-border">
            <label className="text-xs font-bold text-brand-cyan uppercase">Filtros Específicos</label>
            <div className="grid grid-cols-2 gap-2">
              <select className="bg-brand-dark border border-brand-border rounded p-2 text-sm text-white" value={filters.cnh} onChange={e => setFilters({...filters, cnh: e.target.value})}>
                <option value="all">CNH: Todos</option><option value="Sim">Sim</option><option value="Não">Não</option>
              </select>
              <select className="bg-brand-dark border border-brand-border rounded p-2 text-sm text-white" value={filters.marital} onChange={e => setFilters({...filters, marital: e.target.value})}>
                <option value="all">Est. Civil</option>{options.marital.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <select className="w-full bg-brand-dark border border-brand-border rounded p-2 text-sm text-white" value={filters.origin} onChange={e => setFilters({...filters, origin: e.target.value})}>
               <option value="all">Origem (Fonte)</option>{options.origins.map(o=><option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-brand-border flex flex-col gap-2">
          <button onClick={onClose} className="w-full bg-brand-orange text-white py-2 rounded font-bold hover:bg-orange-600">Aplicar Filtros</button>
          <button onClick={clearFilters} className="w-full text-slate-400 hover:text-white py-2 text-sm">Limpar Tudo</button>
        </div>
      </div>
    </>
  );
};

// --- DASHBOARD ---
const Dashboard = ({ filteredJobs, filteredCandidates }) => {
  const totalCandidates = filteredCandidates.length;
  const activeJobsCount = filteredJobs.filter(j => j.status === 'Aberta').length;
  const hiredCount = filteredCandidates.filter(c => c.status === 'Contratado').length;
  const activeProcessCount = filteredCandidates.filter(c => ['Primeira Entrevista', 'Testes', 'Segunda Entrevista', 'Selecionado'].includes(c.status)).length;
  const conversionRate = totalCandidates > 0 ? ((hiredCount / totalCandidates) * 100).toFixed(1) : 0;

  const funnelData = PIPELINE_STAGES.map(stage => ({ 
    name: stage, 
    count: filteredCandidates.filter(c => (c.status || 'Inscrito') === stage).length 
  }));

  const sourceStats = filteredCandidates.reduce((acc, curr) => {
    const s = curr.source || 'Não Informado';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const sourceData = Object.keys(sourceStats)
    .map(k => ({ name: k, value: sourceStats[k] }))
    .sort((a,b) => b.value - a.value)
    .slice(0, 5);

  const upcomingInterviews = filteredCandidates
    .filter(c => c.firstInterviewDate || c.secondInterviewDate)
    .map(c => ({
       ...c,
       nextDate: c.secondInterviewDate || c.firstInterviewDate
    }))
    .sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate))
    .filter(c => new Date(c.nextDate) >= new Date().setHours(0,0,0,0))
    .slice(0, 5);

  const recentCandidates = [...filteredCandidates]
    .sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0))
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Talentos" value={totalCandidates} icon={Users} color="text-brand-cyan" bg="bg-brand-cyan/10" sub={`+${recentCandidates.length} esta semana`} />
        <StatCard title="Vagas Abertas" value={activeJobsCount} icon={Briefcase} color="text-brand-orange" bg="bg-brand-orange/10" sub="Posições ativas" />
        <StatCard title="Em Processo" value={activeProcessCount} icon={Clock} color="text-purple-400" bg="bg-purple-500/10" sub="Candidatos em andamento" />
        <StatCard title="Taxa Conversão" value={`${conversionRate}%`} icon={TrendingUp} color="text-green-400" bg="bg-green-500/10" sub={`${hiredCount} Contratações`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-brand-card p-6 rounded-xl border border-brand-border shadow-lg h-96">
           <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white text-lg">Pipeline de Recrutamento</h3>
           </div>
           <ResponsiveContainer width="100%" height="90%">
              <BarChart data={funnelData} margin={{top: 5, right: 30, left: 0, bottom: 25}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip cursor={{fill: '#334155'}} contentStyle={{backgroundColor:'#0f172a', borderColor:'#475569', color:'#fff', borderRadius:'8px'}} />
                <Bar dataKey="count" fill="#fe5009" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
           </ResponsiveContainer>
        </div>

        <div className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-lg h-96">
           <h3 className="font-bold text-white text-lg mb-4">Origem dos Candidatos</h3>
           <ResponsiveContainer width="100%" height="90%">
             <PieChart>
               <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                 {sourceData.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                 ))}
               </Pie>
               <Tooltip contentStyle={{backgroundColor:'#0f172a', borderColor:'#475569', color:'#fff', borderRadius:'8px'}} />
               <Legend verticalAlign="bottom" height={36} iconType="circle" />
             </PieChart>
           </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-brand-card rounded-xl border border-brand-border shadow-lg overflow-hidden">
            <div className="p-4 border-b border-brand-border bg-brand-dark/30 flex justify-between items-center">
               <h3 className="font-bold text-white flex items-center gap-2"><CalendarCheck size={18} className="text-brand-cyan"/> Próximas Entrevistas</h3>
            </div>
            <div className="divide-y divide-brand-border max-h-64 overflow-y-auto custom-scrollbar">
               {upcomingInterviews.length > 0 ? upcomingInterviews.map(c => (
                 <div key={c.id} className="p-4 flex items-center justify-between hover:bg-brand-dark/50 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-bold">{c.fullName.charAt(0)}</div>
                       <div>
                          <p className="text-sm font-bold text-white">{c.fullName}</p>
                          <p className="text-xs text-slate-400">{c.jobId}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-bold text-brand-orange">{new Date(c.nextDate).toLocaleDateString()}</p>
                       <p className="text-xs text-slate-500">{new Date(c.nextDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                 </div>
               )) : <p className="p-6 text-center text-slate-500 text-sm">Nenhuma entrevista agendada.</p>}
            </div>
         </div>

         <div className="bg-brand-card rounded-xl border border-brand-border shadow-lg overflow-hidden">
            <div className="p-4 border-b border-brand-border bg-brand-dark/30 flex justify-between items-center">
               <h3 className="font-bold text-white flex items-center gap-2"><UserPlus size={18} className="text-green-400"/> Novos Inscritos</h3>
            </div>
            <div className="divide-y divide-brand-border max-h-64 overflow-y-auto custom-scrollbar">
               {recentCandidates.map(c => (
                 <div key={c.id} className="p-4 flex items-center justify-between hover:bg-brand-dark/50 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded bg-brand-dark flex items-center justify-center text-xs text-slate-300 border border-brand-border">{c.source?.substring(0,2).toUpperCase() || 'NA'}</div>
                       <div>
                          <p className="text-sm font-bold text-white truncate w-40">{c.fullName}</p>
                          <p className="text-xs text-slate-500">{c.city || 'Local n/d'}</p>
                       </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 border border-slate-600">{c.status}</span>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bg, sub }) => (
  <div className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-lg flex items-start justify-between hover:border-brand-cyan/30 transition-all">
    <div>
      <p className="text-sm text-slate-400 font-medium mb-1">{title}</p>
      <h4 className="text-3xl font-bold text-white mb-1">{value}</h4>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
    <div className={`p-3 rounded-lg ${bg}`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
  </div>
);

// --- APP PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Estados para Data Sync
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

  // UI States para Modais
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false); // Novo Estado
  const [viewingJob, setViewingJob] = useState(null); // Novo Estado para JobCandidatesModal
  
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [pendingTransition, setPendingTransition] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);

  // Filtros
  const initialFilters = { 
    search: '', period: 'all', sort: 'date_desc',
    jobId: 'all', company: 'all', city: 'all', interestArea: 'all',
    cnh: 'all', marital: 'all', origin: 'all', schooling: 'all'
  };
  const [filters, setFilters] = useState(initialFilters);

  // Auth & Sync
  useEffect(() => { return onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); }); }, []);
  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { console.error(e); } };

  useEffect(() => {
    if (!user) return;
    const unsubs = [
      onSnapshot(query(collection(db, 'jobs'), orderBy('createdAt', 'desc')), s => setJobs(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'candidates'), orderBy('createdAt', 'desc')), s => setCandidates(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'companies'), orderBy('name')), s => setCompanies(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'cities'), orderBy('name')), s => setCities(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'interest_areas'), orderBy('name')), s => setInterestAreas(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'roles'), orderBy('name')), s => setRoles(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'origins'), orderBy('name')), s => setOrigins(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'schooling_levels'), orderBy('name')), s => setSchooling(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'marital_statuses'), orderBy('name')), s => setMarital(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'tags'), orderBy('name')), s => setTags(s.docs.map(d => ({id:d.id, ...d.data()})))),
    ];
    return () => unsubs.forEach(u => u());
  }, [user]);

  // Lógica de Filtros Avançada
  const filteredData = useMemo(() => {
    let list = [...candidates];
    let fJobs = jobs;

    if (filters.company !== 'all') fJobs = fJobs.filter(j => j.company === filters.company);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(c => c.fullName?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s));
    }
    if (filters.jobId !== 'all') list = list.filter(c => c.jobId === filters.jobId);
    if (filters.city !== 'all') list = list.filter(c => c.city === filters.city);
    if (filters.interestArea !== 'all') list = list.filter(c => c.interestAreas === filters.interestArea);
    if (filters.cnh !== 'all') list = list.filter(c => c.hasLicense === filters.cnh);
    if (filters.marital !== 'all') list = list.filter(c => c.maritalStatus === filters.marital);
    if (filters.origin !== 'all') list = list.filter(c => c.source === filters.origin);
    if (filters.schooling !== 'all') list = list.filter(c => c.schoolingLevel === filters.schooling);
    
    if (filters.period !== 'all') {
      const days = parseInt(filters.period);
      const now = new Date();
      list = list.filter(c => {
        if (!c.createdAt) return false;
        const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return Math.ceil(Math.abs(now - date) / (86400000)) <= days;
      });
    }

    list.sort((a, b) => {
      if (filters.sort === 'date_desc') return (new Date(b.createdAt||0) - new Date(a.createdAt||0));
      if (filters.sort === 'date_asc') return (new Date(a.createdAt||0) - new Date(b.createdAt||0));
      if (filters.sort === 'alpha_asc') return a.fullName?.localeCompare(b.fullName);
      return 0;
    });

    return { jobs: fJobs, candidates: list };
  }, [jobs, candidates, filters]);

  // --- Handlers ---
  
  const handleDragEnd = (cId, newStage) => {
    const candidate = candidates.find(c => c.id === cId);
    if (!candidate || candidate.status === newStage) return;
    const isConclusion = ['Selecionado', 'Contratado', 'Reprovado'].includes(newStage);
    const missing = []; 
    // Validações básicas de campos obrigatórios ao avançar
    if (PIPELINE_STAGES.indexOf(newStage) > 1 && !candidate.city) missing.push('city'); 
    
    if (missing.length > 0 || isConclusion) {
        setPendingTransition({ candidate, toStage: newStage, missingFields: missing, isConclusion });
    } else {
        updateDoc(doc(db, 'candidates', cId), { status: newStage });
    }
  };

  const handleSaveGeneric = async (col, d, closeFn) => {
    setIsSaving(true);
    try {
      if (d.id) await updateDoc(doc(db, col, d.id), d);
      else await addDoc(collection(db, col), { ...d, createdAt: serverTimestamp() });
      if(closeFn) closeFn();
    } catch(e) { alert("Erro ao salvar: " + e.message); } finally { setIsSaving(false); }
  };

  // Função para processar importação CSV
  const handleImportData = async (importedCandidates, mode) => {
    setIsSaving(true);
    const batch = writeBatch(db);
    let count = 0;

    try {
      importedCandidates.forEach(newCand => {
         // Verifica duplicidade por email
         const existing = candidates.find(c => c.email && c.email.toLowerCase() === newCand.email?.toLowerCase());
         
         if (existing) {
             if (mode === 'skip') return; // Pula
             if (mode === 'overwrite') {
                 // Atualiza existente
                 const ref = doc(db, 'candidates', existing.id);
                 batch.update(ref, newCand);
                 count++;
             } else if (mode === 'duplicate') {
                 // Cria novo mesmo existindo
                 const ref = doc(collection(db, 'candidates'));
                 batch.set(ref, newCand);
                 count++;
             }
         } else {
             // Cria novo
             const ref = doc(collection(db, 'candidates'));
             batch.set(ref, newCand);
             count++;
         }
      });

      if(count > 0) await batch.commit();
      alert(`Importação concluída! ${count} registros processados.`);
    } catch (error) {
      console.error("Erro na importação:", error);
      alert("Erro ao importar dados.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAux = async (col, name) => { if(name.trim()) await addDoc(collection(db, col), { name }); };
  const handleDeleteItem = async (col, id) => { if(confirm('Excluir item?')) await deleteDoc(doc(db, col, id)); };

  if (authLoading) return <div className="min-h-screen bg-brand-dark flex items-center justify-center text-brand-cyan"><Loader2 className="animate-spin mr-2"/> Carregando...</div>;
  if (!user) return <LoginScreen onLogin={handleGoogleLogin} />;

  const optionsProps = { jobs, companies, cities, interestAreas, roles, origins, schooling, marital, tags };

  return (
    <div className="flex min-h-screen bg-brand-dark font-sans text-slate-200">
      {/* Sidebar Mobile/Desktop */}
      <div className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-brand-card border-r border-brand-border transform transition-transform duration-200 ${isSidebarOpen?'translate-x-0':'-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        <div className="p-6 border-b border-brand-border flex items-center justify-between"><div className="flex items-center gap-2 font-bold text-xl text-white"><Trophy size={18} className="text-brand-orange"/> Young Talents</div><button onClick={()=>setIsSidebarOpen(false)} className="lg:hidden"><X/></button></div>
        <nav className="flex-1 p-4 space-y-1">{[{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'pipeline', label: 'Pipeline', icon: Filter }, { id: 'jobs', label: 'Vagas', icon: Briefcase }, { id: 'candidates', label: 'Candidatos', icon: Users }, { id: 'settings', label: 'Configurações', icon: Settings }].map(i => (
          <button key={i.id} onClick={() => { setActiveTab(i.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === i.id ? 'bg-brand-orange text-white shadow-lg' : 'text-slate-400 hover:bg-brand-hover'}`}><i.icon size={18}/> {i.label}</button>
        ))}</nav>
        <div className="p-4 border-t border-brand-border bg-brand-dark/30 flex items-center justify-between"><div className="text-xs truncate max-w-[120px]">{user.email}</div><button onClick={()=>signOut(auth)}><LogOut size={16} className="text-red-400 hover:text-red-300"/></button></div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="lg:hidden p-4 bg-brand-card flex justify-between border-b border-brand-border"><button onClick={()=>setIsSidebarOpen(true)}><Menu/></button><span>Young Talents</span><div/></div>
        
        {/* TOP BAR */}
        <div className="bg-brand-card border-b border-brand-border px-6 py-4 flex flex-wrap gap-4 items-center justify-between shadow-sm z-10">
           <div className="flex flex-wrap gap-2 w-full lg:w-auto items-center">
              <div className="relative w-full md:w-56"><Search className="absolute left-3 top-2.5 text-slate-400" size={16}/><input placeholder="Buscar..." className="pl-9 pr-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-sm w-full outline-none focus:border-brand-cyan text-white" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})}/></div>
              <select className="bg-brand-dark border border-brand-border rounded-lg text-sm px-2 py-2 outline-none text-white max-w-[120px]" value={filters.period} onChange={e => setFilters({...filters, period: e.target.value})}><option value="all">Período</option><option value="7">7 dias</option><option value="30">30 dias</option></select>
              <select className="bg-brand-dark border border-brand-border rounded-lg text-sm px-2 py-2 outline-none text-white max-w-[120px]" value={filters.sort} onChange={e => setFilters({...filters, sort: e.target.value})}><option value="date_desc">Data ↓</option><option value="date_asc">Data ↑</option><option value="alpha_asc">A-Z</option></select>
           </div>
           <div className="flex items-center gap-3">
              <button onClick={() => setIsFilterSidebarOpen(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isFilterSidebarOpen ? 'bg-brand-orange text-white' : 'bg-brand-dark text-brand-cyan border border-brand-cyan/30 hover:bg-brand-cyan/10'}`}><Filter size={16}/> Filtros Avançados</button>
           </div>
        </div>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-brand-dark custom-scrollbar">
          <div className="max-w-[1600px] mx-auto h-full">
            {activeTab === 'dashboard' && <Dashboard filteredJobs={filteredData.jobs} filteredCandidates={filteredData.candidates} />}
            {activeTab === 'pipeline' && <Pipeline candidates={filteredData.candidates} jobs={jobs} onDragEnd={handleDragEnd} onEdit={setEditingCandidate} />}
            {activeTab === 'jobs' && (
              <JobsList 
                jobs={filteredData.jobs} 
                candidates={candidates} 
                onAdd={() => { setEditingJob({}); setIsJobModalOpen(true); }} 
                onEdit={(j) => { setEditingJob(j); setIsJobModalOpen(true); }} 
                onDelete={(id) => deleteDoc(doc(db, 'jobs', id))} 
                onToggleStatus={handleSaveGeneric} 
                onFilterPipeline={(id) => { setFilters({...filters, jobId: id}); setActiveTab('pipeline'); }}
                onViewCandidates={(job) => setViewingJob(job)} 
              />
            )}
            {activeTab === 'candidates' && <CandidatesList candidates={filteredData.candidates} jobs={jobs} onAdd={() => setEditingCandidate({})} onEdit={setEditingCandidate} onDelete={(id) => deleteDoc(doc(db, 'candidates', id))} />}
            {activeTab === 'settings' && (
              <SettingsPage 
                {...optionsProps} 
                onAddCompany={n=>handleAddAux('companies', n)} onDelCompany={id=>deleteDoc(doc(db,'companies',id))} 
                onAddCity={n=>handleAddAux('cities', n)} onDelCity={id=>deleteDoc(doc(db,'cities',id))} 
                onAddInterest={n=>handleAddAux('interest_areas', n)} onDelInterest={id=>deleteDoc(doc(db,'interest_areas',id))} 
                onAddRole={n=>handleAddAux('roles', n)} onDelRole={id=>deleteDoc(doc(db,'roles',id))} 
                onAddOrigin={n=>handleAddAux('origins', n)} onDelOrigin={id=>deleteDoc(doc(db,'origins',id))} 
                onAddSchooling={n=>handleAddAux('schooling_levels', n)} onDelSchooling={id=>deleteDoc(doc(db,'schooling_levels',id))} 
                onAddMarital={n=>handleAddAux('marital_statuses', n)} onDelMarital={id=>deleteDoc(doc(db,'marital_statuses',id))}
                onAddTag={n=>handleAddAux('tags', n)} onDelTag={id=>deleteDoc(doc(db,'tags',id))}
                onOpenCsvModal={() => setIsCsvModalOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

      <FilterSidebar isOpen={isFilterSidebarOpen} onClose={() => setIsFilterSidebarOpen(false)} filters={filters} setFilters={setFilters} clearFilters={() => setFilters(initialFilters)} options={optionsProps} />
      
      {/* Modais de Edição Principal */}
      {isJobModalOpen && <JobModal isOpen={isJobModalOpen} job={editingJob} onClose={() => { setIsJobModalOpen(false); setEditingJob(null); }} onSave={d => handleSaveGeneric('jobs', d, () => {setIsJobModalOpen(false); setEditingJob(null);})} options={optionsProps} isSaving={isSaving} />}
      {editingCandidate && <CandidateModal candidate={editingCandidate} onClose={() => setEditingCandidate(null)} onSave={d => handleSaveGeneric('candidates', d, () => setEditingCandidate(null))} options={optionsProps} isSaving={isSaving} />}
      {pendingTransition && <TransitionModal transition={pendingTransition} onClose={() => setPendingTransition(null)} onConfirm={d => handleSaveGeneric('candidates', {id: pendingTransition.candidate.id, ...d, status: pendingTransition.toStage}, () => setPendingTransition(null))} cities={cities} />}
      
      {/* Modais Auxiliares (Novos) */}
      <CsvImportModal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} onImportData={handleImportData} />
      <JobCandidatesModal isOpen={!!viewingJob} onClose={() => setViewingJob(null)} job={viewingJob} candidates={candidates.filter(c => c.jobId === viewingJob?.id)} />
    </div>
  );
}

// --- SUB-COMPONENTES DE LISTA ---

const Pipeline = ({ candidates, jobs, onDragEnd, onEdit }) => {
  const [draggedId, setDraggedId] = useState(null);
  const handleDragStart = (e, id) => { setDraggedId(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDrop = (e, stage) => { e.preventDefault(); if (draggedId) { onDragEnd(draggedId, stage); setDraggedId(null); } };
  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex gap-4 min-w-max h-full">
          {PIPELINE_STAGES.map(stage => {
            const stageCandidates = candidates.filter(c => (c.status || 'Inscrito') === stage);
            const isFinal = stage === 'Contratado' || stage === 'Reprovado';
            return (
              <div key={stage} className={`flex-1 flex flex-col rounded-xl p-2 min-w-[280px] w-[280px] border ${isFinal ? 'bg-transparent border-dashed border-slate-600' : 'bg-brand-card/30 border-brand-border'}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, stage)}>
                <div className={`font-bold mb-3 px-3 py-2 flex justify-between items-center rounded-lg border ${STATUS_COLORS[stage] || 'bg-slate-700'}`}>
                  <span className="truncate text-sm">{stage}</span><span className="bg-black/30 px-2 py-0.5 rounded text-xs">{stageCandidates.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {stageCandidates.map(c => (
                    <div key={c.id} draggable onDragStart={(e) => handleDragStart(e, c.id)} onClick={() => onEdit(c)} className="bg-brand-card p-3 rounded-lg border border-brand-border hover:border-brand-cyan cursor-grab active:cursor-grabbing group shadow-sm relative">
                      <div className="flex justify-between items-start mb-1"><p className="font-bold text-sm truncate text-white">{c.fullName}</p><Edit3 size={14} className="opacity-0 group-hover:opacity-100 text-slate-500"/></div>
                      <p className="text-xs text-brand-cyan mb-2 truncate">{jobs.find(j => j.id === c.jobId)?.title || 'Banco Geral'}</p>
                      <div className="text-xs text-slate-400 flex gap-1 items-center"><MapPin size={10}/> {c.city || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const JobsList = ({ jobs, candidates, onAdd, onEdit, onToggleStatus, onFilterPipeline, onViewCandidates }) => (
  <div className="space-y-6">
    <div className="flex justify-between"><h2 className="text-2xl font-bold text-white">Vagas</h2><button onClick={onAdd} className="bg-brand-orange text-white px-4 py-2 rounded flex items-center gap-2"><Plus size={18}/> Nova</button></div>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {jobs.map(j => (
        <div key={j.id} className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-lg group relative hover:border-brand-cyan/50 transition-colors">
          <div className="flex justify-between mb-4">
             <select className={`text-xs px-2 py-1 rounded border bg-transparent outline-none cursor-pointer ${j.status === 'Aberta' ? 'text-brand-cyan border-brand-cyan/30' : 'text-slate-400 border-slate-600'}`} value={j.status} onChange={(e) => onToggleStatus('jobs', {id: j.id, status: e.target.value})} onClick={(e) => e.stopPropagation()}>
                {JOB_STATUSES.map(s => <option key={s} value={s} className="bg-brand-card text-white">{s}</option>)}
             </select>
             <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(j)} className="text-slate-400 hover:text-white"><Edit3 size={16}/></button>
             </div>
          </div>
          <h3 className="font-bold text-lg text-white mb-1">{j.title}</h3>
          <p className="text-sm text-slate-400 mb-4">{j.company}</p>
          <div className="border-t border-brand-border pt-4 flex justify-between items-center">
            <button onClick={() => onFilterPipeline(j.id)} className="text-brand-orange text-sm hover:underline">Ver Pipeline</button>
            <p 
                className="text-xs text-slate-500 cursor-pointer hover:text-brand-cyan transition-colors"
                onClick={() => onViewCandidates(j)}
            >
                {candidates.filter(c => c.jobId === j.id).length} candidatos
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const CandidatesList = ({ candidates, jobs, onAdd, onEdit, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const totalPages = Math.ceil(candidates.length / itemsPerPage);
  const currentData = candidates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-white">Banco de Talentos</h2><button onClick={onAdd} className="bg-brand-cyan text-brand-dark font-bold px-4 py-2 rounded flex items-center gap-2"><UserPlus size={18}/> Adicionar</button></div>
      <div className="bg-brand-card rounded-xl border border-brand-border shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="bg-brand-hover text-slate-200 font-medium">
              <tr><th className="px-6 py-4">Nome / Info</th><th className="px-6 py-4">Detalhes</th><th className="px-6 py-4">Vaga / Fonte</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Ações</th></tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {currentData.map(c => (
                <tr key={c.id} className="hover:bg-brand-hover/50 cursor-pointer transition-colors" onClick={() => onEdit(c)}>
                  <td className="px-6 py-4"><div className="font-bold text-white text-base">{c.fullName}</div><div className="text-xs text-slate-500 flex gap-2 items-center mt-1"><Mail size={10}/> {c.email}</div><div className="text-xs text-slate-500 flex gap-2 items-center mt-0.5"><Phone size={10}/> {c.phone}</div></td>
                  <td className="px-6 py-4"><div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><MapPin size={10}/> {c.city || '-'}</div><div className="text-xs text-slate-400 mb-1">Idade: {c.age || '-'}</div>{c.salaryExpectation && <div className="text-xs text-green-400 flex items-center gap-1"><DollarSign size={10}/> {c.salaryExpectation}</div>}</td>
                  <td className="px-6 py-4"><div className="text-white mb-1 bg-brand-dark px-2 py-1 rounded w-fit">{jobs.find(j => j.id === c.jobId)?.title || <span className="italic text-slate-500">Banco Geral</span>}</div><div className="text-xs text-slate-500 mt-1">Origem: {c.source || '-'}</div></td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs border ${STATUS_COLORS[c.status] || 'bg-slate-700'}`}>{c.status}</span></td>
                  <td className="px-6 py-4 text-right"><button onClick={(e) => { e.stopPropagation(); onEdit(c); }} className="text-slate-400 hover:text-brand-cyan p-2"><Eye size={16}/></button><button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={16}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-brand-dark/50 p-4 border-t border-brand-border flex justify-between items-center gap-4"><div className="text-xs text-slate-400">Pág {currentPage} de {totalPages}</div><div className="flex gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-brand-hover rounded text-xs disabled:opacity-50">Anterior</button><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-brand-hover rounded text-xs disabled:opacity-50">Próximo</button></div></div>
      </div>
    </div>
  );
};

const JobModal = ({ isOpen, job, onClose, onSave, options, isSaving }) => {
  const [d, setD] = useState(job?.id ? {...job} : { title: '', company: '', location: '', status: 'Aberta' });
  const { companies, cities } = options;
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="bg-brand-card rounded-xl shadow-2xl w-full max-w-md border border-brand-border p-6">
        <h3 className="font-bold text-lg text-white mb-4">{d.id ? 'Editar Vaga' : 'Nova Vaga'}</h3>
        <input className="w-full bg-brand-dark border border-brand-border p-2 rounded mb-3 text-white" placeholder="Título" value={d.title} onChange={e=>setD({...d, title:e.target.value})}/>
        <select className="w-full bg-brand-dark border border-brand-border p-2 rounded mb-3 text-white" value={d.company} onChange={e=>setD({...d, company:e.target.value})}><option value="">Selecione Empresa...</option>{companies.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select>
        <select className="w-full bg-brand-dark border border-brand-border p-2 rounded mb-6 text-white" value={d.location} onChange={e=>setD({...d, location:e.target.value})}><option value="">Selecione Cidade...</option>{cities.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select>
        {d.id && (<div className="mb-6"><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Status</label><select className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white" value={d.status} onChange={e=>setD({...d, status:e.target.value})}>{JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>)}
        <div className="flex justify-end gap-2"><button onClick={onClose} className="text-slate-400 px-4">Cancelar</button><button onClick={()=>onSave(d)} disabled={isSaving} className="bg-brand-orange text-white px-4 py-2 rounded">{isSaving ? 'Salvando...' : 'Salvar'}</button></div>
      </div>
    </div>
  );
};

const CandidateModal = ({ candidate, onClose, onSave, options, isSaving }) => {
  const [d, setD] = useState({ ...candidate });
  const [activeSection, setActiveSection] = useState('pessoal');
  const { jobs, cities, interestAreas, origins, schooling, marital } = options;

  const standardFields = ['id', 'fullName', 'photoUrl', 'birthDate', 'age', 'email', 'phone', 'city', 'maritalStatus', 'hasLicense', 'childrenCount', 'freeField', 'education', 'schoolingLevel', 'institution', 'interestAreas', 'experience', 'cvUrl', 'portfolioUrl', 'jobId', 'status', 'source', 'referral', 'feedback', 'createdAt', 'imported', 'typeOfApp', 'salaryExpectation', 'canRelocate', 'courses', 'graduationDate', 'isStudying', 'references', 'firstInterviewDate', 'secondInterviewDate', 'testData', 'sheetId', 'original_timestamp'];
  const extraFields = Object.keys(d).filter(key => !standardFields.includes(key));

  const Input = ({ label, field, type="text" }) => (<div className="mb-3"><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">{label}</label><input type={type} className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white focus:border-brand-orange outline-none" value={d[field]||''} onChange={e => setD({...d, [field]: e.target.value})} /></div>);
  const Select = ({ label, field, list }) => (<div className="mb-3"><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">{label}</label><select className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white focus:border-brand-orange outline-none" value={d[field]||''} onChange={e => setD({...d, [field]: e.target.value})}><option value="">Selecione...</option>{list.map(o=><option key={o.id} value={o.name}>{o.name}</option>)}</select></div>);
  const TextArea = ({ label, field }) => (<div className="mb-3"><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">{label}</label><textarea className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white h-24 focus:border-brand-orange outline-none" value={d[field]||''} onChange={e => setD({...d, [field]: e.target.value})} /></div>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-brand-card rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-brand-border text-white">
        <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center bg-brand-dark/50">
          <div><h3 className="font-bold text-xl">{d.id ? 'Editar Candidato' : 'Novo Talento'}</h3><p className="text-xs text-brand-orange">ID: {d.id || 'Novo'}</p></div>
          <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-white"/></button>
        </div>
        <div className="flex border-b border-brand-border overflow-x-auto">
          {['pessoal', 'profissional', 'processo', 'outros dados'].map(tab => (
             <button key={tab} onClick={() => setActiveSection(tab)} className={`flex-1 py-3 px-4 text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${activeSection === tab ? 'text-brand-orange border-b-2 border-brand-orange bg-brand-orange/5' : 'text-slate-500 hover:text-slate-300'}`}>{tab}</button>
          ))}
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-brand-dark">
          {activeSection === 'pessoal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 flex items-center gap-4 mb-2"><div className="w-20 h-20 rounded-full bg-slate-700 overflow-hidden border-2 border-brand-border shrink-0">{d.photoUrl ? <img src={d.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Users/></div>}</div><div className="flex-1"><Input label="Link da Foto" field="photoUrl" /></div></div>
              <Input label="Nome Completo" field="fullName" />
              <div className="grid grid-cols-2 gap-4"><Input label="Nascimento" field="birthDate" /><Input label="Idade" field="age" type="number" /></div>
              <Input label="E-mail" field="email" type="email" />
              <Input label="Celular / WhatsApp" field="phone" />
              <Select label="Cidade" field="city" list={cities} />
              <div className="grid grid-cols-2 gap-4"><Select label="Estado Civil" field="maritalStatus" list={marital} /><Input label="Filhos" field="childrenCount" /></div>
              <div className="mb-3"><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">CNH</label><select className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white" value={d.hasLicense||''} onChange={e => setD({...d, hasLicense: e.target.value})}><option value="">Selecione</option><option value="Sim">Sim</option><option value="Não">Não</option></select></div>
            </div>
          )}
          {activeSection === 'profissional' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="md:col-span-2"><TextArea label="Resumo / Bio" field="freeField" /></div>
               <Input label="Formação Acadêmica" field="education" />
               <Select label="Nível Escolaridade" field="schoolingLevel" list={schooling} />
               <Input label="Instituição" field="institution" />
               <div className="grid grid-cols-2 gap-4"><Input label="Formatura" field="graduationDate" /><Input label="Cursando?" field="isStudying" /></div>
               <div className="md:col-span-2 mb-3"><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Área de Interesse</label><select className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white" value={d.interestAreas||''} onChange={e => setD({...d, interestAreas: e.target.value})}><option value="">Selecione...</option>{interestAreas.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}</select></div>
               <div className="md:col-span-2"><TextArea label="Experiência Anterior" field="experience" /><TextArea label="Cursos" field="courses" /></div>
               <Input label="Link Currículo" field="cvUrl" /><Input label="Link Portfólio" field="portfolioUrl" />
            </div>
          )}
          {activeSection === 'processo' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div><label className="block text-xs text-slate-400 mb-1">Vaga</label><select className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white" value={d.jobId||''} onChange={e => setD({...d, jobId: e.target.value})}><option value="">Banco Geral</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select></div>
                 <div><label className="block text-xs text-slate-400 mb-1">Status</label><select className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white font-bold" value={d.status} onChange={e => setD({...d, status: e.target.value})}>{PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                 <Select label="Origem" field="source" list={origins} />
                 <Input label="Indicação" field="referral" />
                 <Input label="Pretensão Salarial" field="salaryExpectation" />
                 <Input label="Disponibilidade Mudança" field="canRelocate" />
              </div>
              <div className="bg-brand-card p-4 rounded-xl border border-brand-border">
                 <h4 className="text-brand-orange font-bold text-sm mb-4">Histórico</h4>
                 <div className="grid grid-cols-2 gap-4"><Input label="Data 1ª Entrevista" field="firstInterviewDate" type="datetime-local" /><Input label="Data 2ª Entrevista" field="secondInterviewDate" type="datetime-local" /></div>
                 <TextArea label="Dados dos Testes" field="testData" /><TextArea label="Feedback" field="feedback" />
              </div>
            </div>
          )}
          {activeSection === 'outros dados' && (
            <div className="space-y-4">
               {extraFields.length === 0 && <p className="text-slate-500 italic">Nenhum dado extra.</p>}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{extraFields.map(key => <Input key={key} label={key} field={key} />)}</div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-brand-card border-t border-brand-border flex justify-end gap-2">
          <button onClick={onClose} className="px-6 py-2 text-slate-400 hover:text-white rounded-lg">Cancelar</button>
          <button onClick={() => onSave(d)} disabled={isSaving || !d.fullName} className="bg-brand-orange text-white px-8 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 disabled:opacity-50">{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar</button>
        </div>
      </div>
    </div>
  );
};