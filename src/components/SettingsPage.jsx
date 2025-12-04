import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Filter, Edit3, Trash2, 
  Eye, EyeOff, CheckSquare, Square, 
  Save, X, GripVertical, AlertTriangle, Database
} from 'lucide-react';
import { CSV_FIELD_MAPPING_OPTIONS, PIPELINE_STAGES } from '../constants';

// --- MOCKS INICIAIS PARA CAMPOS DO SISTEMA ---
// Em produção, isso viria do Firebase (ex: collection 'sys_field_configs')
const DEFAULT_CANDIDATE_CONFIG = CSV_FIELD_MAPPING_OPTIONS.map(f => ({
  id: f.value,
  label: f.label.replace(':', ''),
  type: 'Texto', // Padrão, mas poderia ser refinado
  required: false,
  visible: true,
  isSystem: true // Impede deletar o campo, apenas editar propriedades
}));

const SYSTEM_JOB_FIELDS = [
  { id: 'title', label: 'Título da Vaga', type: 'Texto', required: true, visible: true, isSystem: true },
  { id: 'company', label: 'Empresa', type: 'Seleção', required: true, visible: true, isSystem: true },
  { id: 'location', label: 'Cidade/Local', type: 'Seleção', required: true, visible: true, isSystem: true },
  { id: 'status', label: 'Status da Vaga', type: 'Status', required: true, visible: true, isSystem: true },
];

export default function SettingsPage({ 
  companies, onAddCompany, onDelCompany,
  cities, onAddCity, onDelCity,
  interestAreas, onAddInterest, onDelInterest,
  roles, onAddRole, onDelRole,
  // Props extras podem ser passadas aqui para salvar configurações de campos
}) {
  const [activeTab, setActiveTab] = useState('candidatos');
  const [activeSubTab, setActiveSubTab] = useState(''); // Controla sub-categorias
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado local para simular configs de campos (no real, salvaria no Firebase)
  const [candidateFields, setCandidateFields] = useState(DEFAULT_CANDIDATE_CONFIG);
  const [jobFields, setJobFields] = useState(SYSTEM_JOB_FIELDS);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ id: '', label: '', type: 'Texto', required: false, visible: true });

  // --- LÓGICA DE DADOS ---
  
  // Define as sub-abas baseado na aba principal
  const subTabs = useMemo(() => {
    if (activeTab === 'vagas') return [
      { id: 'campos', label: 'Campos do Sistema' },
      { id: 'empresas', label: 'Empresas' },
      { id: 'cidades', label: 'Cidades' },
      { id: 'areas', label: 'Áreas de Interesse' },
      { id: 'cargos', label: 'Cargos' }
    ];
    if (activeTab === 'pipeline') return [
      { id: 'etapas', label: 'Etapas do Funil' },
      { id: 'motivos', label: 'Motivos de Fechamento' },
      { id: 'status', label: 'Status de Encerramento' }
    ];
    return [];
  }, [activeTab]);

  // Define qual sub-aba está ativa por padrão
  useEffect(() => {
    if (subTabs.length > 0 && !subTabs.find(t => t.id === activeSubTab)) {
      setActiveSubTab(subTabs[0].id);
    }
  }, [activeTab, subTabs]);

  // Prepara os dados para a tabela
  const getTableData = () => {
    let data = [];
    
    if (activeTab === 'candidatos') {
      data = candidateFields;
    } 
    else if (activeTab === 'vagas') {
      if (activeSubTab === 'campos') data = jobFields;
      else if (activeSubTab === 'empresas') data = companies.map(c => ({ ...c, type: 'Opção Menu', isSystem: false, label: c.name }));
      else if (activeSubTab === 'cidades') data = cities.map(c => ({ ...c, type: 'Opção Menu', isSystem: false, label: c.name }));
      else if (activeSubTab === 'areas') data = interestAreas.map(c => ({ ...c, type: 'Opção Menu', isSystem: false, label: c.name }));
      else if (activeSubTab === 'cargos') data = roles.map(c => ({ ...c, type: 'Opção Menu', isSystem: false, label: c.name }));
    }
    else if (activeTab === 'pipeline') {
      if (activeSubTab === 'etapas') data = PIPELINE_STAGES.map((s, i) => ({ id: `stage_${i}`, label: s, type: 'Etapa', required: true, visible: true, isSystem: true }));
      // Adicionar lógica para motivos e status aqui
    }

    // Filtro de busca
    if (searchTerm) {
      data = data.filter(d => 
        d.label?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return data;
  };

  const currentData = getTableData();

  // --- ACTIONS ---

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({ ...item });
    } else {
      setEditingItem(null);
      // Gera ID aleatório para novos itens simples
      const newId = `custom_${Date.now()}`;
      setFormData({ id: newId, label: '', type: 'Texto', required: false, visible: true, isSystem: false });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.label) return alert("O Nome do Campo é obrigatório");

    // LÓGICA DE SALVAMENTO (Aqui você conectaria com suas funções do Firebase)
    // Exemplo para listas simples:
    if (activeTab === 'vagas') {
      if (activeSubTab === 'empresas') !editingItem ? onAddCompany(formData.label) : console.log("Update logic here");
      if (activeSubTab === 'cidades') !editingItem ? onAddCity(formData.label) : console.log("Update logic here");
      if (activeSubTab === 'areas') !editingItem ? onAddInterest(formData.label) : console.log("Update logic here");
      if (activeSubTab === 'cargos') !editingItem ? onAddRole(formData.label) : console.log("Update logic here");
    }
    
    // Exemplo para configurações de campo (apenas local por enquanto)
    if (activeTab === 'candidatos') {
       if (editingItem) {
         setCandidateFields(prev => prev.map(f => f.id === editingItem.id ? formData : f));
       } else {
         setCandidateFields(prev => [...prev, formData]);
       }
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if(!confirm("Tem certeza? Isso pode afetar dados existentes.")) return;
    
    if (activeTab === 'vagas') {
      if (activeSubTab === 'empresas') onDelCompany(id);
      if (activeSubTab === 'cidades') onDelCity(id);
      if (activeSubTab === 'areas') onDelInterest(id);
      if (activeSubTab === 'cargos') onDelRole(id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-dark text-slate-200 p-6 gap-6 overflow-hidden">
      
      {/* --- HEADER E ABAS PRINCIPAIS --- */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Database className="text-brand-orange" /> Configurar Campos e Dados
            </h2>
            <p className="text-slate-400 text-sm mt-1">Gerencie a estrutura de dados, listas suspensas e regras do sistema.</p>
          </div>
        </div>

        <div className="flex border-b border-brand-border">
          {['candidatos', 'vagas', 'pipeline'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSearchTerm(''); }}
              className={`px-8 py-3 font-bold text-sm uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === tab 
                  ? 'border-brand-orange text-white bg-brand-orange/5' 
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-brand-card'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* --- BARRA DE CONTROLE E SUB-ABAS --- */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-4 flex flex-col gap-4">
        
        {/* Sub-abas (se houver) */}
        {subTabs.length > 0 && (
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
            {subTabs.map(st => (
              <button
                key={st.id}
                onClick={() => setActiveSubTab(st.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                  activeSubTab === st.id
                    ? 'bg-brand-cyan text-brand-dark border-brand-cyan shadow-lg shadow-brand-cyan/20'
                    : 'bg-transparent text-slate-400 border-slate-600 hover:border-slate-400'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center gap-4">
          {/* Busca */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
            <input 
              className="w-full bg-brand-dark border border-brand-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-brand-cyan outline-none"
              placeholder="Buscar por nome ou ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Botão Novo */}
          <button 
            onClick={() => handleOpenModal()}
            className="bg-brand-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all"
          >
            <Plus size={20}/> Novo Item
          </button>
        </div>
      </div>

      {/* --- TABELA DE DADOS --- */}
      <div className="flex-1 bg-brand-card border border-brand-border rounded-xl shadow-lg overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand-dark/90 text-xs uppercase text-slate-400 font-bold sticky top-0 z-10 backdrop-blur-sm shadow-sm">
              <tr>
                <th className="p-4 w-12 text-center"><GripVertical size={16}/></th>
                <th className="p-4 w-32">ID (Banco)</th>
                <th className="p-4">Nome do Campo / Rótulo</th>
                <th className="p-4 w-40">Tipo</th>
                <th className="p-4 w-24 text-center">Criado em</th>
                <th className="p-4 w-24 text-center">Obrigatório</th>
                <th className="p-4 w-24 text-center">Visível</th>
                <th className="p-4 w-32 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border text-sm">
              {currentData.length > 0 ? currentData.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-brand-dark/30 transition-colors group">
                  <td className="p-4 text-center text-slate-600 cursor-move"><GripVertical size={16}/></td>
                  
                  {/* ID - Protegido e visualmente distinto */}
                  <td className="p-4">
                    <span className="font-mono text-xs text-brand-cyan bg-brand-cyan/10 px-2 py-1 rounded border border-brand-cyan/20">
                      {item.id}
                    </span>
                  </td>
                  
                  <td className="p-4 font-bold text-white">{item.label || item.name}</td>
                  
                  <td className="p-4">
                    <span className="text-xs px-2 py-1 rounded border border-slate-600 text-slate-300 bg-slate-700">
                      {item.type}
                    </span>
                  </td>
                  
                  <td className="p-4 text-center text-xs text-slate-500">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                  </td>

                  {/* Toggle Obrigatório */}
                  <td className="p-4 text-center">
                    {item.required 
                      ? <CheckSquare size={18} className="text-green-400 mx-auto"/> 
                      : <Square size={18} className="text-slate-700 mx-auto"/>}
                  </td>

                  {/* Toggle Visível */}
                  <td className="p-4 text-center">
                    {item.visible !== false 
                      ? <Eye size={18} className="text-brand-cyan mx-auto"/> 
                      : <EyeOff size={18} className="text-slate-700 mx-auto"/>}
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenModal(item)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded"><Edit3 size={16}/></button>
                      {!item.isSystem && (
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded"><Trash2 size={16}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-500 italic">
                    Nenhum registro encontrado nesta categoria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DE EDIÇÃO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-brand-card w-full max-w-md rounded-xl border border-brand-border shadow-2xl p-6 animate-in zoom-in-95">
            
            <div className="flex justify-between items-start mb-6 border-b border-brand-border pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {editingItem ? 'Editar Configuração' : 'Criar Novo Item'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {activeTab.toUpperCase()} &gt; {activeSubTab ? subTabs.find(t=>t.id===activeSubTab)?.label : 'Geral'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-white"/></button>
            </div>
            
            <div className="space-y-5">
              
              {/* ID Field (Read-only if editing system/existing item) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-2">
                  ID do Banco de Dados 
                  <span className="bg-slate-700 text-slate-300 text-[10px] px-1 rounded flex items-center gap-1">
                    <AlertTriangle size={10}/> Imutável
                  </span>
                </label>
                <input 
                  className="w-full bg-slate-800/50 border border-slate-700 p-3 rounded-lg text-slate-400 font-mono text-sm outline-none cursor-not-allowed"
                  value={formData.id}
                  disabled
                  title="O ID não pode ser alterado para manter integridade dos dados."
                />
              </div>

              {/* Label Field */}
              <div>
                <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Nome de Exibição (Rótulo)</label>
                <input 
                  className="w-full bg-brand-dark border border-brand-border p-3 rounded-lg text-white focus:border-brand-orange outline-none"
                  value={formData.label}
                  onChange={e => setFormData({...formData, label: e.target.value})}
                  placeholder="Ex: Nome da Empresa"
                  autoFocus
                />
              </div>

              {/* Type Field */}
              <div>
                <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Tipo de Dado</label>
                <select 
                  className="w-full bg-brand-dark border border-brand-border p-3 rounded-lg text-white focus:border-brand-orange outline-none"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  disabled={formData.isSystem} // Se for sistema, tipo geralmente é fixo
                >
                  <option value="Texto">Texto Curto</option>
                  <option value="Texto Longo">Texto Longo</option>
                  <option value="Número">Número</option>
                  <option value="Data">Data</option>
                  <option value="Seleção">Seleção Única</option>
                  <option value="Múltipla Seleção">Múltipla Seleção</option>
                  <option value="Opção Menu">Item de Lista (Opção)</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="flex gap-6 pt-2 bg-brand-dark p-3 rounded-lg border border-brand-border">
                 <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="accent-brand-orange w-4 h-4"
                      checked={formData.required}
                      onChange={e => setFormData({...formData, required: e.target.checked})}
                    />
                    <span className={`text-sm ${formData.required ? 'text-white font-bold' : 'text-slate-400'}`}>Obrigatório</span>
                 </label>

                 <div className="h-6 w-px bg-slate-700"></div>

                 <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="accent-brand-cyan w-4 h-4"
                      checked={formData.visible}
                      onChange={e => setFormData({...formData, visible: e.target.checked})}
                    />
                    <span className={`text-sm ${formData.visible ? 'text-white font-bold' : 'text-slate-400'}`}>Visível</span>
                 </label>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-brand-border">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleSave} className="bg-brand-orange text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 flex items-center gap-2 shadow-lg">
                <Save size={18}/> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}