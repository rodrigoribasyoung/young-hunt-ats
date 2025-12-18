import React from 'react';
import { BarChart3, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ReportsPage({ candidates = [], jobs = [], applications = [], statusMovements = [] }) {
  const handleExport = () => {
    // Criar dados para exportação
    const data = [
      ['Relatório de Candidatos e Vagas'],
      [],
      ['Estatísticas Gerais'],
      ['Total de Candidatos', candidates.length],
      ['Total de Vagas', jobs.length],
      ['Total de Candidaturas', applications.length],
      ['Total de Movimentações', statusMovements.length],
      [],
      ['Candidatos por Status'],
    ];

    // Agrupar candidatos por status
    const statusCounts = {};
    candidates.forEach(c => {
      const status = c.status || 'Inscrito';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    data.push(['Status', 'Quantidade']);
    Object.entries(statusCounts).forEach(([status, count]) => {
      data.push([status, count]);
    });

    // Criar workbook e exportar
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, `relatorio_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6 overflow-y-auto h-full bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
          <button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download size={18} /> Exportar CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Candidatos</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{candidates.length}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Vagas</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{jobs.length}</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Candidaturas</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{applications.length}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Movimentações</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{statusMovements.length}</div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 size={20} /> Estatísticas Detalhadas
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Use o botão "Exportar CSV" acima para gerar um relatório completo em Excel.
          </p>
        </div>
      </div>
    </div>
  );
}

