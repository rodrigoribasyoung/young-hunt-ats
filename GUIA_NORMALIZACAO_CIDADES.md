# 🏙️ Guia de Normalização de Cidades

## 📋 Visão Geral

O sistema agora normaliza automaticamente os nomes de cidades do Rio Grande do Sul para manter um padrão único e evitar dados bagunçados.

## ✅ Cidades Principais Suportadas

O sistema reconhece e padroniza as seguintes cidades principais:

1. **Porto Alegre/RS**
2. **Canoas/RS**
3. **Bagé/RS**
4. **Santo Antônio da Patrulha/RS**
5. **Guaíba/RS**
6. **Osório/RS**
7. **Tramandaí/RS**
8. **São Borja/RS**
9. **Sant'Ana do Livramento/RS**
10. **Cruz Alta/RS**
11. **Itaqui/RS**
12. **Alegrete/RS**
13. **Arroio do Sal/RS**
14. **Torres/RS**

## 🔄 Variações Reconhecidas

O sistema reconhece automaticamente várias formas de escrever as cidades:

### Exemplos:

**Santo Antônio da Patrulha/RS** reconhece:
- `sto ant patrulha`
- `SAP`
- `SAP/RS`
- `santo antonio da patrulha`
- `Santo Antônio da Patrulha`
- `sto ant patrulha/rs`
- E outras variações

**Porto Alegre/RS** reconhece:
- `POA`
- `poa/rs`
- `Porto Alegre`
- `porto alegre rs`
- E outras variações

**Sant'Ana do Livramento/RS** reconhece:
- `livramento`
- `livramento/rs`
- `santana do livramento`
- `sant'ana do livramento`
- E outras variações

## 🎯 Onde a Normalização Acontece

A normalização é aplicada automaticamente em:

1. **Importação CSV**: Cidades são normalizadas ao importar
2. **Formulário de Cadastro**: Ao salvar um candidato
3. **Edição de Candidato**: Ao atualizar dados
4. **Transição de Status**: Ao preencher campos obrigatórios
5. **Google Forms → Apps Script**: Ao enviar dados do formulário

## 📝 Formato Padrão

Todas as cidades são padronizadas para o formato:
```
Nome da Cidade/RS
```

Exemplos:
- `Porto Alegre/RS`
- `Santo Antônio da Patrulha/RS`
- `Sant'Ana do Livramento/RS`

## 🎨 Interface do Usuário

### Select de Cidades

Nos formulários, as cidades principais aparecem primeiro em um grupo separado:

```
┌─ Cidades Principais ─────────────┐
│ Porto Alegre/RS                  │
│ Canoas/RS                        │
│ Bagé/RS                          │
│ Santo Antônio da Patrulha/RS     │
│ ...                              │
└──────────────────────────────────┘
┌─ Outras Cidades ─────────────────┐
│ [Cidades do Firebase]            │
└──────────────────────────────────┘
```

### Digitação Livre

Se você digitar uma cidade manualmente:
- O sistema tentará reconhecer e normalizar automaticamente
- Se for uma cidade principal, será padronizada
- Se não for reconhecida, será formatada com `/RS` no final

## 🔍 Como Funciona

1. **Reconhecimento**: O sistema compara o texto digitado com variações conhecidas
2. **Normalização**: Converte para o formato padrão
3. **Armazenamento**: Salva no formato padronizado no Firebase
4. **Exibição**: Mostra sempre no formato padronizado

## ⚙️ Código Técnico

### Frontend (React)
- Módulo: `src/utils/cityNormalizer.js`
- Função principal: `normalizeCity(city)`
- Aplicado em: `CsvImportModal`, `CandidateModal`, `TransitionModal`, `App.jsx`

### Backend (Google Apps Script)
- Função: `normalizeCity(city)` no `Code.gs`
- Aplicado em: `onFormSubmit()` e `importarEmLotes()`

## 📊 Benefícios

1. **Dados Consistentes**: Todas as cidades no mesmo formato
2. **Busca Facilitada**: Filtros funcionam corretamente
3. **Relatórios Precisos**: Agrupamentos corretos por cidade
4. **Experiência do Usuário**: Reconhece variações comuns automaticamente

## 🚀 Adicionar Novas Cidades

Para adicionar novas cidades principais, edite `src/utils/cityNormalizer.js`:

```javascript
export const MAIN_CITIES = {
  'Nova Cidade/RS': [
    'nova cidade',
    'nova cidade/rs',
    'nc',
    'nc/rs',
    // ... outras variações
  ],
  // ... outras cidades
};
```

E atualize também o `Code.gs` com a mesma lógica.

## ⚠️ Notas Importantes

- A normalização é **automática** - não precisa fazer nada manualmente
- Cidades não reconhecidas recebem `/RS` automaticamente
- O sistema é **case-insensitive** (não diferencia maiúsculas/minúsculas)
- Acentos são ignorados na comparação (ex: `Bagé` = `Bage`)






