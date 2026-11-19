# [Claude][Data] Posse por aba e versão na sessão ativa (current_session) (3/6)

## Objetivo e Issue
- Issues: Relates to #9, #7, #28 (não fecha #9 antes do Emulator e da decisão sobre salas por código).
- Base: PR 2 (`claude/e2e-perfis` @ `e2f65e6`). Branch: `claude/concorrencia-sessao-ativa` @ `192a9ef`.
- Problema: `current_session` global com `onDisconnect().remove()` por aba (FC-04/DATA-06) — sobrescrita silenciosa e aba antiga apagando a sessão nova.

## Mudanças
- `domain/presentation-lock.js` (puro): publicar, assumir (versão +1, `takeoverOf`), encerrar e reconectar só pela aba dona; atualizadores de transação.
- `sessions.service.js`: `runTransaction`; `onDisconnect` só em `current_session/live/{presenterId}`; observa posse e conexão; ao reconectar registra de novo e restaura se ainda for a dona.
- `presentation.page.js`: pergunta antes de assumir; descarta sessão criada se outra publicar no meio; barra de status (role=status).
- Regras: formato obrigatório, versão +1 na troca de dono, `takeoverOf` para apresentação viva, presença só do dono; formato antigo substituível.
- ADR-003 com plano de migração para salas por código/QR sem quebrar o QR atual.

## Evidências
| Tipo | Comando | Resultado |
| --- | --- | --- |
| Unitários | `npm test` | 72/72 (13 novos de posse) |
| Regras (simulador) | `npm run test:rules:sim` | 53/53 (13 novos: 2 mediadores, 2 abas, queda/retorno, formato antigo, esquema) — **simulado** |
| E2E | `npm run test:e2e` | 36/36 (5 novos de concorrência) |
| Firebase Emulator | — | **NÃO EXECUTADO** |

## Compatibilidade e rollback
Campos novos em `current_session`; o tradutor lê formato antigo como "no ar". Rollback exige reverter **regras e hosting juntos**.

### Riscos aceitos
Qualquer membro da equipe pode apagar `current_session` (cliente só apaga o próprio; teste explícito). Uma sessão pública por vez.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LaU1BRudLpFrtHwuL8B6BA

