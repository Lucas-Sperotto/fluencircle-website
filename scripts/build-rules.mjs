/**
 * @file Gera `docs/firebase/database.rules.proposta.json` a partir de
 * `firebase/rules/database.rules.source.mjs`.
 *
 *   node scripts/build-rules.mjs          # grava o JSON
 *   node scripts/build-rules.mjs --check  # só confere se o JSON está atualizado (CI)
 *
 * Não acessa rede nem Firebase. Gerar o arquivo NÃO publica nada.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildRules } from '../firebase/rules/database.rules.source.mjs';

export const RULES_JSON_PATH = fileURLToPath(new URL('../docs/firebase/database.rules.proposta.json', import.meta.url));

/** Texto exato do JSON gerado (2 espaços, quebra de linha final). */
export function renderRules() {
  return `${JSON.stringify(buildRules(), null, 2)}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const expected = renderRules();
  if (process.argv.includes('--check')) {
    const current = readFileSync(RULES_JSON_PATH, 'utf8');
    if (current !== expected) {
      console.error('docs/firebase/database.rules.proposta.json está desatualizado. Rode: npm run rules:build');
      process.exitCode = 1;
    } else {
      console.log('Regras propostas: JSON em sincronia com a fonte comentada.');
    }
  } else {
    writeFileSync(RULES_JSON_PATH, expected);
    console.log('Gerado: docs/firebase/database.rules.proposta.json (proposta; nada foi publicado).');
  }
}
