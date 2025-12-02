import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Briefcase, Settings, Plus, Search, 
  FileText, MapPin, ChevronRight, CheckCircle, Filter, 
  UserPlus, Trophy, Menu, X, LogOut, Lock, Loader2, Edit3, Trash2,
  Building2, Tag, Mail, Save, AlertTriangle, UploadCloud, 
  Calendar, Phone, DollarSign, SortAsc, SortDesc, Eye, CheckSquare, XSquare
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
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

// --- CONSTANTES ---

const PIPELINE_STAGES = ['Inscrito', 'Considerado', 'Primeira Entrevista', 'Testes', 'Segunda Entrevista', 'Selecionado', 'Contratado', 'Reprovado'];

const STATUS_COLORS = {
  'Inscrito': 'bg-slate-700 text-slate-200 border-slate-600',
  'Considerado': 'bg-blue-900/40 text-blue-300 border-blue-700',
  'Primeira Entrevista': 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/30',
  'Testes': 'bg-purple-900/40 text-purple-300 border-purple-700',
  'Segunda Entrevista': 'bg-brand-orange/20 text-brand-orange border-brand-orange/30',
  'Selecionado': 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  'Contratado': 'bg-green-900/40 text-green-300 border-green-700',
  'Reprovado': 'bg-red-900/40 text-red-300 border-red-700'
};

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

// 1. Modal de Transição (Com Dropdowns Vinculados)
const TransitionModal = ({ transition, onClose, onConfirm, cities }) => {
  const [data, setData] = useState({ feedback: '', returnSent: false, ...transition.candidate });
  
  const handleSave = () => {
    if (transition.isConclusion && !data.feedback) { alert("O feedback é obrigatório."); return; }
    onConfirm(data);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-brand-card rounded-xl shadow-2xl w-full max-w-md border border-brand-orange animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center bg-brand-orange/10">
          <h3 className="font-bold text-white flex items-center gap-2"><AlertTriangle size={20} className="text-brand-orange" /> Movimentação</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-white" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-300">Preencha para mover <strong>{transition.candidate.fullName}</strong> para <strong>{transition.toStage}</strong>:</p>
          
          {transition.missingFields.map(field => (
            <div key={field}>
              <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">{field === 'city' ? 'Cidade' : field}</label>
              
              {/* LÓGICA DE VÍNCULO (Item 3) */}
              {field === 'city' ? (
                 <select className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white text-sm" value={data.city || ''} onChange={e => setData({...data, city: e.target.value})}>
                    <option value="">Selecione a Cidade...</option>
                    {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                 </select>
              ) : field === 'hasLicense' ? (
                 <select className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white text-sm" value={data.hasLicense || ''} onChange={e => setData({...data, hasLicense: e.target.value})}>
                    <option value="">Selecione...</option><option value="Sim">Sim</option><option value="Não">Não</option>
                 </select>
              ) : (
                <input className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white text-sm" value={data[field] || ''} onChange={e => setData({...data, [field]: e.target.value})} />
              )}
            </div>
          ))}

          {transition.isConclusion && (
            <div className="space-y-4 pt-2 border-t border-brand-border">
               <div><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Feedback</label><textarea className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white text-sm h-24" value={data.feedback} onChange={e => setData({...data, feedback: e.target.value})} /></div>
               <div className="flex items-center gap-2 bg-brand-dark p-3 rounded border border-brand-border"><input type="checkbox" className="w-4 h-4 accent-brand-orange" checked={data.returnSent} onChange={e => setData({...data, returnSent: e.target.checked})} /><label className="text-sm text-white">Retorno (feedback) enviado ao candidato.</label></div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-brand-dark/50 flex justify-end gap-2 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white rounded text-sm">Cancelar</button>
          <button onClick={handleSave} className="bg-brand-orange text-white px-4 py-2 rounded text-sm font-bold hover:bg-orange-600 flex items-center gap-2"><Save size={16} /> Salvar</button>
        </div>
      </div>
    </div>
  );
};

// 2. Configurações
const ConfigBox = ({ title, icon: Icon, items, val, setVal, onAdd, onDel, placeholder = "Novo..." }) => (
  <div className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-lg">
    <h3 className="font-bold flex items-center gap-2 mb-4 text-white"><Icon className="text-brand-cyan"/> {title}</h3>
    <div className="flex gap-2 mb-4">
      <input value={val} onChange={e => setVal(e.target.value)} className="bg-brand-dark border border-brand-border p-2 rounded flex-1 text-sm outline-none focus:border-brand-orange text-white" placeholder={placeholder} onKeyDown={(e) => e.key === 'Enter' && onAdd()} />
      <button onClick={onAdd} className="bg-brand-orange text-white px-3 rounded text-sm hover:bg-orange-600"><Plus size={18}/></button>
    </div>
    <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
      {items.map(i => <li key={i.id} className="flex justify-between items-center bg-brand-dark p-2 rounded text-sm text-slate-300 border border-brand-border group mb-1">{i.name} <button onClick={() => onDel(i.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button></li>)}
    </ul>
  </div>
);

const SettingsPage = ({ companies, onAddCompany, onDelCompany, cities, onAddCity, onDelCity, interestAreas, onAddInterest, onDelInterest, roles, onAddRole, onDelRole, onImportCSV, isImporting }) => (
  <div className="space-y-8 pb-10">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-white">Configurações</h2>
      <div className="relative">
         <input type="file" accept=".csv" onChange={onImportCSV} id="csvUpload" className="hidden" disabled={isImporting} />
         <label htmlFor="csvUpload" className={`cursor-pointer bg-brand-cyan text-brand-dark font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-cyan-400 transition-colors ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
           {isImporting ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />} {isImporting ? 'Importando...' : 'Importar CSV (Backup)'}
         </label>
      </div>
    </div>
    <div className="grid md:grid-cols-2 gap-6">
      <ConfigBox title="Empresas" icon={Building2} items={companies} val={companies.val} setVal={companies.setVal} onAdd={companies.onAdd} onDel={onDelCompany} />
      <ConfigBox title="Cidades" icon={MapPin} items={cities} val={cities.val} setVal={cities.setVal} onAdd={cities.onAdd} onDel={onDelCity} />
      <ConfigBox title="Áreas Interesse" icon={Tag} items={interestAreas} val={interestAreas.val} setVal={interestAreas.setVal} onAdd={interestAreas.onAdd} onDel={onDelInterest} />
      <ConfigBox title="Cargos" icon={Briefcase} items={roles} val={roles.val} setVal={roles.setVal} onAdd={roles.onAdd} onDel={onDelRole} />
    </div>
  </div>
);

// 3. Login
const LoginScreen = ({ onLogin, error }) => (
  <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
    <div className="bg-brand-card rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-brand-border">
      <div className="w-20 h-20 bg-gradient-to-br from-brand-orange to-brand-cyan rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-orange/20"><Trophy size={40} className="text-white" /></div>
      <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Young Talents</h1>
      {error && <div className="bg-red-900/20 text-red-400 p-3 rounded-lg text-sm mb-6 flex items-center justify-center border border-red-900/50"><Lock size={16} className="mr-2"/>{error}</div>}
      <button onClick={onLogin} className="w-full bg-white text-brand-dark font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-100 transition-all"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" /> Entrar com Google</button>
    </div>
  </div>
);

// 4. Modal de Candidato Completo (Vínculo de Propriedades)
const CandidateModal = ({ candidate, onClose, onSave, jobs, cities, roles, interestAreas, isSaving }) => {
  const [d, setD] = useState({ ...candidate });
  const [activeSection, setActiveSection] = useState('pessoal');

  const standardFields = ['id', 'fullName', 'photoUrl', 'birthDate', 'age', 'email', 'phone', 'city', 'maritalStatus', 'hasLicense', 'childrenCount', 'freeField', 'education', 'schoolingLevel', 'institution', 'interestAreas', 'experience', 'cvUrl', 'portfolioUrl', 'jobId', 'status', 'source', 'referral', 'feedback', 'createdAt', 'imported', 'typeOfApp', 'salaryExpectation', 'canRelocate', 'courses', 'graduationDate', 'isStudying', 'references', 'firstInterviewDate', 'secondInterviewDate', 'testData', 'sheetId', 'original_timestamp'];
  const extraFields = Object.keys(d).filter(key => !standardFields.includes(key));

  const Input = ({ label, field, type="text" }) => (
    <div className="mb-3"><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">{label}</label><input type={type} className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white focus:border-brand-orange outline-none" value={d[field]||''} onChange={e => setD({...d, [field]: e.target.value})} /></div>
  );
  const TextArea = ({ label, field }) => (
    <div className="mb-3"><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">{label}</label><textarea className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white h-24 focus:border-brand-orange outline-none" value={d[field]||''} onChange={e => setD({...d, [field]: e.target.value})} /></div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-brand-card rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-brand-border text-white">
        <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center bg-brand-dark/50">
          <div><h3 className="font-bold text-xl">{d.id ? 'Ficha do Candidato' : 'Novo Talento'}</h3><p className="text-xs text-brand-orange">ID: {d.id || 'Novo'}</p></div>
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
              
              {/* Vínculo com Cidades */}
              <div className="mb-3"><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Cidade</label><select className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white" value={d.city||''} onChange={e => setD({...d, city: e.target.value})}><option value="">Selecione...</option>{cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
              
              <div className="grid grid-cols-2 gap-4"><Input label="Estado Civil" field="maritalStatus" /><Input label="Filhos" field="childrenCount" /></div>
              <div className="mb-3"><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Possui CNH?</label><select className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white" value={d.hasLicense||''} onChange={e => setD({...d, hasLicense: e.target.value})}><option value="">Selecione</option><option value="Sim">Sim</option><option value="Não">Não</option></select></div>
            </div>
          )}
          {activeSection === 'profissional' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="md:col-span-2"><TextArea label="Resumo / Bio" field="freeField" /></div>
               <Input label="Formação" field="education" />
               <Input label="Nível Escolaridade" field="schoolingLevel" />
               <Input label="Instituição" field="institution" />
               <div className="grid grid-cols-2 gap-4"><Input label="Formatura" field="graduationDate" /><Input label="Cursando?" field="isStudying" /></div>
               
               {/* Vínculo com Áreas de Interesse */}
               <div className="md:col-span-2 mb-3"><label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Área de Interesse Principal</label><select className="w-full bg-brand-dark border border-brand-border p-2.5 rounded-lg text-sm text-white" value={d.interestAreas||''} onChange={e => setD({...d, interestAreas: e.target.value})}><option value="">Selecione...</option>{interestAreas.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}</select></div>
               
               <div className="md:col-span-2"><TextArea label="Experiência Anterior" field="experience" /><TextArea label="Cursos e Certificações" field="courses" /></div>
               <Input label="Link Currículo" field="cvUrl" />
               <Input label="Link Portfólio" field="portfolioUrl" />
            </div>
          )}
          {activeSection === 'processo' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div><label className="block text-xs text-slate-400 mb-1">Vaga</label><select className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white" value={d.jobId||''} onChange={e => setD({...d, jobId: e.target.value})}><option value="">Banco Geral</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select></div>
                 <div><label className="block text-xs text-slate-400 mb-1">Status</label><select className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white font-bold" value={d.status} onChange={e => setD({...d, status: e.target.value})}>{PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                 <Input label="Origem" field="source" />
                 <Input label="Indicação" field="referral" />
                 <Input label="Pretensão Salarial" field="salaryExpectation" />
                 <Input label="Disponibilidade Mudança" field="canRelocate" />
              </div>
              <div className="bg-brand-card p-4 rounded-xl border border-brand-border">
                 <h4 className="text-brand-orange font-bold text-sm mb-4">Histórico</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <Input label="Data 1ª Entrevista" field="firstInterviewDate" type="datetime-local" />
                    <Input label="Data 2ª Entrevista" field="secondInterviewDate" type="datetime-local" />
                 </div>
                 <TextArea label="Dados dos Testes" field="testData" />
                 <TextArea label="Feedback" field="feedback" />
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

  // Config Inputs State (Local para a SettingsPage mas elevado para controle)
  const [configInputs, setConfigInputs] = useState({ company: '', city: '', interest: '', role: '' });

  // UI
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [editingJob, setEditingJob] = useState(null); // Item 5: Edição de Vaga
  const [pendingTransition, setPendingTransition] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Filtros Avançados (Item 4)
  const [filters, setFilters] = useState({ 
    period: 'all', company: 'all', jobId: 'all', city: 'all', 
    interestArea: 'all', search: '',
    sort: 'date_desc', // Item 7: Ordenação
    marital: 'all', cnh: 'all' // Item 4: Novos Filtros
  });

  // Auth
  useEffect(() => { return onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); }); }, []);
  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { console.error(e); } };

  // Data Sync
  useEffect(() => {
    if (!user) return;
    const unsubs = [
      onSnapshot(query(collection(db, 'jobs'), orderBy('createdAt', 'desc')), s => setJobs(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'candidates'), orderBy('createdAt', 'desc')), s => setCandidates(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'companies'), orderBy('name')), s => setCompanies(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'cities'), orderBy('name')), s => setCities(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'interest_areas'), orderBy('name')), s => setInterestAreas(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, 'roles'), orderBy('name')), s => setRoles(s.docs.map(d => ({id:d.id, ...d.data()})))),
    ];
    return () => unsubs.forEach(u => u());
  }, [user]);

  // Filtros e Ordenação (Item 4 e 7)
  const filteredData = useMemo(() => {
    let list = [...candidates]; // Copia para ordenar
    let fJobs = jobs;

    // Filtros de Vagas
    if (filters.company !== 'all') fJobs = fJobs.filter(j => j.company === filters.company);
    if (filters.city !== 'all') fJobs = fJobs.filter(j => j.location === filters.city);

    // Filtros de Candidatos
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(c => c.fullName?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s));
    }
    if (filters.jobId !== 'all') list = list.filter(c => c.jobId === filters.jobId);
    if (filters.city !== 'all') list = list.filter(c => c.city === filters.city);
    if (filters.interestArea !== 'all') list = list.filter(c => c.interestAreas?.includes(filters.interestArea));
    if (filters.cnh !== 'all') list = list.filter(c => c.hasLicense === filters.cnh);
    if (filters.marital !== 'all') list = list.filter(c => c.maritalStatus === filters.marital);
    
    if (filters.period !== 'all') {
      const days = parseInt(filters.period);
      const now = new Date();
      list = list.filter(c => {
        if (!c.createdAt) return false;
        const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return Math.ceil(Math.abs(now - date) / (86400000)) <= days;
      });
    }

    // Ordenação (Item 7)
    list.sort((a, b) => {
      if (filters.sort === 'date_desc') return (new Date(b.createdAt||0) - new Date(a.createdAt||0));
      if (filters.sort === 'date_asc') return (new Date(a.createdAt||0) - new Date(b.createdAt||0));
      if (filters.sort === 'alpha_asc') return a.fullName?.localeCompare(b.fullName);
      if (filters.sort === 'alpha_desc') return b.fullName?.localeCompare(a.fullName);
      return 0;
    });

    return { jobs: fJobs, candidates: list };
  }, [jobs, candidates, filters]);

  // Actions
  const handleDragEnd = (cId, newStage) => {
    const candidate = candidates.find(c => c.id === cId);
    if (!candidate || candidate.status === newStage) return;
    const isConclusion = ['Selecionado', 'Contratado', 'Reprovado'].includes(newStage);
    const missing = []; 
    if (PIPELINE_STAGES.indexOf(newStage) > 1 && !candidate.city) missing.push('city'); 
    
    if (missing.length > 0 || isConclusion) setPendingTransition({ candidate, toStage: newStage, missingFields: missing, isConclusion });
    else updateDoc(doc(db, 'candidates', cId), { status: newStage });
  };

  const confirmTransition = async (d) => {
    if (!pendingTransition) return;
    setIsSaving(true);
    try { await updateDoc(doc(db, 'candidates', pendingTransition.candidate.id), { ...d, status: pendingTransition.toStage }); setPendingTransition(null); } 
    catch(e) { alert("Erro"); } finally { setIsSaving(false); }
  };

  const handleSaveCandidate = async (d) => {
    setIsSaving(true);
    try {
      if (d.id) await updateDoc(doc(db, 'candidates', d.id), d);
      else await addDoc(collection(db, 'candidates'), { ...d, createdAt: serverTimestamp() });
      setEditingCandidate(null);
    } catch(e) { alert("Erro"); } finally { setIsSaving(false); }
  };

  // Item 5: Salvar/Editar Vaga
  const handleSaveJob = async (d) => {
    setIsSaving(true);
    try {
      if (d.id) await updateDoc(doc(db, 'jobs', d.id), d);
      else await addDoc(collection(db, 'jobs'), { ...d, status: 'Aberta', createdAt: serverTimestamp(), createdBy: user.email });
      setIsJobModalOpen(false); setEditingJob(null);
    } catch (e) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  const handleAddAux = async (col, name) => { if(name.trim()) await addDoc(collection(db, col), { name }); };
  const handleDeleteItem = async (col, id) => { if(confirm('Excluir?')) await deleteDoc(doc(db, col, id)); };

  if (authLoading) return <div className="min-h-screen bg-brand-dark flex items-center justify-center text-brand-cyan"><Loader2 className="animate-spin mr-2"/> Carregando...</div>;
  if (!user) return <LoginScreen onLogin={handleGoogleLogin} />;

  // Config Handlers Wrappers
  const configHandlers = {
    companies: { val: configInputs.company, setVal: v=>setConfigInputs({...configInputs, company:v}), onAdd: n=>handleAddAux('companies', n) },
    cities: { val: configInputs.city, setVal: v=>setConfigInputs({...configInputs, city:v}), onAdd: n=>handleAddAux('cities', n) },
    interestAreas: { val: configInputs.interest, setVal: v=>setConfigInputs({...configInputs, interest:v}), onAdd: n=>handleAddAux('interest_areas', n) },
    roles: { val: configInputs.role, setVal: v=>setConfigInputs({...configInputs, role:v}), onAdd: n=>handleAddAux('roles', n) }
  };

  return (
    <div className="flex min-h-screen bg-brand-dark font-sans text-slate-200">
      <div className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-brand-card border-r border-brand-border transform transition-transform duration-200 ${isSidebarOpen?'translate-x-0':'-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        <div className="p-6 border-b border-brand-border flex items-center justify-between"><div className="flex items-center gap-2 font-bold text-xl text-white"><Trophy size={18} className="text-brand-orange"/> Young Talents</div><button onClick={()=>setIsSidebarOpen(false)} className="lg:hidden"><X/></button></div>
        <nav className="flex-1 p-4 space-y-1">{[{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'pipeline', label: 'Pipeline', icon: Filter }, { id: 'jobs', label: 'Vagas', icon: Briefcase }, { id: 'candidates', label: 'Candidatos', icon: Users }, { id: 'settings', label: 'Configurações', icon: Settings }].map(i => (
          <button key={i.id} onClick={() => { setActiveTab(i.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === i.id ? 'bg-brand-orange text-white' : 'text-slate-400 hover:bg-brand-hover'}`}><i.icon size={18}/> {i.label}</button>
        ))}</nav>
        <div className="p-4 border-t border-brand-border bg-brand-dark/30 flex items-center justify-between"><div className="text-xs truncate max-w-[120px]">{user.email}</div><button onClick={()=>signOut(auth)}><LogOut size={16} className="text-red-400"/></button></div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="lg:hidden p-4 bg-brand-card flex justify-between border-b border-brand-border"><button onClick={()=>setIsSidebarOpen(true)}><Menu/></button><span>Young Talents</span><div/></div>
        
        {/* BARRA DE FILTROS SUPERIOR (Item 4 e 7) */}
        <div className="bg-brand-card border-b border-brand-border px-6 py-4 flex flex-wrap gap-4 items-center justify-between shadow-sm z-10">
           <div className="flex flex-wrap gap-2 w-full lg:w-auto items-center">
              <div className="relative w-full md:w-64"><Search className="absolute left-3 top-2.5 text-slate-400" size={16}/><input placeholder="Buscar nome, email..." className="pl-9 pr-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-sm w-full outline-none focus:border-brand-cyan text-white" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})}/></div>
              
              <select className="bg-brand-dark border border-brand-border rounded-lg text-sm px-2 py-2 outline-none text-white max-w-[120px]" value={filters.jobId} onChange={e => setFilters({...filters, jobId: e.target.value})}><option value="all">Vagas</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}</select>
              <select className="bg-brand-dark border border-brand-border rounded-lg text-sm px-2 py-2 outline-none text-white max-w-[120px]" value={filters.city} onChange={e => setFilters({...filters, city: e.target.value})}><option value="all">Cidades</option>{cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
              
              {/* Novos Filtros */}
              <select className="bg-brand-dark border border-brand-border rounded-lg text-sm px-2 py-2 outline-none text-white max-w-[120px]" value={filters.cnh} onChange={e => setFilters({...filters, cnh: e.target.value})}><option value="all">CNH: Todos</option><option value="Sim">Com CNH</option><option value="Não">Sem CNH</option></select>
              <select className="bg-brand-dark border border-brand-border rounded-lg text-sm px-2 py-2 outline-none text-white max-w-[120px]" value={filters.marital} onChange={e => setFilters({...filters, marital: e.target.value})}><option value="all">Est. Civil</option><option value="Solteiro">Solteiro</option><option value="Casado">Casado</option></select>
              
              {/* Ordenação */}
              <select className="bg-brand-dark border border-brand-border rounded-lg text-sm px-2 py-2 outline-none text-white max-w-[120px]" value={filters.sort} onChange={e => setFilters({...filters, sort: e.target.value})}>
                 <option value="date_desc">Recentes</option>
                 <option value="date_asc">Antigos</option>
                 <option value="alpha_asc">A-Z</option>
                 <option value="alpha_desc">Z-A</option>
              </select>
           </div>
           <div className="text-xs font-bold text-brand-cyan border border-brand-cyan/20 px-3 py-1 rounded-full bg-brand-cyan/10 whitespace-nowrap">{filteredData.candidates.length} Talentos • {filteredData.jobs.length} Vagas</div>
        </div>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-brand-dark custom-scrollbar">
          <div className="max-w-[1600px] mx-auto h-full">
            {activeTab === 'dashboard' && <Dashboard filteredJobs={filteredData.jobs} filteredCandidates={filteredData.candidates} />}
            {activeTab === 'pipeline' && <Pipeline candidates={filteredData.candidates} jobs={jobs} onDragEnd={handleDragEnd} onEdit={setEditingCandidate} />}
            {activeTab === 'jobs' && <JobsList jobs={filteredData.jobs} candidates={candidates} onAdd={() => { setEditingJob({}); setIsJobModalOpen(true); }} onEdit={(j) => { setEditingJob(j); setIsJobModalOpen(true); }} onDelete={(id) => handleDeleteItem('jobs', id)} onToggleStatus={handleSaveJob} onFilterPipeline={(id) => { setFilters({...filters, jobId: id}); setActiveTab('pipeline'); }} />}
            {activeTab === 'candidates' && <CandidatesList candidates={filteredData.candidates} jobs={jobs} onAdd={() => setEditingCandidate({})} onEdit={setEditingCandidate} onDelete={(id) => handleDeleteItem('candidates', id)} />}
            {activeTab === 'settings' && <SettingsPage companies={companies} cities={cities} interestAreas={interestAreas} roles={roles} {...configHandlers} onAddCompany={configHandlers.companies.onAdd} onDelCompany={id=>handleDeleteItem('companies', id)} onAddCity={configHandlers.cities.onAdd} onDelCity={id=>handleDeleteItem('cities', id)} onAddInterest={configHandlers.interestAreas.onAdd} onDelInterest={id=>handleDeleteItem('interest_areas', id)} onAddRole={configHandlers.roles.onAdd} onDelRole={id=>handleDeleteItem('roles', id)} onImportCSV={()=>{}} isImporting={false} />}
          </div>
        </main>
      </div>

      {isJobModalOpen && <JobModal isOpen={isJobModalOpen} job={editingJob} onClose={() => { setIsJobModalOpen(false); setEditingJob(null); }} onSave={handleSaveJob} companies={companies} cities={cities} isSaving={isSaving} />}
      {editingCandidate && <CandidateModal candidate={editingCandidate} onClose={() => setEditingCandidate(null)} onSave={handleSaveCandidate} jobs={jobs} cities={cities} roles={roles} interestAreas={interestAreas} isSaving={isSaving} />}
      {pendingTransition && <TransitionModal transition={pendingTransition} onClose={() => setPendingTransition(null)} onConfirm={confirmTransition} cities={cities} />}
    </div>
  );
}

// --- VIEWS ---

const Dashboard = ({ filteredJobs, filteredCandidates }) => {
  const data = PIPELINE_STAGES.filter(s=>s!=='Reprovado').map(s => ({ name: s, count: filteredCandidates.filter(c => c.status === s).length }));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-brand-card p-6 rounded-xl border border-brand-border"><p className="text-slate-400 text-sm">Total Talentos</p><p className="text-2xl font-bold text-brand-cyan">{filteredCandidates.length}</p></div>
        <div className="bg-brand-card p-6 rounded-xl border border-brand-border"><p className="text-slate-400 text-sm">Vagas Abertas</p><p className="text-2xl font-bold text-brand-orange">{filteredJobs.filter(j=>j.status==='Aberta').length}</p></div>
        <div className="bg-brand-card p-6 rounded-xl border border-brand-border"><p className="text-slate-400 text-sm">Contratados</p><p className="text-2xl font-bold text-green-400">{filteredCandidates.filter(c=>c.status==='Contratado').length}</p></div>
      </div>
      <div className="bg-brand-card p-6 rounded-xl border border-brand-border h-80">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#334155"/><XAxis dataKey="name" stroke="#94a3b8" fontSize={10}/><YAxis stroke="#94a3b8"/><Tooltip contentStyle={{backgroundColor:'#1e293b', borderColor:'#475569' }}/><Bar dataKey="count" fill="#fe5009" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
      </div>
    </div>
  );
};

const Pipeline = ({ candidates, jobs, onDragEnd, onEdit }) => {
  const [draggedId, setDraggedId] = useState(null);
  const handleDragStart = (e, id) => { setDraggedId(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDrop = (e, stage) => { e.preventDefault(); if (draggedId) { onDragEnd(draggedId, stage); setDraggedId(null); } };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex gap-4 min-w-max h-full">
          {PIPELINE_STAGES.map(stage => {
            // Normalização: Verifica se status do candidato contem o nome da etapa (ex: "Inscrito" bate com "Inscrito")
            const stageCandidates = candidates.filter(c => (c.status || 'Inscrito') === stage);
            return (
              <div key={stage} className="flex-1 flex flex-col bg-brand-card/50 rounded-xl p-2 min-w-[280px] w-[280px] border border-brand-border" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, stage)}>
                <div className={`font-bold text-slate-200 mb-3 px-2 flex justify-between items-center bg-brand-hover p-2 rounded border-l-4 ${STATUS_COLORS[stage]?.split(' ')[2]||'border-gray-500'}`}>
                  <span className="truncate">{stage}</span><span className="bg-brand-dark px-2 py-0.5 rounded text-xs">{stageCandidates.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {stageCandidates.map(c => (
                    <div key={c.id} draggable onDragStart={(e) => handleDragStart(e, c.id)} onClick={() => onEdit(c)} className="bg-brand-card p-3 rounded-lg border border-brand-border hover:border-brand-cyan cursor-grab active:cursor-grabbing group">
                      <div className="flex justify-between items-start mb-1"><p className="font-bold text-sm truncate">{c.fullName}</p><Edit3 size={14} className="opacity-0 group-hover:opacity-100 text-slate-500"/></div>
                      <p className="text-xs text-brand-cyan mb-2">{jobs.find(j => j.id === c.jobId)?.title || 'Banco Geral'}</p>
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

// Item 5: Vagas com Modo Lista e Edição
const JobsList = ({ jobs, candidates, onAdd, onEdit, onDelete, onToggleStatus, onFilterPipeline }) => (
  <div className="space-y-6">
    <div className="flex justify-between"><h2 className="text-2xl font-bold text-white">Vagas</h2><button onClick={onAdd} className="bg-brand-orange text-white px-4 py-2 rounded flex items-center gap-2"><Plus size={18}/> Nova</button></div>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {jobs.map(j => (
        <div key={j.id} className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-lg group relative">
          <div className="flex justify-between mb-4">
             <span className={`text-xs px-2 py-1 rounded border ${j.status === 'Aberta' ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/30' : 'bg-red-900/20 text-red-400 border-red-900/30'}`}>{j.status}</span>
             <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(j)} className="text-slate-400 hover:text-white"><Edit3 size={16}/></button>
                <button onClick={() => onToggleStatus({...j, status: j.status === 'Aberta' ? 'Fechada' : 'Aberta'})} className="text-slate-400 hover:text-white" title="Alternar Status">{j.status === 'Aberta' ? <XSquare size={16}/> : <CheckSquare size={16}/>}</button>
             </div>
          </div>
          <h3 className="font-bold text-lg text-white mb-1">{j.title}</h3>
          <p className="text-sm text-slate-400 mb-4">{j.company}</p>
          <div className="border-t border-brand-border pt-4 flex justify-between items-center">
            <button onClick={() => onFilterPipeline(j.id)} className="text-brand-orange text-sm hover:underline">Ver Pipeline</button>
            <p className="text-xs text-slate-500">{candidates.filter(c => c.jobId === j.id).length} candidatos</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Item 1: Tabela Melhorada
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
              <tr>
                <th className="px-6 py-4">Nome / Info</th>
                <th className="px-6 py-4">Detalhes</th>
                <th className="px-6 py-4">Vaga / Fonte</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {currentData.map(c => (
                <tr key={c.id} className="hover:bg-brand-hover/50 cursor-pointer transition-colors" onClick={() => onEdit(c)}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white text-base">{c.fullName}</div>
                    <div className="text-xs text-slate-500 flex gap-2 items-center"><Mail size={10}/> {c.email}</div>
                    <div className="text-xs text-slate-500 flex gap-2 items-center"><Phone size={10}/> {c.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><MapPin size={10}/> {c.city || '-'}</div>
                    <div className="text-xs text-slate-400 mb-1">Idade: {c.age || '-'}</div>
                    {c.salaryExpectation && <div className="text-xs text-green-400 flex items-center gap-1"><DollarSign size={10}/> {c.salaryExpectation}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white mb-1">{jobs.find(j => j.id === c.jobId)?.title || <span className="italic text-slate-600">Banco Geral</span>}</div>
                    <div className="text-xs text-slate-500">Fonte: {c.source || '-'}</div>
                  </td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs border ${STATUS_COLORS[c.status] || 'bg-slate-700'}`}>{c.status}</span></td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(c); }} className="text-slate-400 hover:text-brand-cyan p-2"><Eye size={16}/></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-brand-dark/50 p-4 border-t border-brand-border flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="text-xs text-slate-400">Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, candidates.length)} de {candidates.length}</div>
           <div className="flex items-center gap-4">
              <select className="bg-brand-card border border-brand-border rounded px-2 py-1 text-xs text-white outline-none" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}><option value={10}>10</option><option value={50}>50</option><option value={100}>100</option></select>
              <div className="flex gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-brand-hover rounded text-xs disabled:opacity-50">Anterior</button><span className="text-xs py-1 px-2 text-white">Pág {currentPage}/{totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-brand-hover rounded text-xs disabled:opacity-50">Próximo</button></div>
           </div>
        </div>
      </div>
    </div>
  );
};

const JobModal = ({ isOpen, job, onClose, onSave, companies, cities, isSaving }) => {
  const [d, setD] = useState(job?.id ? {...job} : { title: '', company: '', location: '' });
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="bg-brand-card rounded-xl shadow-2xl w-full max-w-md border border-brand-border p-6">
        <h3 className="font-bold text-lg text-white mb-4">{d.id ? 'Editar Vaga' : 'Nova Vaga'}</h3>
        <input className="w-full bg-brand-dark border border-brand-border p-2 rounded mb-3 text-white" placeholder="Título" value={d.title} onChange={e=>setD({...d, title:e.target.value})}/>
        <select className="w-full bg-brand-dark border border-brand-border p-2 rounded mb-3 text-white" value={d.company} onChange={e=>setD({...d, company:e.target.value})}><option value="">Empresa</option>{companies.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select>
        <select className="w-full bg-brand-dark border border-brand-border p-2 rounded mb-6 text-white" value={d.location} onChange={e=>setD({...d, location:e.target.value})}><option value="">Cidade</option>{cities.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select>
        <div className="flex justify-end gap-2"><button onClick={onClose} className="text-slate-400 px-4">Cancelar</button><button onClick={()=>onSave(d)} disabled={isSaving} className="bg-brand-orange text-white px-4 py-2 rounded">{isSaving ? 'Salvando...' : 'Salvar'}</button></div>
      </div>
    </div>
  );
};