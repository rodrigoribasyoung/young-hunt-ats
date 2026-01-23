import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home } from 'lucide-react';

const ThankYouPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 font-young">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        <img src="/logo-young-empreendimentos.png" alt="Young Empreendimentos" className="h-12 w-auto mx-auto mb-4" />
        <CheckCircle className="w-16 h-16 text-young-orange mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Formulário Enviado com Sucesso!
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Obrigado por se candidatar. Seu formulário foi recebido e será analisado pela nossa equipe.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Entraremos em contato em breve através do e-mail fornecido.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-2 bg-young-orange hover:bg-young-orange-hover text-white rounded-lg font-medium transition-colors"
        >
          <Home className="w-4 h-4" />
          Voltar ao Início
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">© 2025 Young Empreendimentos</p>
      </div>
    </div>
  );
};

export default ThankYouPage;
