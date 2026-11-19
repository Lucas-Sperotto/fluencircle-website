/**
 * @file Checagem offline de invariantes de arquitetura e sinks HTML.
 *
 * Defesa regressiva básica: não substitui análise por AST, Firebase Rules
 * Emulator, testes de DOM nem a revisão humana de segurança.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const jsRoot = join(root, 'public', 'js');
const problems = [];
let count = 0;

function checkDirectory(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, item.name);
    if (item.isDirectory()) { checkDirectory(file); continue; }
    if (!item.isFile() || !file.endsWith('.js')) continue;
    count++;
    const name = relative(jsRoot, file).replaceAll('\\', '/');
    const source = readFileSync(file, 'utf8');

    // Dados externos devem ser exibidos com h()/textContent, não HTML cru.
    if (/\.\s*(?:innerHTML|outerHTML)\s*=(?!=)/.test(source) ||
        /\.\s*insertAdjacentHTML\s*\(/.test(source) ||
        /\bdocument\s*\.\s*write\s*\(/.test(source)) {
      problems.push(`${name}: sink HTML exige auditoria`);
    }
    if (name.startsWith('domain/') && /^\s*import\s/m.test(source)) {
      problems.push(`${name}: domain/ não deve importar módulos`);
    }
    if (!name.startsWith('core/') && source.includes('https://www.gstatic.com/firebasejs/')) {
      problems.push(`${name}: SDK Firebase CDN fora de core/`);
    }
    if (!name.startsWith('services/') && source.includes('db-paths.js')) {
      problems.push(`${name}: caminhos RTDB fora de services/`);
    }
  }
}

checkDirectory(jsRoot);
if (problems.length) {
  for (const problem of problems) console.error(problem);
  process.exitCode = 1;
} else {
  console.log(`Arquitetura: ${count} módulos JS verificados; 0 violações estáticas.`);
}
