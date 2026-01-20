# 🔧 Troubleshooting - Problemas no Deploy

## Problema: Frontend não abre páginas após deploy

### Possíveis Causas e Soluções

#### 1. **Variáveis de Ambiente não Configuradas no Vercel**

**Sintoma:** Página em branco, erro no console sobre Firebase, ou tela de carregamento infinita.

**Solução:**
1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione o projeto `young-hunt-ats`
3. Vá em **Settings** → **Environment Variables**
4. Verifique se todas as variáveis estão configuradas:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. Configure para **Production**, **Preview** e **Development**
6. Após salvar, faça um **Redeploy**

#### 2. **Problema com Roteamento (SPA)**

**Sintoma:** Página 404 ao acessar rotas diretas como `/dashboard`, `/candidates`, etc.

**Solução:**
O arquivo `vercel.json` já está configurado corretamente com rewrites:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Se ainda assim não funcionar:
1. Verifique se o `vercel.json` está na raiz do projeto
2. Faça um novo deploy após verificar

#### 3. **Erro de Build**

**Sintoma:** Deploy falha ou build não completa.

**Solução:**
1. Teste o build localmente:
   ```bash
   npm run build
   ```
2. Se o build local funcionar, o problema pode ser:
   - Dependências não instaladas corretamente
   - Versão do Node.js incompatível
3. Verifique os logs do deploy no Vercel Dashboard

#### 4. **Problema com BrowserRouter**

**Sintoma:** Rotas não funcionam, navegação quebra.

**Solução:**
O `BrowserRouter` está corretamente configurado em `src/main.jsx`. Se houver problemas:
1. Verifique se não há múltiplos `BrowserRouter` no código
2. Verifique se todas as rotas estão dentro de `<Routes>`

#### 5. **Cache do Navegador**

**Sintoma:** Mudanças não aparecem após deploy.

**Solução:**
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Ou faça hard refresh (Ctrl+F5)
3. Ou teste em modo anônimo/privado

## 🔍 Como Diagnosticar

### 1. Verificar Console do Navegador
1. Abra a aplicação no navegador
2. Pressione F12 para abrir DevTools
3. Vá na aba **Console**
4. Procure por erros em vermelho

### 2. Verificar Network
1. Na aba **Network** do DevTools
2. Recarregue a página (F5)
3. Verifique se todos os arquivos estão carregando (status 200)
4. Se algum arquivo falhar (status 404, 500), anote qual

### 3. Verificar Variáveis de Ambiente
No console do navegador, execute:
```javascript
console.log('API Key:', import.meta.env.VITE_FIREBASE_API_KEY ? 'Configurada' : 'FALTANDO');
console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'Configurada' : 'FALTANDO');
```

Se mostrar "FALTANDO", as variáveis não estão configuradas no Vercel.

## 📋 Checklist de Verificação

- [ ] Todas as variáveis de ambiente estão configuradas no Vercel
- [ ] Build local funciona (`npm run build`)
- [ ] `vercel.json` está na raiz do projeto
- [ ] Não há erros no console do navegador
- [ ] Todos os arquivos estão carregando (Network tab)
- [ ] Cache do navegador foi limpo
- [ ] Testado em modo anônimo/privado

## 🚨 Erros Comuns

### "Cannot read property 'X' of undefined"
- **Causa:** Variável de ambiente não configurada
- **Solução:** Configure todas as variáveis no Vercel

### "404 Not Found" em rotas
- **Causa:** Rewrites não configurados
- **Solução:** Verifique se `vercel.json` está correto

### "Firebase: Error (auth/invalid-api-key)"
- **Causa:** API Key incorreta ou não configurada
- **Solução:** Verifique `VITE_FIREBASE_API_KEY` no Vercel

### Tela branca sem erros
- **Causa:** Erro silencioso no JavaScript
- **Solução:** Verifique o console para erros, verifique se Firebase inicializou

## 📞 Suporte

Se o problema persistir após seguir este guia:
1. Capture screenshots dos erros no console
2. Capture os logs do deploy no Vercel
3. Verifique a versão do Node.js no Vercel (deve ser 18+)
