import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Video, Users, FileText, Check } from 'lucide-react';

const INTERVIEW_TYPES = ['Entrevista', 'Entrevista Técnica', 'Teste Prático', 'Dinâmica de Grupo', 'Entrevista Final'];
const DURATIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2 horas' },
];

export default function InterviewModal({ 
  isOpen, 
  onClose, 
  onSchedule, 
  candidate,
  job,
  application,
  existingInterview // Para edição
}) {
  const [formData, setFormData] = useState({
    type: existingInterview?.type || 'Entrevista',
    date: existingInterview?.date || '',
    time: existingInterview?.time || '09:00',
    duration: existingInterview?.duration || 60,
    isOnline: existingInterview?.isOnline ?? true,
    location: existingInterview?.location || '',
    meetingLink: existingInterview?.meetingLink || '',
    interviewers: existingInterview?.interviewers?.join(', ') || '',
    notes: existingInterview?.notes || ''
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.date || !formData.time) {
      alert('Data e hora são obrigatórios');
      return;
    }
    
    setSaving(true);
    try {
      await onSchedule({
        candidateId: candidate?.id,
        candidateName: candidate?.fullName || candidate?.candidateName,
        candidateEmail: candidate?.email || candidate?.candidateEmail,
        jobId: job?.id || application?.jobId,
        jobTitle: job?.title || application?.jobTitle,
        applicationId: application?.id,
        type: formData.type,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        isOnline: formData.isOnline,
        location: formData.isOnline ? '' : formData.location,
        meetingLink: formData.isOnline ? formData.meetingLink : '',
        interviewers: formData.interviewers.split(',').map(e => e.trim()).filter(Boolean),
        notes: formData.notes
      });
      onClose();
    } catch (error) {
      console.error('Erro ao agendar:', error);
    } finally {
      setSaving(false);
    }
  };

  // Gerar data mínima (hoje)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="text-blue-500"/> Agendar Entrevista
            </h3>
            {candidate && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {candidate.fullName || candidate.candidateName}
                {(job?.title || application?.jobTitle) && ` • ${job?.title || application?.jobTitle}`}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={20} className="text-gray-500"/>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tipo de Entrevista */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo de Entrevista
            </label>
            <select
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              {INTERVIEW_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Calendar size={14} className="inline mr-1"/> Data *
              </label>
              <input
                type="date"
                required
                min={today}
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Clock size={14} className="inline mr-1"/> Hora *
              </label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={e => setFormData({...formData, time: e.target.value})}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Duração */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Duração
            </label>
            <div className="flex gap-2 flex-wrap">
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setFormData({...formData, duration: d.value})}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    formData.duration === d.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Online/Presencial Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Formato
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({...formData, isOnline: true})}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-colors ${
                  formData.isOnline
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Video size={18}/> Online
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, isOnline: false})}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-colors ${
                  !formData.isOnline
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                <MapPin size={18}/> Presencial
              </button>
            </div>
          </div>

          {/* Local ou Link */}
          {formData.isOnline ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Video size={14} className="inline mr-1"/> Link da Reunião
              </label>
              <input
                type="url"
                placeholder="https://meet.google.com/... ou https://zoom.us/..."
                value={formData.meetingLink}
                onChange={e => setFormData({...formData, meetingLink: e.target.value})}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <MapPin size={14} className="inline mr-1"/> Local
              </label>
              <input
                type="text"
                placeholder="Endereço ou sala"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Entrevistadores */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Users size={14} className="inline mr-1"/> Entrevistadores (emails separados por vírgula)
            </label>
            <input
              type="text"
              placeholder="joao@empresa.com, maria@empresa.com"
              value={formData.interviewers}
              onChange={e => setFormData({...formData, interviewers: e.target.value})}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FileText size={14} className="inline mr-1"/> Observações
            </label>
            <textarea
              placeholder="Instruções, tópicos a abordar, etc."
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              rows={2}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !formData.date || !formData.time}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                Agendando...
              </>
            ) : (
              <>
                <Check size={18}/> Agendar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

