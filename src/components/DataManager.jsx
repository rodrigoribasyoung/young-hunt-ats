// src/components/DataManager.jsx
// Gerenciamento de Dados Base: Empresas, Cidades, Áreas, Setores, Cargos, Funções

import React, { useState, useEffect } from 'react';
import { 
  Building2, MapPin, Briefcase, Users, Layers, Tag,
  Plus, Edit3, Trash2, Search, Save, X, ChevronDown, ChevronRight
} from 'lucide-react';
import { 
  collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

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

// Componente genérico para gerenciar uma coleção
const CollectionManager = ({ 
  collectionName, 
  title, 
  icon: Icon, 
  fields, 
  onShowToast,
  relatedCollections = {}
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [relatedData, setRelatedData] = useState({});

  // Carregar dados da coleção
  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error(`Erro ao carregar ${collectionName}:`, error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [collectionName]);

  // Carregar coleções relacionadas
  useEffect(() => {
    const unsubscribes = [];
    Object.entries(relatedCollections).forEach(([key, colName]) => {
      const q = query(collection(db, colName), orderBy('name', 'asc'));
      const unsub = onSnapshot(q, (snapshot) => {
        setRelatedData(prev => ({
          ...prev,
          [key]: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        }));
      });
      unsubscribes.push(unsub);
    });
    return () => unsubscribes.forEach(u => u());
  }, [relatedCollections]);

  const initForm = () => {
    const initial = {};
    fields.forEach(f => { initial[f.key] = ''; });
    return initial;
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData(initForm());
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    const data = {};
    fields.forEach(f => { data[f.key] = item[f.key] || ''; });
    setFormData(data);
    setShowForm(true);
  };

  const handleSave = async () => {
    const nameField = fields.find(f => f.key === 'name');
    if (nameField && !formData.name?.trim()) {
      if (onShowToast) onShowToast('Nome é obrigatório', 'error');
      return;
    }

    try {
      const data = { ...formData, updatedAt: serverTimestamp() };
      
      if (editingItem) {
        await updateDoc(doc(db, collectionName, editingItem.id), data);
        if (onShowToast) onShowToast(`${title} atualizado`, 'success');
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, collectionName), data);
        if (onShowToast) onShowToast(`${title} criado`, 'success');
      }

      setShowForm(false);
      setEditingItem(null);
      setFormData(initForm());
    } catch (error) {
      console.error('Erro ao salvar:', error);
      if (onShowToast) onShowToast('Erro ao salvar', 'error');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Excluir "${item.name}"?`)) return;
    try {
      await deleteDoc(doc(db, collectionName, item.id));
      if (onShowToast) onShowToast('Excluído com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao excluir:', error);
      if (onShowToast) onShowToast('Erro ao excluir', 'error');
    }
  };

  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.code?.toLowerCase().includes(search.toLowerCase())
  );

  const renderField = (field) => {
    if (field.type === 'select' && field.relatedCollection) {
      const options = relatedData[field.relatedCollection] || [];
      return (
        <select
          className="w-full bg-gray-900 border border-gray-600 p-2.5 rounded-lg text-white text-sm outline-none focus:border-blue-500"
          value={formData[field.key] || ''}
          onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
        >
          <option value="">Selecione...</option>
          {options.map(opt => (
            <option key={opt.id} value={opt.name}>{opt.name}</option>
          ))}
        </select>
      );
    }
    
    if (field.type === 'textarea') {
      return (
        <textarea
          className="w-full bg-gray-900 border border-gray-600 p-2.5 rounded-lg text-white text-sm outline-none focus:border-blue-500 h-20"
          value={formData[field.key] || ''}
          onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
          placeholder={field.placeholder}
        />
      );
    }

    return (
      <input
        type={field.type || 'text'}
        className="w-full bg-gray-900 border border-gray-600 p-2.5 rounded-lg text-white text-sm outline-none focus:border-blue-500"
        value={formData[field.key] || ''}
        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
        placeholder={field.placeholder}
      />
    );
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Icon size={20} className="text-blue-400" />
          <h3 className="font-bold text-white">{title}</h3>
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">{items.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar..."
              className="bg-gray-900 border border-gray-600 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white w-40 outline-none focus:border-blue-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
          >
            <Plus size={14} /> Novo
          </button>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="p-4 bg-blue-900/20 border-b border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {fields.map(field => (
              <div key={field.key} className={field.fullWidth ? 'col-span-2 md:col-span-3' : ''}>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => { setShowForm(false); setEditingItem(null); }}
              className="px-3 py-1.5 text-gray-400 hover:text-white text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
            >
              <Save size={14} /> {editingItem ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Carregando...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {search ? 'Nenhum resultado encontrado' : 'Nenhum registro cadastrado'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase sticky top-0">
              <tr>
                {fields.slice(0, 4).map(field => (
                  <th key={field.key} className="p-3 text-left">{field.label}</th>
                ))}
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-700/30">
                  {fields.slice(0, 4).map(field => (
                    <td key={field.key} className="p-3 text-white">
                      {field.key === 'name' ? (
                        <span className="font-medium">{item[field.key] || '-'}</span>
                      ) : (
                        <span className="text-gray-400">{item[field.key] || '-'}</span>
                      )}
                    </td>
                  ))}
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded mr-1"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 text-red-400 hover:bg-red-900/30 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
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

// Componente principal
export default function DataManager({ onShowToast }) {
  const [activeSection, setActiveSection] = useState('empresas');

  const sections = [
    { 
      id: 'empresas', 
      label: 'Empresas/Unidades', 
      icon: Building2,
      collection: 'companies',
      fields: [
        { key: 'name', label: 'Nome', required: true, placeholder: 'Nome da empresa/unidade' },
        { key: 'code', label: 'Código', placeholder: 'Código interno (ex: UN01)' },
        { key: 'city', label: 'Cidade', type: 'select', relatedCollection: 'cities' },
        { key: 'type', label: 'Tipo', placeholder: 'Matriz, Filial, Unidade...' },
        { key: 'address', label: 'Endereço', placeholder: 'Endereço completo' },
        { key: 'phone', label: 'Telefone', placeholder: '(51) 99999-9999' },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'contato@empresa.com' },
        { key: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00' },
      ],
      relatedCollections: { cities: 'cities' }
    },
    { 
      id: 'cidades', 
      label: 'Cidades', 
      icon: MapPin,
      collection: 'cities',
      fields: [
        { key: 'name', label: 'Nome', required: true, placeholder: 'Nome da cidade' },
        { key: 'state', label: 'Estado/UF', placeholder: 'RS, SC, PR...' },
        { key: 'region', label: 'Região', placeholder: 'Sul, Sudeste...' },
      ],
      relatedCollections: {}
    },
    { 
      id: 'areas', 
      label: 'Áreas de Interesse', 
      icon: Layers,
      collection: 'interestAreas',
      fields: [
        { key: 'name', label: 'Nome', required: true, placeholder: 'Nome da área' },
        { key: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Descrição da área' },
      ],
      relatedCollections: {}
    },
    { 
      id: 'setores', 
      label: 'Setores', 
      icon: Briefcase,
      collection: 'sectors',
      fields: [
        { key: 'name', label: 'Nome', required: true, placeholder: 'Nome do setor' },
        { key: 'area', label: 'Área', type: 'select', relatedCollection: 'areas' },
        { key: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Descrição do setor' },
      ],
      relatedCollections: { areas: 'interestAreas' }
    },
    { 
      id: 'cargos', 
      label: 'Cargos', 
      icon: Users,
      collection: 'positions',
      fields: [
        { key: 'name', label: 'Nome do Cargo', required: true, placeholder: 'Ex: Analista de RH' },
        { key: 'level', label: 'Nível', placeholder: 'Júnior, Pleno, Sênior...' },
        { key: 'area', label: 'Área', type: 'select', relatedCollection: 'areas' },
        { key: 'sector', label: 'Setor', type: 'select', relatedCollection: 'sectors' },
        { key: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Atribuições do cargo', fullWidth: true },
      ],
      relatedCollections: { areas: 'interestAreas', sectors: 'sectors' }
    },
    { 
      id: 'funcoes', 
      label: 'Funções', 
      icon: Tag,
      collection: 'functions',
      fields: [
        { key: 'name', label: 'Nome da Função', required: true, placeholder: 'Ex: Recrutador' },
        { key: 'position', label: 'Cargo', type: 'select', relatedCollection: 'positions' },
        { key: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Descrição da função' },
      ],
      relatedCollections: { positions: 'positions' }
    },
  ];

  const activeConfig = sections.find(s => s.id === activeSection);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Dados Base</h2>
          <p className="text-sm text-gray-400 mt-1">
            Gerencie empresas, cidades, áreas, setores, cargos e funções
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeSection === section.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <section.icon size={16} />
            {section.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeConfig && (
        <CollectionManager
          key={activeConfig.id}
          collectionName={activeConfig.collection}
          title={activeConfig.label}
          icon={activeConfig.icon}
          fields={activeConfig.fields}
          onShowToast={onShowToast}
          relatedCollections={activeConfig.relatedCollections}
        />
      )}

      {/* Dica */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 text-sm">
        <p className="text-blue-300 font-medium mb-1">💡 Dica</p>
        <p className="text-blue-400/80">
          Cadastre primeiro Cidades e Áreas, depois Setores e Cargos, e por último Funções.
          Esses dados serão usados no cadastro de Vagas e Candidaturas.
        </p>
      </div>
    </div>
  );
}




