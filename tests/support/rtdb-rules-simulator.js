/**
 * @file Avaliador LOCAL e simplificado das regras do Firebase Realtime Database.
 *
 * ATENÇÃO — ISTO NÃO É O FIREBASE. Serve para dar retorno rápido, sem rede e
 * sem Java, enquanto se escreve ou revisa `docs/firebase/database.rules.proposta.json`.
 * A prova oficial continua sendo o Firebase Emulator (`npm run test:rules`).
 * Se o simulador e o Emulator discordarem, o Emulator está certo e este
 * arquivo deve ser corrigido.
 *
 * O que é implementado (semântica documentada em
 * https://firebase.google.com/docs/database/security/core-syntax):
 * - `.read` e `.write` em CASCATA: basta uma regra verdadeira no caminho ou em
 *   um ancestral; regras de nós filhos não revogam o que o pai concedeu.
 * - `.validate` NÃO cascateia: é avaliada em cada nó escrito — ancestrais do
 *   caminho escrito e toda a subárvore nova — e só quando o novo valor não é nulo.
 * - Filho nomeado tem prioridade sobre o curinga `$variavel` do mesmo nível.
 * - Variáveis `auth`, `now`, `root`, `data`, `newData` e `$variaveis`.
 * - Métodos de RuleDataSnapshot (`child`, `parent`, `val`, `exists`, `hasChild`,
 *   `hasChildren`, `isString`, `isNumber`, `isBoolean`, `getPriority`) e de string
 *   (`length`, `contains`, `beginsWith`, `endsWith`, `replace`, `toLowerCase`,
 *   `toUpperCase`, `matches`).
 * - `update` multicaminho atômico (tudo ou nada) e `transaction` simples.
 * - `onDisconnect`: a permissão é conferida no REGISTRO; na desconexão a
 *   operação é aplicada sem nova checagem (comportamento documentado do RTDB).
 *
 * O que NÃO é implementado: regras baseadas em consulta (`query.*`), `.indexOn`
 * (apenas ignorado), prioridades, limites de tamanho/profundidade, `ServerValue`.
 * Erro de avaliação (tipo errado, método inexistente, nulo onde não pode) torna a
 * regra falsa, como no Firebase.
 *
 * Módulo ES sem dependências e sem APIs do Node: roda no Node (testes) e no
 * navegador (banco simulado dos testes E2E).
 */

// ---------------------------------------------------------------------------
// Árvore de dados (valores normalizados como o RTDB guarda)
// ---------------------------------------------------------------------------

const INVALID_KEY = /[.#$/[\]\x00-\x1f\x7f]/;

/** Divide um caminho em segmentos, ignorando barras extras. */
export function splitPath(path) {
  return String(path ?? '').split('/').filter(Boolean);
}

/**
 * Normaliza um valor como o RTDB: arrays viram objetos com chaves numéricas,
 * objetos vazios e `null` deixam de existir, chaves inválidas são recusadas.
 * @returns {unknown} valor normalizado ou null
 */
export function normalizeValue(value) {
  if (value === undefined) throw new TypeError('undefined não é um valor válido no RTDB.');
  if (value === null) return null;
  if (Array.isArray(value)) {
    return normalizeValue(Object.fromEntries(value.map((item, index) => [String(index), item])));
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (!key || INVALID_KEY.test(key)) throw new TypeError(`Chave inválida no RTDB: "${key}"`);
      const normalized = normalizeValue(child);
      if (normalized !== null) out[key] = normalized;
    }
    return Object.keys(out).length ? out : null;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError('Número inválido no RTDB.');
  if (['string', 'number', 'boolean'].includes(typeof value)) return value;
  throw new TypeError(`Tipo não suportado no RTDB: ${typeof value}`);
}

/** Lê o valor em um caminho (null se não existir). */
export function getAt(tree, parts) {
  let node = tree;
  for (const part of parts) {
    if (node === null || typeof node !== 'object' || !(part in node)) return null;
    node = node[part];
  }
  return node ?? null;
}

/** Devolve uma NOVA árvore com o valor gravado no caminho (cópia na escrita). */
export function setAt(tree, parts, value) {
  const normalized = normalizeValue(value);
  if (parts.length === 0) return normalized;
  const [head, ...rest] = parts;
  const base = tree !== null && typeof tree === 'object' ? { ...tree } : {};
  const child = setAt(base[head] ?? null, rest, normalized);
  if (child === null) delete base[head];
  else base[head] = child;
  return Object.keys(base).length ? base : null;
}

const clone = (value) => (value === null || typeof value !== 'object' ? value : JSON.parse(JSON.stringify(value)));

// ---------------------------------------------------------------------------
// RuleDataSnapshot
// ---------------------------------------------------------------------------

class RuleError extends Error {}

class Snapshot {
  /** @param {unknown} tree raiz @param {string[]} parts caminho */
  constructor(tree, parts) {
    this.tree = tree;
    this.parts = parts;
  }

  get value() { return getAt(this.tree, this.parts); }

  val() { return clone(this.value); }
  exists() { return this.value !== null; }
  child(path) {
    if (typeof path !== 'string' && typeof path !== 'number') throw new RuleError('child() exige texto.');
    return new Snapshot(this.tree, [...this.parts, ...splitPath(String(path))]);
  }
  parent() {
    if (this.parts.length === 0) throw new RuleError('parent() na raiz.');
    return new Snapshot(this.tree, this.parts.slice(0, -1));
  }
  hasChild(path) { return this.child(path).exists(); }
  hasChildren(names) {
    const value = this.value;
    if (value === null || typeof value !== 'object') return false;
    if (names === undefined) return Object.keys(value).length > 0;
    if (!Array.isArray(names)) throw new RuleError('hasChildren() exige uma lista.');
    return names.every((name) => this.hasChild(name));
  }
  isString() { return typeof this.value === 'string'; }
  isNumber() { return typeof this.value === 'number'; }
  isBoolean() { return typeof this.value === 'boolean'; }
  getPriority() { return null; }
}

const SNAPSHOT_METHODS = new Set(['val', 'exists', 'child', 'parent', 'hasChild', 'hasChildren', 'isString', 'isNumber', 'isBoolean', 'getPriority']);

const STRING_METHODS = {
  contains: (s, sub) => s.includes(requireString(sub)),
  beginsWith: (s, sub) => s.startsWith(requireString(sub)),
  endsWith: (s, sub) => s.endsWith(requireString(sub)),
  replace: (s, from, to) => s.split(requireString(from)).join(requireString(to)),
  toLowerCase: (s) => s.toLowerCase(),
  toUpperCase: (s) => s.toUpperCase(),
  matches: (s, regex) => {
    if (!(regex instanceof RegExp)) throw new RuleError('matches() exige expressão regular.');
    return regex.test(s);
  },
};

function requireString(value) {
  if (typeof value !== 'string') throw new RuleError('Argumento de texto esperado.');
  return value;
}

// ---------------------------------------------------------------------------
// Expressões das regras: analisador léxico e sintático (precedência de JS)
// ---------------------------------------------------------------------------

const PUNCTUATORS = ['===', '!==', '==', '!=', '<=', '>=', '&&', '||', '(', ')', '[', ']', '.', ',', '?', ':', '!', '<', '>', '+', '-', '*', '/', '%'];

function tokenize(source) {
  const tokens = [];
  let i = 0;
  const previousAllowsRegex = () => {
    const last = tokens[tokens.length - 1];
    return !last || (last.type === 'punct' && ['(', ',', '?', ':', '!', '&&', '||', '==', '===', '!=', '!=='].includes(last.value));
  };
  while (i < source.length) {
    const char = source[i];
    if (/\s/.test(char)) { i++; continue; }
    if (/[0-9]/.test(char)) {
      const match = /^[0-9]+(\.[0-9]+)?/.exec(source.slice(i));
      tokens.push({ type: 'num', value: Number(match[0]) });
      i += match[0].length;
      continue;
    }
    if (char === '"' || char === "'") {
      let j = i + 1;
      let text = '';
      while (j < source.length && source[j] !== char) {
        if (source[j] === '\\') {
          const next = source[j + 1];
          text += next === 'n' ? '\n' : next === 't' ? '\t' : next;
          j += 2;
        } else {
          text += source[j++];
        }
      }
      if (source[j] !== char) throw new RuleError('Texto sem aspas de fechamento.');
      tokens.push({ type: 'str', value: text });
      i = j + 1;
      continue;
    }
    if (char === '/' && previousAllowsRegex()) {
      let j = i + 1;
      let body = '';
      let inClass = false;
      while (j < source.length && (source[j] !== '/' || inClass)) {
        if (source[j] === '\\') { body += source[j] + source[j + 1]; j += 2; continue; }
        if (source[j] === '[') inClass = true;
        if (source[j] === ']') inClass = false;
        body += source[j++];
      }
      if (source[j] !== '/') throw new RuleError('Expressão regular sem barra de fechamento.');
      const flags = /^[a-z]*/.exec(source.slice(j + 1))[0];
      if (flags && flags !== 'i') throw new RuleError('O RTDB só aceita a flag "i" em expressões regulares.');
      tokens.push({ type: 'regex', value: new RegExp(body, flags) });
      i = j + 1 + flags.length;
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      const match = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(source.slice(i));
      tokens.push({ type: 'ident', value: match[0] });
      i += match[0].length;
      continue;
    }
    const punct = PUNCTUATORS.find((p) => source.startsWith(p, i));
    if (!punct) throw new RuleError(`Caractere inesperado "${char}" na regra.`);
    tokens.push({ type: 'punct', value: punct });
    i += punct.length;
  }
  tokens.push({ type: 'eof' });
  return tokens;
}

/** Converte o texto de uma regra em árvore sintática. */
export function parseRuleExpression(source) {
  const tokens = tokenize(source);
  let position = 0;
  const peek = () => tokens[position];
  const isPunct = (value) => peek().type === 'punct' && peek().value === value;
  const expect = (value) => {
    if (!isPunct(value)) throw new RuleError(`Esperado "${value}" na regra.`);
    position++;
  };

  function primary() {
    const token = tokens[position++];
    switch (token.type) {
      case 'num': case 'str': case 'regex':
        return { kind: 'literal', value: token.value };
      case 'ident':
        if (token.value === 'true') return { kind: 'literal', value: true };
        if (token.value === 'false') return { kind: 'literal', value: false };
        if (token.value === 'null') return { kind: 'literal', value: null };
        return { kind: 'identifier', name: token.value };
      case 'punct':
        if (token.value === '(') {
          const inner = expression();
          expect(')');
          return inner;
        }
        if (token.value === '[') {
          const items = [];
          while (!isPunct(']')) {
            items.push(expression());
            if (!isPunct(']')) expect(',');
          }
          expect(']');
          return { kind: 'array', items };
        }
        break;
      default:
        break;
    }
    throw new RuleError('Expressão incompleta na regra.');
  }

  function postfix() {
    let node = primary();
    for (;;) {
      if (isPunct('.')) {
        position++;
        const name = tokens[position++];
        if (name.type !== 'ident') throw new RuleError('Nome esperado após ".".');
        node = { kind: 'member', object: node, name: name.value };
      } else if (isPunct('(')) {
        position++;
        const args = [];
        while (!isPunct(')')) {
          args.push(expression());
          if (!isPunct(')')) expect(',');
        }
        expect(')');
        node = { kind: 'call', callee: node, args };
      } else if (isPunct('[')) {
        position++;
        const property = expression();
        expect(']');
        node = { kind: 'index', object: node, property };
      } else {
        return node;
      }
    }
  }

  function unary() {
    if (isPunct('!') || isPunct('-')) {
      const operator = tokens[position++].value;
      return { kind: 'unary', operator, argument: unary() };
    }
    return postfix();
  }

  function binary(next, operators) {
    return function parse() {
      let left = next();
      while (peek().type === 'punct' && operators.includes(peek().value)) {
        const operator = tokens[position++].value;
        left = { kind: 'binary', operator, left, right: next() };
      }
      return left;
    };
  }

  const multiplicative = binary(unary, ['*', '/', '%']);
  const additive = binary(multiplicative, ['+', '-']);
  const relational = binary(additive, ['<', '<=', '>', '>=']);
  const equality = binary(relational, ['==', '===', '!=', '!==']);
  const logicalAnd = binary(equality, ['&&']);
  const logicalOr = binary(logicalAnd, ['||']);

  function expression() {
    const test = logicalOr();
    if (!isPunct('?')) return test;
    position++;
    const consequent = expression();
    expect(':');
    return { kind: 'conditional', test, consequent, alternate: expression() };
  }

  const ast = expression();
  if (peek().type !== 'eof') throw new RuleError('Texto extra no fim da regra.');
  return ast;
}

// ---------------------------------------------------------------------------
// Avaliação
// ---------------------------------------------------------------------------

const isPlainObject = (value) => value !== null && typeof value === 'object' && !(value instanceof Snapshot) && !(value instanceof RegExp) && !Array.isArray(value);

function requireBoolean(value, where) {
  if (typeof value !== 'boolean') throw new RuleError(`${where} exige booleano.`);
  return value;
}

function strictEquals(left, right) {
  // `auth != null` é o idioma oficial: comparar qualquer valor com null é permitido.
  if (left === null || right === null) return left === right;
  if (isPlainObject(left) || isPlainObject(right) || left instanceof Snapshot || right instanceof Snapshot) {
    throw new RuleError('Comparação com objeto não é permitida.');
  }
  return left === right;
}

function evaluate(node, scope) {
  switch (node.kind) {
    case 'literal': return node.value;
    case 'array': return node.items.map((item) => evaluate(item, scope));
    case 'identifier':
      if (!Object.hasOwn(scope, node.name)) throw new RuleError(`Variável desconhecida: ${node.name}`);
      return scope[node.name];
    case 'unary': {
      const value = evaluate(node.argument, scope);
      if (node.operator === '!') return !requireBoolean(value, '"!"');
      if (typeof value !== 'number') throw new RuleError('"-" exige número.');
      return -value;
    }
    case 'conditional':
      return requireBoolean(evaluate(node.test, scope), 'Condição') ? evaluate(node.consequent, scope) : evaluate(node.alternate, scope);
    case 'binary': return evaluateBinary(node, scope);
    case 'member': return readMember(evaluate(node.object, scope), node.name);
    case 'index': return readMember(evaluate(node.object, scope), evaluate(node.property, scope));
    case 'call': {
      if (node.callee.kind !== 'member') throw new RuleError('Somente métodos podem ser chamados.');
      const target = evaluate(node.callee.object, scope);
      const args = node.args.map((arg) => evaluate(arg, scope));
      return callMethod(target, node.callee.name, args);
    }
    default:
      throw new RuleError(`Nó desconhecido: ${node.kind}`);
  }
}

function evaluateBinary(node, scope) {
  if (node.operator === '&&') {
    return requireBoolean(evaluate(node.left, scope), '"&&"') && requireBoolean(evaluate(node.right, scope), '"&&"');
  }
  if (node.operator === '||') {
    return requireBoolean(evaluate(node.left, scope), '"||"') || requireBoolean(evaluate(node.right, scope), '"||"');
  }
  const left = evaluate(node.left, scope);
  const right = evaluate(node.right, scope);
  switch (node.operator) {
    case '==': case '===': return strictEquals(left, right);
    case '!=': case '!==': return !strictEquals(left, right);
    case '+':
      if (typeof left === 'number' && typeof right === 'number') return left + right;
      if ((typeof left === 'string' && ['string', 'number', 'boolean'].includes(typeof right))
        || (typeof right === 'string' && ['string', 'number', 'boolean'].includes(typeof left))) {
        return String(left) + String(right);
      }
      throw new RuleError('"+" exige números ou texto.');
    case '-': case '*': case '/': case '%':
      if (typeof left !== 'number' || typeof right !== 'number') throw new RuleError(`"${node.operator}" exige números.`);
      if (node.operator === '-') return left - right;
      if (node.operator === '*') return left * right;
      if (node.operator === '/') return left / right;
      return left % right;
    case '<': case '<=': case '>': case '>=': {
      const comparable = (typeof left === 'number' && typeof right === 'number') || (typeof left === 'string' && typeof right === 'string');
      if (!comparable) throw new RuleError(`"${node.operator}" exige dois números ou dois textos.`);
      if (node.operator === '<') return left < right;
      if (node.operator === '<=') return left <= right;
      if (node.operator === '>') return left > right;
      return left >= right;
    }
    default:
      throw new RuleError(`Operador desconhecido: ${node.operator}`);
  }
}

function readMember(target, name) {
  if (typeof target === 'string') {
    if (name === 'length') return target.length;
    throw new RuleError(`Propriedade de texto desconhecida: ${name}`);
  }
  if (isPlainObject(target)) {
    // auth e auth.token: propriedade ausente vale null (ex.: claim não definida).
    return Object.hasOwn(target, name) ? target[name] : null;
  }
  throw new RuleError(`Não é possível ler "${name}" deste valor.`);
}

function callMethod(target, name, args) {
  if (target instanceof Snapshot) {
    if (!SNAPSHOT_METHODS.has(name)) throw new RuleError(`Método de snapshot desconhecido: ${name}`);
    return target[name](...args);
  }
  if (typeof target === 'string') {
    const method = STRING_METHODS[name];
    if (!method) throw new RuleError(`Método de texto desconhecido: ${name}`);
    return method(target, ...args);
  }
  throw new RuleError(`Método "${name}" chamado em valor inválido.`);
}

const parsedCache = new Map();

/**
 * Avalia uma regra (texto ou booleano). Qualquer erro ou resultado
 * não booleano conta como `false`, como no Firebase.
 * @returns {{ result: boolean, error?: string }}
 */
export function evaluateRule(rule, scope) {
  if (typeof rule === 'boolean') return { result: rule };
  if (typeof rule !== 'string') return { result: false, error: 'Regra não é texto nem booleano.' };
  try {
    if (!parsedCache.has(rule)) parsedCache.set(rule, parseRuleExpression(rule));
    const value = evaluate(parsedCache.get(rule), scope);
    return value === true ? { result: true } : { result: false, error: value === false ? undefined : 'Resultado não booleano.' };
  } catch (error) {
    if (error instanceof RuleError || error instanceof TypeError) return { result: false, error: error.message };
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Navegação na árvore de regras
// ---------------------------------------------------------------------------

/** Encontra a regra filha para `key`: nome exato primeiro; senão o curinga `$...`. */
function childRule(ruleNode, key, variables) {
  if (!ruleNode || typeof ruleNode !== 'object') return null;
  if (Object.hasOwn(ruleNode, key) && !key.startsWith('.')) return { node: ruleNode[key], variables };
  const wildcard = Object.keys(ruleNode).find((name) => name.startsWith('$'));
  if (!wildcard) return null;
  return { node: ruleNode[wildcard], variables: { ...variables, [wildcard]: key } };
}

/** Percorre a árvore de regras do topo até o caminho, chamando `visit` em cada nível existente. */
function walkRules(rules, parts, visit) {
  let current = { node: rules, variables: {} };
  if (visit(current, 0) === false) return;
  for (let depth = 0; depth < parts.length; depth++) {
    current = childRule(current.node, parts[depth], current.variables);
    if (!current) return;
    if (visit(current, depth + 1) === false) return;
  }
}

function permissionDenied(message) {
  const error = new Error(`PERMISSION_DENIED: ${message}`);
  error.code = 'PERMISSION_DENIED';
  return error;
}

// ---------------------------------------------------------------------------
// Banco simulado
// ---------------------------------------------------------------------------

/**
 * @typedef {{ uid: string, token?: object, provider?: string } | null} SimulatedAuth
 */

/**
 * Cria um banco em memória que aplica as regras informadas.
 * @param {{ rules: object, data?: object, now?: () => number }} options
 *        `rules` é o objeto inteiro do arquivo (com a chave `rules`).
 */
export function createRulesSimulator({ rules, data = null, now = () => Date.now() }) {
  if (!rules || typeof rules.rules !== 'object') throw new TypeError('Informe o JSON de regras com a chave "rules".');
  const ruleRoot = rules.rules;
  let tree = normalizeValue(data);
  const disconnectQueues = new Map();

  function authValue(auth) {
    if (!auth) return null;
    const token = { sub: auth.uid, firebase: { sign_in_provider: auth.provider || 'password' }, ...(auth.token || {}) };
    return { uid: auth.uid, provider: auth.provider || 'password', token };
  }

  function scopeFor(variables, auth, parts, oldTree, newTree) {
    const scope = {
      ...variables,
      auth: authValue(auth),
      now: now(),
      root: new Snapshot(oldTree, []),
      data: new Snapshot(oldTree, parts),
    };
    if (newTree !== undefined) scope.newData = new Snapshot(newTree, parts);
    return scope;
  }

  /** @returns {{ allowed: boolean, reason?: string }} */
  function checkRead(path, auth) {
    const parts = splitPath(path);
    let allowed = false;
    const errors = [];
    walkRules(ruleRoot, parts, ({ node, variables }, depth) => {
      if (node && Object.hasOwn(node, '.read')) {
        const { result, error } = evaluateRule(node['.read'], scopeFor(variables, auth, parts.slice(0, depth), tree));
        if (error) errors.push(`/${parts.slice(0, depth).join('/')}: ${error}`);
        if (result) { allowed = true; return false; }
      }
      return true;
    });
    return allowed ? { allowed } : { allowed, reason: `leitura negada em /${parts.join('/')}${errors.length ? ` (${errors.join('; ')})` : ''}` };
  }

  /** Confere `.validate` na subárvore nova a partir de um nó de regra. */
  function validateSubtree(ruleNode, variables, parts, auth, oldTree, newTree, failures) {
    const value = getAt(newTree, parts);
    if (value === null) return;
    if (ruleNode && Object.hasOwn(ruleNode, '.validate')) {
      const { result, error } = evaluateRule(ruleNode['.validate'], scopeFor(variables, auth, parts, oldTree, newTree));
      if (!result) failures.push(`.validate falhou em /${parts.join('/')}${error ? ` (${error})` : ''}`);
    }
    if (value !== null && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        const next = childRule(ruleNode, key, variables);
        if (next) validateSubtree(next.node, next.variables, [...parts, key], auth, oldTree, newTree, failures);
      }
    }
  }

  /**
   * Aplica gravações em vários caminhos de forma atômica, conferindo regras.
   * @param {Record<string, unknown>} writes caminho absoluto → valor
   */
  function applyWrites(writes, auth, { checkOnly = false } = {}) {
    const paths = Object.keys(writes).map(splitPath);
    for (let i = 0; i < paths.length; i++) {
      for (let j = 0; j < paths.length; j++) {
        if (i !== j && paths[j].length > paths[i].length && paths[i].every((part, k) => paths[j][k] === part)) {
          throw new Error(`Caminhos sobrepostos no update: /${paths[i].join('/')} e /${paths[j].join('/')}`);
        }
      }
    }
    let newTree = tree;
    for (const [path, value] of Object.entries(writes)) newTree = setAt(newTree, splitPath(path), value);

    const failures = [];
    for (const parts of paths) {
      let granted = false;
      const errors = [];
      walkRules(ruleRoot, parts, ({ node, variables }, depth) => {
        if (node && Object.hasOwn(node, '.write')) {
          const { result, error } = evaluateRule(node['.write'], scopeFor(variables, auth, parts.slice(0, depth), tree, newTree));
          if (error) errors.push(`/${parts.slice(0, depth).join('/')}: ${error}`);
          if (result) { granted = true; return false; }
        }
        return true;
      });
      if (!granted) failures.push(`escrita negada em /${parts.join('/')}${errors.length ? ` (${errors.join('; ')})` : ''}`);
    }

    if (failures.length === 0) {
      const visited = new Set();
      for (const parts of paths) {
        // Ancestrais (incluindo a raiz) e o próprio caminho: só o nó de cada nível.
        walkRules(ruleRoot, parts, ({ node, variables }, depth) => {
          const location = parts.slice(0, depth);
          const key = `/${location.join('/')}`;
          if (depth < parts.length) {
            if (!visited.has(key) && node && Object.hasOwn(node, '.validate') && getAt(newTree, location) !== null) {
              visited.add(key);
              const { result, error } = evaluateRule(node['.validate'], scopeFor(variables, auth, location, tree, newTree));
              if (!result) failures.push(`.validate falhou em ${key}${error ? ` (${error})` : ''}`);
            }
            return true;
          }
          // No caminho escrito: valida a subárvore nova inteira.
          validateSubtree(node, variables, location, auth, tree, newTree, failures);
          return false;
        });
      }
    }

    if (failures.length) throw permissionDenied(failures.join(' | '));
    if (!checkOnly) tree = newTree;
  }

  const api = {
    /** Lê respeitando as regras; lança PERMISSION_DENIED se negado. */
    read(path, auth = null) {
      const decision = checkRead(path, auth);
      if (!decision.allowed) throw permissionDenied(decision.reason);
      return clone(getAt(tree, splitPath(path)));
    },
    /** Só informa se a leitura seria permitida. */
    canRead(path, auth = null) {
      return checkRead(path, auth);
    },
    set(path, value, auth = null) {
      applyWrites({ [`/${splitPath(path).join('/')}`]: value }, auth);
    },
    update(path, values, auth = null) {
      const base = splitPath(path);
      const writes = {};
      for (const [relative, value] of Object.entries(values)) writes[`/${[...base, ...splitPath(relative)].join('/')}`] = value;
      applyWrites(writes, auth);
    },
    remove(path, auth = null) {
      applyWrites({ [`/${splitPath(path).join('/')}`]: null }, auth);
    },
    /**
     * Transação simples: lê o valor atual, chama `updateFn` e grava o resultado.
     * `undefined` aborta (como no SDK).
     */
    transaction(path, updateFn, auth = null) {
      const parts = splitPath(path);
      const current = clone(getAt(tree, parts));
      const next = updateFn(current);
      if (next === undefined) return { committed: false, value: current };
      applyWrites({ [`/${parts.join('/')}`]: next }, auth);
      return { committed: true, value: clone(getAt(tree, parts)) };
    },
    /**
     * Registra uma operação para quando a conexão `connectionId` cair. A
     * permissão é conferida AGORA, com os dados atuais.
     */
    onDisconnect(connectionId, { op, path, value }, auth = null) {
      const parts = splitPath(path);
      const writes = op === 'update'
        ? Object.fromEntries(Object.entries(value).map(([relative, v]) => [`/${[...parts, ...splitPath(relative)].join('/')}`, v]))
        : { [`/${parts.join('/')}`]: op === 'remove' ? null : value };
      applyWrites(writes, auth, { checkOnly: true });
      if (!disconnectQueues.has(connectionId)) disconnectQueues.set(connectionId, []);
      disconnectQueues.get(connectionId).push(writes);
    },
    cancelOnDisconnect(connectionId, path) {
      const prefix = `/${splitPath(path).join('/')}`;
      const queue = disconnectQueues.get(connectionId) || [];
      disconnectQueues.set(connectionId, queue.filter((writes) => !Object.keys(writes).some((p) => p === prefix || p.startsWith(`${prefix}/`))));
    },
    /** Simula a queda da conexão: aplica as operações registradas, sem nova checagem. */
    disconnect(connectionId) {
      const queue = disconnectQueues.get(connectionId) || [];
      disconnectQueues.delete(connectionId);
      for (const writes of queue) {
        let next = tree;
        for (const [path, value] of Object.entries(writes)) next = setAt(next, splitPath(path), value);
        tree = next;
      }
      return queue.length;
    },
    /** Acesso administrativo (sem regras), para preparar dados de teste. */
    adminSet(path, value) { tree = setAt(tree, splitPath(path), value); },
    adminGet(path = '') { return clone(getAt(tree, splitPath(path))); },
    reset(data = null) { tree = normalizeValue(data); disconnectQueues.clear(); },
  };
  return api;
}
