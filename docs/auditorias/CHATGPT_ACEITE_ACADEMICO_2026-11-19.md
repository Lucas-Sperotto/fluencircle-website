# Parecer independente ChatGPT — entrega acadêmica FluenCircle

**Data:** 19/11/2026. **Objeto:** pacote do Claude `fluencircle-claude-hardening.zip`, que contém Git bundle e documentação, recebido pelo mantenedor. **Objetivo:** verificar código, testes, proveniência e limites para handoff ao aluno, sem confundir entrega do repositório com aprovação de produção.

## Decisão executiva

**APTO para entrega acadêmica do repositório e roteiro de estudo em ambiente demo, condicionado à leitura das limitações. NÃO APTO para deploy público.**

A entrega inclui código com seis etapas de desenvolvimento preservadas, testes reais no Firebase Emulator de projeto fictício, testes de navegador com Firebase/backend simulados, manuais de aluno e equipe, guias de arquitetura, matriz de acesso, diagramas e ADRs. **Não foi observada uma execução por um aluno seguindo o guia completo do zero.** Isso deve ocorrer como aceite humano separado.

## Linha de base e integridade

| Item | Evidência |
| --- | --- |
| Upstream original | `fluencircle/fluencircle-website@dd8a9d8560d6b7fb8d93e7c259cef05f3b799e42` |
| Main antes da etapa Claude | `5d0180cf34839544c3c9cbc9307133612fddd3f7` |
| Pacote Git Claude | Bundle válido SHA-256 `1c0e561bb00105c444a2f6a538e5fba32b8e7264a814b09a96f2b2b59462ed05`, histórico de 31 commits Claude e um commit preparatório ChatGPT |
| Branches e PRs | Seis refs originais recuperadas e publicadas, PRs **#29–#34**, todos mesclados em ordem por merge commit; sem squash e sem perda dos SHAs originais |
| Main após PR #34 | `4eaf355d00c0fc184b32a59bf02c03fe692d52e1` |
| Correção independente de CI | A execução original da fase de sessão falhou 4/53 por reinicializações paralelas no mesmo banco do Emulator. Commit ChatGPT `598d8ae1f6fc716915a9217e09080871059f32d9` serializou apenas suites do driver Emulator; cópias auditáveis foram propagadas às etapas seguintes. |
| Dependências reproduzíveis | Arquivo `package-lock.json` v3 gerado em GitHub Actions run `44539238235`; CI e manual convertidos para `npm ci` no PR de acabamento, sujeitos a validação desse PR. |

## Evidências de CI independente, não apenas relatadas pelo Claude

| Etapa | PR | GitHub Actions | Oficial Emulator | E2E Playwright, Firebase **SIMULADO** |
| --- | --- | --- | --- | --- |
| Regras e demo isolado | #29 | [44536172209](https://github.com/Lucas-Sperotto/fluencircle-website/actions/runs/44536172209) | **40/40** | ainda não adicionado |
| E2E inicial/a11y | #30 | [44536482584](https://github.com/Lucas-Sperotto/fluencircle-website/actions/runs/44536482584) | Job verde | **31/31** |
| Concorrência (após correção) | #31 | [44537272393](https://github.com/Lucas-Sperotto/fluencircle-website/actions/runs/44537272393) | **53/53** | **36/36** |
| Privacidade e acesso restrito | #32 | [44537454662](https://github.com/Lucas-Sperotto/fluencircle-website/actions/runs/44537454662) | **65/65** | **40/40** |
| Tradutor e rollback de conta | #33 | [44537462449](https://github.com/Lucas-Sperotto/fluencircle-website/actions/runs/44537462449) | **65/65** | **44/44** |
| Guias e handoff acadêmico | #34 | [44537468469](https://github.com/Lucas-Sperotto/fluencircle-website/actions/runs/44537468469) | **65/65** | **44/44** |

A versão final do pacote também passou **87/87 testes unitários** no ambiente local de revisão, **65/65 regras em simulador próprio**, 8 páginas/31 recursos internos sem ausências e 48 módulos JS sem violações do verificador arquitetural. O GitHub Actions reexecutou os jobs oficiais e navegadores usando dependências instaladas nos runners. A suíte E2E faz interceptação do Firebase e backend: não serve de prova de integração com sistemas de produção. A verificação textual de sinks não prova ausência absoluta de XSS.

## O que a auditoria encontrou e corrigiu

O PR #31 falhou inicialmente na integração oficial do Firebase Emulator apesar de passar no simulador. Ao analisar o TAP e o runner, foi identificada uma corrida: diferentes arquivos de teste limpavam/recarregavam o **mesmo banco demo** em paralelo. A correção no executor adicionou `--test-concurrency=1` **somente no driver do Emulator**, mantendo a simulação local paralela. Em seguida, 53/53 testes e depois 65/65 passaram no Emulator. Isso foi **correção da infraestrutura de testes**, não prova de que todas as regras de produção são seguras.

Também foram revisadas as rotas sensíveis: presença passa a evitar duplicar nome/e-mail, decks são buscados pelo índice do próprio aluno, `current_session` passa a ter protocolo de posse/versão e presença por aba, e erro de gravação do tradutor público é exposto ao usuário. O sistema mantém algumas compatibilidades deliberadas e riscos abaixo.

## Pendências e limites que impedem produção

1. **P0 — Escrita pública de flashcards:** `public/js/config/environment.js` mantém `publicTranslatorSavesFlashcards: true` para produção, por compatibilidade com regras **ativas desconhecidas**. O ambiente demo o desabilita. Não há backend controlado substituto validado. A proposta RTDB restritiva não prova estado real.
2. **P0 — Credencial histórica:** sem evidência do operador GCP de rotação/revogação ou inspeção de uso; Issue #6.
3. **P1 — Backend Render:** repositório/código não acessado. `docs/backend/CONTRATO_BACKEND.md` é **contrato proposto**, não implementação nem teste de rate limit, App Check, prompt no servidor, Admin SDK, cota ou CORS.
4. **P1 — Staging/regras reais:** nenhum Firebase projeto real foi escrito ou auditado; faltam exportação das regras ativas, comparação, teste de rollback, CI com SDK real contra Emulator/staging e autorização humana.
5. **P1 — Concorrência:** o aplicativo usa um único tradutor público por vez. Qualquer membro da equipe com permissão pode apagar `current_session` pela API; o cliente verifica posse, mas a regra exige uma decisão de autorização humana. A estrutura nova foi testada com banco simulado e regras no Emulator, não no serviço ativo.
6. **P1 — Privacidade/migração:** novas presenças minimizam dados e novas leituras seguem índice por UID. **Registros antigos com PII não foram migrados**; o plano `scripts/migrations/plan-privacy-migration.mjs` é offline, não uma migração executada em produção. Revisão LGPD, retenção e consentimento pendentes.
7. **Qualidade:** E2E de navegador usa SDK/backend falsos; acessibilidade cobre apenas casos básicos. Teste humano de instalação e de uso pelo aluno, browser com Firebase SDK real e revisão de custo/performance continuam pendentes. O benchmark de redução de bytes (−83,3%) é **sintético**.

Não divulgar URLs/credenciais de produção em logs ou documentação do aluno. Testes devem usar exclusivamente `demo-fluencircle-audit`.

## Condições de entrega ao aluno

1. Clonar o fork e executar **`npm ci`** com Node 22 e Java 21, conforme `docs/entrega/GUIA_DO_ALUNO.md`.
2. Iniciar os emuladores locais e carregar dados sintéticos; confirmar a faixa de ambiente demo antes de qualquer ação.
3. Executar `npm test`, `npm run test:rules` (Emulator real), `npm run test:rules:sim` e `npm run test:e2e`; comparar resultados com os logs/PRs.
4. Ler `docs/entrega/CHECKLIST_FINAL.md` e `LIMITACOES_E_PENDENCIAS.md`; marcar o walkthrough humano A7 quando realizado.
5. Se faltar backend/internet, demonstrar os demais fluxos e registrar **tradutor real bloqueado**, sem simulá-lo como entrega completa.

O pacote do Claude e os commits são autênticos em Git, mas os resultados reportados originalmente por ele foram reexecutados onde havia ambiente; não foram atribuídos falsamente a Claude os testes oficiais realizados posteriormente pelo ChatGPT via GitHub Actions.

## Rastreabilidade das IAs e aceite

- **Claude:** 31 commits originais de implementação/engenharia e handoff, mantendo SHAs e mensagens.
- **ChatGPT:** plano preparatório, importação do Git bundle, análise independente, correção da corrida do Emulator, revisão dos seis PRs, geração controlada de lockfile via runner e esta documentação final.
- **GitHub Actions bot:** commit exato de `package-lock.json`, produzido com `npm install --package-lock-only --ignore-scripts` para não executar scripts de dependências.
- **Mantenedor:** solicitou merges na main e entrega acadêmica, mas ainda deve registrar aceite do roteiro de demo pelo aluno e a decisão de publicação.

**Decisão técnica atual: APTO PARA HANDOFF ACADÊMICO COM LIMITAÇÕES; NO-GO PARA PRODUÇÃO.** Não existe aqui autorização para `firebase deploy` ou qualquer operação com dados/credenciais reais.
