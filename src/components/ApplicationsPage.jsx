import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, X, User, Mail, Phone, MapPin, Building2, Briefcase, 
  Calendar, ChevronDown, ChevronUp, Eye, Trash2, MessageSquare, Plus,
  TrendingUp, Users, Clock, CheckCircle, XCircle, AlertCircle, FileText,
  ArrowRight, MoreVertical
} from 'lucide-react';
import { STATUS_COLORS, PIPELINE_STAGES, CLOSING_STATUSES, ALL_STATUSES } from '../constants';

export default function ApplicationsPage({
  applications = [],
  candidates = [],
  jobs = [],
  companies = [],
  onUpdateApplicationStatus,
  onRemoveApplication,
  onAddApplicationNote,
  onEditCandidate,
  onViewJob,
  onCreateApplication
}) {
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados de UI
  const [expandedApp, setExpandedApp] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [sortField, setSortField] = useState('appliedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Métricas/Resumo
  const stats = useMemo(() => {
    const total = applications.length;
    const byStatus = {};
    const byJob = {};
    const byCompany = {};
    
    PIPELINE_STAGES.forEach(s => byStatus[s] = 0);
    CLOSING_STATUSES.forEach(s => byStatus[s] = 0);
    
    applications.forEach(app => {
      const status = app.status || 'Inscrito';
      byStatus[status] = (byStatus[status] || 0) + 1;
      
      const jobTitle = app.jobTitle || 'Sem vaga';
      byJob[jobTitle] = (byJob[jobTitle] || 0) + 1;
      
      const company = app.jobCompany || 'Sem empresa';
      byCompany[company] = (byCompany[company] || 0) + 1;
    });
    
    // Taxas de conversão
    const inProcess = applications.filter(a => PIPELINE_STAGES.includes(a.status)).length;
    const hired = byStatus['Contratado'] || 0;
    const rejected = byStatus['Reprovado'] || 0;
    const withdrawn = byStatus['Desistiu da vaga'] || 0;
    const closed = hired + rejected + withdrawn;
    const conversionRate = total > 0 ? ((hired / total) * 100).toFixed(1) : 0;
    
    return { 
      total, 
      byStatus, 
      byJob, 
      byCompany, 
      inProcess, 
      hired, 
      rejected, 
      withdrawn,
      closed,
      conversionRate 
    };
  }, [applications]);
  
  // Filtrar candidaturas
  const filteredApplications = useMemo(() => {
    let filtered = [...applications];
    
    // Busca por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(app => 
        app.candidateName?.toLowerCase().includes(term) ||
        app.candidateEmail?.toLowerCase().includes(term) ||
        app.jobTitle?.toLowerCase().includes(term) ||
        app.jobCompany?.toLowerCase().includes(term)
      );
    }
    
    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }
    
    // Filtro por vaga
    if (jobFilter !== 'all') {
      filtered = filtered.filter(app => app.jobId === jobFilter);
    }
    
    // Filtro por empresa
    if (companyFilter !== 'all') {
      filtered = filtered.filter(app => app.jobCompany === companyFilter);
    }
    
    // Filtro por período
    if (periodFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(app => {
        let appDate;
        if (app.appliedAt?.seconds) {
          appDate = new Date(app.appliedAt.seconds * 1000);
        } else if (app.appliedAt?.toDate) {
          appDate = app.appliedAt.toDate();
        } else if (app.appliedAt) {
          appDate = new Date(app.appliedAt);
        } else {
          return false;
        }
        
        const diffDays = Math.floor((today - appDate) / (1000 * 60 * 60 * 24));
        
        switch (periodFilter) {
          case 'today': return diffDays === 0;
          case 'week': return diffDays <= 7;
          case 'month': return diffDays <= 30;
          case 'quarter': return diffDays <= 90;
          default: return true;
        }
      });
    }
    
    // Ordenação
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      if (sortField === 'appliedAt') {
        aVal = a.appliedAt?.seconds || 0;
        bVal = b.appliedAt?.seconds || 0;
      } else if (sortField === 'candidateName') {
        aVal = a.candidateName?.toLowerCase() || '';
        bVal = b.candidateName?.toLowerCase() || '';
      } else if (sortField === 'jobTitle') {
        aVal = a.jobTitle?.toLowerCase() || '';
        bVal = b.jobTitle?.toLowerCase() || '';
      } else if (sortField === 'status') {
        aVal = a.status || '';
        bVal = b.status || '';
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    return filtered;
  }, [applications, searchTerm, statusFilter, jobFilter, companyFilter, periodFilter, sortField, sortDirection]);
  
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
  
  const formatDateTime = (ts) => {
    if (!ts) return 'N/A';
    let date;
    if (ts.seconds || ts._seconds) {
      date = new Date((ts.seconds || ts._seconds) * 1000);
    } else if (ts.toDate) {
      date = ts.toDate();
    } else {
      date = new Date(ts);
    }
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };
  
  // Handler de status
  const handleStatusChange = async (applicationId, newStatus) => {
    if (onUpdateApplicationStatus) {
      await onUpdateApplicationStatus(applicationId, newStatus);
    }
  };
  
  // Handler de nota
  const handleAddNote = async (applicationId) => {
    if (onAddApplicationNote && newNote.trim()) {
      await onAddApplicationNote(applicationId, newNote);
      setNewNote('');
    }
  };
  
  // Toggle ordenação
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Jobs únicos para filtro
  const uniqueJobs = useMemo(() => {
    const jobMap = {};
    applications.forEach(app => {
      if (app.jobId && app.jobTitle) {
        jobMap[app.jobId] = app.jobTitle;
      }
    });
    return Object.entries(jobMap).map(([id, title]) => ({ id, title }));
  }, [applications]);
  
  // Empresas únicas para filtro
  const uniqueCompanies = useMemo(() => {
    const companySet = new Set();
    applications.forEach(app => {
      if (app.jobCompany) companySet.add(app.jobCompany);
    });
    return Array.from(companySet).sort();
  }, [applications]);
  
  // Limpar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setJobFilter('all');
    setCompanyFilter('all');
    setPeriodFilter('all');
  };
  
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || jobFilter !== 'all' || companyFilter !== 'all' || periodFilter !== 'all';

  return (
    <div className="h-full flex flex-col">
      {/* Header com Resumo */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Candidaturas</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gerencie todas as candidaturas de candidatos às vagas
            </p>
          </div>
        </div>
        
        {/* Cards de Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={20} className="opacity-80"/>
              <span className="text-sm font-medium opacity-90">Total</span>
            </div>
            <div className="text-3xl font-bold">{stats.total}</div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={20} className="opacity-80"/>
              <span className="text-sm font-medium opacity-90">Em Processo</span>
            </div>
            <div className="text-3xl font-bold">{stats.inProcess}</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={20} className="opacity-80"/>
              <span className="text-sm font-medium opacity-90">Contratados</span>
            </div>
            <div className="text-3xl font-bold">{stats.hired}</div>
          </div>
          
          <div className="bg-gradient-to-br from-red-500 to-rose-500 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <XCircle size={20} className="opacity-80"/>
              <span className="text-sm font-medium opacity-90">Reprovados</span>
            </div>
            <div className="text-3xl font-bold">{stats.rejected}</div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={20} className="opacity-80"/>
              <span className="text-sm font-medium opacity-90">Desistências</span>
            </div>
            <div className="text-3xl font-bold">{stats.withdrawn}</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} className="opacity-80"/>
              <span className="text-sm font-medium opacity-90">Taxa Conversão</span>
            </div>
            <div className="text-3xl font-bold">{stats.conversionRate}%</div>
          </div>
        </div>
      </div>
      
      {/* Barra de Filtros */}
      <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Busca */}
          <div className="relative flex-1 min-w-[250px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input
              type="text"
              placeholder="Buscar por candidato, email, vaga ou empresa..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
            />
          </div>
          
          {/* Filtro Rápido por Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">Todos os Status</option>
            <optgroup label="Em Processo">
              {PIPELINE_STAGES.map(s => (
                <option key={s} value={s}>{s} ({stats.byStatus[s] || 0})</option>
              ))}
            </optgroup>
            <optgroup label="Fechamento">
              {CLOSING_STATUSES.map(s => (
                <option key={s} value={s}>{s} ({stats.byStatus[s] || 0})</option>
              ))}
            </optgroup>
          </select>
          
          {/* Filtro por Vaga */}
          <select
            value={jobFilter}
            onChange={e => setJobFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">Todas as Vagas</option>
            {uniqueJobs.map(job => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
          
          {/* Filtro por Empresa */}
          <select
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">Todas as Empresas</option>
            {uniqueCompanies.map(company => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>
          
          {/* Filtro por Período */}
          <select
            value={periodFilter}
            onChange={e => setPeriodFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="all">Todo Período</option>
            <option value="today">Hoje</option>
            <option value="week">Última Semana</option>
            <option value="month">Último Mês</option>
            <option value="quarter">Últimos 3 Meses</option>
          </select>
          
          {/* Limpar Filtros */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <X size={16}/> Limpar
            </button>
          )}
        </div>
        
        {/* Contagem de resultados */}
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {filteredApplications.length} candidatura(s) encontrada(s)
          {hasActiveFilters && ` (de ${applications.length} total)`}
        </div>
      </div>
      
      {/* Tabela de Candidaturas */}
      <div className="flex-1 overflow-auto p-4">
        {filteredApplications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <FileText size={48} className="mb-4 opacity-30"/>
            <p className="text-lg font-medium">Nenhuma candidatura encontrada</p>
            <p className="text-sm mt-1">
              {hasActiveFilters ? 'Tente ajustar os filtros' : 'As candidaturas aparecerão aqui quando candidatos forem vinculados às vagas'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header da Tabela */}
            <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-4 py-3 grid grid-cols-12 gap-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
              <button 
                onClick={() => toggleSort('candidateName')}
                className="col-span-3 flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
              >
                Candidato
                {sortField === 'candidateName' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}
              </button>
              <button 
                onClick={() => toggleSort('jobTitle')}
                className="col-span-3 flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
              >
                Vaga / Empresa
                {sortField === 'jobTitle' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}
              </button>
              <button 
                onClick={() => toggleSort('status')}
                className="col-span-2 flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
              >
                Status
                {sortField === 'status' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}
              </button>
              <button 
                onClick={() => toggleSort('appliedAt')}
                className="col-span-2 flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
              >
                Data
                {sortField === 'appliedAt' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}
              </button>
              <div className="col-span-2 text-right">Ações</div>
            </div>
            
            {/* Linhas */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredApplications.map(app => {
                const candidate = candidates.find(c => c.id === app.candidateId);
                const job = jobs.find(j => j.id === app.jobId);
                const isExpanded = expandedApp === app.id;
                
                return (
                  <div key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {/* Linha Principal */}
                    <div className="px-4 py-3 grid grid-cols-12 gap-4 items-center">
                      {/* Candidato */}
                      <div className="col-span-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {candidate?.photoUrl ? (
                            <img src={candidate.photoUrl} alt="" className="w-full h-full object-cover"/>
                          ) : (
                            <User size={20} className="text-gray-500"/>
                          )}
                        </div>
                        <div className="min-w-0">
                          <button 
                            onClick={() => onEditCandidate && candidate && onEditCandidate(candidate)}
                            className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block text-left"
                          >
                            {app.candidateName || 'Sem nome'}
                          </button>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {app.candidateEmail}
                          </div>
                        </div>
                      </div>
                      
                      {/* Vaga / Empresa */}
                      <div className="col-span-3">
                        <button 
                          onClick={() => onViewJob && job && onViewJob(job)}
                          className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block text-left"
                        >
                          {app.jobTitle || 'Sem vaga'}
                        </button>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Building2 size={12}/> {app.jobCompany || 'Sem empresa'}
                        </div>
                      </div>
                      
                      {/* Status */}
                      <div className="col-span-2">
                        <select
                          value={app.status || 'Inscrito'}
                          onChange={e => handleStatusChange(app.id, e.target.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border-0 outline-none cursor-pointer ${STATUS_COLORS[app.status] || 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                        >
                          <optgroup label="Funil">
                            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                          </optgroup>
                          <optgroup label="Fechamento">
                            {CLOSING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </optgroup>
                        </select>
                      </div>
                      
                      {/* Data */}
                      <div className="col-span-2 text-sm text-gray-600 dark:text-gray-400">
                        <div>{formatDate(app.appliedAt)}</div>
                        {app.updatedAt && app.updatedAt !== app.appliedAt && (
                          <div className="text-xs opacity-70">Atualizado: {formatDate(app.updatedAt)}</div>
                        )}
                      </div>
                      
                      {/* Ações */}
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <button
                          onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title={isExpanded ? 'Recolher' : 'Expandir'}
                        >
                          {isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                        </button>
                        <button
                          onClick={() => onEditCandidate && candidate && onEditCandidate(candidate)}
                          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Ver candidato"
                        >
                          <Eye size={18}/>
                        </button>
                        <button
                          onClick={() => onRemoveApplication && onRemoveApplication(app.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remover candidatura"
                        >
                          <Trash2 size={18}/>
                        </button>
                      </div>
                    </div>
                    
                    {/* Seção Expandida */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                        <div className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Info do Candidato */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                              Informações do Candidato
                            </h4>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
                              {candidate?.phone && (
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                  <Phone size={14}/> {candidate.phone}
                                </div>
                              )}
                              {candidate?.city && (
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                  <MapPin size={14}/> {candidate.city}
                                </div>
                              )}
                              {candidate?.interestAreas && (
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                  <Briefcase size={14}/> {candidate.interestAreas}
                                </div>
                              )}
                              {candidate?.schoolingLevel && (
                                <div className="text-gray-600 dark:text-gray-400">
                                  <span className="text-gray-500">Escolaridade:</span> {candidate.schoolingLevel}
                                </div>
                              )}
                              {candidate?.experience && (
                                <div className="text-gray-600 dark:text-gray-400">
                                  <span className="text-gray-500">Experiência:</span> {candidate.experience.substring(0, 100)}...
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Notas */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                              <MessageSquare size={14}/> Notas da Candidatura
                            </h4>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                              {/* Adicionar Nota */}
                              <div className="flex gap-2 mb-3">
                                <input
                                  type="text"
                                  placeholder="Adicionar nota..."
                                  value={expandedApp === app.id ? newNote : ''}
                                  onChange={e => setNewNote(e.target.value)}
                                  onKeyPress={e => e.key === 'Enter' && handleAddNote(app.id)}
                                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                />
                                <button
                                  onClick={() => handleAddNote(app.id)}
                                  disabled={!newNote.trim()}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Plus size={16}/>
                                </button>
                              </div>
                              
                              {/* Lista de Notas */}
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {(app.notes || []).length > 0 ? (
                                  app.notes.map((note, idx) => (
                                    <div key={idx} className="bg-gray-100 dark:bg-gray-900 rounded-lg p-2 text-sm">
                                      <p className="text-gray-700 dark:text-gray-300">{note.text}</p>
                                      <p className="text-xs text-gray-500 mt-1">{note.userName} • {formatDate(note.timestamp)}</p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-gray-500 text-center py-2">Nenhuma nota</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Info da Vaga */}
                        {job && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                              Dados da Vaga
                            </h4>
                            <div className="flex flex-wrap gap-4 text-sm">
                              {job.city && (
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
                                  <MapPin size={12} className="inline mr-1"/> {job.city}
                                </span>
                              )}
                              {job.sector && (
                                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full">
                                  Setor: {job.sector}
                                </span>
                              )}
                              {job.position && (
                                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full">
                                  Cargo: {job.position}
                                </span>
                              )}
                              {job.function && (
                                <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full">
                                  Função: {job.function}
                                </span>
                              )}
                              {job.contractType && (
                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full">
                                  {job.contractType}
                                </span>
                              )}
                              {job.workModel && (
                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full">
                                  {job.workModel}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Resumo por Status na Lateral (Footer fixo) */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(stats.byStatus)
            .filter(([_, count]) => count > 0)
            .map(([status, count]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  statusFilter === status 
                    ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' 
                    : ''
                } ${STATUS_COLORS[status] || 'bg-gray-200 text-gray-700'}`}
              >
                {status}: {count}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

