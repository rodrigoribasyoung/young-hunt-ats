import React, { useState } from 'react';
import { 
  Users, Mail, History, Database, Layout, UploadCloud, Download, 
  Plus, Trash2, Edit3, Save, Search, FileText, CheckSquare, X
} from 'lucide-react';
import { CSV_FIELD_MAPPING_OPTIONS, PIPELINE_STAGES } from '../constants';

export default function SettingsPage({ 
  onOpenCsvModal,
  // Props para manipulação de dados (mockadas para o exemplo visual, mas funcionais na estrutura)
}) {
  const [activeTab, setActiveTab] = useState('campos');

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
        {activeTab === 'import' && <ImportExportManager onOpenCsvModal={onOpenCsvModal} />}
        {activeTab === 'users' && <UserManager />}
        {activeTab === 'emails' && <EmailTemplateManager />}
        {activeTab === 'history' && <MassActionHistory />}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTES DE CADA ABA ---

const FieldsManager = () => {
  // Mock dos campos baseado no CSV
  const [fields, setFields] = useState(CSV_FIELD_MAPPING_OPTIONS.map((f, i) => ({
    id: f.value, label: f.label.replace(':', ''), type: 'Texto', visible: true, required: i < 3
  })));
  const [search, setSearch] = useState('');

  const filteredFields = fields.filter(f => f.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in">
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
          <input 
            className="w-full bg-brand-card border border-brand-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-brand-cyan outline-none"
            placeholder="Buscar campo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="bg-brand-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm">
          <Plus size={16}/> Novo Campo Personalizado
        </button>
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
            {filteredFields.map(field => (
              <tr key={field.id} className="hover:bg-brand-dark/30 transition-colors">
                <td className="p-4 font-bold text-white">{field.label}</td>
                <td className="p-4 font-mono text-xs text-brand-cyan">{field.id}</td>
                <td className="p-4 text-slate-400">{field.type}</td>
                <td className="p-4 text-center">
                  <input type="checkbox" checked={field.visible} readOnly className="accent-brand-cyan cursor-pointer"/>
                </td>
                <td className="p-4 text-center">
                   <input type="checkbox" checked={field.required} readOnly className="accent-brand-orange cursor-pointer"/>
                </td>
                <td className="p-4 text-right">
                  <button className="p-2 text-slate-400 hover:text-white"><Edit3 size={16}/></button>
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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto animate-in fade-in">
      {/* Etapas do Funil */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Etapas do Funil (Kanban)</h3>
          <button className="text-brand-cyan hover:underline text-sm font-bold flex items-center gap-1"><Plus size={14}/> Adicionar Etapa</button>
        </div>
        <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
           {PIPELINE_STAGES.map((stage, index) => (
             <div key={stage} className="p-4 border-b border-brand-border last:border-0 flex justify-between items-center hover:bg-brand-dark/30 group">
                <div className="flex items-center gap-3">
                  <span className="bg-brand-dark text-slate-500 w-6 h-6 flex items-center justify-center rounded-full text-xs font-mono">{index + 1}</span>
                  <span className="font-medium text-white">{stage}</span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded"><Edit3 size={14}/></button>
                  <button className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"><Trash2 size={14}/></button>
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
             <button className="text-brand-cyan hover:underline text-sm font-bold flex items-center gap-1"><Plus size={14}/> Novo Motivo</button>
           </div>
           <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-2">
              {['Salário Incompatível', 'Sem qualificação técnica', 'Fit Cultural', 'Aceitou outra proposta'].map(m => (
                <div key={m} className="text-sm text-slate-300 p-2 border-b border-brand-border last:border-0 flex justify-between">
                  {m}
                  <button className="text-slate-500 hover:text-red-400"><Trash2 size={14}/></button>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

const ImportExportManager = ({ onOpenCsvModal }) => (
  <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto animate-in fade-in">
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

     <div className="bg-brand-card p-8 rounded-xl border border-brand-border flex flex-col items-center text-center hover:border-brand-orange/50 transition-colors">
        <div className="w-16 h-16 bg-brand-orange/10 rounded-full flex items-center justify-center mb-4 text-brand-orange">
           <Download size={32}/>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Exportar Dados</h3>
        <p className="text-slate-400 text-sm mb-6">Baixe relatórios completos de candidatos, vagas e históricos em formato CSV ou Excel.</p>
        <button className="bg-brand-dark border border-brand-border text-white px-6 py-3 rounded-lg font-bold hover:bg-brand-border w-full">
           Configurar Exportação
        </button>
     </div>
  </div>
);

const UserManager = () => (
  <div className="max-w-4xl mx-auto animate-in fade-in space-y-6">
     <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Usuários do Sistema</h3>
        <button className="bg-brand-orange text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> Convidar Usuário</button>
     </div>
     <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
           <thead className="bg-brand-dark/50 text-slate-400 uppercase text-xs font-bold">
              <tr><th className="p-4">Nome</th><th className="p-4">Email</th><th className="p-4">Perfil</th><th className="p-4 text-right">Status</th></tr>
           </thead>
           <tbody className="divide-y divide-brand-border">
              <tr className="hover:bg-brand-dark/30">
                 <td className="p-4 font-bold text-white">Admin Principal</td>
                 <td className="p-4 text-slate-400">admin@youngtalents.com</td>
                 <td className="p-4"><span className="bg-purple-900/30 text-purple-300 px-2 py-1 rounded text-xs border border-purple-800">Administrador</span></td>
                 <td className="p-4 text-right"><span className="text-green-400 text-xs font-bold">Ativo</span></td>
              </tr>
              {/* Mock users */}
              <tr className="hover:bg-brand-dark/30">
                 <td className="p-4 font-bold text-white">Recrutador 01</td>
                 <td className="p-4 text-slate-400">recruiter@youngtalents.com</td>
                 <td className="p-4"><span className="bg-blue-900/30 text-blue-300 px-2 py-1 rounded text-xs border border-blue-800">Recrutador</span></td>
                 <td className="p-4 text-right"><span className="text-green-400 text-xs font-bold">Ativo</span></td>
              </tr>
           </tbody>
        </table>
     </div>
  </div>
);

const EmailTemplateManager = () => (
   <div className="max-w-5xl mx-auto animate-in fade-in space-y-6">
      <div className="flex justify-between items-center">
         <h3 className="text-lg font-bold text-white">Modelos de Email Automáticos</h3>
         <button className="bg-brand-cyan text-brand-dark px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> Novo Template</button>
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

const MassActionHistory = () => (
   <div className="max-w-5xl mx-auto animate-in fade-in space-y-6">
      <h3 className="text-lg font-bold text-white">Histórico de Ações em Massa</h3>
      <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
         <table className="w-full text-left text-sm">
            <thead className="bg-brand-dark/50 text-slate-400 uppercase text-xs font-bold">
               <tr><th className="p-4">Data/Hora</th><th className="p-4">Usuário</th><th className="p-4">Ação</th><th className="p-4 text-right">Registros Afetados</th></tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
               <tr className="hover:bg-brand-dark/30">
                  <td className="p-4 text-slate-400">03/12/2025 14:30</td>
                  <td className="p-4 text-white">Admin</td>
                  <td className="p-4"><span className="bg-blue-900/30 text-blue-300 px-2 py-1 rounded text-xs border border-blue-800">Importação CSV</span></td>
                  <td className="p-4 text-right font-mono font-bold text-white">145</td>
               </tr>
               <tr className="hover:bg-brand-dark/30">
                  <td className="p-4 text-slate-400">02/12/2025 09:15</td>
                  <td className="p-4 text-white">Recrutador 01</td>
                  <td className="p-4"><span className="bg-red-900/30 text-red-300 px-2 py-1 rounded text-xs border border-red-800">Exclusão em Massa</span></td>
                  <td className="p-4 text-right font-mono font-bold text-white">12</td>
               </tr>
            </tbody>
         </table>
      </div>
   </div>
);