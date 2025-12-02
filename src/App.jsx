import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Building2, 
  Settings, 
  Plus, 
  Search, 
  FileText, 
  MapPin, 
  ChevronRight,
  CheckCircle,
  XCircle,
  Filter,
  UserPlus,
  Trophy,
  Menu,
  X,
  LogOut,
  Lock,
  Loader2,
  Calendar,
  Save,
  Trash2,
  Edit3,
  Mail,
  Phone,
  Link as LinkIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Firebase Imports
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";

// --- FIREBASE CONFIGURATION (SUBSTITUA PELO SEU NOVO PROJETO) ---
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

// --- CONSTANTS ---
// Cores da Identidade: #fe5009 (Laranja), #00bcbc (Ciano)
const COLORS = ['#fe5009', '#00bcbc', '#fb923c', '#22d3ee', '#f87171']; 

// Pipeline atualizado conforme solicitação nos campos
const PIPELINE_STAGES = ['Inscrito', 'Primeira Entrevista', 'Testes', 'Segunda Entrevista', 'Selecionado', 'Contratado'];

const STATUS_COLORS = {
  'Inscrito': 'bg-slate-700 text-slate-200 border-slate-600',
  'Primeira Entrevista': 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/30',
  'Testes': 'bg-purple-900/40 text-purple-300 border-purple-700',
  'Segunda Entrevista': 'bg-brand-orange/20 text-brand-orange border-brand-orange/30',
  'Selecionado': 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  'Contratado': 'bg-green-900/40 text-green-300 border-green-700',
  'Reprovado': 'bg-red-900/40 text-red-300 border-red-700'
};

// Domínio permitido para login (Altere conforme necessidade)
const ALLOWED_DOMAIN = 'youngtalents.com.br'; // Exemplo

// --- LOGIN COMPONENT (Dark Theme) ---
const LoginScreen = ({ onLogin, error }) => (
  <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
    <div className="bg-brand-card rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-brand-border">
      <div className="w-20 h-20 bg-gradient-to-br from-brand-orange to-brand-cyan rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-orange/20">
        <Trophy size={40} className="text-white" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Young Talents</h1>
      <p className="text-slate-400 mb-8 font-light">Gestão de Talentos do Futuro</p>
      
      {error && (
        <div className="bg-red-900/20 text-red-400 p-3 rounded-lg text-sm mb-6 flex items-center gap-2 justify-center text-left border border-red-900/50">
          <Lock size={16} className="shrink-0" /> 
          <span>{error}</span>
        </div>
      )}

      <button onClick={onLogin} className="w-full bg-white text-brand-dark font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-100 transition-all shadow-md transform hover:scale-[1.02]">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
        Entrar com Google
      </button>
      <p className="mt-4 text-xs text-slate-500">Acesso restrito a colaboradores autorizados.</p>
    </div>
  </div>
);

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data State
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [cities, setCities] = useState([]);

  // Filter State
  const [filters, setFilters] = useState({
    period: 'all', 
    company: 'all',
    jobId: 'all',
    city: 'all',
    search: ''
  });

  // UI State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);

  // --- AUTHENTICATION ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Validação de domínio flexível (pode retirar o check se quiser liberar qualquer gmail)
        // if (currentUser.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          setUser(currentUser);
          setLoginError('');
        // } else {
        //   signOut(auth);
        //   setLoginError(`Acesso restrito: Utilize e-mail corporativo @${ALLOWED_DOMAIN}`);
        //   setUser(null);
        // }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setLoginError('');
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(auth, provider); } catch (error) { console.error(error); setLoginError('Erro ao tentar fazer login.'); }
  };

  const handleLogout = () => signOut(auth);

  // --- DATA SYNC ---
  useEffect(() => {
    if (!user) return;
    try {
      const unsubJobs = onSnapshot(query(collection(db, 'jobs'), orderBy('createdAt', 'desc')), (s) => setJobs(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubCandidates = onSnapshot(query(collection(db, 'candidates'), orderBy('createdAt', 'desc')), (s) => setCandidates(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubCompanies = onSnapshot(query(collection(db, 'companies'), orderBy('name')), (s) => setCompanies(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubCities = onSnapshot(query(collection(db, 'cities'), orderBy('name')), (s) => setCities(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      return () => { unsubJobs(); unsubCandidates(); unsubCompanies(); unsubCities(); };
    } catch (e) { console.error(e); }
  }, [user]);

  // --- FILTER LOGIC ---
  const filteredData = useMemo(() => {
    let filteredJobs = jobs;
    let filteredCandidates = candidates;

    if (filters.company !== 'all') filteredJobs = filteredJobs.filter(j => j.company === filters.company);
    if (filters.city !== 'all') filteredJobs = filteredJobs.filter(j => j.location === filters.city);

    const validJobIds = filteredJobs.map(j => j.id);
    
    filteredCandidates = filteredCandidates.filter(c => {
      const belongsToValidJob = validJobIds.includes(c.jobId);
      const matchesJobSelect = filters.jobId === 'all' || c.jobId === filters.jobId;
      const matchesSearch = c.fullName?.toLowerCase().includes(filters.search.toLowerCase()) || 
                            c.email?.toLowerCase().includes(filters.search.toLowerCase());

      let matchesPeriod = true;
      if (filters.period !== 'all' && c.createdAt) {
        const days = parseInt(filters.period);
        const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        const diffDays = Math.ceil(Math.abs(new Date() - date) / (1000 * 60 * 60 * 24));
        matchesPeriod = diffDays <= days;
      }

      return belongsToValidJob && matchesJobSelect && matchesSearch && matchesPeriod;
    });

    return { jobs: filteredJobs, candidates: filteredCandidates };
  }, [jobs, candidates, filters]);

  // --- HANDLERS ---
  const handleSaveJob = async (data) => {
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'jobs'), { ...data, status: 'Aberta', createdAt: serverTimestamp(), createdBy: user.email });
      setIsJobModalOpen(false);
    } catch (e) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  const handleSaveCandidate = async (data) => {
    setIsSaving(true);
    try {
      if (data.id) {
        const { id, ...updateData } = data;
        await updateDoc(doc(db, 'candidates', id), updateData);
      } else {
        await addDoc(collection(db, 'candidates'), { ...data, createdAt: serverTimestamp(), createdBy: user.email });
      }
      setEditingCandidate(null);
    } catch (e) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  const handleDragEnd = async (candidateId, newStage) => {
    if (!candidateId || !newStage) return;
    try {
      await updateDoc(doc(db, 'candidates', candidateId), { status: newStage });
    } catch (e) { console.error("Drag Error", e); }
  };

  const handleDeleteItem = async (col, id) => {
     if(confirm('Tem certeza?')) await deleteDoc(doc(db, col, id));
  };

  const handleAddAux = async (col, name) => {
    if(name.trim()) await addDoc(collection(db, col), { name });
  };

  if (authLoading) return <div className="min-h-screen bg-brand-dark flex items-center justify-center text-brand-cyan gap-2"><Loader2 className="animate-spin" /> Carregando...</div>;
  if (!user) return <LoginScreen onLogin={handleGoogleLogin} error={loginError} />;

  return (
    <div className="flex min-h-screen bg-brand-dark font-sans text-slate-200">
      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-brand-card border-r border-brand-border transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        <div className="p-6 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-orange to-brand-cyan rounded-lg flex items-center justify-center"><Trophy size={18} className="text-white" /></div>
            Young Talents
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400"><X size={24} /></button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'pipeline', label: 'Pipeline', icon: Filter }, { id: 'jobs', label: 'Vagas', icon: Briefcase }, { id: 'candidates', label: 'Candidatos', icon: Users }, { id: 'settings', label: 'Configurações', icon: Settings }].map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20' : 'text-slate-400 hover:bg-brand-hover hover:text-white'}`}>
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-brand-border bg-brand-dark/30">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-cyan flex items-center justify-center text-xs font-bold text-brand-dark truncate">{user.displayName?.charAt(0)}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate text-white">{user.displayName}</p><p className="text-xs text-slate-500 truncate">{user.email}</p></div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 text-xs text-red-400 hover:text-red-300 px-4 py-2 hover:bg-red-900/10 rounded"><LogOut size={14} /> Sair</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="lg:hidden p-4 bg-brand-card shadow-sm flex items-center justify-between border-b border-brand-border sticky top-0 z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-200"><Menu size={24} /></button>
          <span className="font-bold text-white">Young Talents</span>
          <div className="w-6" /> 
        </div>

        {/* Global Filter Bar */}
        <div className="bg-brand-card border-b border-brand-border px-8 py-4 flex flex-col lg:flex-row gap-4 items-center justify-between shadow-sm z-10">
           <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input 
                   placeholder="Buscar candidato..." 
                   className="pl-9 pr-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-sm w-full lg:w-64 focus:ring-2 focus:ring-brand-cyan outline-none text-white placeholder-slate-500"
                   value={filters.search}
                   onChange={e => setFilters({...filters, search: e.target.value})}
                 />
              </div>
              <select className="border border-brand-border rounded-lg text-sm px-3 py-2 bg-brand-dark text-slate-200" value={filters.jobId} onChange={e => setFilters({...filters, jobId: e.target.value})}>
                 <option value="all">Todas Vagas</option>
                 {filteredData.jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
           </div>
           <div className="text-xs text-brand-cyan font-medium border border-brand-cyan/20 px-3 py-1 rounded-full bg-brand-cyan/10">
              {filteredData.candidates.length} Talentos • {filteredData.jobs.length} Vagas
           </div>
        </div>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-brand-dark custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full">
            {activeTab === 'dashboard' && <Dashboard filteredJobs={filteredData.jobs} filteredCandidates={filteredData.candidates} />}
            {activeTab === 'pipeline' && (
              <Pipeline 
                candidates={filteredData.candidates} 
                jobs={jobs}
                onDragEnd={handleDragEnd} 
                onEdit={(c) => setEditingCandidate(c)}
              />
            )}
            {activeTab === 'jobs' && (
              <JobsList 
                jobs={filteredData.jobs} 
                candidates={candidates} 
                onAdd={() => setIsJobModalOpen(true)} 
                onDelete={(id) => handleDeleteItem('jobs', id)} 
                onFilterPipeline={(id) => { setFilters({...filters, jobId: id}); setActiveTab('pipeline'); }}
              />
            )}
            {activeTab === 'candidates' && (
              <CandidatesList 
                candidates={filteredData.candidates} 
                jobs={jobs} 
                onAdd={() => setEditingCandidate({})} 
                onEdit={(c) => setEditingCandidate(c)}
                onDelete={(id) => handleDeleteItem('candidates', id)} 
              />
            )}
            {activeTab === 'settings' && (
              <SettingsPage 
                 companies={companies} onAddCompany={(n) => handleAddAux('companies', n)} onDelCompany={(id) => handleDeleteItem('companies', id)}
                 cities={cities} onAddCity={(n) => handleAddAux('cities', n)} onDelCity={(id) => handleDeleteItem('cities', id)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {isJobModalOpen && (
        <JobModal 
          isOpen={isJobModalOpen} 
          onClose={() => setIsJobModalOpen(false)} 
          onSave={handleSaveJob} 
          companies={companies} 
          cities={cities} 
          isSaving={isSaving} 
        />
      )}
      {editingCandidate && (
        <CandidateModal 
           candidate={editingCandidate} 
           onClose={() => setEditingCandidate(null)} 
           onSave={handleSaveCandidate} 
           jobs={jobs} 
           cities={cities} 
           isSaving={isSaving} 
        />
      )}
    </div>
  );
}

// --- SUB-COMPONENTS (Adapted for Young Talents Identity) ---

const Dashboard = ({ filteredJobs, filteredCandidates }) => {
  const activeJobs = filteredJobs.filter(j => j.status === 'Aberta').length;
  const hired = filteredCandidates.filter(c => c.status === 'Contratado').length;
  const stageData = PIPELINE_STAGES.map(s => ({ name: s, count: filteredCandidates.filter(c => c.status === s).length }));
  const jobData = [{ name: 'Abertas', value: activeJobs }, { name: 'Fechadas', value: filteredJobs.length - activeJobs }];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-white">Visão Geral</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Vagas Ativas" value={activeJobs} icon={Briefcase} color="text-brand-orange" bg="bg-brand-orange/10" />
        <StatCard label="Total Talentos" value={filteredCandidates.length} icon={Users} color="text-brand-cyan" bg="bg-brand-cyan/10" />
        <StatCard label="Em Processo" value={filteredCandidates.filter(c => c.status !== 'Inscrito' && c.status !== 'Contratado').length} icon={FileText} color="text-purple-400" bg="bg-purple-500/10" />
        <StatCard label="Contratados" value={hired} icon={CheckCircle} color="text-green-400" bg="bg-green-500/10" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-brand-card p-6 rounded-xl shadow-lg border border-brand-border h-80">
          <h3 className="font-bold mb-4 text-white">Funil de Seleção</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
              <YAxis fontSize={12} stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }} cursor={{fill: '#334155'}} />
              <Bar dataKey="count" fill="#fe5009" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-brand-card p-6 rounded-xl shadow-lg border border-brand-border h-80">
          <h3 className="font-bold mb-4 text-white">Status das Vagas</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={jobData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                {jobData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, bg }) => (
  <div className="bg-brand-card p-6 rounded-xl shadow-lg border border-brand-border flex items-center gap-4 hover:border-brand-cyan/50 transition-colors">
    <div className={`p-3 rounded-lg ${bg}`}><Icon className={`w-6 h-6 ${color}`} /></div>
    <div><p className="text-sm text-slate-400 font-medium">{label}</p><p className="text-2xl font-bold text-white">{value}</p></div>
  </div>
);

// Pipeline (Kanban)
const Pipeline = ({ candidates, jobs, onDragEnd, onEdit }) => {
  const [draggedId, setDraggedId] = useState(null);
  const handleDragStart = (e, id) => { setDraggedId(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDrop = (e, stage) => { e.preventDefault(); if (draggedId) { onDragEnd(draggedId, stage); setDraggedId(null); } };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex-1 overflow-x-auto pb-2 custom-scrollbar">
        <div className="flex gap-4 min-w-[1200px] h-full">
          {PIPELINE_STAGES.map(stage => (
            <div 
              key={stage} 
              className="flex-1 flex flex-col bg-brand-card/50 rounded-xl p-2 min-w-[280px] border border-brand-border"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <div className="font-semibold text-slate-200 mb-3 px-2 flex justify-between items-center bg-brand-hover p-2 rounded">
                {stage} 
                <span className="bg-brand-orange text-white px-2 py-0.5 rounded-full text-xs font-bold">{candidates.filter(c => c.status === stage).length}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {candidates.filter(c => c.status === stage).map(c => {
                  const job = jobs.find(j => j.id === c.jobId);
                  return (
                    <div 
                      key={c.id} 
                      draggable 
                      onDragStart={(e) => handleDragStart(e, c.id)}
                      onClick={() => onEdit(c)}
                      className="bg-brand-card p-3 rounded-lg shadow-sm border border-brand-border hover:border-brand-cyan cursor-grab active:cursor-grabbing transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                             {c.photoUrl ? <img src={c.photoUrl} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs">{c.fullName?.charAt(0)}</div>}
                             <p className="font-bold text-slate-200 text-sm">{c.fullName}</p>
                        </div>
                        <button className="text-slate-500 hover:text-brand-orange opacity-0 group-hover:opacity-100"><Edit3 size={14} /></button>
                      </div>
                      <p className="text-xs text-brand-cyan bg-brand-cyan/10 inline-block px-1.5 py-0.5 rounded mb-2 font-medium truncate max-w-full">
                        {job?.title || 'Sem Vaga'}
                      </p>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin size={10} /> {c.city || 'N/A'} • {c.age ? `${c.age} anos` : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const JobsList = ({ jobs, candidates, onAdd, onDelete, onFilterPipeline }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-white">Vagas</h2><button onClick={onAdd} className="bg-brand-orange text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-600 transition-colors"><Plus size={18}/> Nova Vaga</button></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {jobs.map(job => {
        const appCount = candidates.filter(c => c.jobId === job.id).length;
        return (
          <div key={job.id} className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-lg flex flex-col group hover:border-brand-orange/50 transition-colors">
            <div className="flex justify-between mb-4"><div className="p-2 bg-brand-dark rounded-lg"><Briefcase className="text-brand-orange" size={24}/></div><span className="text-xs bg-brand-cyan/20 text-brand-cyan px-2 py-1 rounded-full h-fit">{job.status}</span></div>
            <h3 className="font-bold text-lg mb-1 text-white">{job.title}</h3>
            <p className="text-sm text-slate-400 mb-4">{job.company}</p>
            <div className="text-sm text-slate-500 space-y-1 mb-4 flex-1">
              <p className="flex items-center gap-2"><MapPin size={14}/> {job.location}</p>
              <p className="flex items-center gap-2 font-medium text-brand-cyan"><Users size={14}/> {appCount} Candidatos</p>
            </div>
            <div className="flex justify-between items-center border-t border-brand-border pt-4">
              <button onClick={() => onFilterPipeline(job.id)} className="text-brand-orange text-sm font-medium hover:underline flex items-center gap-1">Ver Pipeline <ChevronRight size={14}/></button>
              <button onClick={() => onDelete(job.id)} className="text-red-400 text-xs hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">Excluir</button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const CandidatesList = ({ candidates, jobs, onAdd, onEdit, onDelete }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-white">Banco de Talentos</h2><button onClick={onAdd} className="bg-brand-cyan text-brand-dark font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-cyan-400 transition-colors"><UserPlus size={18}/> Adicionar Talento</button></div>
    <div className="bg-brand-card rounded-xl border border-brand-border shadow-lg overflow-hidden">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="bg-brand-hover text-slate-200 font-medium"><tr><th className="px-6 py-4">Nome</th><th className="px-6 py-4">Vaga</th><th className="px-6 py-4">Cidade</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Ações</th></tr></thead>
        <tbody className="divide-y divide-brand-border">
          {candidates.map(c => (
            <tr key={c.id} className="hover:bg-brand-hover/50 cursor-pointer transition-colors" onClick={() => onEdit(c)}>
              <td className="px-6 py-4 font-medium flex items-center gap-3">
                 {c.photoUrl && <img src={c.photoUrl} className="w-8 h-8 rounded-full object-cover" />}
                 <div>{c.fullName}<div className="text-xs text-slate-500 font-normal">{c.email}</div></div>
              </td>
              <td className="px-6 py-4">{jobs.find(j => j.id === c.jobId)?.title || <span className="text-slate-600 italic">Banco Geral</span>}</td>
              <td className="px-6 py-4">{c.city}</td>
              <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs border ${STATUS_COLORS[c.status] || 'bg-slate-700 text-white'}`}>{c.status}</span></td>
              <td className="px-6 py-4 text-right">
                <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }} className="text-slate-500 hover:text-red-500 p-1"><Trash2 size={16}/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const SettingsPage = ({ companies, onAddCompany, onDelCompany, cities, onAddCity, onDelCity }) => {
  const [co, setCo] = useState(''); const [ci, setCi] = useState('');
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white">Configurações</h2>
      <div className="grid md:grid-cols-2 gap-8">
        <ConfigBox title="Empresas" icon={Building2} items={companies} val={co} setVal={setCo} onAdd={onAddCompany} onDel={onDelCompany} placeholder="Nova Empresa..." />
        <ConfigBox title="Cidades" icon={MapPin} items={cities} val={ci} setVal={setCi} onAdd={onAddCity} onDel={onDelCity} placeholder="Nova Cidade..." />
      </div>
    </div>
  );
};

const ConfigBox = ({ title, icon: Icon, items, val, setVal, onAdd, onDel, placeholder }) => (
  <div className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-lg">
    <h3 className="font-bold flex items-center gap-2 mb-4 text-white"><Icon className="text-brand-cyan"/> {title}</h3>
    <div className="flex gap-2 mb-4"><input value={val} onChange={e => setVal(e.target.value)} className="bg-brand-dark border border-brand-border p-2 rounded flex-1 text-sm outline-none focus:border-brand-orange text-white" placeholder={placeholder} /><button onClick={() => { if(val) { onAdd(val); setVal(''); } }} className="bg-brand-orange text-white px-4 rounded text-sm hover:bg-orange-600">Add</button></div>
    <ul className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">{items.map(i => <li key={i.id} className="flex justify-between bg-brand-dark p-2 rounded text-sm text-slate-300 border border-brand-border">{i.name} <button onClick={() => onDel(i.id)} className="text-red-400 hover:text-red-500"><X size={14}/></button></li>)}</ul>
  </div>
);

// --- MODALS ---

const JobModal = ({ onClose, onSave, companies, cities, isSaving }) => {
  const [d, setD] = useState({ title: '', company: '', location: '', roleType: 'Tempo Integral' });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="bg-brand-card rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border border-brand-border text-white">
        <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center"><h3 className="font-bold text-lg">Nova Vaga</h3><button onClick={onClose}><X size={20}/></button></div>
        <div className="p-6 space-y-4">
          <input className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white" placeholder="Título do Cargo" value={d.title} onChange={e => setD({...d, title: e.target.value})} />
          <select className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white" value={d.company} onChange={e => setD({...d, company: e.target.value})}><option value="">Empresa</option>{companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
          <select className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white" value={d.location} onChange={e => setD({...d, location: e.target.value})}><option value="">Cidade</option>{cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
        </div>
        <div className="px-6 py-4 bg-brand-dark/50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white rounded">Cancelar</button>
          <button onClick={() => onSave(d)} disabled={isSaving || !d.title} className="bg-brand-orange text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-orange-600 disabled:opacity-50">
            {isSaving && <Loader2 size={16} className="animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

// ** NEW CANDIDATE MODAL WITH ALL FIELDS **
const CandidateModal = ({ candidate, onClose, onSave, jobs, isSaving }) => {
  const initial = {
    fullName: '', photoUrl: '', birthDate: '', age: '', email: '', phone: '', city: '',
    interestAreas: '', education: '', experience: '', courses: '', freeField: '',
    schoolingLevel: '', maritalStatus: '', hasLicense: '', institution: '',
    source: '', typeOfApp: 'Banco de Talentos', jobId: '',
    references: '', certifications: '', cvUrl: '', portfolioUrl: '',
    graduationDate: '', canRelocate: '', isStudying: '', salaryExpectation: '',
    childrenCount: '', referral: '',
    status: 'Inscrito', firstInterviewDate: '', testData: '', secondInterviewDate: '', feedback: ''
  };

  const [d, setD] = useState(candidate?.id ? { ...initial, ...candidate } : initial);
  const [activeSection, setActiveSection] = useState('pessoal'); // pessoal, profissional, processo

  // Helper Inputs
  const Input = ({ label, field, type="text", placeholder="" }) => (
    <div className="mb-3">
       <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">{label}</label>
       <input type={type} className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white focus:border-brand-orange outline-none transition-colors" placeholder={placeholder} value={d[field]} onChange={e => setD({...d, [field]: e.target.value})} />
    </div>
  );

  const TextArea = ({ label, field, placeholder="" }) => (
    <div className="mb-3">
       <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">{label}</label>
       <textarea className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white h-24 focus:border-brand-orange outline-none" placeholder={placeholder} value={d[field]} onChange={e => setD({...d, [field]: e.target.value})} />
    </div>
  );

  const Select = ({ label, field, options }) => (
    <div className="mb-3">
       <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">{label}</label>
       <select className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white focus:border-brand-orange outline-none" value={d[field]} onChange={e => setD({...d, [field]: e.target.value})}>
          <option value="">Selecione...</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
       </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-brand-card rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-brand-border text-white">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center bg-brand-dark/50">
          <div>
             <h3 className="font-bold text-xl text-white">{candidate?.id ? 'Editar Talento' : 'Novo Talento'}</h3>
             <p className="text-xs text-brand-orange">ID: {candidate?.id || 'Gerado ao salvar'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24}/></button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-brand-border">
          {['pessoal', 'profissional', 'processo'].map(tab => (
             <button 
                key={tab} 
                onClick={() => setActiveSection(tab)}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${activeSection === tab ? 'text-brand-orange border-b-2 border-brand-orange bg-brand-orange/5' : 'text-slate-500 hover:text-slate-300'}`}
             >
                {tab}
             </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-brand-dark">
          
          {/* SEÇÃO PESSOAL */}
          {activeSection === 'pessoal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 flex items-center gap-4 mb-4 bg-brand-card p-4 rounded-xl border border-brand-border">
                 <div className="w-20 h-20 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center border-2 border-brand-orange">
                    {d.photoUrl ? <img src={d.photoUrl} className="w-full h-full object-cover" /> : <Users size={32} className="text-slate-500"/>}
                 </div>
                 <div className="flex-1">
                    <Input label="URL da Foto" field="photoUrl" placeholder="https://..." />
                 </div>
              </div>
              
              <Input label="Nome Completo" field="fullName" />
              <div className="grid grid-cols-2 gap-4">
                 <Input label="Data de Nascimento" field="birthDate" type="date" />
                 <Input label="Idade" field="age" type="number" />
              </div>
              <Input label="E-mail Principal" field="email" type="email" />
              <Input label="Celular / WhatsApp" field="phone" />
              <Input label="Cidade onde Reside" field="city" />
              <Input label="Estado Civil" field="maritalStatus" />
              <Select label="Possui CNH B?" field="hasLicense" options={['Sim', 'Não', 'Em processo']} />
              <Input label="Filhos (Quantos?)" field="childrenCount" />
            </div>
          )}

          {/* SEÇÃO PROFISSIONAL */}
          {activeSection === 'profissional' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="md:col-span-2">
                 <TextArea label="Campo Livre (Seja Você!)" field="freeField" placeholder="Fale um pouco sobre quem você é..." />
               </div>
               
               <Input label="Formação Acadêmica" field="education" />
               <Input label="Nível de Escolaridade" field="schoolingLevel" />
               <Input label="Instituição de Ensino" field="institution" />
               <Input label="Data de Formatura" field="graduationDate" type="date" />
               <Select label="Cursando Superior?" field="isStudying" options={['Sim', 'Não', 'Trancado']} />
               
               <div className="md:col-span-2">
                 <TextArea label="Áreas de Interesse" field="interestAreas" />
                 <TextArea label="Experiências Anteriores" field="experience" />
                 <TextArea label="Cursos e Certificações" field="courses" />
               </div>

               <Input label="Link Currículo (Drive/LinkedIn)" field="cvUrl" />
               <Input label="Link Portfólio" field="portfolioUrl" />
               <Input label="Expectativa Salarial" field="salaryExpectation" />
               <Select label="Disponibilidade Mudança?" field="canRelocate" options={['Sim', 'Não', 'A conversar']} />
            </div>
          )}

          {/* SEÇÃO PROCESSO */}
          {activeSection === 'processo' && (
            <div className="space-y-6">
              <div className="bg-brand-card p-4 rounded-xl border border-brand-border">
                 <label className="block text-xs font-bold text-brand-orange uppercase mb-3">Controle de Vaga</label>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Tipo de Candidatura</label>
                      <select className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white" value={d.typeOfApp} onChange={e => setD({...d, typeOfApp: e.target.value})}>
                        <option>Banco de Talentos</option>
                        <option>Vaga Específica</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Vaga Vinculada</label>
                      <select className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white" value={d.jobId} onChange={e => setD({...d, jobId: e.target.value})}>
                        <option value="">Sem Vínculo (Apenas Banco)</option>
                        {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Etapa Atual</label>
                      <select className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white font-bold" value={d.status} onChange={e => setD({...d, status: e.target.value})}>
                        {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        <option value="Reprovado">Reprovado</option>
                      </select>
                    </div>
                    <Input label="Origem (Onde encontrou?)" field="source" />
                    <Input label="Indicação (Quem?)" field="referral" />
                 </div>
              </div>

              <div className="bg-brand-card p-4 rounded-xl border border-brand-border">
                 <label className="block text-xs font-bold text-brand-cyan uppercase mb-3">Histórico do Processo</label>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Data 1ª Entrevista" field="firstInterviewDate" type="datetime-local" />
                    <Input label="Data 2ª Entrevista" field="secondInterviewDate" type="datetime-local" />
                    <div className="md:col-span-2">
                       <TextArea label="Dados dos Testes" field="testData" placeholder="Resultados de testes técnicos ou comportamentais..." />
                       <TextArea label="Feedback / Anotações" field="feedback" />
                    </div>
                 </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-brand-card border-t border-brand-border flex justify-between items-center">
          <p className="text-xs text-slate-500 italic">* Campos obrigatórios: Nome</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-6 py-2 text-slate-400 hover:text-white rounded-lg transition-colors">Cancelar</button>
            <button onClick={() => onSave(d)} disabled={isSaving || !d.fullName} className="bg-gradient-to-r from-brand-orange to-orange-600 text-white px-8 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 disabled:opacity-50 shadow-lg shadow-brand-orange/20 transition-all">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Dados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};