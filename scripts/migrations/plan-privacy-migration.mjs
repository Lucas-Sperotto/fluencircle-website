/**
 * @file Gera o PLANO de migração de privacidade a partir de um backup JSON.
 *
 *   node scripts/migrations/plan-privacy-migration.mjs caminho/do/backup.json > plano.json
 *
 * Não lê nem grava no Firebase. Não publique backups nem planos com dados
 * reais no Git (contêm nomes e e-mails): mantenha-os fora do repositório.
 */
import { readFileSync } from 'node:fs';
import { planPrivacyMigration } from './privacy-migration.mjs';

const file = process.argv[2];
if (!file) {
  console.error('Uso: node scripts/migrations/plan-privacy-migration.mjs <backup.json>');
  process.exit(2);
}
const plan = planPrivacyMigration(JSON.parse(readFileSync(file, 'utf8')));
console.error(`Sessões: ${plan.stats.sessions} · presenças: ${plan.stats.attendees} · PII removida: ${plan.stats.piiRemoved}`
  + ` · índices criados: ${plan.stats.indexCreated} · índices atualizados: ${plan.stats.indexUpgraded}`
  + ` · addedAt preenchido: ${plan.stats.addedAtFilled} · índices órfãos (só relatados): ${plan.orphans.length}`);
console.log(JSON.stringify({ geradoEm: new Date().toISOString(), aplicar: 'update multicaminho na raiz, com privilégio administrativo, após backup', ...plan }, null, 2));
