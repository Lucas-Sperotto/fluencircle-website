/**
 * Fidelidade do simulador local de regras (tests/support/rtdb-rules-simulator.js)
 * a comportamentos DOCUMENTADOS do Realtime Database. Cada caso cita a regra da
 * documentação que reproduz. Passar aqui não prova nada sobre o Firebase real:
 * só indica que o simulador segue a semântica descrita em
 * https://firebase.google.com/docs/database/security/core-syntax
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRulesSimulator, parseRuleExpression, evaluateRule, normalizeValue } from '../support/rtdb-rules-simulator.js';

const denied = (fn) => assert.throws(fn, (error) => error.code === 'PERMISSION_DENIED');
const user = (uid, token = {}) => ({ uid, token });

test('[doc] .read em cascata: o pai concede e o filho não consegue revogar', () => {
  const db = createRulesSimulator({ rules: { rules: { foo: { '.read': true, bar: { '.read': false } } } }, data: { foo: { bar: 1 } } });
  assert.equal(db.read('/foo/bar'), 1);
});

test('[doc] regra no filho não concede leitura do pai', () => {
  const db = createRulesSimulator({ rules: { rules: { foo: { bar: { '.read': true } } } }, data: { foo: { bar: 1, baz: 2 } } });
  assert.equal(db.read('/foo/bar'), 1);
  denied(() => db.read('/foo'));
});

test('[doc] .write em cascata e negação padrão sem regra', () => {
  const db = createRulesSimulator({ rules: { rules: { open: { '.write': true }, closed: { child: {} } } } });
  db.set('/open/a/b', 'x');
  assert.deepEqual(db.adminGet('/open'), { a: { b: 'x' } });
  denied(() => db.set('/closed/child', 1));
});

test('[doc] .validate é avaliada nos ancestrais com o newData combinado (exemplo widget)', () => {
  const rules = { rules: { '.write': true, widget: {
    '.validate': "newData.hasChildren(['color', 'size'])",
    size: { '.validate': 'newData.isNumber() && newData.val() >= 0 && newData.val() <= 99' },
  } } };
  const db = createRulesSimulator({ rules });
  denied(() => db.set('/widget', 'foo'));
  denied(() => db.set('/widget', { size: 22 }));
  denied(() => db.set('/widget', { size: 'foo', color: 'red' }));
  db.set('/widget', { size: 21, color: 'blue' });
  db.set('/widget/size', 99); // registro já tem color: passa
  db.adminSet('/widget', null);
  denied(() => db.set('/widget/size', 99)); // sem color: falha no ancestral
});

test('[doc] .validate não roda para remoções (newData nulo)', () => {
  const db = createRulesSimulator({
    rules: { rules: { '.write': true, widget: { '.validate': "newData.hasChildren(['color'])" } } },
    data: { widget: { color: 'red' } },
  });
  db.remove('/widget');
  assert.equal(db.adminGet('/widget'), null);
});

test('[doc] filho nomeado tem prioridade sobre o curinga $', () => {
  const db = createRulesSimulator({ rules: { rules: { items: {
    special: { '.write': false },
    $id: { '.write': true },
  } } } });
  db.set('/items/qualquer', 1);
  denied(() => db.set('/items/special', 1));
});

test('[padrão] $other com .validate false recusa campos desconhecidos', () => {
  const db = createRulesSimulator({ rules: { rules: { profile: {
    '.write': true, name: { '.validate': 'newData.isString()' }, $other: { '.validate': false },
  } } } });
  db.set('/profile', { name: 'Ana' });
  denied(() => db.set('/profile', { name: 'Ana', extra: true }));
});

test('[doc] update multicaminho é atômico: um caminho negado anula todos', () => {
  const db = createRulesSimulator({ rules: { rules: { a: { '.write': true }, b: { '.write': false } } } });
  denied(() => db.update('/', { 'a/x': 1, 'b/y': 2 }));
  assert.equal(db.adminGet('/a'), null);
});

test('[doc] newData.parent() enxerga o estado combinado de um update multicaminho', () => {
  const rules = { rules: { '.write': true, left: { $id: { '.validate': "newData.parent().parent().child('right/' + $id).exists()" } } } };
  const db = createRulesSimulator({ rules });
  denied(() => db.set('/left/k', 1));
  db.update('/', { 'left/k': 1, 'right/k': 2 });
  assert.equal(db.adminGet('/left/k'), 1);
});

test('[doc] auth é null para visitante; auth.uid e auth.token.email para logado', () => {
  const rules = { rules: { users: { $uid: { '.write': 'auth != null && auth.uid === $uid && auth.token.email === newData.child(\'email\').val()' } } } };
  const db = createRulesSimulator({ rules });
  denied(() => db.set('/users/u1', { email: 'a@x.test' }));
  denied(() => db.set('/users/u1', { email: 'a@x.test' }, user('u2', { email: 'a@x.test' })));
  db.set('/users/u1', { email: 'a@x.test' }, user('u1', { email: 'a@x.test' }));
});

test('[doc] erro de avaliação torna a regra falsa', () => {
  const db = createRulesSimulator({ rules: { rules: { n: { '.write': true, '.validate': 'newData.val().length < 5' } } } });
  denied(() => db.set('/n', 123)); // número não tem length
  db.set('/n', 'abc');
});

test('[doc] matches com expressão regular e flag i', () => {
  assert.equal(evaluateRule("'ABC-12'.matches(/^[a-z]+-[0-9]+$/i)", {}).result, true);
  assert.equal(evaluateRule("'ABC'.matches(/^[a-z]+$/)", {}).result, false);
  assert.throws(() => parseRuleExpression("'a'.matches(/a/g)"));
});

test('[sdk] caminhos sobrepostos no mesmo update são recusados', () => {
  const db = createRulesSimulator({ rules: { rules: { '.write': true } } });
  assert.throws(() => db.update('/', { a: { b: 1 }, 'a/b': 2 }), /sobrepostos/);
});

test('[doc] onDisconnect confere permissão no registro e aplica depois sem nova checagem', () => {
  const rules = { rules: { presence: { $uid: { '.write': 'auth != null && auth.uid === $uid' } } } };
  const db = createRulesSimulator({ rules, data: { presence: { u1: true } } });
  denied(() => db.onDisconnect('c1', { op: 'remove', path: '/presence/u1' }, user('u2')));
  db.onDisconnect('c1', { op: 'remove', path: '/presence/u1' }, user('u1'));
  assert.equal(db.disconnect('c1'), 1);
  assert.equal(db.adminGet('/presence/u1'), null);
});

test('[sdk] transação aborta quando a função devolve undefined', () => {
  const db = createRulesSimulator({ rules: { rules: { '.read': true, '.write': true } }, data: { c: 1 } });
  assert.deepEqual(db.transaction('/c', () => undefined), { committed: false, value: 1 });
  assert.deepEqual(db.transaction('/c', (v) => v + 1), { committed: true, value: 2 });
});

test('[doc] arrays viram objetos com chaves numéricas e vazios somem', () => {
  assert.deepEqual(normalizeValue(['a', null, 'c']), { 0: 'a', 2: 'c' });
  assert.equal(normalizeValue({ a: {} }), null);
  assert.throws(() => normalizeValue({ 'a.b': 1 }), TypeError);
});

test('expressões: precedência, ternário, concatenação e erros de tipo', () => {
  assert.equal(evaluateRule('1 + 2 * 3 === 7 && !(false || false)', {}).result, true);
  assert.equal(evaluateRule("('a' + 1) === 'a1' ? true : false", {}).result, true);
  assert.equal(evaluateRule("'10' < 9", {}).result, false); // erro de tipo → falso
  assert.equal(evaluateRule('1', {}).result, false); // não booleano → falso
});
