import React, { useState, useMemo } from 'react';
import { X, User, MapPin, Mail, Phone, Plus, Trash2, ChevronDown, ChevronUp, MessageSquare, ArrowRight, Search, UserPlus } from 'lucide-react';
import { STATUS_COLORS, PIPELINE_STAGES, CLOSING_STATUSES, ALL_STATUSES } from '../../constants';

export default function JobCandidatesModal({ 
  isOpen, 
  onClose, 
  job, 
  candidates = [],
  applications = [],
  onCreateApplication,
  onUpdateApplicationStatus,
  onRemoveApplication,
  onAddApplicationNote,
  onEditCandidate
}) {
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [searchCandidate, setSearchCandidate] = useState('');
  const [expandedApp, setExpandedApp] = useState(null);
  const [newNote, setNewNote] = useState('');

  if (!isOpen || !job) return null;

  // Candidaturas desta vaga
  const jobApplications = applications.filter(a => a.jobId === job.id);
  
  // Candidatos que já estão vinculados a esta vaga
  const linkedCandidateIds = jobApplications.map(a => a.candidateId);
  
  // Candidatos disponíveis para vincular (que não estão nesta vaga)
  const availableCandidates = candidates.filter(c => 
    !linkedCandidateIds.includes(c.id) &&
    (c.fullName?.toLowerCase().includes(searchCandidate.toLowerCase()) ||
     c.email?.toLowerCase().includes(searchCandidate.toLowerCase()))
  );

  // Estatísticas
  const stats = useMemo(() => {
    const byStatus = {};
    PIPELINE_STAGES.forEach(s => byStatus[s] = 0);
    CLOSING_STATUSES.forEach(s => byStatus[s] = 0);
    
    jobApplications.forEach(app => {
      const status = app.status || 'Inscrito';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });
    
    return byStatus;
  }, [jobApplications]);

  const handleAddCandidate = async (candidateId) => {
    if (onCreateApplication) {
      await onCreateApplication(candidateId, job.id);
      setSearchCandidate('');
    }
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    if (onUpdateApplicationStatus) {
      await onUpdateApplicationStatus(applicationId, newStatus);
    }
  };

  const handleAddNote = async (applicationId) => {
    if (onAddApplicationNote && newNote.trim()) {
      await onAddApplicationNote(applicationId, newNote);
      setNewNote('');
    }
  };

  // Formatar data
  const formatDate = (ts) => {
    if (!ts) return 'N/A';
    let date;
    if (ts.seconds || ts._seconds) {
      date = new Date((ts.seconds || ts._seconds) * 1000);
    } else if (ts.toDate) {
      date = ts.toDate();
    } else {
      date = new Date(ts);
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <div>
            <h3 className="font-bold text-xl text-gray-900 dark:text-white">{job.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{job.company} {job.city && `• ${job.city}`}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{jobApplications.length}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">candidaturas</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <X className="text-gray-500 dark:text-gray-400"/>
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-6 py-3 bg-gray-100 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700 flex gap-3 flex-wrap">
          {Object.entries(stats).filter(([_, count]) => count > 0).map(([status, count]) => (
            <div key={status} className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-200 text-gray-700'}`}>
              {status}: {count}
            </div>
          ))}
        </div>

        {/* Add Candidate Button/Section */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          {!showAddCandidate ? (
            <button
              onClick={() => setShowAddCandidate(true)}
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm"
            >
              <UserPlus size={18}/> Vincular candidato a esta vaga
            </button>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium text-blue-800 dark:text-blue-300">Selecione um candidato do banco de talentos:</span>
                <button onClick={() => setShowAddCandidate(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={18}/>
                </button>
              </div>
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400"/>
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={searchCandidate}
                  onChange={e => setSearchCandidate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {searchCandidate && (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {availableCandidates.slice(0, 10).map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => handleAddCandidate(c.id)}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-500 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover rounded-full"/> : <User size={16}/>}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white text-sm">{c.fullName}</div>
                          <div className="text-xs text-gray-500">{c.email}</div>
                        </div>
                      </div>
                      <Plus size={18} className="text-blue-500"/>
                    </div>
                  ))}
                  {availableCandidates.length === 0 && searchCandidate && (
                    <div className="text-center text-gray-500 py-4 text-sm">
                      Nenhum candidato encontrado
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Applications List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {jobApplications.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-16">
              <UserPlus size={48} className="mx-auto mb-4 opacity-30"/>
              <p>Nenhum candidato vinculado a esta vaga ainda.</p>
              <p className="text-sm mt-2">Clique em "Vincular candidato" para adicionar.</p>
            </div>
          ) : (
            jobApplications.map(app => {
              const candidate = candidates.find(c => c.id === app.candidateId);
              const isExpanded = expandedApp === app.id;
              
              return (
                <div key={app.id} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Main Row */}
                  <div className="p-4 flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 border-2 border-white dark:border-gray-600 shadow">
                      {candidate?.photoUrl ? (
                        <img src={candidate.photoUrl} className="w-full h-full object-cover rounded-full"/>
                      ) : (
                        <User size={24} className="text-gray-500"/>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 
                          className="font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                          onClick={() => onEditCandidate && onEditCandidate(candidate)}
                        >
                          {app.candidateName}
                        </h4>
                        <span className="text-xs text-gray-500">Candidatou em {formatDate(app.appliedAt)}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {candidate?.email && <span className="flex items-center gap-1"><Mail size={12}/> {candidate.email}</span>}
                        {candidate?.phone && <span className="flex items-center gap-1"><Phone size={12}/> {candidate.phone}</span>}
                        {candidate?.city && <span className="flex items-center gap-1"><MapPin size={12}/> {candidate.city}</span>}
                      </div>
                    </div>
                    
                    {/* Status Selector */}
                    <div className="flex items-center gap-2">
                      <select
                        value={app.status || 'Inscrito'}
                        onChange={e => handleStatusChange(app.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 outline-none cursor-pointer ${STATUS_COLORS[app.status] || 'bg-gray-200 text-gray-700'}`}
                      >
                        <optgroup label="Funil">
                          {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </optgroup>
                        <optgroup label="Fechamento">
                          {CLOSING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </optgroup>
                      </select>
                      
                      {/* Expand/Actions */}
                      <button
                        onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                      </button>
                      
                      <button
                        onClick={() => onRemoveApplication && onRemoveApplication(app.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remover candidato desta vaga"
                      >
                        <Trash2 size={18}/>
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Section */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/50">
                      {/* Notas */}
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-700 dark:text-gray-300 text-sm mb-2 flex items-center gap-2">
                          <MessageSquare size={14}/> Notas da Candidatura
                        </h5>
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            placeholder="Adicionar nota sobre esta candidatura..."
                            value={newNote}
                            onChange={e => setNewNote(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleAddNote(app.id)}
                            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleAddNote(app.id)}
                            disabled={!newNote.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Adicionar
                          </button>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {(app.notes || []).map((note, idx) => (
                            <div key={idx} className="bg-gray-100 dark:bg-gray-900 rounded-lg p-2 text-sm">
                              <p className="text-gray-700 dark:text-gray-300">{note.text}</p>
                              <p className="text-xs text-gray-500 mt-1">{note.userName} • {formatDate(note.timestamp)}</p>
                            </div>
                          ))}
                          {(!app.notes || app.notes.length === 0) && (
                            <p className="text-xs text-gray-500 text-center py-2">Nenhuma nota adicionada</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Quick Info */}
                      {candidate && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {candidate.interestAreas && (
                            <div>
                              <span className="text-gray-500">Área:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{candidate.interestAreas}</span>
                            </div>
                          )}
                          {candidate.experience && (
                            <div>
                              <span className="text-gray-500">Experiência:</span>
                              <span className="ml-2 text-gray-900 dark:text-white truncate">{candidate.experience.substring(0, 50)}...</span>
                            </div>
                          )}
                          {candidate.schoolingLevel && (
                            <div>
                              <span className="text-gray-500">Escolaridade:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{candidate.schoolingLevel}</span>
                            </div>
                          )}
                          {candidate.salaryExpectation && (
                            <div>
                              <span className="text-gray-500">Expectativa Salarial:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{candidate.salaryExpectation}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {stats['Contratado'] > 0 && (
              <span className="text-green-600 font-medium">{stats['Contratado']} contratado(s)</span>
            )}
          </div>
          <button onClick={onClose} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
