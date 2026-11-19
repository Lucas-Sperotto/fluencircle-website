# Handoff final do Claude — Issue #28 (hardening e entrega ao aluno)

**Para:** revisão independente do ChatGPT e aceite do mantenedor. **De:** Claude (Opus 5.5), implementador.
Claude **não** é revisor independente desta implementação (AGENTS.md, item 7).

## 1. Identificação

| Item | Valor |
| --- | --- |
| Data | 19/11/2026 |
| Plano | `prompts/CLAUDE_HARDENING_ENTREGA_ALUNO.md` (ChatGPT), commit `bc1341c` |
| Base | `main@5d0180cf34839544c3c9cbc9307133612fddd3f7` |
| Branch final | `feat/claude-hardening-entrega` — o commit que adiciona este documento é o último da branch (`git log -1`) |
| Último commit de **código** testado | `f98048ead7e2d7550f96dfbc7fb926d1e9b14bc6` (depois dele, só documentação) |
| Autor Git dos commits | `Claude <noreply@anthropic.com>`, com `Co-Authored-By` e link da sessão na mensagem |
| Ambiente | Ubuntu 24.04, Node 22.23.5, Chrome 153 (Chrome for Testing), Playwright 1.63.0 pré-instalado, Java 21; **sem** `firebase-tools` e sem rede para instalar pacotes |

## 2. PRs — NÃO ABERTOS (bloqueio de acesso)

A ferramenta de acesso ao GitHub respondeu **"link your GitHub account to let Claude access repositories"** (três
tentativas: início, meio e fim do trabalho). Por isso **nenhum push foi feito e nenhum PR foi aberto**. Os branches
estão no pacote `git bundle` entregue ao mantenedor; os textos dos PRs estão em `docs/auditorias/claude-prs/`.

PRs propostos, **em Draft para a `main`**, empilhados (cada um contém os anteriores; revisar pelo intervalo indicado e
fazer merge na ordem):

| # | Branch | Tip | Revisar intervalo | Issues | Texto |
| --- | --- | --- | --- | --- | --- |
| 1 | `claude/emulador-regras` | `6cf336b` | `main..6cf336b` | #5 #7 #13 #15 #28 | `claude-prs/PR-A-emulador-regras.md` |
| 2 | `claude/e2e-perfis` | `e2f65e6` | `6cf336b..e2f65e6` | #13 #15 #28 | `claude-prs/PR-B-e2e-perfis.md` |
| 3 | `claude/concorrencia-sessao-ativa` | `192a9ef` | `e2f65e6..192a9ef` | #9 #7 #28 | `claude-prs/PR-C-concorrencia.md` |
| 4 | `claude/privacidade-leituras` | `fa7a7e5` | `192a9ef..fa7a7e5` | #10 #7 #28 | `claude-prs/PR-D-privacidade.md` |
| 5 | `claude/tradutor-contas-backend` | `f98048e` | `fa7a7e5..f98048e` | #5 #8 #6 #28 | `claude-prs/PR-E-tradutor-contas.md` |
| 6 | `feat/claude-hardening-entrega` | último commit | `f98048e..HEAD` | #28 #14 | `claude-prs/PR-F-entrega.md` |

Publicar a partir do pacote (pessoa com acesso de escrita):

```bash
git fetch caminho/fluencircle-claude-hardening.bundle 'refs/heads/*:refs/remotes/pacote/*'
for b in claude/emulador-regras claude/e2e-perfis claude/concorrencia-sessao-ativa \
         claude/privacidade-leituras claude/tradutor-contas-backend feat/claude-hardening-entrega; do
  git push origin "refs/remotes/pacote/$b:refs/heads/$b"
done
# depois, para cada linha da tabela (o pacote traz o script abrir-prs.sh que faz isto):
gh pr create --draft --base main --head <branch> --title "<título do arquivo>" --body-file docs/auditorias/claude-prs/<arquivo>.md
```

## 3. Commits (31 do Claude, incluindo este documento, + 1 do plano)

| SHA | Mensagem | PR |
| --- | --- | --- |
| `bc1341c` | docs(prompt): prepare Claude implementation scope… (**ChatGPT**, plano) | — |
| `d91f484` | test(rules): add offline RTDB rules simulator checked against documented semantics | 1 |
| `ba85e5b` | feat(rules): generate least-privilege RTDB rules proposal from commented source | 1 |
| `e3f6260` | test(rules): add RBAC matrix runnable on Firebase Emulator or local simulator | 1 |
| `b6782ba` | feat(config): select Firebase Emulator on local hosts with visible test badge | 1 |
| `400b461` | chore(emulator): add isolated demo emulator config, synthetic seed and npm scripts | 1 |
| `8ca1196` | ci: run rules on local simulator offline and on Firebase Emulator in separate job | 1 |
| `6cf336b` | docs(firebase): document rules model, emulator workflow and publication gates | 1 |
| `484fdcd` | test(e2e): add Playwright harness with shared fake RTDB enforcing proposed rules | 2 |
| `9c5d4ce` | test(e2e): cover environment selection, profiles and main flows | 2 |
| `4450e94` | test(a11y): add basic accessibility and keyboard checks on all pages | 2 |
| `e2f65e6` | ci: add E2E job with Playwright and simulated Firebase (no deploy) | 2 |
| `dc50907` | feat(domain): add pure ownership decisions for the active session | 3 |
| `089494c` | feat(rules): enforce presenter ownership, version and takeover on current_session | 3 |
| `420be0c` | feat(sessions): publish current_session by transaction with per-tab presence | 3 |
| `649d06b` | feat(presentation): confirm takeover, discard raced session and show ownership status | 3 |
| `c247b81` | test(e2e): cover two mediators, two tabs and network drop and return | 3 |
| `192a9ef` | docs(sessions): record ADR-003 ownership model and room-code migration plan | 3 |
| `f043c7d` | feat(sessions): store attendance without PII and enrich the student index | 4 |
| `287917f` | feat(flashcards): load student decks from own index and restrict reads to attendees | 4 |
| `efc0545` | chore(migration): add offline privacy migration planner and synthetic read benchmark | 4 |
| `fa7a7e5` | docs(privacy): record ADR-004 and update data model, rules matrix and manual | 4 |
| `b044c85` | feat(translator): make public flashcard saving explicit per environment and report denials | 5 |
| `c05fb9a` | fix(accounts): roll back the auth account when the profile write fails | 5 |
| `3f7b317` | test(e2e): cover translator save modes, backend outage and account rollback | 5 |
| `f98048e` | docs(backend): specify controlled translation API and record repository blocker | 5 |
| `d27e080` | docs(adr): record ADR-002 on isolated environments, generated rules and test executors | 6 |
| `70b7d20` | docs(engenharia): add access matrix, refresh AS-IS/TO-BE diagrams and requirement traceability | 6 |
| `61dc59d` | docs(operacao): update runbook and add backup/rollback and dependency inventory | 6 |
| `26cf51c` | docs(entrega): add student guide, architecture, test matrix, limitations and final checklist | 6 |
| `b065477` | docs: index delivery docs in README and record Claude stage in AI ledgers | 6 |
| (este) | docs(auditoria): add Claude final handoff and Draft PR descriptions | 6 |

Diferença total `main..HEAD` (antes deste documento): 87 arquivos, +6545/−430.

## 4. Resultados (detalhes em `docs/entrega/MATRIZ_DE_TESTES.md`)

| Verificação | Estado | Resultado |
| --- | --- | --- |
| `npm test` | **EXECUTADO** | 87/87 |
| `node --check` (91 arquivos), `verify-static`, `verify-architecture` (48 módulos), `rules:check` | **EXECUTADO** | sem falhas |
| `npm run test:rules:sim` | **EXECUTADO (SIMULADO)** | 65/65 — pré-verificação, não prova |
| `npm run test:rules` (Emulator) | **NÃO EXECUTADO — BLOQUEADO** | `sh: firebase: not found` (exit 127) |
| `npm run test:e2e` | **EXECUTADO** (Firebase simulado) | 44/44, três execuções seguidas |
| `npm run emulators:seed` | **NÃO EXECUTADO** | sem Emulator |
| Medição sintética / plano de migração sintético / Mermaid (`mmdc`) | **EXECUTADO** | −83,3% de volume; 1 PII + 1 índice antigo; 15/15 diagramas |
| CI no GitHub Actions | **NÃO EXECUTADO** | sem push |

## 5. O que mudou, por Issue

- **#5 escrita pública:** proposta continua negando escrita anônima (testado); tradutor explícito por ambiente
  (Emulator não tenta; produção tenta por compatibilidade e explica a negação); backend controlado especificado,
  **não implementado** (sem acesso).
- **#6 credencial histórica:** nada executado (somente o operador GCP); documentação reforçada sem reproduzir valores.
- **#7 RBAC/regras:** regras geradas de fonte comentada; 65 casos permitidos/negados; regras **ativas** continuam
  desconhecidas.
- **#8 backend e contas:** contrato + modelo de ameaças; criação de conta com desfazer; repositório do Render
  **bloqueado** (busca documentada em `docs/backend/CONTRATO_BACKEND.md` §1).
- **#9 concorrência:** posse por aba, versão, confirmação para assumir, presença por aba, reconexão; ADR-003 com plano
  de salas/QR.
- **#10 privacidade/escala:** leitura pelo índice próprio, presença sem PII, regras por presença, plano de migração
  offline, medição sintética; ADR-004.
- **#13 testes:** simulador + matriz de regras, E2E com perfis e acessibilidade básica, CI em três jobs.
- **#15 ambientes:** Emulator obrigatório em endereço local, selo visível, configuração só do Emulator, carga sintética
  com guarda; staging **não existe** (decisão humana).

## 6. O que pedir à revisão independente (prioridade)

1. **Rodar o job `rules-emulator`.** É a principal evidência que falta. Pontos de semântica a observar se algo
   divergir do simulador: `.validate` em ancestrais durante `update` multicaminho; `newData.parent()` vendo os outros
   caminhos do mesmo `update`; `child()` com valor nulo em ramo não avaliado (curto-circuito em
   `current_session/.validate`); regra do `onDisconnect` avaliada no registro; transação chamada primeiro com `null`
   (os atualizadores devolvem `null` para forçar a conferência no servidor); isolamento de dois
   `authenticatedContext` com o mesmo uid; `goOffline()` disparando o `onDisconnect` no Emulator.
2. **SDK real 10.8.0** (o E2E usa módulos falsos): `runTransaction` com cache mantido por `onValue`; ordem dos eventos
   de `.info/connected` ao reconectar; `connectAuthEmulator` na instância secundária; `deleteUser` da conta recém-criada.
3. **Revisão de código focada:** `services/sessions.service.js` (`watchPresentation`: corridas, limpeza de ouvintes,
   supressão de eventos durante o próprio encerramento); `presentation.page.js` (descarte da sessão criada em conflito);
   `flashcards.page.js` (leituras paralelas e falha parcial); `circle-translator.page.js`; `account-creation.js`.
4. **Simulador no repositório:** decidir se fica (está rotulado, tem testes de fidelidade e serve aos E2E) ou se sai
   após o Emulator rodar na CI.
5. **Guia do aluno:** o roteiro de demonstração foi escrito a partir do código e dos E2E, **não executado contra o
   Emulator real** (checklist A7).
6. **`package-lock.json`:** gerar, revisar e trocar para `npm ci`.

## 7. Pendências e decisões humanas

Lista completa em `docs/entrega/LIMITACOES_E_PENDENCIAS.md` e `docs/entrega/CHECKLIST_FINAL.md`. Principais:
regras ativas exportadas e comparadas; staging; backup/restauração testados; migração de privacidade; backend;
modo do tradutor em produção; Issue #6; LGPD; autorização de deploy. **Decisão atual: NO-GO para produção.**

## 8. Limites desta atuação

- Nenhum acesso a Firebase/Render reais, contas reais ou dados pessoais; nenhum deploy, merge ou rotação de credencial.
- Nenhum teste, captura de tela ou aprovação externa foi inventado; o que não rodou está marcado como tal.
- Dados de teste são sintéticos (`example.test`). A senha `fluencircle-demo` só existe no Auth Emulator local.
- Logs completos das execuções acompanham o pacote de entrega (fora do Git).
