# [Claude][Security] Tradutor público explícito por ambiente, contas com desfazer e contrato do backend (5/6)

## Objetivo e Issue
- Issues: Relates to #5, #8, #6, #28 (backend **bloqueado**: repositório do Render não localizado).
- Base: PR 4 (`claude/privacidade-leituras` @ `fa7a7e5`). Branch: `claude/tradutor-contas-backend` @ `f98048e`.

## Mudanças
- Tradutor público: `publicTranslatorSavesFlashcards` = produção **ligado** (compatibilidade com regras ativas desconhecidas) / Emulator **desligado**; mensagens separadas para falha de tradução, negação por regra e sucesso.
- Contas: `services/account-creation.js` desfaz a conta de login se o perfil falhar; uid órfão informado ao admin se o desfazer falhar.
- `docs/backend/CONTRATO_BACKEND.md`: AS-IS verificado, busca do repositório registrada, STRIDE, contrato proposto (`POST /public-translations` que traduz e só então grava; idempotência; rate limit; App Check; teto de custo; Admin SDK), testes de contrato a escrever **no repositório do backend**. Nenhuma implementação de servidor foi inventada.

## Evidências
| Tipo | Comando | Resultado |
| --- | --- | --- |
| Unitários | `npm test` | 87/87 (contas 4, erros 2, ambiente +1) |
| E2E | `npm run test:e2e` | 44/44 (Emulator não tenta gravar; produção: 1 tentativa negada; backend 503; desfazer conta) |
| Backend Render | — | **BLOQUEADO / NÃO VERIFICADO** |

## Decisão humana pendente
Desligar a gravação pública direta em produção agora ou só quando o backend existir (checklist B7).

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LaU1BRudLpFrtHwuL8B6BA

