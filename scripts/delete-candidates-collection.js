/**
 * Script para excluir TODOS os documentos da coleção 'candidates' no Firestore.
 * Uso: zerar a base para começar do zero (ex.: antes de importar CSV dos antigos).
 *
 * Execute:
 *   node scripts/delete-candidates-collection.js
 *
 * Requisitos:
 *   - .env ou .env.local com VITE_FIREBASE_PROJECT_ID
 *   - Credenciais: uma das opções abaixo
 *     1) GOOGLE_APPLICATION_CREDENTIALS=./caminho/para/serviceAccountKey.json
 *     2) --key=./caminho/para/serviceAccountKey.json
 *     3) gcloud auth application-default login (conta com acesso ao projeto)
 *
 * ⚠️  IRREVERSÍVEL. Faça backup/export se precisar dos dados.
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import admin from 'firebase-admin';

dotenv.config();
dotenv.config({ path: '.env.local' });

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
const COL = 'candidates';
const BATCH_SIZE = 100;  // menor para evitar RESOURCE_EXHAUSTED
const DELAY_MS = 200;    // pausa entre lotes

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getCredential() {
  const keyArg = process.argv.find((a) => a.startsWith('--key='));
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || (keyArg && keyArg.slice(6));
  if (keyPath) {
    const p = resolve(keyPath);
    const key = JSON.parse(readFileSync(p, 'utf8'));
    return admin.credential.cert(key);
  }
  return admin.credential.applicationDefault();
}

async function deleteCollection(db, collectionPath) {
  const col = db.collection(collectionPath);
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await col.limit(BATCH_SIZE).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
    console.log(`   Excluídos ${total} documento(s)...`);
    if (DELAY_MS) await sleep(DELAY_MS);
  }
  return total;
}

async function main() {
  if (!PROJECT_ID) {
    console.error('❌ Defina VITE_FIREBASE_PROJECT_ID em .env ou .env.local');
    process.exit(1);
  }

  console.log(`Projeto: ${PROJECT_ID}`);
  console.log(`Coleção: ${COL}`);
  console.log('Inicializando Firebase Admin...');

  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: PROJECT_ID,
        credential: getCredential()
      });
    }
    const db = admin.firestore();

    console.log(`Excluindo todos os documentos de "${COL}"...`);
    const n = await deleteCollection(db, COL);
    console.log(`\n✅ Concluído. Total excluído: ${n} documento(s).`);
    process.exit(0);
  } catch (e) {
    console.error('\n❌ Erro:', e.message);
    const code = e.code ?? e?.status ?? e?.details?.[0]?.code;
    if (code === 7 || e.message?.includes('PERMISSION_DENIED')) {
      console.log('\nDica: use uma Service Account com permissão de edição no Firestore.');
      console.log('  - Baixe a chave em: Firebase Console > Configurações do projeto > Contas de serviço');
      console.log('  - Execute: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/delete-candidates-collection.js');
      console.log('  - Ou: node scripts/delete-candidates-collection.js --key=./serviceAccountKey.json');
    }
    if (code === 8 || e.message?.includes('RESOURCE_EXHAUSTED') || e.message?.includes('Quota exceeded')) {
      console.log('\nDica (cota excedida): o projeto pode ter atingido limite de leituras/escritas.');
      console.log('  - Tente novamente em algumas horas (cotas diárias são renovadas).');
      console.log('  - Ou exclua manualmente: Firebase Console > Firestore > candidates (selecione e delete).');
      console.log('  - Ou reduza BATCH_SIZE/DELAY_MS no script e execute de novo.');
    }
    process.exit(1);
  }
}

main();
