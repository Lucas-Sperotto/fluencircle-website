# ADR-001 — Preservar arquitetura modular sem build na fase de auditoria

**Estado:** aceita como baseline técnico para auditoria; reavaliar quando testes de integração estiverem completos.
**Data:** 18/11/2026.
**Evidência:** reorganização Claude no PR #2; commit de referência original `533b78f`; auditoria independente PR #17.

## Contexto

O site foi construído com oito HTML, CSS e JavaScript nativos, Firebase Auth/RTDB por CDN e backend Render/Gemini. A refatoração do Claude implementou a arquitetura **A**: módulos `config/`, `core/`, `domain/`, `services/`, `ui/`, `pages/` e estilos separados por arquivo, sem pipeline de build.

O PDF original de Claude **recomendou B (Vite multipágina)** mas a entrega de código implementou **A**. Sem acesso a Firebase real e E2E, mudar o bundler junto da auditoria tornaria regressões mais difíceis de atribuir.

## Alternativas avaliadas

| Alternativa | Vantagens | Riscos/custo | Decisão |
| --- | --- | --- | --- |
| A — Módulos JS e CSS sem build | Menor mudança de ambiente, depuração direta, deploy atual preservado | Muitas requisições CSS; dependência de CDN, configuração manual, proteção precisa de lint/testes | **Adotada como base de auditoria** |
| B — Vite multipágina | Imports npm, build, assets hash, variáveis por ambiente, ESLint/Vitest | Reconfigurar entrada de oito páginas e hosting; regressão se alterar simultaneamente regras | **Proposta para fase posterior** |
| C — SPA Vue/React | Componentização integrada, roteamento e tipagem opcional | Reescrita das telas sem benefício imediato para resolver autorização Firebase | **Não adotada** |

## Decisão e consequências

1. Preservar **A** na `main` enquanto corrigimos inconsistências verificáveis com testes.
2. Manter `domain/` independente de navegador/Firebase e acesso a RTDB somente por `services/`.
3. Padronizar CI offline e documentar a matriz de integração no Emulator; testes sem servidor **não** comprovam segurança de dados.
4. Qualquer migração B exigirá Issue/ADR específico, prova de equivalência de links/QR codes, browser E2E, CSP e comparação de performance.
5. Não mudar nomes de nós (`meetings`, `meeting_sessions`, `current_session`) sem migração, regras e backup.

## Critérios para reavaliar B

- Ambientes staging/produção separados.
- Regras de RTDB e backend de tradução testados.
- Suíte E2E das oito páginas e responsabilidades de acesso.
- Comparação de build size, cache, carga inicial e custo de manutenção.
- Rollback de hosting verificado.

**Esta ADR não autoriza deploy nem determina a arquitetura futura em definitivo.** Referências: Issues #13, #14 e #15; `docs/diagramas/DIAGRAMAS.md`.
