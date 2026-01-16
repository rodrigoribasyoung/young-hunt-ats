# 📋 Guia de Importação CSV - Prevenção de Erros

## ⚠️ Problema Identificado

Os dados foram importados com mapeamento incorreto, causando:
- Campos preenchidos com valores errados
- Dados misturados entre colunas
- Informações perdidas ou incorretas

**Exemplo do erro:**
- `fullName` recebeu "verificando as necessidades de execução das obras..."
- `email` recebeu "quadras poliesportivas"
- `phone` recebeu "redes de esgoto"

## ✅ Soluções Implementadas

### 1. Validação de Campos Obrigatórios
- Sistema agora **exige** que `fullName` e `email` estejam mapeados
- Bloqueia importação se campos essenciais não estiverem corretos
- Mostra alertas claros sobre campos faltantes

### 2. Preview dos Dados
- Mostra preview da primeira linha mapeada antes de importar
- Permite verificar se os dados estão corretos
- Destaque visual para campos obrigatórios

### 3. Melhor Detecção Automática
- Algoritmo melhorado para detectar headers corretamente
- Correspondência mais precisa entre labels do CSV e campos do sistema
- Fallbacks mais específicos para evitar mapeamentos errados

### 4. Validação de Dados
- Remove candidatos sem nome ou email antes de salvar
- Limpa valores vazios e espaços em branco
- Valida estrutura do arquivo antes de processar

## 📝 Como Usar Corretamente

### Passo 1: Baixar o Modelo
1. Clique em **"Baixar Modelo CSV"** ou **"Baixar Modelo XLSX"**
2. Use o modelo gerado como base
3. **NÃO altere os nomes das colunas** (headers)

### Passo 2: Preencher os Dados
1. Mantenha a primeira linha com os headers exatos
2. Preencha os dados nas linhas seguintes
3. **Campos obrigatórios:**
   - `Nome completo:`
   - `E-mail principal:`

### Passo 3: Revisar Mapeamento
1. Após fazer upload, revise o **Passo 2**
2. Verifique se os campos estão mapeados corretamente:
   - Campos obrigatórios aparecem em **vermelho**
   - Preview mostra amostra dos dados
3. Ajuste manualmente se necessário

### Passo 4: Confirmar Importação
1. Verifique o preview dos dados
2. Escolha o modo de duplicação
3. Defina a tag de importação
4. Clique em **"Confirmar Importação"**

## 🚨 Checklist Antes de Importar

- [ ] Usei o modelo gerado pelo sistema
- [ ] Headers estão exatamente como no modelo
- [ ] Campos obrigatórios (Nome e Email) estão preenchidos
- [ ] Revisei o mapeamento no Passo 2
- [ ] Verifiquei o preview dos dados
- [ ] Campos obrigatórios estão destacados em vermelho e mapeados

## 🔧 Como Corrigir Dados Já Importados Incorretamente

### Opção 1: Excluir e Reimportar
1. Identifique os candidatos com dados incorretos (use a tag de importação)
2. Exclua os candidatos incorretos
3. Corrija o CSV
4. Reimporte usando o modelo correto

### Opção 2: Editar Manualmente
1. Abra cada candidato no modal de edição
2. Corrija os campos manualmente
3. Salve as alterações

## 📊 Estrutura Correta do CSV

### Headers Obrigatórios (primeira linha):
```
"Nome completo:","E-mail principal:","Nº telefone celular / Whatsapp:","Cidade onde reside:",...
```

### Exemplo de Linha de Dados:
```
"João Silva","joao@email.com","(11) 99999-9999","São Paulo",...
```

## ⚠️ Erros Comuns a Evitar

1. **Alterar nomes dos headers** - Use exatamente como no modelo
2. **Pular a revisão de mapeamento** - Sempre revise o Passo 2
3. **Ignorar campos obrigatórios** - Sistema bloqueia se não mapear
4. **Usar CSV com formatação diferente** - Use o modelo gerado
5. **Não verificar preview** - Sempre confira antes de confirmar

## 🎯 Campos Essenciais

Estes campos **DEVEM** estar mapeados:
- ✅ `Nome completo:` → `fullName`
- ✅ `E-mail principal:` → `email`

Outros campos são opcionais, mas recomendados:
- `Nº telefone celular / Whatsapp:` → `phone`
- `Cidade onde reside:` → `city`
- `Formação:` → `education`
- etc.

## 📞 Suporte

Se encontrar problemas:
1. Verifique se está usando o modelo correto
2. Revise o mapeamento no Passo 2
3. Verifique o preview dos dados
4. Confirme que campos obrigatórios estão mapeados






