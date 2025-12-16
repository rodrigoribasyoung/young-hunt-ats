import React, { useState } from 'react';
import { UploadCloud, X, ArrowRight, CheckCircle, AlertCircle, Download, FileSpreadsheet } from 'lucide-react';
import { CSV_FIELD_MAPPING_OPTIONS } from '../../constants';

export default function CsvImportModal({ isOpen, onClose, onImportData }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Options
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [parsedData, setParsedData] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importMode, setImportMode] = useState('skip'); // 'skip', 'overwrite', 'duplicate'
  const [customTag, setCustomTag] = useState('');
  const [useCustomTag, setUseCustomTag] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n');
      if (lines.length > 0) {
        // Parser CSV melhorado (suporta vírgulas dentro de aspas)
        const parseCSVLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const head = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
        setHeaders(head);
        
        const data = lines.slice(1).map(line => {
            if(!line.trim()) return null;
            const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, ''));
            const row = {};
            head.forEach((h, i) => row[h] = values[i] || '');
            return row;
        }).filter(Boolean);
        
        setParsedData(data);
        
        // Auto-guess mapping (Lógica Melhorada para seus campos)
        const initialMap = {};
        head.forEach(h => {
            const lowerH = h.toLowerCase().trim();
            
            // Tenta encontrar correspondência exata ou aproximada na lista de constantes
            const foundOption = CSV_FIELD_MAPPING_OPTIONS.find(opt => {
                const optLabel = opt.label.toLowerCase().replace(':', '').trim();
                return optLabel === lowerH || 
                       lowerH.includes(optLabel) ||
                       optLabel.includes(lowerH);
            });

            if (foundOption) {
                initialMap[h] = foundOption.value;
            } else {
                // Fallbacks genéricos caso o nome mude um pouco - ordem importa!
                if(lowerH.includes('nome completo') || (lowerH.includes('nome') && !lowerH.includes('instituição'))) initialMap[h] = 'fullName';
                else if(lowerH.includes('e-mail') || lowerH.includes('email') || lowerH.includes('mail')) initialMap[h] = 'email';
                else if(lowerH.includes('telefone') || lowerH.includes('celular') || lowerH.includes('whatsapp') || lowerH.includes('cel')) initialMap[h] = 'phone';
                else if(lowerH.includes('cidade onde') || lowerH.includes('cidade')) initialMap[h] = 'city';
                else if(lowerH.includes('onde você nos encontrou') || lowerH.includes('onde encontrou') || lowerH.includes('fonte') || lowerH.includes('origem')) initialMap[h] = 'source';
                else if(lowerH.includes('áreas de interesse') || lowerH.includes('área de interesse') || lowerH.includes('area interesse')) initialMap[h] = 'interestAreas';
                else if(lowerH.includes('formação') || lowerH.includes('formacao')) initialMap[h] = 'education';
                else if(lowerH.includes('currículo') || lowerH.includes('curriculo') || lowerH.includes('cv')) initialMap[h] = 'cvUrl';
                else if(lowerH.includes('portfólio') || lowerH.includes('portfolio')) initialMap[h] = 'portfolioUrl';
                else if(lowerH.includes('cnh') || lowerH.includes('carteira')) initialMap[h] = 'hasLicense';
                else if(lowerH.includes('estado civil')) initialMap[h] = 'maritalStatus';
                else if(lowerH.includes('escolaridade') || lowerH.includes('nível de escolaridade')) initialMap[h] = 'schoolingLevel';
            }
        });
        setMapping(initialMap);
        setStep(2);
      }
    };
    
    // Suporta CSV e XLSX
    if (uploadedFile.name.endsWith('.xlsx') || uploadedFile.name.endsWith('.xls')) {
      // Para XLSX, precisaríamos de uma biblioteca como xlsx, mas por enquanto vamos apenas avisar
      alert('Arquivos Excel (.xlsx) precisam ser convertidos para CSV primeiro. Use "Salvar como CSV" no Excel.');
      return;
    }
    
    reader.readAsText(uploadedFile);
  };

  const downloadTemplate = () => {
    // Cria um CSV modelo com todos os campos
    const templateHeaders = CSV_FIELD_MAPPING_OPTIONS.map(opt => opt.label);
    const csvContent = [
      templateHeaders.join(','),
      // Linha de exemplo
      templateHeaders.map((_, i) => {
        const examples = [
          'João Silva',
          'joao@email.com',
          '(11) 99999-9999',
          'São Paulo',
          '1990-01-15',
          '34',
          'Solteiro',
          '0',
          'https://exemplo.com/foto.jpg',
          'Sim',
          'Engenharia de Software',
          'Superior Completo',
          'Universidade XYZ',
          '2015-12-20',
          'Não',
          '5 anos como desenvolvedor...',
          'Curso de React, Node.js...',
          'Certificação AWS',
          'Desenvolvimento, Tecnologia',
          'https://exemplo.com/cv.pdf',
          'https://exemplo.com/portfolio',
          'LinkedIn',
          'Maria Santos',
          'R$ 8.000',
          'Sim',
          'Referência 1, Referência 2',
          'Vaga Específica',
          'Informações adicionais...',
          '2024-12-04T10:30:00',
          'COD123'
        ];
        return `"${examples[i] || ''}"`;
      }).join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `modelo_importacao_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMapChange = (header, systemField) => {
    setMapping(prev => ({...prev, [header]: systemField}));
  };

  const finishImport = () => {
    // Gera tag de importação
    const fileName = file?.name?.replace(/\.[^/.]+$/, '') || 'importacao';
    const dateTime = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const defaultTag = `${fileName}_${dateTime}`;
    const importTag = useCustomTag && customTag.trim() ? customTag.trim() : defaultTag;

    const finalCandidates = parsedData.map(row => {
        const candidate = {};
        Object.keys(mapping).forEach(header => {
            if(mapping[header]) {
                candidate[mapping[header]] = row[header];
            }
        });
        // Default fields
        candidate.status = 'Inscrito';
        candidate.createdAt = new Date().toISOString();
        candidate.imported = true;
        candidate.importTag = importTag;
        candidate.importDate = new Date().toISOString();
        return candidate;
    });

    onImportData(finalCandidates, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-brand-card rounded-xl shadow-2xl w-full max-w-2xl border border-brand-border flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-dark/50">
           <h3 className="font-bold text-xl text-white">Importação em Massa (CSV)</h3>
           <button onClick={onClose}><X className="text-slate-400 hover:text-white"/></button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
           {step === 1 && (
             <div className="space-y-6">
               {/* Botão de Download do Modelo */}
               <div className="bg-brand-dark/50 border border-brand-border rounded-xl p-6">
                 <div className="flex items-center gap-3 mb-4">
                   <FileSpreadsheet size={24} className="text-brand-cyan"/>
                   <div>
                     <h4 className="text-white font-bold text-sm">Modelo de Importação</h4>
                     <p className="text-slate-400 text-xs">Baixe o arquivo modelo para ver o formato correto</p>
                   </div>
                 </div>
                 <button 
                   onClick={downloadTemplate}
                   className="w-full bg-brand-cyan text-brand-dark font-bold px-4 py-3 rounded-lg hover:bg-cyan-400 flex items-center justify-center gap-2"
                 >
                   <Download size={18}/>
                   Baixar Modelo CSV
                 </button>
               </div>

               {/* Área de Upload */}
               <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-brand-border rounded-xl bg-brand-dark/30 hover:bg-brand-dark/50 transition-colors">
                 <UploadCloud size={48} className="text-brand-cyan mb-4"/>
                 <p className="text-white font-medium mb-2">Arraste seu arquivo CSV/XLSX ou clique para selecionar</p>
                 <p className="text-slate-400 text-xs mb-4">Formatos aceitos: .csv, .xlsx</p>
                 <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" id="fileInput"/>
                 <label htmlFor="fileInput" className="bg-brand-orange text-white px-4 py-2 rounded cursor-pointer hover:bg-orange-600">
                   Escolher Arquivo
                 </label>
                 {file && (
                   <p className="text-brand-cyan text-sm mt-3 font-medium">
                     ✓ {file.name} ({parsedData.length} linhas detectadas)
                   </p>
                 )}
               </div>
             </div>
           )}

           {step === 2 && (
             <div className="space-y-4">
                <div className="bg-brand-cyan/10 border border-brand-cyan/30 p-4 rounded-lg mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-brand-cyan shrink-0 mt-0.5"/>
                    <div>
                      <h4 className="text-white font-bold text-sm mb-1">Revisão de Vínculos</h4>
                      <p className="text-slate-300 text-xs">
                        Revise os vínculos automáticos. Campos já identificados estão marcados. 
                        Você pode alterar ou ignorar colunas que não deseja importar.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {headers.map(header => {
                    const isMapped = !!mapping[header];
                    const mappedField = CSV_FIELD_MAPPING_OPTIONS.find(opt => opt.value === mapping[header]);
                    return (
                      <div 
                        key={header} 
                        className={`grid grid-cols-2 gap-4 items-center p-3 rounded-lg border ${
                          isMapped 
                            ? 'bg-brand-cyan/5 border-brand-cyan/30' 
                            : 'bg-brand-dark/30 border-brand-border'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium">{header}</span>
                          {isMapped && (
                            <span className="text-xs bg-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded">
                              ✓ Auto-detectado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                           <ArrowRight size={14} className="text-slate-500"/>
                           <select 
                             className={`bg-brand-dark border rounded p-2 text-sm text-white w-full focus:border-brand-cyan outline-none ${
                               isMapped ? 'border-brand-cyan/50' : 'border-brand-border'
                             }`}
                             value={mapping[header] || ''}
                             onChange={e => handleMapChange(header, e.target.value)}
                           >
                              <option value="">⚠️ Ignorar Coluna</option>
                              {CSV_FIELD_MAPPING_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label} {mapping[header] === opt.value ? '✓' : ''}
                                </option>
                              ))}
                           </select>
                        </div>
                        {mappedField && (
                          <div className="col-span-2 text-xs text-brand-cyan mt-1">
                            → Será mapeado para: <strong>{mappedField.label}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 bg-brand-dark/50 rounded-lg border border-brand-border">
                  <p className="text-xs text-slate-400">
                    <strong className="text-brand-cyan">{headers.filter(h => mapping[h]).length}</strong> de <strong>{headers.length}</strong> colunas mapeadas
                  </p>
                </div>
             </div>
           )}

           {step === 3 && (
             <div className="space-y-6">
                <div className="bg-brand-cyan/10 border border-brand-cyan/30 p-4 rounded-lg flex gap-3 items-start">
                    <CheckCircle className="text-brand-cyan shrink-0 mt-1" size={20}/>
                    <div>
                        <h4 className="text-white font-bold text-sm">Pronto para importar!</h4>
                        <p className="text-brand-cyan text-sm">{parsedData.length} candidatos encontrados.</p>
                        <p className="text-slate-400 text-xs mt-1">Arquivo: {file?.name}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-white text-sm font-bold uppercase">Como tratar duplicados? (pelo e-mail)</label>
                    <div className="space-y-2">
                        <label className={`flex items-center gap-3 p-3 bg-brand-dark border rounded cursor-pointer transition-colors ${
                          importMode === 'skip' ? 'border-brand-orange bg-brand-orange/10' : 'border-brand-border hover:border-brand-orange'
                        }`}>
                            <input type="radio" name="mode" value="skip" checked={importMode === 'skip'} onChange={() => setImportMode('skip')} className="accent-brand-orange"/>
                            <div>
                                <span className="block text-white text-sm font-bold">Pular (Manter atual)</span>
                                <span className="block text-slate-400 text-xs">Se o candidato já existir, não faz nada.</span>
                            </div>
                        </label>
                        <label className={`flex items-center gap-3 p-3 bg-brand-dark border rounded cursor-pointer transition-colors ${
                          importMode === 'overwrite' ? 'border-brand-orange bg-brand-orange/10' : 'border-brand-border hover:border-brand-orange'
                        }`}>
                            <input type="radio" name="mode" value="overwrite" checked={importMode === 'overwrite'} onChange={() => setImportMode('overwrite')} className="accent-brand-orange"/>
                            <div>
                                <span className="block text-white text-sm font-bold">Substituir / Atualizar</span>
                                <span className="block text-slate-400 text-xs">Atualiza os dados do candidato existente com os novos.</span>
                            </div>
                        </label>
                        <label className={`flex items-center gap-3 p-3 bg-brand-dark border rounded cursor-pointer transition-colors ${
                          importMode === 'duplicate' ? 'border-brand-orange bg-brand-orange/10' : 'border-brand-border hover:border-brand-orange'
                        }`}>
                            <input type="radio" name="mode" value="duplicate" checked={importMode === 'duplicate'} onChange={() => setImportMode('duplicate')} className="accent-brand-orange"/>
                            <div>
                                <span className="block text-white text-sm font-bold">Duplicar</span>
                                <span className="block text-slate-400 text-xs">Cria um novo registro mesmo se já existir.</span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Tags de Importação */}
                <div className="space-y-3 border-t border-brand-border pt-4">
                    <label className="text-white text-sm font-bold uppercase">Tag de Importação</label>
                    <div className="bg-brand-dark/50 border border-brand-border rounded-lg p-4 space-y-3">
                        <div>
                            <p className="text-slate-300 text-xs mb-2">Tag padrão (será usada se não houver tag personalizada):</p>
                            <div className="bg-brand-card border border-brand-border rounded p-2 text-xs text-brand-cyan font-mono">
                                {file?.name?.replace(/\.[^/.]+$/, '') || 'importacao'}_{new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <input 
                                type="checkbox" 
                                id="useCustomTag"
                                checked={useCustomTag}
                                onChange={(e) => setUseCustomTag(e.target.checked)}
                                className="mt-1 accent-brand-orange"
                            />
                            <div className="flex-1">
                                <label htmlFor="useCustomTag" className="text-white text-sm font-medium cursor-pointer block mb-2">
                                    Usar tag personalizada
                                </label>
                                <input
                                    type="text"
                                    value={customTag}
                                    onChange={(e) => setCustomTag(e.target.value)}
                                    disabled={!useCustomTag}
                                    placeholder="Ex: Importação Dezembro 2024"
                                    className="w-full bg-brand-dark border border-brand-border rounded p-2 text-sm text-white outline-none focus:border-brand-cyan disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <p className="text-slate-400 text-xs mt-1">
                                    A tag ajuda a identificar e filtrar candidatos importados em lote
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
           )}
        </div>

        <div className="p-6 border-t border-brand-border flex justify-between bg-brand-dark/30">
           {step > 1 && <button onClick={() => setStep(s => s-1)} className="text-slate-400 hover:text-white px-4">Voltar</button>}
           {step < 3 ? (
             <button 
                onClick={() => setStep(s => s+1)} 
                disabled={!file}
                className="ml-auto bg-brand-cyan text-brand-dark font-bold px-6 py-2 rounded hover:bg-cyan-400 disabled:opacity-50"
             >
                Próximo
             </button>
           ) : (
             <button 
                onClick={finishImport} 
                className="ml-auto bg-brand-orange text-white font-bold px-6 py-2 rounded hover:bg-orange-600"
             >
                Confirmar Importação
             </button>
           )}
        </div>
      </div>
    </div>
  );
}