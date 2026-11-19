# Checklist final — aceite do mantenedor e critérios GO/NO-GO

Marque com data, responsável e link de evidência. **Entrega acadêmica (Parte A) não autoriza publicação (Parte B).**

## Parte A — Aceite da entrega acadêmica

| # | Critério | Evidência esperada | Estado atualizado por ChatGPT (19/11/2026) |
| --- | --- | --- | --- |
| A1 | Branches publicados e PRs Draft abertos para a `main`, na ordem de dependência | links dos PRs | **✓ Verificado em GitHub** — PRs #29–#34 mesclados sequencialmente, commits Claude preservados; importação publicada via conector autorizado. |
| A2 | Job `offline` verde | link da execução | **✓ Verificado em CI** — jobs offline aprovados (execuções #44536172209, #44536482584, #44537272393, #44537454662, #44537462449 e #44537468469). |
| A3 | Job `rules-emulator` verde (65 casos no Emulator) | log com títulos `[Emulator]` | **✓ Verificado em CI** — 65/65 no Firebase Emulator oficial no PR #34, execução #44537468469. |
| A4 | Job `e2e` verde (44 casos) | link da execução | **✓ Verificado em CI** — 44/44 E2E Playwright **com Firebase simulado**, execução #44537468469. |
| A5 | Divergências entre Emulator e simulador corrigidas (se houver) | commit de correção | **✓ Corrigido e reexecutado** — 4 falhas de corrida na execução #44536739384; suíte oficial serializada pelo commit ChatGPT `598d8ae`; 53/53 e depois 65/65 aprovados. |
| A6 | Revisão independente do ChatGPT concluída, com testes revalidados | relatório de revisão | **✓ Revisão independente ChatGPT** — PRs #29–#34 comentados e integrados após jobs oficiais; relatório complementar em `docs/auditorias/CHATGPT_ACEITE_ACADEMICO_2026-11-19.md`. |
| A7 | Um aluno segue `GUIA_DO_ALUNO.md` do zero e completa o roteiro de demonstração | relato com data | ☐ **Pendente** — falta um aluno executar presencialmente o roteiro completo desde o clone e registrar evidência. |
| A8 | `package-lock.json` gerado e CI usando `npm ci` | commit | **✓ Em validação final** — lockfile v3 gerado via workflow GitHub Actions #44539238235; CI atualizada para `npm ci` neste PR; somente concluir após execução verde. |
| A9 | Documentação revisada (README, guia, arquitetura, matriz, limitações, ADRs, manual) | aprovação no PR | **✓ Revisão técnica documental** — PR #34 integra guias, matriz, diagramas, ADRs e runbooks; há limitações explícitas e pendências de produto/aceite. |
| A10 | Aceite humano registrado e merges feitos pelo revisor autorizado | merge commits | **Parcial** — merges foram autorizados pelo mantenedor e executados (PRs #29–#34); aceite humano do roteiro do aluno e produção não registrados. |

## Parte B — GO/NO-GO para produção

Todos obrigatórios. Qualquer item em aberto = **NO-GO**.

| # | Critério | Responsável | Estado |
| --- | --- | --- | --- |
| B1 | Regras **ativas** exportadas, versionadas e comparadas com a proposta, cada diferença decidida | operador + 2 revisores | ☐ |
| B2 | Regras finais aprovadas no job `rules-emulator` | CI | ☐ |
| B3 | Projeto de **staging** criado, isolado, com dados controlados | operador | ☐ |
| B4 | Backup do RTDB feito e **restauração testada** em staging (`docs/operacao/BACKUP_E_ROLLBACK.md`) | operador | ☐ |
| B5 | Migração de privacidade (plano offline) aplicada e validada em staging | operador | ☐ |
| B6 | Backend do tradutor auditado; contrato implementado com App Check, rate limit, teto de custo e testes de contrato | equipe do backend | ☐ bloqueado (sem acesso ao código) |
| B7 | Decisão registrada sobre a gravação pública direta (desligar ou substituir pelo backend) | mantenedor | ☐ |
| B8 | Credencial histórica avaliada e revogada/rotacionada (Issue #6) | operador GCP | ☐ |
| B9 | API key web restrita por domínio e App Check configurado (monitorar antes de exigir) | operador | ☐ |
| B10 | E2E com o SDK real contra Emulator ou staging (login, temas, sessão, dois mediadores, tradutor, estudo, contas) | QA | ☐ |
| B11 | CSP testada em canal de pré-visualização do staging, sem erros no console | QA | ☐ |
| B12 | Decisões LGPD registradas (retenção, revogação, aviso de privacidade) | responsável pelos dados | ☐ |
| B13 | Plano de rollback pronto: regras anteriores salvas, versão do hosting anotada, janela combinada | operador | ☐ |
| B14 | Monitoramento pós-publicação definido (erros, custo do backend, gravações anônimas) | operador | ☐ |
| B15 | Autorização humana explícita para o deploy, com data e responsável | mantenedor | ☐ |

**Decisão atual: NO-GO para produção.** Motivos principais: B1–B6, B8 e B15 em aberto.
