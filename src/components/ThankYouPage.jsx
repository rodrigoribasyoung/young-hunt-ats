import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home } from 'lucide-react';

const ThankYouPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
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
          className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Home className="w-4 h-4" />
          Voltar ao Início
        </button>
      </div>
    </div>
  );
};

export default ThankYouPage;
