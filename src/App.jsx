import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Briefcase, Settings, Plus, Search, 
  FileText, MapPin, Filter, Trophy, Menu, X, LogOut, Loader2, Edit3, Trash2,
  Building2, Mail, Check, Ban, UserMinus, CheckSquare, Square, Kanban, List,
  CalendarCheck, AlertCircle
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

import { PIPELINE_STAGES, STATUS_COLORS, JOB_STATUSES, CSV_FIELD_MAPPING_OPTIONS, ALL_STATUSES } from './constants';

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
const FilterSidebar = ({ isOpen, onClose, filters, setFilters, clearFilters, options }) => {
  if (!isOpen) return null;
  
  const dynamicFilters = CSV_FIELD_MAPPING_OPTIONS.filter(opt => 
    ['city', 'interestAreas', 'schoolingLevel', 'source', 'maritalStatus', 'hasLicense'].includes(opt.value)
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-96 bg-brand-card border-l border-brand-border z-50 p-6 shadow-2xl transform transition-transform duration-300 overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-white text-lg flex items-center gap-2"><Filter size={20}/> Filtros Avançados</h3>
          <button onClick={onClose}><X className="text-slate-400 hover:text-white" /></button>
        </div>
        
        <div className="space-y-6 flex-1 custom-scrollbar overflow-y-auto pr-2">
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-orange uppercase">Vaga Vinculada</label>
            <select className="w-full bg-brand-dark border border-brand-border rounded p-3 text-sm text-white outline-none focus:border-brand-orange" value={filters.jobId} onChange={e => setFilters({...filters, jobId: e.target.value})}>
               <option value="all">Todas as Vagas</option>{options.jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>

          {dynamicFilters.map(field => {
             let optionsList = [];
             if(field.value === 'city') optionsList = options.cities;
             else if(field.value === 'interestAreas') optionsList = options.interestAreas;
             else if(field.value === 'schoolingLevel') optionsList = options.schooling;
             else if(field.value === 'source') optionsList = options.origins;
             else if(field.value === 'maritalStatus') optionsList = options.marital;
             
             const hasOptions = optionsList.length > 0;
             const isBoolean = ['hasLicense', 'isStudying', 'canRelocate'].includes(field.value);

             return (
                <div key={field.value} className="space-y-2">
                   <label className="text-xs font-bold text-slate-400 uppercase">{field.label.replace(':', '')}</label>
                   {hasOptions ? (
                      <select className="w-full bg-brand-dark border border-brand-border rounded p-3 text-sm text-white outline-none focus:border-brand-orange" value={filters[field.value] || 'all'} onChange={e => setFilters({...filters, [field.value]: e.target.value})}>
                         <option value="all">Todos</option>
                         {optionsList.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
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
          <button onClick={clearFilters} className="w-full text-slate-400 hover:text-white py-2 text-sm">Limpar Tudo</button>
        </div>
      </div>
    </>
  );
};

// --- APP PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pipeline');
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
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);

  // Filtro Global
  const initialFilters = { 
    jobId: 'all', company: 'all', city: 'all', interestArea: 'all',
    cnh: 'all', marital: 'all', origin: 'all', schooling: 'all'
  };
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => { return onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); }); }, []);
  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { console.error(e); } };

  // Sync Data - CORREÇÃO: Removido orderBy('updatedAt') para garantir que docs antigos apareçam
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
      if (!d.id) payload.createdAt = serverTimestamp();
      if (d.id) await updateDoc(doc(db, col, d.id), payload);
      else await addDoc(collection(db, col), payload);
      if(closeFn) closeFn();
    } catch(e) { alert("Erro ao salvar: " + e.message); } finally { setIsSaving(false); }
  };

  const handleDragEnd = (cId, newStage) => {
    const candidate = candidates.find(c => c.id === cId);
    if (!candidate || candidate.status === newStage) return;
    const missing = [];
    if (newStage === 'Considerado' && !candidate.city) missing.push('Cidade');
    if (newStage === 'Seleção' && (!candidate.email || !candidate.phone)) missing.push('Email/Telefone');
    if (missing.length > 0) {
        alert(`Preencha para mover para ${newStage}: ${missing.join(', ')}`);
        setEditingCandidate(candidate);
        return;
    }
    updateDoc(doc(db, 'candidates', cId), { status: newStage, updatedAt: serverTimestamp() });
  };

  const handleCloseStatus = (cId, status) => {
     if(confirm(`Mover para ${status}?`)) {
        updateDoc(doc(db, 'candidates', cId), { status, updatedAt: serverTimestamp(), closedAt: serverTimestamp() });
     }
  };

  // Filtra candidatos baseado nos filtros da Sidebar (Avançados)
  const filteredCandidates = useMemo(() => {
    let data = [...candidates];
    Object.keys(filters).forEach(key => {
       if(filters[key] !== 'all' && filters[key] !== '') {
          data = data.filter(c => c[key] === filters[key]);
       }
    });
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
           <button onClick={()=>setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu/></button>
           <h2 className="text-lg font-bold text-white ml-2 lg:ml-0">
              {activeTab === 'pipeline' ? 'Pipeline de Talentos' : activeTab === 'jobs' ? 'Gestão de Vagas' : activeTab === 'candidates' ? 'Banco de Talentos' : activeTab === 'settings' ? 'Configurações' : 'Dashboard'}
           </h2>
           <div className="flex items-center gap-3">
              <button onClick={() => setIsFilterSidebarOpen(true)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-brand-cyan font-bold px-3 py-1.5 rounded border border-slate-700 hover:border-brand-cyan transition-colors">
                 <Filter size={16}/> Filtros Avançados
              </button>
           </div>
        </header>

        <div className="flex-1 overflow-hidden bg-brand-dark relative">
           {activeTab === 'dashboard' && <div className="p-6 overflow-y-auto h-full"><Dashboard filteredJobs={jobs} filteredCandidates={filteredCandidates} /></div>}
           {activeTab === 'pipeline' && <PipelineView candidates={filteredCandidates} jobs={jobs} onDragEnd={handleDragEnd} onEdit={setEditingCandidate} onCloseStatus={handleCloseStatus} />}
           {activeTab === 'jobs' && <div className="p-6 overflow-y-auto h-full"><JobsList jobs={jobs} candidates={candidates} onAdd={()=>{setEditingJob({});setIsJobModalOpen(true)}} onEdit={(j)=>{setEditingJob(j);setIsJobModalOpen(true)}} onDelete={(id)=>deleteDoc(doc(db,'jobs',id))} onToggleStatus={handleSaveGeneric} onFilterPipeline={()=>{setFilters({...filters, jobId: 'mock_id'}); setActiveTab('pipeline')}} onViewCandidates={setViewingJob}/></div>}
           {activeTab === 'candidates' && <div className="p-6 overflow-y-auto h-full"><CandidatesList candidates={filteredCandidates} jobs={jobs} onAdd={()=>setEditingCandidate({})} onEdit={setEditingCandidate} onDelete={(id)=>deleteDoc(doc(db,'candidates',id))}/></div>}
           {activeTab === 'settings' && <div className="p-0 h-full"><SettingsPage {...optionsProps} onOpenCsvModal={()=>setIsCsvModalOpen(true)} /></div>}
        </div>
      </div>

      <FilterSidebar isOpen={isFilterSidebarOpen} onClose={() => setIsFilterSidebarOpen(false)} filters={filters} setFilters={setFilters} clearFilters={() => setFilters(initialFilters)} options={optionsProps} />

      {/* MODAIS GLOBAIS */}
      {isJobModalOpen && <JobModal isOpen={isJobModalOpen} job={editingJob} onClose={() => { setIsJobModalOpen(false); setEditingJob(null); }} onSave={d => handleSaveGeneric('jobs', d, () => {setIsJobModalOpen(false); setEditingJob(null);})} options={optionsProps} isSaving={isSaving} />}
      {editingCandidate && <CandidateModal candidate={editingCandidate} onClose={() => setEditingCandidate(null)} onSave={d => handleSaveGeneric('candidates', d, () => setEditingCandidate(null))} options={optionsProps} isSaving={isSaving} />}
      {pendingTransition && <TransitionModal transition={pendingTransition} onClose={() => setPendingTransition(null)} onConfirm={d => handleSaveGeneric('candidates', {id: pendingTransition.candidate.id, ...d, status: pendingTransition.toStage}, () => setPendingTransition(null))} cities={cities} />}
      <CsvImportModal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} onImportData={(d) => handleSaveGeneric('candidates_batch', d)} />
      <JobCandidatesModal isOpen={!!viewingJob} onClose={() => setViewingJob(null)} job={viewingJob} candidates={candidates.filter(c => c.jobId === viewingJob?.id)} />
    </div>
  );
}

// --- PIPELINE VIEW ---
const PipelineView = ({ candidates, jobs, onDragEnd, onEdit, onCloseStatus }) => {
  const [viewMode, setViewMode] = useState('kanban'); 
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleCounts, setVisibleCounts] = useState(PIPELINE_STAGES.reduce((acc, stage) => ({...acc, [stage]: 20}), {}));
  const [localSearch, setLocalSearch] = useState('');
  const [localSort, setLocalSort] = useState('recent');
  const [statusFilter, setStatusFilter] = useState('active'); // active, hired, rejected

  useEffect(() => setSelectedIds([]), [candidates]);

  const handleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleSelectAll = () => selectedIds.length === candidates.length ? setSelectedIds([]) : setSelectedIds(candidates.map(c => c.id));
  const loadMore = (stage) => setVisibleCounts(prev => ({ ...prev, [stage]: prev[stage] + 20 }));

  // Processamento Local dos Dados para a View
  const processedData = useMemo(() => {
     let data = [...candidates];
     
     // Filtro de Status
     if (statusFilter === 'active') data = data.filter(c => PIPELINE_STAGES.includes(c.status) || !c.status);
     else if (statusFilter === 'hired') data = data.filter(c => c.status === 'Contratado');
     else if (statusFilter === 'rejected') data = data.filter(c => c.status === 'Reprovado');
     else if (statusFilter === 'withdrawn') data = data.filter(c => c.status === 'Desistiu da vaga');
     
     // Busca Local
     if (localSearch) {
         const s = localSearch.toLowerCase();
         data = data.filter(c => c.fullName?.toLowerCase().includes(s));
     }

     // Ordenação
     data.sort((a, b) => {
         if (localSort === 'recent') return (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0);
         if (localSort === 'oldest') return (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0);
         if (localSort === 'az') return (a.fullName||'').localeCompare(b.fullName||'');
         return 0;
     });

     return data;
  }, [candidates, statusFilter, localSearch, localSort]);

  return (
     <div className="flex flex-col h-full relative">
        <div className="px-6 py-3 border-b border-brand-border flex flex-wrap gap-4 justify-between items-center bg-brand-dark">
           <div className="flex gap-3 items-center">
              <div className="flex bg-brand-card p-1 rounded-lg border border-brand-border">
                 <button onClick={() => setViewMode('kanban')} className={`p-2 rounded ${viewMode==='kanban' ? 'bg-brand-dark text-brand-cyan' : 'text-slate-400'}`}><Kanban size={16}/></button>
                 <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode==='list' ? 'bg-brand-dark text-brand-cyan' : 'text-slate-400'}`}><List size={16}/></button>
              </div>
              <input className="bg-brand-card border border-brand-border rounded px-3 py-1.5 text-sm text-white outline-none focus:border-brand-cyan w-48" placeholder="Buscar na view..." value={localSearch} onChange={e=>setLocalSearch(e.target.value)}/>
              <select className="bg-brand-card border border-brand-border rounded px-3 py-1.5 text-sm text-white outline-none" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                 <option value="active">Em Andamento</option><option value="hired">Contratados</option><option value="rejected">Reprovados</option><option value="all">Todos</option>
              </select>
              <select className="bg-brand-card border border-brand-border rounded px-3 py-1.5 text-sm text-white outline-none" value={localSort} onChange={e=>setLocalSort(e.target.value)}>
                 <option value="recent">Mais Recentes</option><option value="oldest">Mais Antigos</option><option value="az">A-Z</option>
              </select>
           </div>
           <div className="text-xs text-slate-500">{processedData.length} talentos</div>
        </div>
        <div className="flex-1 overflow-hidden">
           {viewMode === 'kanban' ? (
              <div className="h-full overflow-x-auto p-4 custom-scrollbar"><div className="flex gap-4 h-full min-w-max">
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
   const displayedCandidates = allCandidates.slice(0, limit);
   const handleDrop = (e) => { e.preventDefault(); const cId = e.dataTransfer.getData("candidateId"); if (cId) onDragEnd(cId, stage); };
   const handleDragStart = (e, cId) => { e.dataTransfer.setData("candidateId", cId); };
   return (
      <div className="w-[300px] flex flex-col bg-brand-card/40 border border-brand-border rounded-xl h-full backdrop-blur-sm" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
         <div className={`p-3 border-b border-brand-border flex justify-between items-center rounded-t-xl ${STATUS_COLORS[stage]}`}><span className="font-bold text-sm uppercase">{stage}</span><span className="bg-black/20 px-2 py-0.5 rounded text-xs font-mono">{allCandidates.length}</span></div>
         <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">{displayedCandidates.map(c => (
            <div key={c.id} draggable onDragStart={(e) => handleDragStart(e, c.id)} onClick={() => onEdit(c)} className={`bg-brand-card p-3 rounded-lg border hover:border-brand-cyan cursor-grab shadow-sm group relative ${selectedIds.includes(c.id) ? 'border-brand-orange bg-brand-orange/5' : 'border-brand-border'}`}>
               <div className={`absolute top-2 left-2 z-20 ${selectedIds.includes(c.id)?'opacity-100':'opacity-0 group-hover:opacity-100'}`} onClick={e=>e.stopPropagation()}><input type="checkbox" className="accent-brand-orange" checked={selectedIds.includes(c.id)} onChange={()=>onSelect(c.id)}/></div>
               <div className="pl-6 mb-2"><h4 className="font-bold text-white text-sm line-clamp-1">{c.fullName}</h4></div>
               <div className="space-y-1 pl-6"><div className="text-xs text-brand-cyan truncate flex gap-1"><Building2 size={10}/> {c.interestAreas}</div><div className="text-xs text-slate-400 truncate flex gap-1"><MapPin size={10}/> {c.city}</div></div>
               <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col bg-brand-card shadow-lg rounded border border-brand-border z-20"><button onClick={(e)=>{e.stopPropagation();onCloseStatus(c.id,'Contratado')}} className="p-1.5 hover:text-green-400"><Check size={14}/></button><button onClick={(e)=>{e.stopPropagation();onCloseStatus(c.id,'Reprovado')}} className="p-1.5 hover:text-red-400"><Ban size={14}/></button></div>
            </div>
         ))}{allCandidates.length > limit && <button onClick={onLoadMore} className="w-full py-2 text-xs text-slate-400 dashed border border-slate-700 hover:bg-brand-card">Carregar mais</button>}</div>
      </div>
   );
};

// --- LISTAS LEGADAS ---
const JobsList = ({ jobs, candidates, onAdd, onEdit, onToggleStatus, onViewCandidates }) => (
  <div className="space-y-6"><div className="flex justify-between"><h2 className="text-2xl font-bold text-white">Vagas</h2><button onClick={onAdd} className="bg-brand-orange text-white px-4 py-2 rounded flex items-center gap-2"><Plus size={18}/> Nova</button></div>
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{jobs.map(j => (<div key={j.id} className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-lg group hover:border-brand-cyan/50"><div className="flex justify-between mb-4"><select className="text-xs px-2 py-1 rounded border bg-transparent outline-none cursor-pointer text-brand-cyan border-brand-cyan/30" value={j.status} onChange={(e) => onToggleStatus('jobs', {id: j.id, status: e.target.value})} onClick={(e) => e.stopPropagation()}>{JOB_STATUSES.map(s => <option key={s} value={s} className="bg-brand-card">{s}</option>)}</select><button onClick={() => onEdit(j)} className="text-slate-400 hover:text-white opacity-0 group-hover:opacity-100"><Edit3 size={16}/></button></div><h3 className="font-bold text-lg text-white mb-1">{j.title}</h3><p className="text-sm text-slate-400 mb-4">{j.company}</p><div className="border-t border-brand-border pt-4 flex justify-between items-center"><p className="text-xs text-slate-500 cursor-pointer hover:text-brand-cyan" onClick={() => onViewCandidates(j)}>{candidates.filter(c => c.jobId === j.id).length} candidatos</p></div></div>))}</div></div>
);

const CandidatesList = ({ candidates, jobs, onAdd, onEdit, onDelete }) => (
  <div className="space-y-6"><div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-white">Banco de Talentos</h2><button onClick={onAdd} className="bg-brand-cyan text-brand-dark font-bold px-4 py-2 rounded flex items-center gap-2"><UserPlus size={18}/> Adicionar</button></div>
  <div className="bg-brand-card rounded-xl border border-brand-border shadow-lg overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm text-left text-slate-300"><thead className="bg-brand-hover text-slate-200 font-medium"><tr><th className="px-6 py-4">Nome</th><th className="px-6 py-4">Detalhes</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-brand-border">{candidates.map(c => (<tr key={c.id} className="hover:bg-brand-hover/50 cursor-pointer" onClick={() => onEdit(c)}><td className="px-6 py-4"><div className="font-bold text-white">{c.fullName}</div><div className="text-xs text-slate-500">{c.email}</div></td><td className="px-6 py-4"><div className="text-xs text-slate-400">{c.city}</div></td><td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs border ${STATUS_COLORS[c.status]}`}>{c.status}</span></td><td className="px-6 py-4 text-right"><button onClick={(e)=>{e.stopPropagation();onDelete(c.id)}} className="text-red-500"><Trash2 size={16}/></button></td></tr>))}</tbody></table></div></div></div>
);

// MODAIS COMPLETOS
const JobModal = ({ isOpen, job, onClose, onSave, options, isSaving }) => {
  const [d, setD] = useState(job?.id ? {...job} : { title: '', company: '', location: '', status: 'Aberta' });
  if (!isOpen) return null;
  return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div className="bg-brand-card rounded-xl w-full max-w-md border border-brand-border p-6"><h3 className="font-bold text-lg text-white mb-4">{d.id ? 'Editar' : 'Nova'} Vaga</h3><input className="w-full bg-brand-dark border border-brand-border p-2 rounded mb-3 text-white" placeholder="Título" value={d.title} onChange={e=>setD({...d, title:e.target.value})}/><select className="w-full bg-brand-dark border border-brand-border p-2 rounded mb-3 text-white" value={d.company} onChange={e=>setD({...d, company:e.target.value})}><option value="">Empresa...</option>{options.companies.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select><select className="w-full bg-brand-dark border border-brand-border p-2 rounded mb-6 text-white" value={d.location} onChange={e=>setD({...d, location:e.target.value})}><option value="">Local...</option>{options.cities.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select><div className="flex justify-end gap-2"><button onClick={onClose} className="text-slate-400 px-4">Cancelar</button><button onClick={()=>onSave(d)} disabled={isSaving} className="bg-brand-orange text-white px-4 py-2 rounded">Salvar</button></div></div></div>);
};

const CandidateModal = ({ candidate, onClose, onSave, options, isSaving }) => {
  const [d, setD] = useState({ ...candidate });
  const [activeSection, setActiveSection] = useState('pessoal');
  const Input = ({ label, field, type="text" }) => (<div className="mb-3"><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">{label}</label><input type={type} className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white outline-none focus:border-brand-orange" value={d[field]||''} onChange={e => setD({...d, [field]: e.target.value})} /></div>);
  
  return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="bg-brand-card rounded-xl w-full max-w-4xl h-[90vh] flex flex-col border border-brand-border text-white"><div className="px-6 py-4 border-b border-brand-border flex justify-between bg-brand-dark/50"><div><h3 className="font-bold text-xl">{d.id?'Editar':'Novo'} Candidato</h3></div><button onClick={onClose}><X/></button></div><div className="flex border-b border-brand-border">{['pessoal', 'profissional', 'processo'].map(tab => (<button key={tab} onClick={() => setActiveSection(tab)} className={`flex-1 py-3 px-4 text-sm font-bold uppercase ${activeSection === tab ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-slate-500'}`}>{tab}</button>))}</div><div className="p-8 overflow-y-auto flex-1 bg-brand-dark">{activeSection === 'pessoal' && <div className="grid grid-cols-2 gap-6"><Input label="Nome" field="fullName"/><Input label="Email" field="email"/><Input label="Celular" field="phone"/><Input label="Cidade" field="city"/></div>}{activeSection === 'profissional' && <div className="grid grid-cols-2 gap-6"><Input label="Formação" field="education"/><Input label="Área Interesse" field="interestAreas"/><Input label="Link CV" field="cvUrl"/><Input label="Link Portfolio" field="portfolioUrl"/></div>}{activeSection === 'processo' && <div className="grid grid-cols-2 gap-6"><div className="mb-3"><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Status</label><select className="w-full bg-brand-dark border border-brand-border p-2.5 rounded text-white" value={d.status} onChange={e=>setD({...d, status:e.target.value})}>{ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></div></div>}</div><div className="px-6 py-4 border-t border-brand-border flex justify-end gap-2"><button onClick={onClose} className="px-6 py-2 text-slate-400">Cancelar</button><button onClick={()=>onSave(d)} disabled={isSaving} className="bg-brand-orange text-white px-8 py-2 rounded">Salvar</button></div></div></div>);
};