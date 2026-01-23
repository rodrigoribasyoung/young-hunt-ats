# Zerar a coleção `candidates` no Firestore

Para recomeçar a base do zero (ex.: antes de importar um CSV com os dados antigos até uma data).

## Opção 1: Script com Firebase Admin (recomendado)

### Requisitos

- `VITE_FIREBASE_PROJECT_ID` em `.env` ou `.env.local`
- Credenciais (uma das opções):
  - **Service Account:** `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json`  
    Ou: `node scripts/delete-candidates-collection.js --key=./serviceAccountKey.json`
  - **gcloud:** `gcloud auth application-default login` (conta com acesso ao projeto)

### Executar

```bash
npm run delete-candidates
```

Ou:

```bash
node scripts/delete-candidates-collection.js
```

Com chave explícita:

```bash
node scripts/delete-candidates-collection.js --key=./caminho/para/serviceAccountKey.json
```

### Se der `RESOURCE_EXHAUSTED` / `Quota exceeded`

- O projeto pode ter batido no limite de leituras/escritas (ex.: cota diária do plano gratuito).
- **O que fazer:**
  1. Tentar de novo em algumas horas.
  2. Ou excluir pelo **Firebase Console:** Firestore > `candidates` > selecionar documentos e excluir (em lotes, se for muitos).
  3. Ou reduzir `BATCH_SIZE` e aumentar `DELAY_MS` em `scripts/delete-candidates-collection.js` e rodar de novo.

---

## Opção 2: Firebase CLI

Com o projeto selecionado e CLI logada na conta certa:

```bash
firebase use talents-c856d
firebase firestore:delete candidates -r -f
```

Ou em um projeto diferente:

```bash
firebase firestore:delete candidates -r -f -P SEU_PROJECT_ID
```

Se aparecer `Failed to fetch documents` ou erro de rede, use o script da Opção 1.

---

## Após zerar

- Importe o CSV dos candidatos antigos (ex.: até 22/01/2026) pelo **Banco de Talentos** > Importar CSV no ATS.
- Novos cadastros passam a vir só do formulário público `/apply` e da importação.
