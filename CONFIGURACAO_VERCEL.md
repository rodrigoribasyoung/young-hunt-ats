# 🔧 Configuração das Variáveis de Ambiente no Vercel

## ⚠️ IMPORTANTE: Erro `auth/invalid-api-key` no Host

Este erro ocorre quando as variáveis de ambiente do Firebase não estão configuradas corretamente no Vercel.

## 📋 Passo a Passo para Configurar

### 1. Acesse o Vercel Dashboard
- Vá em: https://vercel.com/dashboard
- Selecione o projeto `young-hunt-ats`

### 2. Vá em Settings → Environment Variables

### 3. Configure as seguintes variáveis (valores do projeto `talents-c856d`):

| Variável | Valor |
|----------|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyAiNDKAboqB-6Gt0WIddx4_rUquATNLGCg` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `talents-c856d.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `talents-c856d` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `talents-c856d.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `752258306660` |
| `VITE_FIREBASE_APP_ID` | `1:752258306660:web:67843646d1358e8c3ac571` |

### 4. ⚠️ ATENÇÃO:
- **NÃO** coloque aspas nos valores
- **NÃO** coloque espaços extras antes ou depois
- Configure para **Production**, **Preview** e **Development** (ou pelo menos Production)

### 5. Após salvar, faça um novo deploy:
- Vá em **Deployments**
- Clique nos **3 pontos** do último deployment
- Selecione **Redeploy**

### 6. Verifique se funcionou:
- Após o deploy, abra a aplicação no host
- Abra o Console do navegador (F12)
- O erro `auth/invalid-api-key` deve ter desaparecido
- Você deve conseguir fazer login normalmente

## 🔍 Como Verificar se Está Funcionando

1. Abra o Console do navegador (F12)
2. Procure por logs que começam com `[DEBUG] Firebase Config Check:`
3. Deve mostrar:
   ```javascript
   {
     hasApiKey: true,
     apiKeyLength: 39, // ou outro número > 0
     hasProjectId: true,
     projectId: "talents-c856d",
     hasAuthDomain: true,
     authDomain: "talents-c856d.firebaseapp.com"
   }
   ```

Se algum desses valores for `false` ou `undefined`, as variáveis não estão configuradas corretamente no Vercel.

## 🐛 Troubleshooting

### Erro persiste após configurar?
1. Verifique se salvou as variáveis (não apenas digitou)
2. Verifique se fez um **novo deploy** (Redeploy)
3. Limpe o cache do navegador (Ctrl+F5)
4. Verifique se não há espaços ou caracteres invisíveis nos valores

### Como copiar os valores corretamente?
1. No Firebase Console → Projeto `talents-c856d` → Configurações → Configurações do app
2. Selecione o app Web
3. Copie os valores **sem aspas** e **sem espaços extras**
