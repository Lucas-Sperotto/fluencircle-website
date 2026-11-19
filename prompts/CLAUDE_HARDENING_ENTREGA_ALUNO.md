# Claude Code — etapa final de hardening e entrega ao aluno

**Plano elaborado por ChatGPT; execução atribuída a Claude; revisão final e merges pelo ChatGPT.**

Repositório: https://github.com/Lucas-Sperotto/fluencircle-website
Branch já criada: `feat/claude-hardening-entrega`
Base: `5d0180cf34839544c3c9cbc9307133612fddd3f7`
Issue coordenadora: #28.

## Objetivo
Deixar o FluenCircle tecnicamente verificável, documentado e reproduzível para entrega acadêmica, com manutenção de recursos existentes. **Não confunda entrega ao aluno com autorização de deploy público.**

## Preparação
Leia `AGENTS.md`, `README.md`, `docs/auditorias/GEMINI_AUDITORIA.md`, `docs/auditorias/CHATGPT_REVISAO_FINAL_GEMINI_2026-11-19.md`, `docs/operacao/SEGURANCA_E_DEPLOY.md`, requisitos, ADR e manual. Identifique a main real e registre o SHA. Não altere diretamente a main; use a branch indicada, já existente. Execute e registre `npm test`, `node scripts/verify-static.mjs`, `node scripts/verify-architecture.mjs`, checagem de sintaxe e estado git.

## Prioridades técnicas e Issues
1. **#5/#7 — Firebase RTDB:** separar regras de produção (não conhecidas) de `database.rules.proposta.json`. Criar `firebase.emulator.json` ou configuração local equivalente para projeto **demo-fluencircle-audit**, dados sintéticos e testes positivos/negativos com Firebase Emulator e `@firebase/rules-unit-testing`. Cobrir visitante, aluno A/B, mediador A/B, admin, conta sem perfil, escrita anônima de flashcards, sessões/flashcards de terceiros, papéis, índices reversos, SRS e schema. Regras permissivas em nós pais exigem revisão de herança. **Nunca publicar rascunho de regras sem testes e decisão humana.**
2. **#5/#8 — Tradução pública:** manter experiência de visitante sem login quando viável, porém salvar cards somente através de um backend controlado, com validação de sessão/conteúdo, cota/rate limit, autenticação apropriada, App Check quando suportado, idempotência, observabilidade e limites de custo. Verifique onde está o repositório do Render; **se não estiver acessível, não invente implementação e registre bloqueio**. O Admin SDK ignora Security Rules: o backend deve aplicar autorização. App Check e Anonymous Auth isolados **não substituem** rate limiting.
3. **#9 — Concorrência:** resolver riscos do `current_session` global e `onDisconnect().remove()` com posse/versão/transação ou salas por código. Criar testes de dois mediadores, duas abas, desconexão e retorno, usando Emulator; documentar migração para links/QR codes.
4. **#10 — Privacidade e escala:** substituir leitura global de sessões e cards por caminhos e queries por `user_sessions/{uid}`, com regras coerentes; minimizar PII em `attendees`, preservar compatibilidade e índices `.indexOn` apenas onde úteis.
5. **#13/#15 — CI, ambiente e entrega:** diferenciar staging e produção; E2E de perfis e acessibilidade em ambiente isolado. Separar testes unitários, regras RTDB e E2E em jobs claros. **Sem CI deploy automático**. Revisar SRS e erros, proteger segredo antigo na Issue #6 (apenas operador GCP confirma rotação).

## Documentação e artefatos finais
Atualize README, requisitos/casos de uso, manual por perfil, diagramas Mermaid AS-IS/TO-BE, ADRs, runbook, lista de dependências, backup/rollback e matriz de acesso. Crie:
- `docs/entrega/GUIA_DO_ALUNO.md`: instalação, uso, teste e roteiro de demonstração local;
- `docs/entrega/ARQUITETURA_E_FLUXOS.md`: módulos, dados e frontend/backend;
- `docs/entrega/MATRIZ_DE_TESTES.md`: comandos efetivamente executados e evidências;
- `docs/entrega/LIMITACOES_E_PENDENCIAS.md`: distinção entre testes locais, produção e futuras melhorias;
- `docs/entrega/CHECKLIST_FINAL.md`: aceite do mantenedor e critérios GO/NO-GO;
- `docs/auditorias/CLAUDE_HANDOFF_FINAL.md`: SHA, commits, PRs, resultados e pendências para revisão ChatGPT.

Comentários devem explicar por que decisões e tratamentos de erro existem; use JSDoc onde útil. Não invente screenshots, testes ou aprovações externas.

## Governança obrigatória
Relacione mudanças às Issues #5, #7, #8, #9, #10, #13, #15 e #28. Registre commits pequenos e Conventional Commits. Prefira PRs por subsistema, com base e escopo claros, riscos, testes, impacto, compatibilidade, rollback e atribuição de IAs. Faça push e abra PRs **em Draft para a main**; **não faça merge nem deploy**. A revisão final e os merges aprovados serão feitos pelo ChatGPT após revalidar testes; o mantenedor decide sobre qualquer implantação externa.

Não usar Firebase/Render de produção, segredos, contas reais nem dados pessoais para testes. Se faltar acesso ao backend, ferramentas ou Emulator, avance com o que for comprovável e marque o restante como **NÃO EXECUTADO/BLOQUEADO**.

**Resultado mínimo para entregar ao aluno:** código auditável, docs claras, testes reproduzíveis e limitações explícitas. **GO para produção** exige comprovação separada de RTDB ativo, backend, credenciais, concorrência, E2E, isolamento, backup e autorização humana. Se faltar, manter **NO-GO para produção**.

Ao terminar, responda com links de PRs, SHA dos commits, matriz de testes executados, evidências e handoff do aluno.