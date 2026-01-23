# Configuração de Segurança do Firebase para Formulário Público

## Visão Geral

O formulário público (`/apply`) permite que candidatos enviem seus dados diretamente para o Firebase sem autenticação. Isso requer configuração adequada das regras de segurança do Firestore.

## Opção 1: Regras do Firestore (Mais Simples)

Configure as regras do Firestore para permitir escrita pública apenas na coleção `candidates`:

### Passos:

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto `talents-c856d`
3. Vá em **Firestore Database** > **Rules**
4. Adicione ou atualize as regras:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permite escrita pública apenas na coleção candidates
    // Apenas para criar novos documentos (não permite atualizar ou deletar)
    match /candidates/{candidateId} {
      allow create: if request.resource.data.keys().hasAll(['fullName', 'email', 'phone', 'status', 'origin', 'createdAt', 'original_timestamp'])
                   && request.resource.data.origin == 'public_form'
                   && request.resource.data.status == 'Inscrito';
      allow read: if request.auth != null; // Apenas usuários autenticados podem ler
      allow update, delete: if false; // Não permite atualizar ou deletar sem autenticação
    }
    
    // Todas as outras coleções requerem autenticação
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Validações Implementadas:

- ✅ Apenas criação de novos documentos (não permite update/delete)
- ✅ Campos obrigatórios devem estar presentes
- ✅ Campo `origin` deve ser `'public_form'` (previne inserções maliciosas)
- ✅ Campo `status` deve ser `'Inscrito'` (previne status inválidos)
- ✅ Leitura requer autenticação (protege dados sensíveis)

## Opção 2: Cloud Function como Proxy (Mais Seguro - Recomendado)

Para maior segurança, use uma Cloud Function como intermediário:

### Vantagens:

- ✅ Validação adicional no servidor
- ✅ Rate limiting
- ✅ Logs de auditoria
- ✅ Proteção contra spam
- ✅ Sanitização de dados

### Implementação:

1. Crie uma Cloud Function no Firebase:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.submitCandidate = functions.https.onCall(async (data, context) => {
  // Validação
  if (!data.fullName || !data.email || !data.phone) {
    throw new functions.https.HttpsError('invalid-argument', 'Campos obrigatórios faltando');
  }
  
  // Rate limiting (opcional - usando IP)
  // Verificar se já enviou recentemente
  
  // Sanitização
  const candidateData = {
    fullName: data.fullName.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.replace(/\D/g, ''),
    // ... outros campos
    status: 'Inscrito',
    origin: 'public_form',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    original_timestamp: admin.firestore.FieldValue.serverTimestamp(),
    tags: ['Novo Inscrito', 'Formulário Público']
  };
  
  // Verificar duplicatas (opcional: o formulário público permite recadastro com aviso)
  // Se quiser BLOQUEAR recadastro, descomente o bloco abaixo:
  // const existing = await admin.firestore()
  //   .collection('candidates')
  //   .where('email', '==', candidateData.email)
  //   .limit(1)
  //   .get();
  // if (!existing.empty) {
  //   throw new functions.https.HttpsError('already-exists', 'Candidato já cadastrado');
  // }
  
  // Criar documento
  const docRef = await admin.firestore()
    .collection('candidates')
    .add(candidateData);
  
  return { success: true, id: docRef.id };
});
```

2. Atualize o componente `PublicCandidateForm.jsx` para usar a Cloud Function:

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const submitCandidate = httpsCallable(functions, 'submitCandidate');

// No handleSubmit:
const result = await submitCandidate(normalizedData);
```

## Recomendação

**Para começar rapidamente:** Use a Opção 1 (Regras do Firestore)

**Para produção:** Migre para a Opção 2 (Cloud Function) para maior segurança e controle

## Verificação

Após configurar as regras no Firebase Console:

1. **Teste o formulário público** em `/apply` — formulário, logo Young, steps e rodapé devem carregar
2. **Teste a página de agradecimento** em `/apply/thank-you` — deve exibir mensagem de sucesso e "Voltar ao Início"
3. **Preencha e envie** um formulário de teste (com as regras já publicadas)
4. **Verifique no Firebase Console** se o documento foi criado:
   - Firestore Database > `candidates`
   - `origin` = `'public_form'`
   - `status` = `'Inscrito'`
   - Campos `fullName`, `email`, `phone`, `createdAt`, `original_timestamp` presentes

## Troubleshooting

### Erro: "Missing or insufficient permissions"

- Verifique se as regras do Firestore foram publicadas corretamente
- Verifique se o campo `origin` está sendo enviado como `'public_form'`
- Verifique se todos os campos obrigatórios estão presentes

### Recadastro / "Document already exists"

- O formulário **permite** que o mesmo e-mail se cadastre mais de uma vez
- É exibido um aviso: "Você já faz parte do nosso Banco de Talentos. Pode continuar mesmo assim para atualizar suas informações."
- Cada envio cria um **novo** documento em `candidates` (não há update de documento existente)
- Se usar Cloud Function com checagem de duplicata, remova ou comente essa validação para permitir recadastro

### Erro: "Invalid data"

- Verifique se os campos obrigatórios estão preenchidos
- Verifique se o formato dos dados está correto

## Segurança Adicional (Opcional)

### Rate Limiting

**Implementado no cliente** em `PublicCandidateForm.jsx`: cooldown de 1 minuto após envio bem-sucedido (localStorage).

Exemplo para servidor ou customização:

```javascript
// No componente, antes de enviar:
const lastSubmit = localStorage.getItem('lastFormSubmit');
if (lastSubmit) {
  const timeSinceLastSubmit = Date.now() - parseInt(lastSubmit);
  if (timeSinceLastSubmit < 60000) { // 1 minuto
    setErrors({ submit: 'Aguarde um momento antes de enviar novamente.' });
    return;
  }
}
localStorage.setItem('lastFormSubmit', Date.now().toString());
```

### reCAPTCHA

Adicione Google reCAPTCHA para prevenir bots:

1. Configure reCAPTCHA no Google Cloud Console
2. Instale: `npm install react-google-recaptcha`
3. Adicione ao formulário antes do envio

## Notas Importantes

- ⚠️ As regras do Firestore são públicas e podem ser visualizadas no código do cliente
- ⚠️ Sempre valide dados no servidor (Cloud Function) para produção
- ⚠️ Monitore logs do Firebase para detectar tentativas de abuso
- ⚠️ Considere adicionar rate limiting para prevenir spam
