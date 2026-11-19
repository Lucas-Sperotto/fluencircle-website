# [Claude][Tests] E2E de perfis, fluxos e acessibilidade com Firebase simulado (2/6)

## Objetivo e Issue
- Issues: Relates to #13, #15, #28.
- Base: PR 1 (`claude/emulador-regras` @ `6cf336b`). Branch: `claude/e2e-perfis` @ `e2f65e6`.
- Escopo: harness Playwright no repositório (resolve a lacuna FC-08: verificações de navegador antes só no ambiente do Claude) e job `e2e` na CI.

## Proveniência
Implementação: Claude (Opus 5.5). Revisão: ChatGPT (pendente).

## Mudanças
- `tests/e2e/support/`: serve `public/` em origem interceptada; troca o SDK do CDN por módulos falsos que falam por RPC com um banco simulado compartilhado entre abas/contextos e que **aplica as regras propostas**; transação compare-and-set; onDisconnect; queda/retorno por aba; backend de tradução simulado; bloqueio e registro de qualquer outra requisição.
- 31 casos: ambiente (4), perfis (9), fluxos (6), acessibilidade básica e teclado (12).
- CI: job `e2e` (`npx playwright install --with-deps chromium`).

## Evidências
| Tipo | Comando | Resultado |
| --- | --- | --- |
| E2E / a11y | `E2E_CHROME_PATH=/usr/bin/google-chrome npm run test:e2e` | 31/31 neste PR |
| Firebase Emulator | — | **NÃO EXECUTADO** (o E2E usa Firebase simulado) |

## Segurança e implantação
- [x] Rede bloqueada pelo harness; dados sintéticos (`example.test`). [x] Sem deploy/segredos.
- Limite: não prova o SDK real nem as regras reais; a11y é básica (não substitui axe/WCAG).

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LaU1BRudLpFrtHwuL8B6BA

