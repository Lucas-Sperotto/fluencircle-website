# Verificações e testes — revisão Gemini (material encaminhado)

**Data:** 19/11/2026 · **Base:** `469aaecb767bec2d552d05faf7323fd407fb303a`.

## Matriz de evidência

| Categoria | Execução pelo Gemini? | Resultado documentado |
| --- | --- | --- |
| SHA-256 do pacote | **SIM, informado pelo Gemini** | 111/111 caminhos iguais ao manifesto |
| Leitura dos exemplos JSON | **SIM, informado pelo Gemini** | `database.rules.proposta.json` e `firebase.json.exemplo` sintaticamente válidos; lacunas FC-01/02/06/07/09 |
| `npm test` | **NÃO**; log pré-gerado | 25/25 testes Node `v22.23.4` indicados por `EVIDENCIAS/npm-test.txt` |
| `node --check` | **NÃO**; log pré-gerado | PASS no arquivo `EVIDENCIAS/node-check.txt` |
| `verify-architecture.mjs` | **NÃO**; log pré-gerado | 42 módulos JS, 0 violações estáticas |
| `verify-static.mjs` | **NÃO**; log pré-gerado | 8 HTML, 31 referências locais, 0 ausentes |
| Firebase Emulator / regras ativas | **NÃO** | Não há prova de matriz de autorização ou configuração em vigor |
| Render / Gemini backend | **NÃO** | Código de servidor fora deste repositório |
| Browser E2E/visual/a11y | **NÃO** | Não há suíte automatizada reproduzida por Gemini |

O Gemini relatou não possuir executáveis `node`, `npm`, `git` e `firebase-tools` em seu container de análise. Não atribuir os logs do GitHub Actions ao ambiente Gemini.

## Comandos offline reproduzíveis

```bash
node -v
npm test
find public/js tests scripts -type f \( -name '*.js' -o -name '*.mjs' \) -print0 | xargs -0 -n1 node --check
node scripts/verify-static.mjs
node scripts/verify-architecture.mjs
```

Eles não modificam dados de produção.

## Testes futuros (NÃO EXECUTADOS)

Uma suíte Firebase Emulator isolada sob `demo-fluencircle-test` deve verificar, com dados artificiais, **negação** de gravação de cards por visitantes, leitura de sessões/cartões não vinculados por aluno A/B, leitura global de `users` por mediador e escrita de papéis/temas/índices por usuários sem permissão.

Também deverá testar progressão do SRS, concorrência e `onDisconnect` de duas conexões. Os resultados reais e as regras testadas deverão ser anexados ao PR.

```bash
# Apenas após existir firebase.json E regras DE TESTE revisadas no Emulator
firebase emulators:exec --project demo-fluencircle-test --only database "node --test tests/rules/*.test.js"
```

**Não executar comandos de deploy a partir dos arquivos `*.proposta.json` e `*.exemplo`.**
