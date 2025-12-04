import React, { useState } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';

export default function TransitionModal({ transition, onClose, onConfirm, cities, interestAreas, schooling, marital, origins }) {
  // transition contém: { candidate, toStage, missingFields, isConclusion }
  
  const [data, setData] = useState({
    feedback: '',
    returnSent: false,
    // Cidades agora vem do candidato, não é um campo editável aqui
  });

  const fieldLabels = {
    city: 'Cidade',
    hasLicense: 'Possui CNH',
    interestAreas: 'Áreas de Interesse',
    education: 'Formação',
    experience: 'Experiência Anterior',
    maritalStatus: 'Estado Civil',
    source: 'Onde encontrou'
  };

  const handleSave = () => {
    // Validação básica dos campos faltantes
    for (let field of transition.missingFields) {
        // Verifica se o campo está vazio no state 'data'
        if (!data[field] || data[field] === '') {
            alert(`O campo ${fieldLabels[field] || field} é obrigatório para esta etapa.`);
            return;
        }
    }

    if (transition.isConclusion && !data.feedback) {
      alert("O feedback/observação é obrigatório para encerrar o processo.");
      return;
    }

    if (transition.isConclusion && !data.returnSent) {
       if(!confirm("Você não marcou que o retorno foi enviado. Deseja continuar mesmo assim?")) {
         return;
       }
    }
    
    onConfirm(data);
  };

  const renderInput = (field) => {
    const commonClass = "w-full bg-brand-dark border border-brand-border p-2 rounded text-white text-sm focus:border-brand-orange outline-none";

    switch(field) {
        case 'hasLicense':
            return (
                <select className={commonClass} value={data.hasLicense} onChange={e => setData({...data, hasLicense: e.target.value})}>
                    <option value="">Selecione...</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                </select>
            );
        case 'interestAreas':
             return (
                <select className={commonClass} value={data.interestAreas} onChange={e => setData({...data, interestAreas: e.target.value})}>
                    <option value="">Selecione...</option>
                    {interestAreas && interestAreas.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                </select>
            );
        case 'maritalStatus':
             return (
                <select className={commonClass} value={data.maritalStatus} onChange={e => setData({...data, maritalStatus: e.target.value})}>
                    <option value="">Selecione...</option>
                    {marital && marital.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
            );
        case 'source':
             return (
                <select className={commonClass} value={data.source} onChange={e => setData({...data, source: e.target.value})}>
                    <option value="">Selecione...</option>
                    {origins && origins.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
            );
        case 'experience':
            return (
                <textarea className={commonClass + " h-20"} value={data.experience} onChange={e => setData({...data, experience: e.target.value})} />
            );
        default:
            return (
                <input className={commonClass} value={data[field]} onChange={e => setData({...data, [field]: e.target.value})} />
            );
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-brand-card rounded-xl shadow-2xl w-full max-w-md border border-brand-orange animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center bg-brand-orange/10">
          <h3 className="font-bold text-white flex items-center gap-2">
            <AlertTriangle size={20} className="text-brand-orange" />
            Requisitos da Etapa
          </h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-white" /></button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <p className="text-sm text-slate-300">
            Movendo <strong>{transition.candidate.fullName}</strong> para <strong className="text-brand-cyan">{transition.toStage}</strong>.
          </p>

          {/* Mostrar dados relevantes do candidato */}
          {transition.candidate.city && (
            <div className="bg-brand-dark/50 border border-brand-border p-3 rounded text-xs">
              <p className="text-slate-400">📍 Cidade: <span className="text-brand-cyan font-bold">{transition.candidate.city}</span></p>
            </div>
          )}

          {transition.missingFields.length > 0 && (
             <div className="bg-red-500/10 border border-red-500/30 p-3 rounded text-xs text-red-200 mb-2">
                Preencha os dados obrigatórios abaixo para continuar.
             </div>
          )}

          {transition.missingFields.map(field => (
            <div key={field}>
              <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">{fieldLabels[field] || field} *</label>
              {renderInput(field)}
            </div>
          ))}

          {transition.isConclusion && (
            <div className="space-y-4 pt-4 border-t border-brand-border mt-4">
               <div>
                  <label className="block text-xs font-bold text-brand-cyan uppercase mb-1.5">Feedback / Observação *</label>
                  <textarea 
                    className="w-full bg-brand-dark border border-brand-border p-2 rounded text-white text-sm h-24 focus:border-brand-orange outline-none"
                    placeholder="Descreva o motivo..."
                    value={data.feedback}
                    onChange={e => setData({...data, feedback: e.target.value})}
                  />
               </div>
               <div className="flex items-start gap-2 bg-brand-dark p-3 rounded border border-brand-border">
                  <input 
                    type="checkbox" 
                    id="returnSent"
                    className="w-4 h-4 mt-0.5 accent-brand-orange"
                    checked={data.returnSent}
                    onChange={e => setData({...data, returnSent: e.target.checked})}
                  />
                  <label htmlFor="returnSent" className="text-sm text-white cursor-pointer select-none">
                    Confirmo que o retorno (positivo ou negativo) foi dado ao candidato.
                  </label>
               </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-brand-dark/50 flex justify-end gap-2 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white rounded text-sm">Cancelar</button>
          <button onClick={handleSave} className="bg-brand-orange text-white px-4 py-2 rounded text-sm font-bold hover:bg-orange-600 flex items-center gap-2">
            <Save size={16} /> Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}