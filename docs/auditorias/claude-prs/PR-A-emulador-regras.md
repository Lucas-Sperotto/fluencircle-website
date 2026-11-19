# [Claude][Security] Emulator isolado, regras RTDB geradas e matriz de acesso (1/6)

## Objetivo e Issue
- Issues: Relates to #5, #7, #13, #15, #28 (não fecha nenhuma: falta o Emulator rodar na CI e decisão humana).
- Base: `main@5d0180c` + `bc1341c` (plano do ChatGPT, já na branch `feat/claude-hardening-entrega`).
- Branch: `claude/emulador-regras` @ `6cf336b`. **Primeiro da pilha; fazer merge antes dos PRs 2–6.**
- Escopo: ambiente local sempre no Emulator; `firebase.emulator.json` (projeto `demo-fluencircle-audit`); regras propostas geradas de fonte comentada; simulador local de regras; 40 casos RBAC; job de CI do Emulator.

## Proveniência
- Implementação: Claude (Opus 5.5), autor Git `Claude <noreply@anthropic.com>`. Plano: ChatGPT (`prompts/CLAUDE_HARDENING_ENTREGA_ALUNO.md`).
- Revisor independente: ChatGPT (pendente). Claude **não** se declara revisor da própria implementação.

## Mudanças
- `public/js/config/environment.js`: localhost/127.0.0.1/[::1]/*.localhost → Emulator + selo; resto → produção; sem parâmetro para forçar produção.
- `core/`: `connectDatabaseEmulator`/`connectAuthEmulator` antes de qualquer uso; reexporta `runTransaction`.
- `firebase/rules/database.rules.source.mjs` → `docs/firebase/database.rules.proposta.json` (`npm run rules:build` / `rules:check`).
- `tests/support/rtdb-rules-simulator.js` (+17 testes de fidelidade a exemplos documentados); `tests/rules/` com executor Emulator ou simulador.
- `scripts/emulator/seed.mjs` (recusa projeto não demo e host não local); scripts npm sem deploy (teste garante).
- CI: job `offline` (+ simulador) e job `rules-emulator` (Java 21, `npm install`, `npm run test:rules`).
- Compatibilidade: leitura de `meeting_sessions`/`flashcards` por qualquer perfil mantida neste PR (restrita no PR 4).

## Evidências (sem resultados inventados)
| Tipo | Comando / ambiente | Resultado observado |
| --- | --- | --- |
| Unitários | `npm test`, Node 22.23.5 | 59/59 neste PR |
| Regras (simulador) | `npm run test:rules:sim` | 40/40 — **pré-verificação, não é prova** |
| Firebase Emulator / RBAC | `npm run test:rules` | **NÃO EXECUTADO** (sem firebase-tools/rede no ambiente) — rodar no job `rules-emulator` |
| Navegador | harness E2E (PR 2) em origem local e de produção | projeto, emuladores e selo corretos; 0 requisições externas |

## Segurança e implantação
- [x] Sem segredo novo. [x] Sem escrita/deploy em produção. [x] Regras consideradas (proposta, não publicada).
- [x] Rollback: reverter o PR; nada foi publicado. [ ] Revisão independente pendente.

### Riscos remanescentes
Simulador pode divergir do Firebase (se divergir, o Emulator vence). Sem `package-lock.json`. Regras ativas desconhecidas.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LaU1BRudLpFrtHwuL8B6BA

