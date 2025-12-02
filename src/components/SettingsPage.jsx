// src/components/SettingsPage.jsx
import React, { useState } from 'react';
import { Building2, MapPin, Tag, Briefcase, Mail, Globe, GraduationCap, Heart, Plus, X } from 'lucide-react';

export default function SettingsPage({ 
  companies, onAddCompany, onDelCompany,
  cities, onAddCity, onDelCity,
  interestAreas, onAddInterest, onDelInterest,
  roles, onAddRole, onDelRole,
  origins, onAddOrigin, onDelOrigin,
  schooling, onAddSchooling, onDelSchooling,
  marital, onAddMarital, onDelMarital,
  onImportCSV, isImporting
}) {
  const [inputs, setInputs] = useState({ 
    company: '', city: '', interest: '', role: '', origin: '', schooling: '', marital: '' 
  });

  const handleAdd = (key, fn) => {
    if (inputs[key]) { fn(inputs[key]); setInputs({ ...inputs, [key]: '' }); }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Configurações e Validações</h2>
        <div className="relative">
           <input type="file" accept=".csv" onChange={onImportCSV} id="csvUpload" className="hidden" disabled={isImporting} />
           <label htmlFor="csvUpload" className={`cursor-pointer bg-brand-cyan text-brand-dark font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-cyan-400 transition-colors ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
             {isImporting ? 'Importando...' : 'Importar Backup CSV'}
           </label>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Bloco 1: Dados da Vaga */}
        <ConfigBox title="Empresas" icon={Building2} items={companies} val={inputs.company} setVal={v => setInputs({...inputs, company: v})} onAdd={() => handleAdd('company', onAddCompany)} onDel={onDelCompany} />
        <ConfigBox title="Cidades / Locais" icon={MapPin} items={cities} val={inputs.city} setVal={v => setInputs({...inputs, city: v})} onAdd={() => handleAdd('city', onAddCity)} onDel={onDelCity} />
        <ConfigBox title="Cargos / Roles" icon={Briefcase} items={roles} val={inputs.role} setVal={v => setInputs({...inputs, role: v})} onAdd={() => handleAdd('role', onAddRole)} onDel={onDelRole} placeholder="Ex: Analista Jr..." />

        {/* Bloco 2: Dados do Candidato (Novas Validações) */}
        <ConfigBox title="Áreas de Interesse" icon={Tag} items={interestAreas} val={inputs.interest} setVal={v => setInputs({...inputs, interest: v})} onAdd={() => handleAdd('interest', onAddInterest)} onDel={onDelInterest} placeholder="Ex: Comercial, Tech..." />
        <ConfigBox title="Origens (Fonte)" icon={Globe} items={origins} val={inputs.origin} setVal={v => setInputs({...inputs, origin: v})} onAdd={() => handleAdd('origin', onAddOrigin)} onDel={onDelOrigin} placeholder="Ex: LinkedIn, Indicação..." />
        <ConfigBox title="Nível Escolaridade" icon={GraduationCap} items={schooling} val={inputs.schooling} setVal={v => setInputs({...inputs, schooling: v})} onAdd={() => handleAdd('schooling', onAddSchooling)} onDel={onDelSchooling} placeholder="Ex: Superior Completo..." />
        <ConfigBox title="Estado Civil" icon={Heart} items={marital} val={inputs.marital} setVal={v => setInputs({...inputs, marital: v})} onAdd={() => handleAdd('marital', onAddMarital)} onDel={onDelMarital} placeholder="Ex: Solteiro(a)..." />
      </div>
    </div>
  );
}

const ConfigBox = ({ title, icon: Icon, items = [], val, setVal, onAdd, onDel, placeholder = "Adicionar novo..." }) => (
  <div className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-lg flex flex-col h-80">
    <h3 className="font-bold flex items-center gap-2 mb-4 text-white"><Icon className="text-brand-cyan" size={20}/> {title}</h3>
    <div className="flex gap-2 mb-4">
      <input 
        value={val} 
        onChange={e => setVal(e.target.value)} 
        className="bg-brand-dark border border-brand-border p-2 rounded flex-1 text-sm outline-none focus:border-brand-orange text-white" 
        placeholder={placeholder} 
        onKeyDown={(e) => e.key === 'Enter' && onAdd()}
      />
      <button onClick={onAdd} className="bg-brand-orange text-white px-3 rounded text-sm hover:bg-orange-600"><Plus size={18}/></button>
    </div>
    <ul className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-2">
      {items.map(i => (
        <li key={i.id} className="flex justify-between items-center bg-brand-dark p-2 rounded text-sm text-slate-300 border border-brand-border group">
          <span className="truncate">{i.name}</span> 
          <button onClick={() => onDel(i.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
        </li>
      ))}
    </ul>
  </div>
);