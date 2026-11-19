# [Claude][Privacy] Leitura mínima do aluno e presença sem PII (4/6)

## Objetivo e Issue
- Issues: Relates to #10, #7, #28 (dados de produção **não** migrados).
- Base: PR 3 (`claude/concorrencia-sessao-ativa` @ `192a9ef`). Branch: `claude/privacidade-leituras` @ `fa7a7e5`.
- Problema: aluno baixava todas as sessões e cards (FC-07/PRIV-09) e cada presença guardava nome e e-mail.

## Mudanças
- Presença = `{ addedAt }`; `user_sessions/{uid}/{sessão}` = `{ topic, startedAt }`, na mesma escrita.
- `flashcards.page.js`: aluno lê só o próprio índice e os próprios decks (paralelo; falha parcial não derruba a lista); entrada antiga `true` lê só `topic`/`startedAt` da própria sessão. Equipe mantém visão completa.
- Regras: sessões e cards inteiros só para equipe; deck para quem participou e tem perfil; nova presença sem PII; sem `.indexOn` (não há consultas).
- `scripts/migrations/`: plano **offline** a partir de backup (remove PII antiga, completa o índice, só relata órfãos). `scripts/benchmarks/read-volume.mjs`: medição sintética.
- ADR-004 com pendências LGPD.

## Evidências
| Tipo | Comando | Resultado |
| --- | --- | --- |
| Unitários | `npm test` | 80/80 |
| Regras (simulador) | `npm run test:rules:sim` | 65/65 (12 novos de privacidade) — **simulado** |
| E2E | `npm run test:e2e` | 40/40; teste confere a lista **exata** de caminhos lidos pela aluna |
| Medição sintética | `node scripts/benchmarks/read-volume.mjs` | 767,3 → 128,0 KiB (−83,3%); presenças alheias expostas 2.348 → 0 |
| Emulator / migração real | — | **NÃO EXECUTADOS** |

## Compatibilidade e rollback
Dados antigos continuam legíveis; escrita nova só no formato novo. Migração de dados é decisão humana, com backup e staging antes.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LaU1BRudLpFrtHwuL8B6BA

