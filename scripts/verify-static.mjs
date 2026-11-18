// Verificações estáticas determinísticas, sem rede, Firebase ou dependências npm.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const publicRoot = join(repoRoot, 'public');
const entries = readdirSync(publicRoot).filter((file) => file.endsWith('.html'));
const missing = [];
let references = 0;

for (const htmlName of entries) {
  const htmlPath = join(publicRoot, htmlName);
  const html = readFileSync(htmlPath, 'utf8');
  const urls = [
    ...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi),
    ...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi),
  ];
  for (const match of urls) {
    const url = match[1];
    if (/^(?:https?:|data:|\/\/|#|mailto:)/i.test(url)) continue;
    const pathname = url.split(/[?#]/)[0];
    if (!pathname) continue;
    const base = pathname.startsWith('/') ? publicRoot : dirname(htmlPath);
    const target = resolve(base, pathname.replace(/^\//, ''));
    references++;
    if (!existsSync(target)) missing.push({ file: htmlName, target: pathname });
  }
}

for (const filename of [
  'docs/firebase/database.rules.proposta.json',
  'docs/firebase/firebase.json.exemplo',
  'package.json',
]) {
  JSON.parse(readFileSync(join(repoRoot, filename), 'utf8'));
}

if (missing.length) {
  for (const item of missing) console.error('Referência local não encontrada:', item);
  process.exitCode = 1;
} else {
  console.log(`HTML: ${entries.length} páginas; ${references} referências locais conferidas; 0 ausentes.`);
  console.log('JSON de configuração e propostas: sintaxe válida.');
}
