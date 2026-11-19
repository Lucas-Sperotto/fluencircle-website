/**
 * Checagens OFFLINE do arquivo de regras propostas. Não provam autorização:
 * a matriz de acesso está em tests/rules/ (Emulator ou simulador).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderRules, RULES_JSON_PATH } from '../../scripts/build-rules.mjs';
import { parseRuleExpression } from '../support/rtdb-rules-simulator.js';

const rules = JSON.parse(readFileSync(RULES_JSON_PATH, 'utf8'));

function* ruleEntries(node, path = '') {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('.')) yield [`${path}/${key}`, value];
    else if (value && typeof value === 'object') yield* ruleEntries(value, `${path}/${key}`);
  }
}

test('JSON gerado está em sincronia com a fonte comentada (npm run rules:build)', () => {
  assert.equal(readFileSync(RULES_JSON_PATH, 'utf8'), renderRules());
});

test('toda expressão de regra tem sintaxe válida', () => {
  let count = 0;
  for (const [path, value] of ruleEntries(rules.rules)) {
    if (typeof value !== 'string') continue;
    assert.doesNotThrow(() => parseRuleExpression(value), path);
    count++;
  }
  assert.ok(count > 30, `poucas expressões encontradas: ${count}`);
});

test('negação padrão na raiz e nenhuma permissão literal true além da leitura de current_session', () => {
  assert.equal(rules.rules['.read'], false);
  assert.equal(rules.rules['.write'], false);
  const openGrants = [...ruleEntries(rules.rules)].filter(([path, value]) => value === true && /\.(read|write)$/.test(path)).map(([path]) => path);
  assert.deepEqual(openGrants, ['/current_session/.read']);
});

test('nenhum .write concede acesso sem autenticação', () => {
  for (const [path, value] of ruleEntries(rules.rules)) {
    if (!path.endsWith('.write') || value === false) continue;
    assert.match(String(value), /auth != null/, `${path} não exige auth`);
  }
});
