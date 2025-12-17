import React, { useState, useEffect } from 'react';
import { 
  Users, Mail, History, Database, Layout, UploadCloud, Download, 
  Plus, Trash2, Edit3, Save, Search, FileText, CheckSquare, X, Building2
} from 'lucide-react';
import { CSV_FIELD_MAPPING_OPTIONS, PIPELINE_STAGES } from '../constants';
import { 
  collection, onSnapshot, query, orderBy, limit, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import * as XLSX from 'xlsx';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper para mostrar toast (será passado do App ou criado localmente)
let showToast = (message, type = 'info') => {
  alert(message); // Fallback simples
};

export default function SettingsPage({ 
  onOpenCsvModal,
  activeSettingsTab,
  onSettingsTabChange,
  onShowToast,
  userRoles = [],
  currentUserRole = 'admin',
  onSetUserRole,
  onRemoveUserRole,
  currentUserEmail
}) {
  // Usar toast do App se disponível
  if (onShowToast) showToast = onShowToast;
  
  const activeTab = activeSettingsTab || 'campos';
  const setActiveTab = (tab) => {
    if (onSettingsTabChange) onSettingsTabChange(tab);
  };

  const tabs = [
    { id: 'campos', label: 'Gerenciamento de Campos', icon: Database },
    { id: 'pipeline', label: 'Configuração do Pipeline', icon: Layout },
    { id: 'import', label: 'Importar / Exportar', icon: UploadCloud },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'emails', label: 'Modelos de Email', icon: Mail },
    { id: 'history', label: 'Histórico de Ações', icon: History },
  ];

  return (
    <div className="flex flex-col h-full bg-brand-dark text-slate-200">
      {/* Header e Navegação */}
      <div className="p-6 border-b border-brand-border bg-brand-card">
        <h2 className="text-2xl font-bold text-white mb-6">Configurações do Sistema</h2>
        <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-lg font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-brand-dark text-brand-orange border-brand-orange' 
                  : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-brand-dark/50'
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo das Abas */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        {activeTab === 'campos' && <FieldsManager />}
        {activeTab === 'pipeline' && <PipelineManager />}
        {activeTab === 'companies' && <CompaniesManager onShowToast={onShowToast} />}
        {activeTab === 'import' && <ImportExportManager onOpenCsvModal={onOpenCsvModal} onShowToast={onShowToast} />}
        {activeTab === 'users' && <UserManager userRoles={userRoles} currentUserRole={currentUserRole} onSetUserRole={onSetUserRole} onRemoveUserRole={onRemoveUserRole} currentUserEmail={currentUserEmail} onShowToast={onShowToast} />}
        {activeTab === 'emails' && <EmailTemplateManager />}
        {activeTab === 'history' && <MassActionHistory />}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTES DE CADA ABA ---

const FieldsManager = () => {
  const [candidateFieldsState, setCandidateFieldsState] = useState([]);
  const [jobFieldsState, setJobFieldsState] = useState([]);
  const [activeSection, setActiveSection] = useState('candidate');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState(null);

  // Inicializar campos padrão
  useEffect(() => {
    const defaultCandidateFields = CSV_FIELD_MAPPING_OPTIONS.map((f, i) => ({
      id: f.value, label: f.label.replace(':', ''), type: 'Texto', visible: true, required: i < 3
    }));
    setCandidateFieldsState(defaultCandidateFields);
    
    const defaultJobFields = [
      { id: 'title', label: 'Título da Vaga', type: 'Texto', visible: true, required: true },
      { id: 'company', label: 'Empresa', type: 'Texto', visible: true, required: true },
      { id: 'city', label: 'Cidade', type: 'Texto', visible: true, required: false },
      { id: 'description', label: 'Descrição', type: 'Texto Longo', visible: true, required: false },
      { id: 'requirements', label: 'Requisitos', type: 'Texto Longo', visible: true, required: false },
      { id: 'salary', label: 'Salário', type: 'Número', visible: true, required: false },
      { id: 'status', label: 'Status', type: 'Seleção', visible: true, required: true },
    ];
    setJobFieldsState(defaultJobFields);
    setLoading(false);
  }, []);

  const handleToggleVisibility = (fieldId, currentValue) => {
    if (activeSection === 'candidate') {
      setCandidateFieldsState(prev => prev.map(f => f.id === fieldId ? { ...f, visible: !currentValue } : f));
    } else {
      setJobFieldsState(prev => prev.map(f => f.id === fieldId ? { ...f, visible: !currentValue } : f));
    }
    if (onShowToast) onShowToast('Visibilidade atualizada', 'success');
    // TODO: Salvar no Firestore quando implementar persistência
  };

  const handleToggleRequired = (fieldId, currentValue) => {
    if (activeSection === 'candidate') {
      setCandidateFieldsState(prev => prev.map(f => f.id === fieldId ? { ...f, required: !currentValue } : f));
    } else {
      setJobFieldsState(prev => prev.map(f => f.id === fieldId ? { ...f, required: !currentValue } : f));
    }
    if (onShowToast) onShowToast('Obrigatoriedade atualizada', 'success');
    // TODO: Salvar no Firestore quando implementar persistência
  };

  const filteredCandidateFields = candidateFieldsState.filter(f => 
    f.label.toLowerCase().includes(search.toLowerCase())
  );
  const filteredJobFields = jobFieldsState.filter(f => 
    f.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection('candidate')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              activeSection === 'candidate'
                ? 'bg-brand-orange text-white'
                : 'bg-brand-card text-slate-400 hover:bg-brand-hover hover:text-white'
            }`}
          >
            Campos do Candidato
          </button>
          <button
            onClick={() => setActiveSection('job')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              activeSection === 'job'
                ? 'bg-brand-orange text-white'
                : 'bg-brand-card text-slate-400 hover:bg-brand-hover hover:text-white'
            }`}
          >
            Campos da Vaga
          </button>
        </div>
        <div className="flex gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input 
              className="w-full bg-brand-card border border-brand-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-brand-cyan outline-none"
              placeholder="Buscar campo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => showToast('Funcionalidade de campo personalizado em desenvolvimento', 'info')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                          <Plus size={16}/> Novo Campo Personalizado
                        </button>
                        <div className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg text-xs text-yellow-800 dark:text-yellow-300 font-medium">
                          ⚠️ Em desenvolvimento
                        </div>
                      </div>
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-dark/50 text-slate-400 font-bold uppercase text-xs">
            <tr>
              <th className="p-4">Nome do Campo</th>
              <th className="p-4">ID (Sistema)</th>
              <th className="p-4">Tipo</th>
              <th className="p-4 text-center">Visível</th>
              <th className="p-4 text-center">Obrigatório</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {(activeSection === 'candidate' ? filteredCandidateFields : filteredJobFields).map(field => (
              <tr key={field.id} className="hover:bg-brand-hover/50 dark:hover:bg-brand-hover/50 transition-colors">
                <td className="p-4 font-bold text-white break-words">{field.label}</td>
                <td className="p-4 font-mono text-xs text-brand-cyan break-words">{field.id}</td>
                <td className="p-4 text-slate-400 break-words">{field.type}</td>
                <td className="p-4 text-center">
                  <input
                    type="checkbox"
                    checked={field.visible}
                    onChange={() => handleToggleVisibility(field.id, field.visible)}
                    className="accent-brand-cyan cursor-pointer"
                    title="Alternar visibilidade"
                  />
                </td>
                <td className="p-4 text-center">
                   <input
                     type="checkbox"
                     checked={field.required}
                     onChange={() => handleToggleRequired(field.id, field.required)}
                     className="accent-brand-orange cursor-pointer"
                     title="Alternar obrigatoriedade"
                   />
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => {
                      if (onShowToast) onShowToast(`Edição completa do campo "${field.label}" em desenvolvimento`, 'info');
                    }}
                    className="p-2 text-slate-400 hover:text-brand-cyan transition-colors"
                    title="Editar campo (em desenvolvimento)"
                  >
                    <Edit3 size={16}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PipelineManager = () => {
  const [stages, setStages] = useState(PIPELINE_STAGES);
  const [editingStage, setEditingStage] = useState(null);
  const [newStageName, setNewStageName] = useState('');
  const [showAddStage, setShowAddStage] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState([
    'Salário Incompatível',
    'Sem qualificação técnica',
    'Fit Cultural',
    'Aceitou outra proposta'
  ]);

  const handleAddStage = () => {
    if (newStageName.trim() && !stages.includes(newStageName.trim())) {
      const updated = [...stages, newStageName.trim()];
      setStages(updated);
      setNewStageName('');
      setShowAddStage(false);
      if (onShowToast) onShowToast('Etapa adicionada com sucesso', 'success');
      // TODO: Salvar no Firestore quando implementar persistência
    } else if (stages.includes(newStageName.trim())) {
      if (onShowToast) onShowToast('Esta etapa já existe', 'error');
    }
  };

  const handleEditStage = (oldName, newName) => {
    if (newName.trim() && newName.trim() !== oldName) {
      if (stages.includes(newName.trim())) {
        if (onShowToast) onShowToast('Esta etapa já existe', 'error');
        return;
      }
      const updated = stages.map(s => s === oldName ? newName.trim() : s);
      setStages(updated);
      setEditingStage(null);
      if (onShowToast) onShowToast('Etapa atualizada', 'success');
      // TODO: Salvar no Firestore quando implementar persistência
    }
  };

  const handleDeleteStage = (stageName) => {
    if (window.confirm(`Tem certeza que deseja remover a etapa "${stageName}"?`)) {
      const updated = stages.filter(s => s !== stageName);
      setStages(updated);
      if (onShowToast) onShowToast('Etapa removida', 'success');
      // TODO: Salvar no Firestore quando implementar persistência
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto animate-in fade-in">
      {/* Etapas do Funil */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Etapas do Funil (Kanban)</h3>
          <button 
            onClick={() => setShowAddStage(!showAddStage)}
            className="text-brand-cyan hover:underline text-sm font-bold flex items-center gap-1"
          >
            <Plus size={14}/> Adicionar Etapa
          </button>
        </div>
        
        {showAddStage && (
          <div className="bg-brand-card border border-brand-border rounded-lg p-4 flex gap-2">
            <input
              type="text"
              value={newStageName}
              onChange={e => setNewStageName(e.target.value)}
              placeholder="Nome da nova etapa"
              className="flex-1 bg-brand-dark border border-brand-border rounded px-3 py-2 text-sm text-white outline-none focus:border-brand-cyan"
              onKeyPress={e => e.key === 'Enter' && handleAddStage()}
            />
            <button
              onClick={handleAddStage}
              className="bg-brand-cyan text-white px-4 py-2 rounded text-sm font-bold hover:bg-cyan-400"
            >
              Adicionar
            </button>
            <button
              onClick={() => { setShowAddStage(false); setNewStageName(''); }}
              className="bg-brand-dark border border-brand-border text-slate-400 px-4 py-2 rounded text-sm hover:text-white"
            >
              <X size={16}/>
            </button>
          </div>
        )}

        <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
           {stages.map((stage, index) => (
             <div key={stage} className="p-4 border-b border-brand-border last:border-0 flex justify-between items-center hover:bg-brand-dark/30 group">
                <div className="flex items-center gap-3 flex-1">
                  <span className="bg-brand-dark text-slate-500 w-6 h-6 flex items-center justify-center rounded-full text-xs font-mono">{index + 1}</span>
                  {editingStage === stage ? (
                    <input
                      type="text"
                      defaultValue={stage}
                      onBlur={e => handleEditStage(stage, e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleEditStage(stage, e.target.value)}
                      className="flex-1 bg-brand-dark border border-brand-border rounded px-2 py-1 text-sm text-white outline-none focus:border-brand-cyan"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium text-white">{stage}</span>
                  )}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setEditingStage(editingStage === stage ? null : stage)}
                    className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded"
                    title="Editar etapa"
                  >
                    <Edit3 size={14}/>
                  </button>
                  <button 
                    onClick={() => handleDeleteStage(stage)}
                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"
                    title="Remover etapa"
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* Gatilhos e Motivos */}
      <div className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Gatilhos de Fechamento</h3>
          <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-2">
             {['Contratado', 'Reprovado', 'Desistiu da Vaga'].map(status => (
               <div key={status} className="flex items-center justify-between p-3 bg-brand-dark/30 rounded-lg border border-transparent hover:border-brand-border">
                  <span className="text-sm font-bold text-slate-200">{status}</span>
                  <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-900/50">Ativo</span>
               </div>
             ))}
          </div>
        </div>

        <div className="space-y-4">
           <div className="flex justify-between items-center">
             <h3 className="text-lg font-bold text-white">Motivos de Perda</h3>
             <button 
               onClick={() => {
                 const newReason = prompt('Digite o novo motivo de perda:');
                 if (newReason && newReason.trim() && !rejectionReasons.includes(newReason.trim())) {
                   setRejectionReasons(prev => [...prev, newReason.trim()]);
                   if (onShowToast) onShowToast('Motivo adicionado', 'success');
                   // TODO: Salvar no Firestore quando implementar persistência
                 } else if (rejectionReasons.includes(newReason.trim())) {
                   if (onShowToast) onShowToast('Este motivo já existe', 'error');
                 }
               }}
               className="text-brand-cyan hover:underline text-sm font-bold flex items-center gap-1"
             >
               <Plus size={14}/> Novo Motivo
             </button>
           </div>
           <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-2">
              {rejectionReasons.map((m, idx) => (
                <div key={idx} className="text-sm text-slate-300 p-2 border-b border-brand-border last:border-0 flex justify-between items-center">
                  <span>{m}</span>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Remover motivo "${m}"?`)) {
                        setRejectionReasons(prev => prev.filter(r => r !== m));
                        if (onShowToast) onShowToast('Motivo removido', 'success');
                        // TODO: Salvar no Firestore quando implementar persistência
                      }
                    }}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                    title="Remover motivo"
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>
              ))}
              {rejectionReasons.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-4">Nenhum motivo cadastrado</div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

const ImportExportManager = ({ onOpenCsvModal, onShowToast }) => {
  const [exportType, setExportType] = useState('candidates'); // 'candidates' ou 'jobs'
  const [exportFormat, setExportFormat] = useState('csv'); // 'csv' ou 'xlsx'
  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      // Buscar dados do Firestore
      const collectionName = exportType === 'candidates' ? 'candidates' : 'jobs';
      const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        // Converter timestamps para formato legível
        const processed = { ...docData };
        if (docData.createdAt) {
          const date = docData.createdAt.toDate ? docData.createdAt.toDate() : new Date(docData.createdAt);
          processed.createdAt = date.toLocaleString('pt-BR');
        }
        if (docData.updatedAt) {
          const date = docData.updatedAt.toDate ? docData.updatedAt.toDate() : new Date(docData.updatedAt);
          processed.updatedAt = date.toLocaleString('pt-BR');
        }
        return processed;
      });

      if (data.length === 0) {
        if (onShowToast) onShowToast('Nenhum dado encontrado para exportar', 'info');
        else alert('Nenhum dado encontrado para exportar');
        setExporting(false);
        return;
      }

      // Preparar dados para exportação
      const headers = Object.keys(data[0]);
      const rows = data.map(item => headers.map(header => item[header] || ''));

      if (exportFormat === 'csv') {
        // Exportar CSV
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => {
            const cellStr = String(cell || '');
            // Escapar vírgulas e aspas
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${exportType}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Exportar XLSX
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, exportType === 'candidates' ? 'Candidatos' : 'Vagas');
        XLSX.writeFile(workbook, `${exportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
      }

      if (onShowToast) {
        onShowToast(`Exportação concluída! ${data.length} registro(s) exportado(s).`, 'success');
      } else {
        alert(`Exportação concluída! ${data.length} registro(s) exportado(s).`);
      }
      
      // Registrar no histórico
      try {
        await addDoc(collection(db, 'actionHistory'), {
          action: 'exportação',
          collection: collectionName,
          recordsAffected: data.length,
          userEmail: 'system', // Será atualizado pelo App se necessário
          timestamp: serverTimestamp(),
          details: { format: exportFormat, type: exportType },
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.error('Erro ao registrar histórico de exportação:', e);
      }
    } catch (error) {
      console.error('Erro na exportação:', error);
      if (onShowToast) {
        onShowToast(`Erro ao exportar: ${error.message}`, 'error');
      } else {
        alert(`Erro ao exportar: ${error.message}`);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Importação */}
        <div className="bg-brand-card p-8 rounded-xl border border-brand-border flex flex-col items-center text-center hover:border-brand-cyan/50 transition-colors">
          <div className="w-16 h-16 bg-brand-cyan/10 rounded-full flex items-center justify-center mb-4 text-brand-cyan">
            <UploadCloud size={32}/>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Importar Candidatos</h3>
          <p className="text-slate-400 text-sm mb-6">Carregue arquivos CSV para adicionar candidatos em massa ao banco de talentos.</p>
          <button onClick={onOpenCsvModal} className="bg-brand-cyan text-brand-dark px-6 py-3 rounded-lg font-bold hover:bg-cyan-400 w-full">
            Iniciar Importação
          </button>
        </div>

        {/* Exportação */}
        <div className="bg-brand-card p-8 rounded-xl border border-brand-border flex flex-col items-center text-center hover:border-brand-orange/50 transition-colors">
          <div className="w-16 h-16 bg-brand-orange/10 rounded-full flex items-center justify-center mb-4 text-brand-orange">
            <Download size={32}/>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Exportar Dados</h3>
          <p className="text-slate-400 text-sm mb-6">Baixe relatórios completos de candidatos ou vagas em formato CSV ou Excel.</p>
          
          <div className="w-full space-y-3">
            <select
              value={exportType}
              onChange={e => setExportType(e.target.value)}
              className="w-full bg-brand-dark border border-brand-border rounded px-3 py-2 text-sm text-white outline-none focus:border-brand-orange"
            >
              <option value="candidates">Candidatos</option>
              <option value="jobs">Vagas</option>
            </select>
            
            <div className="flex gap-2">
              <button
                onClick={() => setExportFormat('csv')}
                className={`flex-1 px-3 py-2 rounded text-sm font-bold transition-colors ${
                  exportFormat === 'csv'
                    ? 'bg-brand-orange text-white'
                    : 'bg-brand-dark border border-brand-border text-slate-400 hover:text-white'
                }`}
              >
                CSV
              </button>
              <button
                onClick={() => setExportFormat('xlsx')}
                className={`flex-1 px-3 py-2 rounded text-sm font-bold transition-colors ${
                  exportFormat === 'xlsx'
                    ? 'bg-brand-orange text-white'
                    : 'bg-brand-dark border border-brand-border text-slate-400 hover:text-white'
                }`}
              >
                Excel
              </button>
            </div>
            
            <button
              onClick={exportData}
              disabled={exporting}
              className="bg-brand-orange text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-600 w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Exportando...
                </>
              ) : (
                <>
                  <Download size={16}/>
                  Exportar {exportType === 'candidates' ? 'Candidatos' : 'Vagas'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const UserManager = ({ userRoles = [], currentUserRole, onSetUserRole, onRemoveUserRole, currentUserEmail, onShowToast }) => {
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('recruiter');

  const ROLES = [
    { value: 'admin', label: 'Administrador', color: 'bg-purple-900/30 text-purple-300 border-purple-800', desc: 'Acesso total ao sistema' },
    { value: 'recruiter', label: 'Recrutador', color: 'bg-blue-900/30 text-blue-300 border-blue-800', desc: 'Pode editar candidatos, mover no funil, agendar entrevistas' },
    { value: 'viewer', label: 'Visualizador', color: 'bg-gray-900/30 text-gray-300 border-gray-700', desc: 'Apenas visualização, sem edição' }
  ];

  const handleAddUser = async () => {
    if (!newUserEmail.trim() || !newUserEmail.includes('@')) {
      if (onShowToast) onShowToast('Digite um email válido', 'error');
      return;
    }
    
    if (onSetUserRole) {
      await onSetUserRole(newUserEmail.trim().toLowerCase(), newUserRole);
      setNewUserEmail('');
      setShowAddUser(false);
    }
  };

  const getRoleInfo = (role) => ROLES.find(r => r.value === role) || ROLES[2];
  
  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Usuários do Sistema</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Seu perfil: <span className={`px-2 py-0.5 rounded text-xs border ${getRoleInfo(currentUserRole).color}`}>{getRoleInfo(currentUserRole).label}</span>
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddUser(!showAddUser)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={16}/> Adicionar Usuário
          </button>
        )}
      </div>

      {/* Formulário de adicionar usuário */}
      {showAddUser && isAdmin && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-4">
          <h4 className="font-medium text-blue-800 dark:text-blue-300">Novo Usuário</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                placeholder="usuario@empresa.com"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Perfil</label>
              <select
                value={newUserRole}
                onChange={e => setNewUserRole(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddUser(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              Cancelar
            </button>
            <button onClick={handleAddUser} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Descrição dos perfis */}
      <div className="grid grid-cols-3 gap-4">
        {ROLES.map(role => (
          <div key={role.value} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <span className={`inline-block px-2 py-0.5 rounded text-xs border ${role.color} mb-2`}>{role.label}</span>
            <p className="text-xs text-gray-600 dark:text-gray-400">{role.desc}</p>
          </div>
        ))}
      </div>

      {/* Lista de usuários */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 uppercase text-xs font-bold">
            <tr>
              <th className="p-4">Email</th>
              <th className="p-4">Perfil</th>
              <th className="p-4">Desde</th>
              {isAdmin && <th className="p-4 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {/* Usuário atual (sempre aparece mesmo sem registro) */}
            {currentUserEmail && !userRoles.find(r => r.email === currentUserEmail) && (
              <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                <td className="p-4 font-medium text-gray-900 dark:text-white">
                  {currentUserEmail}
                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(você)</span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs border ${getRoleInfo('admin').color}`}>
                    Administrador
                  </span>
                </td>
                <td className="p-4 text-gray-500 dark:text-gray-400 text-xs">Primeiro acesso</td>
                {isAdmin && <td className="p-4 text-right text-gray-400 text-xs">-</td>}
              </tr>
            )}
            {userRoles.map(userRole => (
              <tr key={userRole.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${userRole.email === currentUserEmail ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                <td className="p-4 font-medium text-gray-900 dark:text-white">
                  {userRole.email}
                  {userRole.email === currentUserEmail && <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(você)</span>}
                </td>
                <td className="p-4">
                  {isAdmin && userRole.email !== currentUserEmail ? (
                    <select
                      value={userRole.role}
                      onChange={e => onSetUserRole && onSetUserRole(userRole.email, e.target.value)}
                      className={`px-2 py-1 rounded text-xs border cursor-pointer ${getRoleInfo(userRole.role).color}`}
                    >
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs border ${getRoleInfo(userRole.role).color}`}>
                      {getRoleInfo(userRole.role).label}
                    </span>
                  )}
                </td>
                <td className="p-4 text-gray-500 dark:text-gray-400 text-xs">
                  {userRole.createdAt?.toDate ? userRole.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}
                </td>
                {isAdmin && (
                  <td className="p-4 text-right">
                    {userRole.email !== currentUserEmail && (
                      <button
                        onClick={() => onRemoveUserRole && onRemoveUserRole(userRole.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remover acesso"
                      >
                        <Trash2 size={16}/>
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {userRoles.length === 0 && !currentUserEmail && (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Nenhum usuário cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EmailTemplateManager = () => (
   <div className="max-w-5xl mx-auto animate-in fade-in space-y-6">
      <div className="flex justify-between items-center">
         <h3 className="text-lg font-bold text-white">Modelos de Email Automáticos</h3>
         <div className="flex items-center gap-2">
           <button 
             onClick={() => showToast('Funcionalidade de criar template em desenvolvimento', 'info')}
             className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 dark:bg-blue-500 dark:hover:bg-blue-600"
           >
             <Plus size={16}/> Novo Template
           </button>
           <div className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg text-xs text-yellow-800 dark:text-yellow-300 font-medium">
             ⚠️ Em desenvolvimento
           </div>
         </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
         {[
            { title: 'Boas Vindas (Candidatura)', trigger: 'Ao se inscrever', subject: 'Confirmação de Inscrição - Young Talents' },
            { title: 'Convite Entrevista', trigger: 'Ao mover para Entrevista I', subject: 'Convite para Entrevista' },
            { title: 'Feedback Negativo', trigger: 'Ao mover para Reprovado', subject: 'Update sobre sua candidatura' },
            { title: 'Aprovação Final', trigger: 'Ao mover para Contratado', subject: 'Parabéns! Você foi aprovado' },
         ].map((t, i) => (
            <div key={i} className="bg-brand-card p-5 rounded-xl border border-brand-border hover:border-brand-orange transition-colors cursor-pointer group">
               <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-white">{t.title}</h4>
                  <Edit3 size={16} className="text-slate-500 group-hover:text-white"/>
               </div>
               <div className="text-xs text-slate-400 mb-2">Gatilho: <span className="text-brand-cyan">{t.trigger}</span></div>
               <div className="text-sm text-slate-300 bg-brand-dark p-3 rounded border border-brand-border italic">
                  "{t.subject}"
               </div>
            </div>
         ))}
      </div>
   </div>
);

const CompaniesManager = ({ onShowToast }) => {
  const [companies, setCompanies] = useState([]);
  const [cities, setCities] = useState([]);
  const [interestAreas, setInterestAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCompany, setEditingCompany] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', city: '', interestArea: '', address: '', phone: '', email: '' });

  useEffect(() => {
    const q = query(collection(db, 'companies'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const companiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCompanies(companiesData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar empresas:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const qCities = query(collection(db, 'cities'), orderBy('name', 'asc'));
    const unsubscribeCities = onSnapshot(qCities, (snapshot) => {
      setCities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qAreas = query(collection(db, 'interestAreas'), orderBy('name', 'asc'));
    const unsubscribeAreas = onSnapshot(qAreas, (snapshot) => {
      setInterestAreas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeCities();
      unsubscribeAreas();
    };
  }, []);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      if (onShowToast) onShowToast('Nome da empresa é obrigatório', 'error');
      return;
    }

    try {
      const companyData = {
        name: formData.name.trim(),
        city: formData.city || '',
        interestArea: formData.interestArea || '',
        address: formData.address || '',
        phone: formData.phone || '',
        email: formData.email || '',
        updatedAt: serverTimestamp()
      };

      if (editingCompany) {
        await updateDoc(doc(db, 'companies', editingCompany.id), companyData);
        if (onShowToast) onShowToast('Empresa atualizada com sucesso', 'success');
      } else {
        companyData.createdAt = serverTimestamp();
        companyData.createdBy = 'system';
        await addDoc(collection(db, 'companies'), companyData);
        if (onShowToast) onShowToast('Empresa criada com sucesso', 'success');
      }

      setEditingCompany(null);
      setShowAddForm(false);
      setFormData({ name: '', city: '', interestArea: '', address: '', phone: '', email: '' });
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      if (onShowToast) onShowToast('Erro ao salvar empresa', 'error');
    }
  };

  const handleDelete = async (companyId, companyName) => {
    if (!window.confirm(`Tem certeza que deseja excluir a empresa "${companyName}"?`)) return;

    try {
      await deleteDoc(doc(db, 'companies', companyId));
      if (onShowToast) onShowToast('Empresa excluída com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao excluir empresa:', error);
      if (onShowToast) onShowToast('Erro ao excluir empresa', 'error');
    }
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      city: company.city || '',
      interestArea: company.interestArea || '',
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || ''
    });
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setEditingCompany(null);
    setShowAddForm(false);
    setFormData({ name: '', city: '', interestArea: '', address: '', phone: '', email: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Empresas e Unidades</h3>
        <button
          onClick={() => {
            setEditingCompany(null);
            setFormData({ name: '', city: '', interestArea: '', address: '', phone: '', email: '' });
            setShowAddForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <Plus size={16}/> Nova Empresa/Unidade
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4 shadow-lg">
          <h4 className="font-bold text-gray-900 dark:text-white text-lg">{editingCompany ? 'Editar' : 'Nova'} Empresa/Unidade</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Nome *</label>
              <input
                type="text"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Nome da empresa/unidade"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Cidade</label>
              <select
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
              >
                <option value="">Selecione uma cidade...</option>
                {cities.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Área de Interesse</label>
              <select
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.interestArea}
                onChange={e => setFormData({...formData, interestArea: e.target.value})}
              >
                <option value="">Selecione uma área...</option>
                {interestAreas.map(area => (
                  <option key={area.id} value={area.name}>{area.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Endereço</label>
              <input
                type="text"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                placeholder="Endereço completo"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Telefone</label>
              <input
                type="text"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="(51) 99999-9999"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Email</label>
              <input
                type="email"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="contato@empresa.com"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {editingCompany ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-bold uppercase text-xs">
            <tr>
              <th className="p-4">Nome</th>
              <th className="p-4">Cidade</th>
              <th className="p-4">Área</th>
              <th className="p-4">Contato</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {companies.length > 0 ? (
              companies.map(company => (
                <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="p-4 font-bold text-gray-900 dark:text-white">{company.name}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{company.city || 'N/A'}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{company.interestArea || 'N/A'}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400 text-xs">
                    {company.phone && <div>{company.phone}</div>}
                    {company.email && <div>{company.email}</div>}
                    {!company.phone && !company.email && 'N/A'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleEdit(company)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        title="Editar"
                      >
                        <Edit3 size={16}/>
                      </button>
                      <button
                        onClick={() => handleDelete(company.id, company.name)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Excluir"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Nenhuma empresa cadastrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MassActionHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'actionHistory'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(historyData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar histórico:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionLabel = (action) => {
    const labels = {
      'importação_csv': 'Importação CSV',
      'exclusão': 'Exclusão',
      'atualização_massa': 'Atualização em Massa',
      'exportação': 'Exportação'
    };
    return labels[action] || action;
  };

  const getActionColor = (action) => {
    if (action.includes('importação')) return 'bg-blue-900/30 text-blue-300 border-blue-800';
    if (action.includes('exclusão')) return 'bg-red-900/30 text-red-300 border-red-800';
    if (action.includes('atualização')) return 'bg-yellow-900/30 text-yellow-300 border-yellow-800';
    if (action.includes('exportação')) return 'bg-green-900/30 text-green-300 border-green-800';
    return 'bg-slate-900/30 text-slate-300 border-slate-800';
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Histórico de Ações em Massa</h3>
        <div className="text-xs text-slate-400">
          {history.length} registro{history.length !== 1 ? 's' : ''}
        </div>
      </div>
      <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-brand-cyan border-t-transparent rounded-full"></div>
            <p className="mt-2">Carregando histórico...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <History size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhuma ação registrada ainda</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-dark/50 text-slate-400 uppercase text-xs font-bold">
              <tr>
                <th className="p-4">Data/Hora</th>
                <th className="p-4">Usuário</th>
                <th className="p-4">Ação</th>
                <th className="p-4">Detalhes</th>
                <th className="p-4 text-right">Registros Afetados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-brand-dark/30">
                  <td className="p-4 text-slate-400 text-xs">
                    {formatDate(item.timestamp)}
                  </td>
                  <td className="p-4 text-white text-sm">
                    {item.userName || item.userEmail}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs border ${getActionColor(item.action)}`}>
                      {getActionLabel(item.action)}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-400">
                    {item.details?.importMode && (
                      <span className="block">Modo: {item.details.importMode}</span>
                    )}
                    {item.details?.imported && (
                      <span className="block">Novos: {item.details.imported}</span>
                    )}
                    {item.details?.updated && (
                      <span className="block">Atualizados: {item.details.updated}</span>
                    )}
                    {item.collection && (
                      <span className="block">Coleção: {item.collection}</span>
                    )}
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-white">
                    {item.recordsAffected || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};