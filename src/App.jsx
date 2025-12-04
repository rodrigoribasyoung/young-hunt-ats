import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Briefcase, Settings, Plus, Search, 
  FileText, MapPin, ChevronRight, CheckCircle, Filter, 
  UserPlus, Trophy, Menu, X, LogOut, Lock, Loader2, Edit3, Trash2,
  Building2, Tag, Mail, Save, AlertTriangle, UploadCloud, 
  Calendar, Phone, DollarSign, SortAsc, SortDesc, Eye, CheckSquare, XSquare,
  Clock, TrendingUp, AlertCircle, CalendarCheck, MoreVertical, List, Kanban,
  ArrowRightCircle, Check, Ban, UserMinus, RefreshCw, CheckSquare as CheckBoxIcon, Square
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

import { PIPELINE_STAGES, STATUS_COLORS, JOB_STATUSES, CSV_FIELD_MAPPING_OPTIONS } from './constants';

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
      <h1 className="text-3xl font-bold text-white mb-2 font-sans">Young Talents ATS</h1>
      <button onClick={onLogin} className="w-full bg-white text-slate-900 py-3.5 px-4 rounded-lg font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-3 shadow-lg mt-6">
        Entrar com Google
      </button>
    </div>
  </div>
);

// --- SIDEBAR FILTROS AVANÇADOS (Melhorada) ---
const FilterSidebar = ({ isOpen, onClose, filters, setFilters, clearFilters, options }) => {
  if (!isOpen) return null;
  
  // Filtros Dinâmicos baseados em CSV_FIELD_MAPPING_OPTIONS
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
        
        <div className="space-y-6 flex-1">
          {/* Filtros Fixos Importantes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-cyan uppercase">Vaga</label>
            <select className="w-full bg-brand-dark border border-brand-border rounded p-3 text-sm text-white outline-none focus:border-brand-orange" value={filters.jobId} onChange={e => setFilters({...filters, jobId: e.target.value})}>
               <option value="all">Todas as Vagas</option>{options.jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>

          {/* Filtros Dinâmicos */}
          {dynamicFilters.map(field => (
             <div key={field.value} className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">{field.label.replace(':', '')}</label>
                <select 
                   className="w-full bg-brand-dark border border-brand-border rounded p-3 text-sm text-white outline-none focus:border-brand-orange"
                   value={filters[field.value] || 'all'}
                   onChange={e => setFilters({...filters, [field.value]: e.target.value})}
                >
                   <option value="all">Todos</option>
                   {/* Aqui idealmente extrairíamos as opções únicas dos candidatos, simplificado para o exemplo com as listas de options */}
                   {field.value === 'city' && options.cities.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                   {field.value === 'interestAreas' && options.interestAreas.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                   {field.value === 'schoolingLevel' && options.schooling.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                   {field.value === 'source' && options.origins.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                   {field.value === 'hasLicense' && <><option value="Sim">Sim</option><option value="Não">Não</option></>}
                </select>
             </div>
          ))}
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
  const [activeTab, setActiveTab] = useState('pipeline'); // Padrão Pipeline
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
    search: '', period: 'all', sort: 'recent',
    jobId: 'all', company: 'all', city: 'all', interestArea: 'all',
    cnh: 'all', marital: 'all', origin: 'all', schooling: 'all'
  };
  const [filters, setFilters] = useState(initialFilters);

  // Auth
  useEffect(() => { return onAuthStateChanged(auth, (u) => setUser(u)); }, []);
  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { console.error(e); } };

  // Sync Data
  useEffect(() => {
    if (!user) return;
    const unsubs = [
      onSnapshot(query(collection(db, 'jobs'), orderBy('createdAt', 'desc')), s => setJobs(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'candidates'), orderBy('updatedAt', 'desc')), s => setCandidates(s.docs.map(d => ({id:d.id, ...d.data()})))),
      // Listas auxiliares
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

  // Handlers
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

    // Obrigatoriedades
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

  const handleDeleteAllCandidates = async () => {
    if(!confirm("ATENÇÃO: Excluir TODOS os candidatos?")) return;
    setIsSaving(true);
    const snap = await getDocs(collection(db, 'candidates'));
    const batch = writeBatch(db);
    snap.forEach(d => batch.delete(doc(db, 'candidates', d.id)));
    await batch.commit();
    setIsSaving(false);
    alert("Banco limpo.");
  };

  // Lógica de Filtro Global
  const filteredCandidates = useMemo(() => {
    let data = [...candidates];
    // Filtros Avançados
    if (filters.jobId !== 'all') data = data.filter(c => c.jobId === filters.jobId);
    if (filters.search) {
       const s = filters.search.toLowerCase();
       data = data.filter(c => c.fullName?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s));
    }
    // ... Outros filtros ...
    return data;
  }, [candidates, filters]);

  const optionsProps = { jobs, companies, cities, interestAreas, roles, origins, schooling, marital, tags };

  if (!user) return <LoginScreen onLogin={handleGoogleLogin} />;

  return (
    <div className="flex min-h-screen bg-brand-dark font-sans text-slate-200 overflow-hidden">
      
      {/* SIDEBAR PRINCIPAL */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-brand-card border-r border-brand-border flex flex-col transition-transform ${isSidebarOpen?'translate-x-0':'-translate-x-full'} lg:translate-x-0`}>
        <div className="p-6 border-b border-brand-border flex items-center justify-between">
           <div className="flex items-center gap-2 font-bold text-xl text-white"><Trophy size={24} className="text-brand-orange"/> ATS</div>
           <button onClick={()=>setIsSidebarOpen(false)} className="lg:hidden"><X/></button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
           {[
             { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
             { id: 'pipeline', label: 'Pipeline de Talentos', icon: Filter },
             { id: 'jobs', label: 'Gestão de Vagas', icon: Briefcase },
             { id: 'candidates', label: 'Banco de Talentos', icon: Users },
             { id: 'settings', label: 'Configurações', icon: Settings }
           ].map(i => (
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
              {activeTab === 'pipeline' ? 'Pipeline de Talentos' : activeTab === 'jobs' ? 'Gestão de Vagas' : activeTab === 'candidates' ? 'Banco de Talentos' : 'Dashboard'}
           </h2>
           <div className="flex items-center gap-3">
              <button onClick={() => setIsFilterSidebarOpen(true)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-brand-cyan font-bold px-3 py-1.5 rounded border border-slate-700 hover:border-brand-cyan transition-colors">
                 <Filter size={16}/> Filtros
              </button>
           </div>
        </header>

        <div className="flex-1 overflow-hidden bg-brand-dark relative">
           {activeTab === 'dashboard' && <div className="p-6 overflow-y-auto h-full"><Dashboard filteredJobs={jobs} filteredCandidates={filteredCandidates} /></div>}
           
           {activeTab === 'pipeline' && (
              <PipelineView 
                 candidates={filteredCandidates} 
                 jobs={jobs} 
                 onDragEnd={handleDragEnd} 
                 onEdit={setEditingCandidate}
                 onCloseStatus={handleCloseStatus}
              />
           )}
           
           {activeTab === 'jobs' && <div className="p-6 overflow-y-auto h-full"><JobsList jobs={jobs} candidates={candidates} onAdd={()=>{setEditingJob({});setIsJobModalOpen(true)}} onEdit={(j)=>{setEditingJob(j);setIsJobModalOpen(true)}} onDelete={(id)=>deleteDoc(doc(db,'jobs',id))} onToggleStatus={handleSaveGeneric} onFilterPipeline={()=>{setFilters({...filters, jobId: 'mock_id'}); setActiveTab('pipeline')}} onViewCandidates={setViewingJob}/></div>}
           
           {activeTab === 'candidates' && <div className="p-6 overflow-y-auto h-full"><CandidatesList candidates={filteredCandidates} jobs={jobs} onAdd={()=>setEditingCandidate({})} onEdit={setEditingCandidate} onDelete={(id)=>deleteDoc(doc(db,'candidates',id))}/></div>}
           
           {activeTab === 'settings' && <div className="p-0 h-full"><SettingsPage {...optionsProps} onOpenCsvModal={()=>setIsCsvModalOpen(true)} /></div>}
        </div>
      </div>

      {/* SIDEBAR DE FILTROS */}
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

// --- PIPELINE REFORMULADO ---

const PipelineView = ({ candidates, jobs, onDragEnd, onEdit, onCloseStatus }) => {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Estados de "Carregar Mais" por coluna no Kanban
  const [visibleCounts, setVisibleCounts] = useState(
     PIPELINE_STAGES.reduce((acc, stage) => ({...acc, [stage]: 20}), {})
  );

  // Resetar seleções quando mudar filtros
  useEffect(() => setSelectedIds([]), [candidates]);

  const handleSelect = (id) => {
     setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
     if (selectedIds.length === candidates.length) setSelectedIds([]);
     else setSelectedIds(candidates.map(c => c.id));
  };

  const loadMore = (stage) => {
     setVisibleCounts(prev => ({ ...prev, [stage]: prev[stage] + 20 }));
  };

  // Toolbar de Ações em Massa
  const MassActionsBar = () => selectedIds.length > 0 && (
     <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-brand-orange text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-4 animate-in slide-in-from-bottom-4">
        <span className="font-bold text-sm">{selectedIds.length} selecionados</span>
        <div className="h-4 w-px bg-white/30"></div>
        <button className="hover:underline text-sm font-medium flex items-center gap-1"><Mail size={14}/> Email</button>
        <button className="hover:underline text-sm font-medium flex items-center gap-1"><Trash2 size={14}/> Excluir</button>
        <button onClick={() => setSelectedIds([])} className="bg-white/20 p-1 rounded-full hover:bg-white/30"><X size={14}/></button>
     </div>
  );

  return (
     <div className="flex flex-col h-full relative">
        <MassActionsBar />
        
        {/* Barra de Visualização */}
        <div className="px-6 py-3 border-b border-brand-border flex justify-between items-center bg-brand-dark">
           <div className="flex bg-brand-card p-1 rounded-lg border border-brand-border">
              <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode==='kanban' ? 'bg-brand-dark text-brand-cyan shadow-sm' : 'text-slate-400 hover:text-white'}`}><Kanban size={16}/> Kanban</button>
              <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode==='list' ? 'bg-brand-dark text-brand-cyan shadow-sm' : 'text-slate-400 hover:text-white'}`}><List size={16}/> Lista</button>
           </div>
           <div className="text-xs text-slate-500">
              {candidates.length} talentos encontrados
           </div>
        </div>

        {/* Área Principal */}
        <div className="flex-1 overflow-hidden">
           {viewMode === 'kanban' ? (
              <div className="h-full overflow-x-auto overflow-y-hidden p-4 custom-scrollbar">
                 <div className="flex gap-4 h-full min-w-max">
                    {PIPELINE_STAGES.map(stage => (
                       <KanbanColumn 
                          key={stage} 
                          stage={stage}
                          // Passa apenas os itens visíveis para renderizar
                          allCandidates={candidates.filter(c => (c.status || 'Inscrito') === stage)}
                          limit={visibleCounts[stage]}
                          onLoadMore={() => loadMore(stage)}
                          jobs={jobs}
                          onDragEnd={onDragEnd} // Passando para o filho para gerenciar o drop
                          onEdit={onEdit}
                          onCloseStatus={onCloseStatus}
                          selectedIds={selectedIds}
                          onSelect={handleSelect}
                       />
                    ))}
                 </div>
              </div>
           ) : (
              <div className="h-full overflow-y-auto p-4 custom-scrollbar">
                 <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-brand-card text-white font-bold sticky top-0 z-10 shadow-sm">
                       <tr>
                          <th className="p-4 w-10"><input type="checkbox" className="accent-brand-orange w-4 h-4 cursor-pointer" checked={selectedIds.length > 0 && selectedIds.length === candidates.length} onChange={handleSelectAll}/></th>
                          <th className="p-4">Nome Completo</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Vaga</th>
                          <th className="p-4 text-center">Atualizado</th>
                          <th className="p-4 text-right">Ações</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border bg-brand-card/20">
                       {candidates.slice(0, itemsPerPage).map(c => (
                          <tr key={c.id} className={`hover:bg-brand-card/50 transition-colors ${selectedIds.includes(c.id) ? 'bg-brand-orange/10' : ''}`}>
                             <td className="p-4"><input type="checkbox" className="accent-brand-orange w-4 h-4 cursor-pointer" checked={selectedIds.includes(c.id)} onChange={() => handleSelect(c.id)}/></td>
                             <td className="p-4 font-bold text-white cursor-pointer hover:text-brand-cyan" onClick={() => onEdit(c)}>{c.fullName}</td>
                             <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs border ${STATUS_COLORS[c.status] || 'bg-slate-700'}`}>{c.status}</span></td>
                             <td className="p-4 text-xs">{jobs.find(j=>j.id===c.jobId)?.title || '-'}</td>
                             <td className="p-4 text-center text-xs text-slate-500">{c.updatedAt?.seconds ? new Date(c.updatedAt.seconds * 1000).toLocaleDateString() : '-'}</td>
                             <td className="p-4 text-right"><button onClick={() => onEdit(c)}><Edit3 size={16} className="hover:text-brand-cyan"/></button></td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           )}
        </div>
     </div>
  );
};

// Coluna Kanban Isolada para Performance e Drag/Drop
const KanbanColumn = ({ stage, allCandidates, limit, onLoadMore, jobs, onDragEnd, onEdit, onCloseStatus, selectedIds, onSelect }) => {
   const [draggedId, setDraggedId] = useState(null);
   const displayedCandidates = allCandidates.slice(0, limit);
   
   const handleDrop = (e) => {
       e.preventDefault();
       const cId = e.dataTransfer.getData("candidateId");
       if (cId) onDragEnd(cId, stage);
   };

   const handleDragStart = (e, cId) => {
       e.dataTransfer.setData("candidateId", cId);
       e.dataTransfer.effectAllowed = "move";
   };

   return (
      <div 
         className="w-[300px] flex flex-col bg-brand-card/40 border border-brand-border rounded-xl h-full max-h-full backdrop-blur-sm"
         onDragOver={(e) => e.preventDefault()} 
         onDrop={handleDrop}
      >
         <div className={`p-3 border-b border-brand-border flex justify-between items-center rounded-t-xl ${STATUS_COLORS[stage]}`}>
            <span className="font-bold text-sm uppercase tracking-wide flex items-center gap-2">
               {stage}
            </span>
            <span className="bg-black/20 px-2 py-0.5 rounded text-xs font-mono font-bold">{allCandidates.length}</span>
         </div>

         <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar relative">
            {displayedCandidates.map(c => (
               <div 
                  key={c.id} 
                  draggable 
                  onDragStart={(e) => handleDragStart(e, c.id)} 
                  onClick={() => onEdit(c)} 
                  className={`bg-brand-card p-3 rounded-lg border hover:border-brand-cyan cursor-grab active:cursor-grabbing shadow-sm group relative transition-all ${selectedIds.includes(c.id) ? 'border-brand-orange bg-brand-orange/5' : 'border-brand-border'}`}
               >
                  {/* Checkbox Flutuante (aparece no hover ou se selecionado) */}
                  <div className={`absolute top-2 left-2 z-20 ${selectedIds.includes(c.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="accent-brand-orange w-4 h-4 cursor-pointer shadow-sm" checked={selectedIds.includes(c.id)} onChange={() => onSelect(c.id)}/>
                  </div>

                  <div className="pl-6 mb-2">
                     <h4 className="font-bold text-white text-sm line-clamp-1" title={c.fullName}>{c.fullName}</h4>
                     {c.updatedAt && <p className="text-[10px] text-slate-500 mt-0.5">Atualizado: {new Date(c.updatedAt.seconds * 1000).toLocaleDateString()}</p>}
                  </div>

                  <div className="space-y-1 pl-6">
                     <div className="text-xs text-brand-cyan truncate flex items-center gap-1"><Briefcase size={10}/> {c.interestAreas || 'Área n/d'}</div>
                     <div className="text-xs text-slate-400 truncate flex items-center gap-1"><Building2 size={10}/> {c.education || 'Formação n/d'}</div>
                     <div className="text-xs text-slate-400 truncate flex items-center gap-1"><MapPin size={10}/> {c.city || 'Local n/d'}</div>
                  </div>

                  {/* Botões de Fechamento Rápido */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col bg-brand-card shadow-lg rounded border border-brand-border z-20">
                     <button onClick={(e) => { e.stopPropagation(); onCloseStatus(c.id, 'Contratado'); }} className="p-1.5 hover:bg-green-500/20 hover:text-green-400 text-slate-500" title="Contratar"><Check size={14}/></button>
                     <button onClick={(e) => { e.stopPropagation(); onCloseStatus(c.id, 'Reprovado'); }} className="p-1.5 hover:bg-red-500/20 hover:text-red-400 text-slate-500" title="Reprovar"><Ban size={14}/></button>
                  </div>
               </div>
            ))}

            {allCandidates.length > limit && (
               <button onClick={onLoadMore} className="w-full py-2 text-xs text-slate-400 hover:text-white hover:bg-brand-card/50 rounded dashed border border-slate-700">
                  Carregar mais...
               </button>
            )}
         </div>
      </div>
   );
};
// Mantenha os componentes `JobsList` e `CandidatesList` como estavam, apenas `Dashboard` foi atualizado levemente