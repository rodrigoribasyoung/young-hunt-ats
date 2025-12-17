# 📚 Documentação dos Arquivos Essenciais

Este documento explica o objetivo e a importância de cada arquivo essencial do sistema Young Talents ATS, organizados do **mais importante ao menos importante**.

---

## 🎯 1. `src/main.jsx` - Ponto de Entrada da Aplicação

**Importância:** ⭐⭐⭐⭐⭐ **CRÍTICO**

**Objetivo:** Arquivo de inicialização do React. É o primeiro arquivo executado quando a aplicação inicia.

**Responsabilidades:**
- Renderiza o componente raiz `App` no DOM
- Envolve a aplicação com `ThemeProvider` para gerenciamento de tema
- Configura o `StrictMode` do React para desenvolvimento
- Importa os estilos globais (`index.css`)

**Por que é essencial:** Sem este arquivo, a aplicação não inicia. É a porta de entrada que conecta o código React ao HTML.

---

## 🏗️ 2. `src/App.jsx` - Componente Principal da Aplicação

**Importância:** ⭐⭐⭐⭐⭐ **CRÍTICO**

**Objetivo:** Componente central que contém toda a lógica de negócio, gerenciamento de estado, e estrutura da interface.

**Responsabilidades Principais:**

### 2.1. Autenticação e Segurança
- Gerencia login/logout com Google (Firebase Auth)
- Controla acesso baseado em autenticação
- Exibe tela de login quando não autenticado

### 2.2. Gerenciamento de Dados (Firebase Firestore)
- Sincroniza dados em tempo real: candidatos, vagas, empresas, cidades, áreas de interesse
- Operações CRUD (Create, Read, Update, Delete)
- Batch operations para importação em massa

### 2.3. Componentes de Interface
- **Dashboard**: KPIs, gráficos e estatísticas de recrutamento
- **PipelineView**: Visualização Kanban com drag & drop de candidatos
- **CandidatesList**: Tabela completa com busca, filtros, paginação e ordenação
- **JobsList**: Gestão de vagas com status e candidatos vinculados
- **FilterSidebar**: Filtros avançados com persistência em localStorage

### 2.4. Lógica de Negócio
- **Validação de Campos**: Verifica campos obrigatórios por etapa do pipeline
- **Transições de Status**: Controla movimentação entre etapas com validação
- **Filtros Globais**: Aplica filtros em tempo real nos candidatos
- **Modais**: Gerencia abertura/fechamento de modais (edição, transição, importação)

### 2.5. Componentes Modais
- **JobModal**: Criar/editar vagas
- **CandidateModal**: Criar/editar candidatos com abas (pessoal, profissional, processo)

**Por que é essencial:** Contém 90% da lógica da aplicação. Sem ele, não há funcionalidade.

---

## 📋 3. `src/constants.js` - Constantes e Configurações do Sistema

**Importância:** ⭐⭐⭐⭐⭐ **CRÍTICO**

**Objetivo:** Centraliza todas as constantes, configurações e mapeamentos usados em toda a aplicação.

**Conteúdo Principal:**

### 3.1. Etapas do Pipeline
- `PIPELINE_STAGES`: Etapas visuais do Kanban (Inscrito → Considerado → Entrevista I → Testes → Entrevista II → Seleção)
- `CLOSING_STATUSES`: Status que encerram o processo (Contratado, Reprovado, Desistiu da vaga)
- `ALL_STATUSES`: Combinação de todas as etapas para validação

### 3.2. Validação de Campos
- `STAGE_REQUIRED_FIELDS`: Define quais campos são obrigatórios em cada etapa
  - Exemplo: Para "Entrevista I" são obrigatórios: fullName, email, phone, city

### 3.3. Cores e Estilos
- `STATUS_COLORS`: Mapeamento de cores para cada status (usado em badges e cards)
- `JOB_STATUSES`: Status possíveis para vagas (Aberta, Preenchida, Cancelada, Fechada)

### 3.4. Mapeamento CSV
- `CSV_FIELD_MAPPING_OPTIONS`: Lista completa de campos do formulário mapeados para variáveis do sistema
  - Usado na importação CSV para vincular colunas do arquivo aos campos do banco
  - Inclui: identificação, contato, dados pessoais, profissional, links, perguntas

**Por que é essencial:** Centraliza configurações críticas. Alterações aqui afetam todo o sistema. Facilita manutenção e evita duplicação de código.

---

## 🎨 4. `src/ThemeContext.jsx` - Gerenciamento de Tema (Dark/Light Mode)

**Importância:** ⭐⭐⭐⭐ **MUITO IMPORTANTE**

**Objetivo:** Fornece contexto React para gerenciar o tema escuro/claro da aplicação com persistência.

**Funcionalidades:**
- **Estado do Tema**: Gerencia se está em modo dark ou light
- **Persistência**: Salva preferência no `localStorage`
- **Aplicação no DOM**: Adiciona/remove classe `dark` no elemento raiz (`<html>`)
- **Hook Customizado**: `useTheme()` para acessar tema em qualquer componente

**Como Funciona:**
1. Lê preferência salva no `localStorage` ao iniciar
2. Aplica classe `dark` no HTML quando `isDark === true`
3. Tailwind CSS usa essa classe para aplicar estilos dark mode
4. Toggle atualiza estado e salva nova preferência

**Por que é essencial:** Proporciona experiência de usuário consistente. Sem ele, o toggle de tema não funciona e a preferência não persiste.

---

## 🔄 5. `src/components/modals/TransitionModal.jsx` - Modal de Transição de Etapas

**Importância:** ⭐⭐⭐⭐ **MUITO IMPORTANTE**

**Objetivo:** Modal exibido quando um candidato é movido para uma nova etapa que requer campos obrigatórios ou quando o processo é encerrado.

**Funcionalidades:**

### 5.1. Validação de Campos Obrigatórios
- Exibe campos faltantes que são obrigatórios para a nova etapa
- Valida se todos os campos foram preenchidos antes de confirmar
- Pré-preenche campos com dados existentes do candidato

### 5.2. Tipos de Inputs
- **Selects**: Para cidade, áreas de interesse, estado civil, fonte (origem)
- **Textarea**: Para experiência anterior
- **Checkbox**: Para CNH (Sim/Não)
- **Inputs de Texto**: Para campos genéricos

### 5.3. Conclusão de Processo
- Quando movendo para status final (Contratado/Reprovado):
  - Exige feedback/observação obrigatório
  - Checkbox para confirmar que retorno foi enviado ao candidato
  - Salva timestamp de fechamento

**Por que é essencial:** Garante integridade dos dados. Impede movimentação de candidatos sem informações necessárias. Melhora qualidade do banco de dados.

---

## 📥 6. `src/components/modals/CsvImportModal.jsx` - Modal de Importação CSV

**Importância:** ⭐⭐⭐⭐ **MUITO IMPORTANTE**

**Objetivo:** Permite importação em massa de candidatos a partir de arquivos CSV com mapeamento inteligente de campos.

**Funcionalidades:**

### 6.1. Processo em 3 Etapas
1. **Upload**: Seleção e leitura do arquivo CSV
2. **Mapeamento**: Vincular colunas do CSV aos campos do sistema
3. **Opções**: Escolher como tratar duplicados (pular, substituir, duplicar)

### 6.2. Auto-Guess Mapping
- Detecta automaticamente campos comuns (nome, email, telefone, cidade, etc.)
- Usa correspondência exata ou parcial com `CSV_FIELD_MAPPING_OPTIONS`
- Fallbacks inteligentes para variações de nomes de campos

### 6.3. Tratamento de Duplicados
- **Pular**: Mantém candidato existente (não atualiza)
- **Substituir**: Atualiza dados do candidato existente
- **Duplicar**: Cria novo registro mesmo se já existir

**Por que é essencial:** Permite migração de dados e importação em massa. Economiza tempo ao não precisar cadastrar candidatos manualmente.

---

## 👥 7. `src/components/modals/JobsCandidateModal.jsx` - Modal de Candidatos por Vaga

**Importância:** ⭐⭐⭐ **IMPORTANTE**

**Objetivo:** Exibe lista de candidatos vinculados a uma vaga específica.

**Funcionalidades:**
- Lista todos os candidatos que se inscreveram para a vaga
- Mostra informações resumidas: nome, email, telefone, cidade, status
- Exibe foto do candidato (se disponível)
- Mostra score de match (se calculado)
- Badge colorido com status atual do candidato

**Por que é essencial:** Permite visualizar rapidamente todos os candidatos de uma vaga. Facilita comparação e seleção.

---

## ⚙️ 8. `src/components/SettingsPage.jsx` - Página de Configurações

**Importância:** ⭐⭐⭐ **IMPORTANTE**

**Objetivo:** Interface centralizada para configurações e gerenciamento do sistema.

**Abas Disponíveis:**

### 8.1. Gerenciamento de Campos
- Lista todos os campos do sistema
- Visualização de campos visíveis/obrigatórios
- (Funcionalidade de edição pendente)

### 8.2. Configuração do Pipeline
- Visualização e edição das etapas do funil
- Gerenciamento de gatilhos de fechamento
- Motivos de perda de candidatos

### 8.3. Importar / Exportar
- Botão para abrir modal de importação CSV
- (Exportação pendente de implementação)

### 8.4. Usuários
- Lista de usuários do sistema
- Perfis e status (mock por enquanto)

### 8.5. Modelos de Email
- Templates de email automáticos
- Gatilhos por etapa do pipeline

### 8.6. Histórico de Ações
- Log de ações em massa realizadas no sistema

**Por que é essencial:** Centraliza configurações do sistema. Facilita administração e customização.

---

## 🎨 9. `tailwind.config.js` - Configuração do Tailwind CSS

**Importância:** ⭐⭐⭐ **IMPORTANTE**

**Objetivo:** Define configurações personalizadas do framework Tailwind CSS usado para estilização.

**Configurações Principais:**

### 9.1. Dark Mode
- `darkMode: 'class'`: Habilita modo escuro baseado em classe CSS
- Permite toggle manual de tema

### 9.2. Cores da Marca
- `brand.orange`: #fe5009 (cor principal)
- `brand.cyan`: #00bcbc (cor secundária)
- `brand.dark`: #0f172a (fundo principal)
- `brand.card`: #1e293b (fundo dos cards)
- `brand.hover`: #334155 (estado hover)
- `brand.border`: #475569 (bordas)

### 9.3. Fonte
- `Space Grotesk`: Fonte customizada usada em toda aplicação

**Por que é essencial:** Define identidade visual do sistema. Sem ele, as cores e estilos personalizados não funcionam.

---

## 🎨 10. `src/index.css` - Estilos Globais

**Importância:** ⭐⭐ **COMPLEMENTAR**

**Objetivo:** Estilos CSS globais aplicados em toda a aplicação.

**Conteúdo:**
- Importação da fonte Google Fonts (Space Grotesk)
- Diretivas do Tailwind CSS (@tailwind base, components, utilities)
- Reset de estilos (altura 100%, margens zeradas)
- Customização de scrollbar para tema escuro
- Cores de fundo e texto padrão

**Por que é essencial:** Define base visual da aplicação. Garante consistência de estilos e scrollbar customizada.

---

## 📊 Resumo de Importância

| Arquivo | Importância | Motivo |
|---------|-------------|--------|
| `src/main.jsx` | ⭐⭐⭐⭐⭐ | Ponto de entrada - sem ele nada funciona |
| `src/App.jsx` | ⭐⭐⭐⭐⭐ | Contém toda lógica e funcionalidades principais |
| `src/constants.js` | ⭐⭐⭐⭐⭐ | Centraliza configurações críticas do sistema |
| `src/ThemeContext.jsx` | ⭐⭐⭐⭐ | Gerencia tema com persistência |
| `src/components/modals/TransitionModal.jsx` | ⭐⭐⭐⭐ | Validação e integridade de dados |
| `src/components/modals/CsvImportModal.jsx` | ⭐⭐⭐⭐ | Importação em massa essencial |
| `src/components/modals/JobsCandidateModal.jsx` | ⭐⭐⭐ | Visualização de candidatos por vaga |
| `src/components/SettingsPage.jsx` | ⭐⭐⭐ | Configurações e administração |
| `tailwind.config.js` | ⭐⭐⭐ | Identidade visual e cores |
| `src/index.css` | ⭐⭐ | Estilos globais complementares |

---

## 🔗 Dependências entre Arquivos

```
main.jsx
  └── ThemeContext.jsx (fornece contexto de tema)
  └── App.jsx (componente principal)
      ├── constants.js (importa constantes)
      ├── TransitionModal.jsx (modal de transição)
      ├── CsvImportModal.jsx (modal de importação)
      ├── JobsCandidateModal.jsx (modal de candidatos)
      └── SettingsPage.jsx (página de configurações)
          └── constants.js (importa constantes)
```

---

## 📝 Notas Finais

- **Arquivos não listados**: Existem outros arquivos no projeto (package.json, vite.config.js, etc.) mas são arquivos de configuração de build/ambiente, não essenciais para entender a lógica da aplicação.

- **Firebase**: A aplicação depende do Firebase (Firestore + Auth) mas as configurações estão no código, não em arquivos separados.

- **Componentes Reutilizáveis**: Alguns componentes menores (como InputField) estão dentro de App.jsx por simplicidade, mas poderiam ser extraídos para arquivos separados.

---

**Última atualização:** 4 de Dezembro, 2025





