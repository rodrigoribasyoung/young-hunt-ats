import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Briefcase, Settings, Plus, Search, 
  FileText, MapPin, ChevronRight, CheckCircle, Filter, 
  UserPlus, Trophy, Menu, X, LogOut, Lock, Loader2, Edit3, Trash2,
  Building2, Tag, Mail, Save, AlertTriangle, UploadCloud, 
  Calendar, Phone, DollarSign, SortAsc, SortDesc, Eye, CheckSquare, XSquare,
  Clock, TrendingUp, AlertCircle, CalendarCheck, MoreVertical, List, Kanban,
  ArrowRightCircle, Check, Ban, UserMinus, RefreshCw
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

import { PIPELINE_STAGES, CLOSING_STATUSES, STATUS_COLORS, JOB_STATUSES, ALL_STATUSES } from './constants';

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
      <p className="text-slate-400 mb-8">Sistema de gestão de recrutamento e seleção.</p>
      <button onClick={onLogin} className="w-full bg-white text-slate-900 py-3.5 px-4 rounded-lg font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-3 shadow-lg">
        Entrar com Google
      </button>
    </div>
  </div>
);

// --- DASHBOARD ---
const Dashboard = ({ filteredJobs, filteredCandidates }) => {
  const totalCandidates = filteredCandidates.length;
  const activeJobsCount = filteredJobs.filter(j => j.status === 'Aberta').length;
  const hiredCount = filteredCandidates.filter(c => c.status === 'Contratado').length;
  const activeProcessCount = filteredCandidates.filter(c => PIPELINE_STAGES.includes(c.status) && c.status !== 'Inscrito').length;
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
  const sourceData = Object.keys(sourceStats).map(k => ({ name: k, value: sourceStats[k] })).sort((a,b) => b.value - a.value).slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Talentos" value={totalCandidates} icon={Users} color="text-brand-cyan" bg="bg-brand-cyan/10" />
        <StatCard title="Vagas Abertas" value={activeJobsCount} icon={Briefcase} color="text-brand-orange" bg="bg-brand-orange/10" />
        <StatCard title="Em Processo" value={activeProcessCount} icon={Clock} color="text-purple-400" bg="bg-purple-500/10" />
        <StatCard title="Taxa Conversão" value={`${conversionRate}%`} icon={TrendingUp} color="text-green-400" bg="bg-green-500/10" sub={`${hiredCount} Contratações`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-brand-card p-6 rounded-xl border border-brand-border shadow-lg h-96">
           <h3 className="font-bold text-white text-lg mb-4">Pipeline de Recrutamento</h3>
           <ResponsiveContainer width="100%" height="90%">
              <BarChart data={funnelData}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="name" stroke="#94a3b8" fontSize={10} /><YAxis stroke="#94a3b8" fontSize={10} /><Tooltip cursor={{fill: '#334155'}} contentStyle={{backgroundColor:'#0f172a', borderColor:'#475569'}} /><Bar dataKey="count" fill="#fe5009" radius={[4, 4, 0, 0]} barSize={40} /></BarChart>
           </ResponsiveContainer>
        </div>
        <div className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-lg h-96">
           <h3 className="font-bold text-white text-lg mb-4">Origem</h3>
           <ResponsiveContainer width="100%" height="90%">
             <PieChart><Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{sourceData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip contentStyle={{backgroundColor:'#0f172a', borderColor:'#475569'}} /><Legend /></PieChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bg, sub }) => (
  <div className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-lg flex items-start justify-between">
    <div><p className="text-sm text-slate-400 font-medium mb-1">{title}</p><h4 className="text-3xl font-bold text-white mb-1">{value}</h4>{sub && <p className="text-xs text-slate-500">{sub}</p>}</div>
    <div className={`p-3 rounded-lg ${bg}`}><Icon className={`w-6 h-6 ${color}`} /></div>
  </div>
);

// --- APP PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
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

  // Modais
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [viewingJob, setViewingJob] = useState(null);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [pendingTransition, setPendingTransition] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

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

  // Handlers Principais
  const handleSaveGeneric = async (col, d, closeFn) => {
    setIsSaving(true);
    try {
      const payload = { ...d, updatedAt: serverTimestamp() };
      if (!d.id) payload.createdAt = serverTimestamp();
      
      if (d.id) await updateDoc(doc(db, col, d.id), payload);
      else await addDoc(collection(db, col), payload);
      
      if(closeFn) closeFn();
    } catch(e) { alert("Erro ao salvar: " + e.message); } finally { setIsSaving(false); }
  };

  const handleDragEnd = (cId, newStage) => {
    const candidate = candidates.find(c => c.id === cId);
    if (!candidate || candidate.status === newStage) return;

    // Validações de Obrigatoriedade
    const missing = [];
    
    // Regra: Para ir para 'Considerado', precisa ter Cidade
    if (newStage === 'Considerado') {
        if (!candidate.city) missing.push('Cidade (city)');
    }
    
    // Regra: Para ir para 'Seleção', precisa ter Email e Telefone
    if (newStage === 'Seleção') {
        if (!candidate.email) missing.push('Email');
        if (!candidate.phone) missing.push('Telefone');
    }

    if (missing.length > 0) {
        alert(`Para mover para ${newStage}, preencha: ${missing.join(', ')}`);
        setEditingCandidate(candidate); // Abre modal para editar
        return;
    }

    // Se passou na validação, atualiza status e data de modificação
    updateDoc(doc(db, 'candidates', cId), { 
        status: newStage,
        updatedAt: serverTimestamp()
    });
  };

  const handleClosingStatus = (cId, status) => {
    if (confirm(`Confirmar mudança de status para: ${status}?`)) {
        updateDoc(doc(db, 'candidates', cId), { 
            status: status,
            updatedAt: serverTimestamp(),
            closedAt: serverTimestamp()
        });
    }
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-brand-dark text-brand-cyan"><Loader2 className="animate-spin mr-2"/> Carregando...</div>;
  if (!user) return <LoginScreen onLogin={handleGoogleLogin} />;

  const optionsProps = { jobs, companies, cities, interestAreas, roles, origins, schooling, marital, tags };

  return (
    <div className="flex min-h-screen bg-brand-dark font-sans text-slate-200">
      <div className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-brand-card border-r border-brand-border transform transition-transform duration-200 ${isSidebarOpen?'translate-x-0':'-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        <div className="p-6 border-b border-brand-border flex items-center justify-between"><div className="flex items-center gap-2 font-bold text-xl text-white"><Trophy size={18} className="text-brand-orange"/> Young Talents</div><button onClick={()=>setIsSidebarOpen(false)} className="lg:hidden"><X/></button></div>
        <nav className="flex-1 p-4 space-y-1">{[{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'pipeline', label: 'Pipeline de Talentos', icon: Filter }, { id: 'jobs', label: 'Vagas', icon: Briefcase }, { id: 'candidates', label: 'Candidatos', icon: Users }, { id: 'settings', label: 'Configurações', icon: Settings }].map(i => (
          <button key={i.id} onClick={() => { setActiveTab(i.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === i.id ? 'bg-brand-orange text-white shadow-lg' : 'text-slate-400 hover:bg-brand-hover'}`}><i.icon size={18}/> {i.label}</button>
        ))}</nav>
        <div className="p-4 border-t border-brand-border bg-brand-dark/30 flex items-center justify-between"><div className="text-xs truncate max-w-[120px]">{user.email}</div><button onClick={()=>signOut(auth)}><LogOut size={16} className="text-red-400 hover:text-red-300"/></button></div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="lg:hidden p-4 bg-brand-card flex justify-between border-b border-brand-border"><button onClick={()=>setIsSidebarOpen(true)}><Menu/></button><span>Young Talents</span><div/></div>

        <main className="flex-1 overflow-hidden bg-brand-dark">
          {activeTab === 'dashboard' && <div className="p-4 md:p-8 overflow-y-auto h-full"><Dashboard filteredJobs={jobs} filteredCandidates={candidates} /></div>}
          
          {activeTab === 'pipeline' && (
            <PipelineView 
               candidates={candidates} 
               jobs={jobs} 
               onDragEnd={handleDragEnd} 
               onEdit={setEditingCandidate}
               onCloseStatus={handleClosingStatus}
            />
          )}

          {activeTab === 'jobs' && (
            <div className="p-4 md:p-8 overflow-y-auto h-full">
               <JobsList 
                 jobs={jobs} candidates={candidates} 
                 onAdd={() => { setEditingJob({}); setIsJobModalOpen(true); }} 
                 onEdit={(j) => { setEditingJob(j); setIsJobModalOpen(true); }} 
                 onDelete={(id) => deleteDoc(doc(db, 'jobs', id))} 
                 onToggleStatus={handleSaveGeneric} 
                 onFilterPipeline={(id) => { /* Filtro será passado para Pipeline via URL ou Contexto futuramente, aqui simplificado */ setActiveTab('pipeline'); }}
                 onViewCandidates={(job) => setViewingJob(job)} 
               />
            </div>
          )}
          
          {activeTab === 'candidates' && <div className="p-4 md:p-8 overflow-y-auto h-full"><CandidatesList candidates={candidates} jobs={jobs} onAdd={() => setEditingCandidate({})} onEdit={setEditingCandidate} onDelete={(id) => deleteDoc(doc(db, 'candidates', id))} /></div>}
          
          {activeTab === 'settings' && <div className="p-4 md:p-8 overflow-y-auto h-full"><SettingsPage {...optionsProps} onAddCompany={n=>handleSaveGeneric('companies',{name:n})} onDelCompany={id=>deleteDoc(doc(db,'companies',id))} onAddCity={n=>handleSaveGeneric('cities',{name:n})} onDelCity={id=>deleteDoc(doc(db,'cities',id))} onAddInterest={n=>handleSaveGeneric('interest_areas',{name:n})} onDelInterest={id=>deleteDoc(doc(db,'interest_areas',id))} onAddRole={n=>handleSaveGeneric('roles',{name:n})} onDelRole={id=>deleteDoc(doc(db,'roles',id))} onAddOrigin={n=>handleSaveGeneric('origins',{name:n})} onDelOrigin={id=>deleteDoc(doc(db,'origins',id))} onAddSchooling={n=>handleSaveGeneric('schooling_levels',{name:n})} onDelSchooling={id=>deleteDoc(doc(db,'schooling_levels',id))} onAddMarital={n=>handleSaveGeneric('marital_statuses',{name:n})} onDelMarital={id=>deleteDoc(doc(db,'marital_statuses',id))} onAddTag={n=>handleSaveGeneric('tags',{name:n})} onDelTag={id=>deleteDoc(doc(db,'tags',id))} onOpenCsvModal={() => setIsCsvModalOpen(true)} /></div>}
        </main>
      </div>

      {isJobModalOpen && <JobModal isOpen={isJobModalOpen} job={editingJob} onClose={() => { setIsJobModalOpen(false); setEditingJob(null); }} onSave={d => handleSaveGeneric('jobs', d, () => {setIsJobModalOpen(false); setEditingJob(null);})} options={optionsProps} isSaving={isSaving} />}
      {editingCandidate && <CandidateModal candidate={editingCandidate} onClose={() => setEditingCandidate(null)} onSave={d => handleSaveGeneric('candidates', d, () => setEditingCandidate(null))} options={optionsProps} isSaving={isSaving} />}
      {pendingTransition && <TransitionModal transition={pendingTransition} onClose={() => setPendingTransition(null)} onConfirm={d => handleSaveGeneric('candidates', {id: pendingTransition.candidate.id, ...d, status: pendingTransition.toStage}, () => setPendingTransition(null))} cities={cities} />}
      <CsvImportModal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} onImportData={(d) => handleSaveGeneric('candidates_batch', d)} />
      <JobCandidatesModal isOpen={!!viewingJob} onClose={() => setViewingJob(null)} job={viewingJob} candidates={candidates.filter(c => c.jobId === viewingJob?.id)} />
    </div>
  );
}

// --- NOVO COMPONENTE: PIPELINE VIEW ---

const PipelineView = ({ candidates, jobs, onDragEnd, onEdit, onCloseStatus }) => {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filtros Locais do Pipeline
  const [filters, setFilters] = useState({
     search: '',
     sort: 'recent', // 'az', 'za', 'recent', 'oldest', 'updated'
     status: 'active', // 'active', 'all', 'hired', 'rejected', 'withdrawn'
     tag: 'all'
  });

  // Filtragem e Ordenação
  const processedData = useMemo(() => {
     let data = [...candidates];

     // 1. Filtro de Status
     if (filters.status === 'active') data = data.filter(c => PIPELINE_STAGES.includes(c.status) || !c.status);
     else if (filters.status === 'hired') data = data.filter(c => c.status === 'Contratado');
     else if (filters.status === 'rejected') data = data.filter(c => c.status === 'Reprovado');
     else if (filters.status === 'withdrawn') data = data.filter(c => c.status === 'Desistiu da vaga');
     // 'all' não filtra status

     // 2. Busca Texto
     if (filters.search) {
        const lower = filters.search.toLowerCase();
        data = data.filter(c => c.fullName?.toLowerCase().includes(lower) || c.email?.toLowerCase().includes(lower));
     }

     // 3. Ordenação
     data.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        const updateA = a.updatedAt?.seconds || 0;
        const updateB = b.updatedAt?.seconds || 0;
        const nameA = a.fullName || '';
        const nameB = b.fullName || '';

        if (filters.sort === 'recent') return dateB - dateA;
        if (filters.sort === 'oldest') return dateA - dateB;
        if (filters.sort === 'updated') return updateB - updateA;
        if (filters.sort === 'az') return nameA.localeCompare(nameB);
        if (filters.sort === 'za') return nameB.localeCompare(nameA);
        return 0;
     });

     return data;
  }, [candidates, filters]);

  // Paginação (Aplicada apenas no modo Lista ou para limitar carga no kanban se necessário)
  const paginatedData = useMemo(() => {
     if (viewMode === 'kanban') return processedData; // Kanban mostra tudo do filtro
     const start = (currentPage - 1) * itemsPerPage;
     return processedData.slice(start, start + itemsPerPage);
  }, [processedData, currentPage, itemsPerPage, viewMode]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);

  // Drag & Drop
  const [draggedId, setDraggedId] = useState(null);
  const handleDragStart = (e, id) => { setDraggedId(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDrop = (e, stage) => { e.preventDefault(); if (draggedId) { onDragEnd(draggedId, stage); setDraggedId(null); } };

  return (
    <div className="flex flex-col h-full">
      {/* Barra de Ferramentas Pipeline */}
      <div className="bg-brand-card border-b border-brand-border p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Filter className="text-brand-orange"/> Pipeline de Talentos
             </h2>
             <div className="flex bg-brand-dark p-1 rounded-lg border border-brand-border">
                <button onClick={() => setViewMode('kanban')} className={`p-2 rounded ${viewMode==='kanban' ? 'bg-brand-card text-brand-cyan shadow' : 'text-slate-400 hover:text-white'}`} title="Modo Kanban"><Kanban size={18}/></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode==='list' ? 'bg-brand-card text-brand-cyan shadow' : 'text-slate-400 hover:text-white'}`} title="Modo Lista"><List size={18}/></button>
             </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
             {/* Busca */}
             <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={16}/>
                <input 
                  className="w-full bg-brand-dark border border-brand-border rounded pl-9 pr-3 py-2 text-sm text-white focus:border-brand-cyan outline-none" 
                  placeholder="Buscar candidato..."
                  value={filters.search}
                  onChange={e => setFilters({...filters, search: e.target.value})}
                />
             </div>

             {/* Filtros Dropdown */}
             <select className="bg-brand-dark border border-brand-border rounded px-3 py-2 text-sm text-white outline-none" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                <option value="active">Em Andamento (Pipeline)</option>
                <option value="all">Todos os Status</option>
                <option value="hired">Contratados</option>
                <option value="rejected">Reprovados</option>
                <option value="withdrawn">Desistentes</option>
             </select>

             <select className="bg-brand-dark border border-brand-border rounded px-3 py-2 text-sm text-white outline-none" value={filters.sort} onChange={e => setFilters({...filters, sort: e.target.value})}>
                <option value="recent">Mais Recentes</option>
                <option value="oldest">Mais Antigos</option>
                <option value="updated">Última Atualização</option>
                <option value="az">A-Z</option>
                <option value="za">Z-A</option>
             </select>
             
             {/* Paginação Selector */}
             <select className="bg-brand-dark border border-brand-border rounded px-3 py-2 text-sm text-white outline-none" value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))}>
                <option value={10}>10 por pág</option>
                <option value={50}>50 por pág</option>
                <option value={100}>100 por pág</option>
                <option value={500}>500 por pág</option>
                <option value={1000}>1000 por pág</option>
             </select>

             <button onClick={() => setShowFilters(!showFilters)} className={`ml-auto flex items-center gap-2 px-3 py-2 rounded text-sm font-bold border ${showFilters ? 'bg-brand-orange text-white border-brand-orange' : 'bg-brand-dark text-slate-400 border-brand-border'}`}>
                <Filter size={16}/> Filtros Avançados
             </button>
          </div>
          
          {/* Área de Filtros Avançados (Expansível) */}
          {showFilters && (
             <div className="p-4 bg-brand-dark/50 rounded border border-brand-border animate-in slide-in-from-top-2 text-sm text-slate-400">
                <p>Implementar filtros de Tags e Data aqui...</p>
             </div>
          )}
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-hidden relative bg-brand-dark">
         {viewMode === 'kanban' ? (
            <div className="h-full overflow-x-auto overflow-y-hidden p-4 custom-scrollbar">
               <div className="flex gap-4 h-full min-w-max">
                  {PIPELINE_STAGES.map(stage => (
                     <KanbanColumn 
                        key={stage} 
                        stage={stage} 
                        candidates={processedData.filter(c => (c.status || 'Inscrito') === stage)}
                        jobs={jobs}
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                        onEdit={onEdit}
                        onCloseStatus={onCloseStatus}
                     />
                  ))}
               </div>
            </div>
         ) : (
            <div className="h-full overflow-y-auto p-4 custom-scrollbar">
               <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-brand-card text-white font-bold sticky top-0 z-10">
                     <tr>
                        <th className="p-3 rounded-tl-lg">Nome</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Área de Interesse</th>
                        <th className="p-3">Vaga</th>
                        <th className="p-3">Cidade</th>
                        <th className="p-3 text-center">Atualizado</th>
                        <th className="p-3 rounded-tr-lg text-right">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border bg-brand-card/30">
                     {paginatedData.map(c => (
                        <tr key={c.id} className="hover:bg-brand-hover/50 transition-colors">
                           <td className="p-3 font-bold text-white cursor-pointer hover:text-brand-cyan" onClick={() => onEdit(c)}>{c.fullName}</td>
                           <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs border ${STATUS_COLORS[c.status] || 'bg-slate-700'}`}>{c.status}</span></td>
                           <td className="p-3">{c.interestAreas}</td>
                           <td className="p-3 text-xs">{jobs.find(j=>j.id===c.jobId)?.title || '-'}</td>
                           <td className="p-3">{c.city}</td>
                           <td className="p-3 text-center text-xs text-slate-500">
                              {c.updatedAt?.seconds ? new Date(c.updatedAt.seconds * 1000).toLocaleDateString() : '-'}
                           </td>
                           <td className="p-3 text-right">
                              <button onClick={() => onEdit(c)} className="p-1 hover:text-brand-cyan"><Edit3 size={16}/></button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
               {/* Paginação Footer */}
               <div className="mt-4 flex justify-between items-center text-xs text-slate-400">
                  <span>Mostrando {paginatedData.length} de {processedData.length}</span>
                  <div className="flex gap-2">
                     <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} className="px-3 py-1 bg-brand-card rounded disabled:opacity-50">Anterior</button>
                     <span className="py-1">Página {currentPage} de {totalPages || 1}</span>
                     <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="px-3 py-1 bg-brand-card rounded disabled:opacity-50">Próxima</button>
                  </div>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

// Sub-componente Coluna Kanban
const KanbanColumn = ({ stage, candidates, jobs, onDragStart, onDrop, onEdit, onCloseStatus }) => {
   return (
      <div 
         className="w-[300px] flex flex-col bg-brand-card/30 border border-brand-border rounded-xl h-full max-h-full"
         onDragOver={(e) => e.preventDefault()} 
         onDrop={(e) => onDrop(e, stage)}
      >
         {/* Header da Coluna */}
         <div className={`p-3 border-b border-brand-border flex justify-between items-center bg-opacity-20 rounded-t-xl ${STATUS_COLORS[stage]}`}>
            <span className="font-bold text-sm uppercase tracking-wide">{stage}</span>
            <span className="bg-brand-dark/50 px-2 py-0.5 rounded text-xs font-mono">{candidates.length}</span>
         </div>

         {/* Lista de Cards */}
         <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {candidates.map(c => (
               <div 
                  key={c.id} 
                  draggable 
                  onDragStart={(e) => onDragStart(e, c.id)} 
                  onClick={() => onEdit(c)} 
                  className="bg-brand-card p-3 rounded-lg border border-brand-border hover:border-brand-cyan cursor-grab active:cursor-grabbing shadow-sm group relative animate-in zoom-in-95 duration-200"
               >
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-2">
                     <h4 className="font-bold text-white text-sm line-clamp-1" title={c.fullName}>{c.fullName}</h4>
                     {c.updatedAt && (
                        <span className="text-[10px] text-slate-500" title="Última atualização">
                           {new Date(c.updatedAt.seconds * 1000).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})}
                        </span>
                     )}
                  </div>

                  {/* Card Body - Os 5 campos solicitados */}
                  <div className="space-y-1.5">
                     <div className="flex items-center gap-1.5 text-xs text-brand-cyan truncate">
                        <Briefcase size={12}/> {c.interestAreas || 'Área n/d'}
                     </div>
                     <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                        <Building2 size={12}/> {c.education || 'Formação n/d'}
                     </div>
                     <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                        <MapPin size={12}/> {c.city || 'Cidade n/d'}
                     </div>
                     
                     {/* Tags */}
                     <div className="flex flex-wrap gap-1 mt-2">
                        {/* Mock de Tags - No futuro viria de c.tags */}
                        {['Top Talent', 'Indicação'].slice(0, 3).map(t => (
                           <span key={t} className="px-1.5 py-0.5 rounded-[3px] bg-slate-700 text-[10px] text-slate-300 border border-slate-600">
                              {t}
                           </span>
                        ))}
                     </div>
                  </div>

                  {/* Actions (Gatilhos de Fechamento) */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-card shadow-xl rounded border border-brand-border flex flex-col z-10">
                     <button 
                        onClick={(e) => { e.stopPropagation(); onCloseStatus(c.id, 'Contratado'); }} 
                        className="p-1.5 hover:bg-green-900/50 hover:text-green-400 text-slate-400" 
                        title="Marcar como Contratado"
                     ><Check size={14}/></button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); onCloseStatus(c.id, 'Reprovado'); }} 
                        className="p-1.5 hover:bg-red-900/50 hover:text-red-400 text-slate-400" 
                        title="Marcar como Reprovado"
                     ><Ban size={14}/></button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); onCloseStatus(c.id, 'Desistiu da vaga'); }} 
                        className="p-1.5 hover:bg-slate-700 hover:text-white text-slate-400" 
                        title="Marcar como Desistência"
                     ><UserMinus size={14}/></button>
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
};

// Componentes Listas Legado (Mantidos para compatibilidade se necessário, mas PipelineView substitui Pipeline)
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
            <p className="text-xs text-slate-500 cursor-pointer hover:text-brand-cyan transition-colors" onClick={() => onViewCandidates(j)}>{candidates.filter(c => c.jobId === j.id).length} candidatos</p>
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

  const standardFields = ['id', 'fullName', 'photoUrl', 'birthDate', 'age', 'email', 'phone', 'city', 'maritalStatus', 'hasLicense', 'childrenCount', 'freeField', 'education', 'schoolingLevel', 'institution', 'interestAreas', 'experience', 'cvUrl', 'portfolioUrl', 'jobId', 'status', 'source', 'referral', 'feedback', 'createdAt', 'imported', 'typeOfApp', 'salaryExpectation', 'canRelocate', 'courses', 'graduationDate', 'isStudying', 'references', 'firstInterviewDate', 'secondInterviewDate', 'testData', 'sheetId', 'original_timestamp', 'updatedAt', 'closedAt'];
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
              <div className="md:col-span-2 flex items-center gap-4 mb-2">
                 <div className="w-20 h-20 rounded-full bg-slate-700 overflow-hidden border-2 border-brand-border shrink-0">
                    {d.photoUrl ? <img src={d.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Users/></div>}
                 </div>
                 <div className="flex-1"><Input label="Link da Foto" field="photoUrl" /></div>
              </div>
              <div className="md:col-span-2"><Input label="Nome Completo" field="fullName" /></div>
              <div className="grid grid-cols-2 gap-4"><Input label="Nascimento" field="birthDate" /><Input label="Idade" field="age" type="number" /></div>
              <Input label="E-mail" field="email" type="email" />
              <Input label="Celular / WhatsApp" field="phone" />
              <Select label="Cidade" field="city" list={cities} />
              <div className="grid grid-cols-2 gap-4"><Select label="Estado Civil" field="maritalStatus" list={marital} /><Input label="Filhos (Quantos)" field="childrenCount" /></div>
              <div className="mb-3"><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Possui CNH B?</label><select className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white" value={d.hasLicense||''} onChange={e => setD({...d, hasLicense: e.target.value})}><option value="">Selecione</option><option value="Sim">Sim</option><option value="Não">Não</option></select></div>
            </div>
          )}
          {activeSection === 'profissional' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="md:col-span-2"><TextArea label="Resumo / Bio / Campo Livre" field="freeField" /></div>
               <Input label="Formação Acadêmica" field="education" />
               <Select label="Nível Escolaridade" field="schoolingLevel" list={schooling} />
               <div className="md:col-span-2"><Input label="Instituição de Ensino" field="institution" /></div>
               <div className="grid grid-cols-2 gap-4"><Input label="Data Formatura" field="graduationDate" /><Input label="Está Cursando?" field="isStudying" /></div>
               <div className="md:col-span-2 mb-3"><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Área de Interesse</label><select className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white" value={d.interestAreas||''} onChange={e => setD({...d, interestAreas: e.target.value})}><option value="">Selecione...</option>{interestAreas.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}</select></div>
               <div className="md:col-span-2"><TextArea label="Experiência Anterior" field="experience" /></div>
               <div className="md:col-span-2"><TextArea label="Cursos e Certificações" field="courses" /></div>
               <div className="md:col-span-2"><TextArea label="Referências Profissionais" field="references" /></div>
               <Input label="Link Currículo" field="cvUrl" />
               <Input label="Link Portfólio" field="portfolioUrl" />
            </div>
          )}
          {activeSection === 'processo' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="md:col-span-2"><Input label="Tipo de Candidatura" field="typeOfApp" /></div>
                 <div><label className="block text-xs text-slate-400 mb-1">Vaga Vinculada</label><select className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white" value={d.jobId||''} onChange={e => setD({...d, jobId: e.target.value})}><option value="">Banco Geral</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select></div>
                 <div><label className="block text-xs text-slate-400 mb-1">Status no Pipeline</label><select className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white font-bold" value={d.status} onChange={e => setD({...d, status: e.target.value})}>{ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                 <Select label="Onde nos encontrou?" field="source" list={origins} />
                 <Input label="Indicação (Quem indicou?)" field="referral" />
                 <Input label="Pretensão Salarial" field="salaryExpectation" />
                 <Input label="Disp. Mudança de Cidade" field="canRelocate" />
              </div>
              <div className="bg-brand-card p-4 rounded-xl border border-brand-border"><h4 className="text-brand-orange font-bold text-sm mb-4">Histórico Interno</h4><div className="grid grid-cols-2 gap-4"><Input label="Data 1ª Entrevista" field="firstInterviewDate" type="datetime-local" /><Input label="Data 2ª Entrevista" field="secondInterviewDate" type="datetime-local" /></div><TextArea label="Dados dos Testes" field="testData" /><TextArea label="Feedback / Observações" field="feedback" /></div>
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