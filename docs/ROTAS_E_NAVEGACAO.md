# 🗺️ Rotas e Navegação - Young Talents ATS

Este documento descreve todas as rotas e slugs disponíveis no sistema.

## 📍 Rotas Principais

### Rotas Públicas (Sem Autenticação)

| Rota | Descrição | Componente |
|------|-----------|------------|
| `/apply` | Formulário público de candidatos | `PublicCandidateForm` |
| `/apply/thank-you` | Página de agradecimento após envio | `ThankYouPage` |

**Nota:** Essas rotas são acessíveis sem login e permitem que candidatos externos se cadastrem.

### Rotas de Páginas (Requerem Autenticação)

| Rota | Slug | Descrição | Componente |
|------|------|-----------|------------|
| `/` | - | Redireciona para `/dashboard` | - |
| `/dashboard` | `dashboard` | Dashboard com KPIs e gráficos | `Dashboard` |
| `/pipeline` | `pipeline` | Pipeline Kanban de candidatos | `PipelineView` |
| `/candidates` | `candidates` | Banco de Talentos (tabela) | `TalentBankView` |
| `/jobs` | `jobs` | Gestão de Vagas | `JobsList` |
| `/applications` | `applications` | Candidaturas formais | `ApplicationsPage` |
| `/companies` | `companies` | Gestão de Empresas | `MasterDataManager` |
| `/positions` | `positions` | Gestão de Cargos | `MasterDataManager` |
| `/sectors` | `sectors` | Gestão de Setores | `MasterDataManager` |
| `/cities` | `cities` | Gestão de Cidades | `MasterDataManager` |
| `/reports` | `reports` | Relatórios | `ReportsPage` |
| `/help` | `help` | Ajuda e Documentação | `HelpPage` |
| `/settings` | `settings` | Configurações do Sistema | `SettingsPage` |

### Rotas de Perfil

| Rota | Parâmetro | Descrição | Componente |
|------|-----------|-----------|-------------|
| `/candidate/:id` | `id` | Perfil completo do candidato | `CandidateProfilePage` |

**Exemplo:** `/candidate/abc123xyz` abre o perfil do candidato com ID `abc123xyz`

## 🔗 Query Parameters (Modais)

Os modais são abertos via query parameters na URL:

| Parâmetro | Valor | Descrição | Exemplo |
|-----------|-------|-----------|---------|
| `modal` | `job` | Modal de criação/edição de vaga | `/?modal=job` |
| `modal` | `job-candidates` | Modal de candidatos de uma vaga | `/?modal=job-candidates&id=job123` |
| `modal` | `csv` | Modal de importação CSV | `/?modal=csv` |
| `id` | `string` | ID do recurso (vaga, candidato, etc) | `/?modal=job&id=job123` |
| `settingsTab` | `campos\|pipeline\|empresas\|usuarios\|historico\|emails` | Aba ativa nas configurações | `/settings?settingsTab=pipeline` |

**Exemplos de URLs completas:**
- `/dashboard?modal=job&id=abc123` - Dashboard com modal de edição de vaga
- `/candidates?modal=csv` - Banco de Talentos com modal de importação
- `/settings?settingsTab=pipeline` - Configurações na aba Pipeline

## 🧭 Navegação Programática

### Funções de Navegação

```javascript
// Navegar para uma página
navigate('/dashboard');
navigate('/pipeline');
navigate('/candidates');

// Abrir perfil de candidato
navigate(`/candidate/${candidateId}`);

// Abrir modal de vaga
const params = new URLSearchParams();
params.set('modal', 'job');
if (jobId) params.set('id', jobId);
navigate(`${location.pathname}?${params.toString()}`);

// Fechar modal (remove query params)
navigate(location.pathname);
```

### Mudança de Aba

```javascript
// Usar setActiveTab (atualiza URL automaticamente)
setActiveTab('dashboard');
setActiveTab('pipeline');
setActiveTab('candidates');
```

## 🔄 Redirecionamentos Automáticos

1. **Rota raiz (`/`)**: Redireciona automaticamente para `/dashboard`
2. **Settings sem aba**: Se acessar `/settings` sem `settingsTab`, redireciona para `/settings?settingsTab=campos`

## 📱 URLs Compartilháveis

Todas as rotas são compartilháveis:
- ✅ Páginas principais: `/dashboard`, `/pipeline`, `/candidates`, etc.
- ✅ Perfis de candidatos: `/candidate/:id`
- ✅ Modais: `/?modal=job&id=abc123`
- ✅ Configurações: `/settings?settingsTab=pipeline`

## ⚠️ Notas Importantes

1. **Slugs diretos**: As rotas usam slugs diretos (sem `page=`), ex: `/dashboard` em vez de `/?page=dashboard`
2. **Query params para modais**: Modais são controlados via query parameters, não rotas separadas
3. **Persistência**: O estado da aplicação (filtros, abas) é sincronizado com a URL
4. **Histórico do navegador**: Todas as navegações são registradas no histórico do navegador

## 🔍 Validação de Rotas

O sistema valida automaticamente se o slug é válido:

```javascript
const validTabs = [
  'dashboard', 'pipeline', 'candidates', 'jobs', 
  'applications', 'companies', 'positions', 'sectors', 
  'cities', 'reports', 'help', 'settings'
];
```

Se um slug inválido for acessado, o sistema redireciona para `/dashboard`.
