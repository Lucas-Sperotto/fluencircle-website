# Auditoria técnica independente — FluenCircle

**Data da revisão:** 18/11/2026 · **Ferramenta:** ChatGPT (GPT-6) · **Estado:** código integrado para auditoria, **NÃO APROVADO PARA DEPLOY**.

## 1. Base e método

| Elemento | Referência |
| --- | --- |
| Upstream original | `fluencircle/fluencircle-website@dd8a9d8560d6b7fb8d93e7c259cef05f3b799e42` |
| Refatoração Claude | `533b78fd7008b1804424557620c3acd9fa4739b8`, PR #2 |
| Verificação original ChatGPT | PR #3, árvore equivalente aos 87 arquivos do ZIP |
| PDF da auditoria original | `docs/auditorias/Auditoria técnica do fluencircle-website.pdf` (15 páginas), PR #4 |
| Base posterior aos reparos localizados | `main@d5bfc9115211aa0cf41852f3a144bf156dec9a14`, PR #16 |
| Teste próprio offline | Node 22: `npm test` (25/25), `node --check`; GitHub Actions run 44429728763 (success) |
| Escopo | Código frontend, fluxo de dados inferido, propostas Firebase, documentação, arquitetura e testes offline |
| Não avaliado dinamicamente | Regras **ativas** no RTDB, console Google Cloud, Firebase Emulator, backend Render, produção, usuários reais, acessibilidade e E2E reais |

**Níveis de evidência:** **OBSERVADO NO CÓDIGO** = implementação conferida; **EXECUTADO** = teste com resultado reproduzível; **RELATADO POR TERCEIRO** = afirmação do PDF/Claude ainda não reproduzida; **PENDENTE** = depende de serviço ou ambiente não inspecionado. Uma aprovação de CI offline não comprova regras de segurança.

## 2. Parecer executivo

A refatoração de Claude separou páginas, domínio, serviços e interface em módulos ES, eliminou duplicações e incorporou testes básicos. A estrutura mantém oito páginas HTML, sem etapa de build, Firebase SDK 10.8.0 via CDN, Realtime Database, Auth e backend de tradução hospedado fora do repositório.

A versão foi integrada à `main` por solicitação do responsável **para servir de baseline de desenvolvimento**, não como autorização de publicação. O PR #16 corrige uma falha de integridade (remoções parciais de sessão/presença) e reduz falhas de ciclo de vida no navegador. Permanecem bloqueios **P0/P1** de autorização, abuso de gravações públicas, credenciais, backend e concorrência de mediadores.

A arquitetura **A (modular sem build)** é a implementação atual. A arquitetura **B (Vite multipágina)** é uma proposta do relatório histórico — não foi implementada e não deve ser apresentada como concluída.

## 3. Matriz de achados

| ID | Prioridade | Evidência e estado | Ação verificável | Issue |
| --- | --- | --- | --- | --- |
| SEC-01 | **P0** | **Observado:** `circle-translator.page.js` grava flashcards em sessão ativa sem login. A proposta `docs/firebase/database.rules.proposta.json` autoriza criação em `flashcards/$sessionId/$cardId` sem testar `auth`. **Não sabemos quais regras estão ativas.** | Redesenhar escrita pública (backend controlado ou Anonymous Auth + App Check e limitação), validar permissões/abuso no Emulator; não publicar a proposta como está. | #5 |
| SEC-02 | **P0 condicional** | **Relatado por Claude:** credencial potencialmente sensível em `public/js/env.js` entre commits `6c8f017` e `d680b33`. O valor e a validade atual não foram reproduzidos aqui. | Operador do serviço identifica tipo, confere logs/uso e revoga/rotaciona; registrar apenas evidência sanitizada. | #6 |
| SEC-03 | **P1** | **Observado:** papéis checados no cliente em `auth.service.js`; regras reais do RTDB não estão versionadas na raiz. A proposta ainda concede leituras amplas para usuários com perfil. | Exportar regras **ativas**; testes positivos e negativos por ator; proteção de dados no servidor, não apenas no menu. | #7 |
| SEC-04 | **P1** | **Observado:** `translate.service.js` envia `{prompt}` ao Render, sem token explícito. O repositório do backend não foi auditado. | Contrato de texto com prompt no servidor, proteção da rota pública, CORS, limites de taxa/custo, testes de integração. | #8 |
| OPS-05 | **P1** | **Observado:** configuração web do Firebase aponta para o projeto real; README alerta que rodar localmente usa produção. | Staging/Emulator com dados sintéticos, seleção de ambiente testável e sem deploy automático. | #15 |
| DATA-06 | **P1** | **Observado:** `current_session` é um único nó global; `onDisconnect().remove()` de uma aba pode retirar a publicação de outra. | `active_sessions/{codigo}`, controle de posse, transações e testes com dois mediadores e reconexão. | #9 |
| DATA-07 | **P1 — reparo implementado** | **Observado antes do PR #16:** `removeAttendee` e `deleteSession` usavam gravações sequenciais com erro parcial suprimido. **Agora:** mapa multicaminho e erro propagado. **Executado:** testes puros da forma do payload. | Confirmar no Emulator permissões de todos os caminhos e falhas de regra/concorrência; sem alegar validação real do RTDB. | #11 |
| DATA-08 | **P1** | **Observado:** `users.service.js` cria conta no Firebase Auth pela instância secundária, desloga e só depois grava `users/{uid}`. Falha na última etapa deixa conta Auth sem perfil. | Mover criação/revogação para backend Admin SDK com rollback/idempotência e auditar cadastro público. | #8 |
| PRIV-09 | **P1** | **Observado:** `flashcards.page.js` baixa **todas** as sessões e cartões, filtrando depois no navegador. `attendees` inclui nome e e-mail. | Consultar por `user_sessions/{uid}`, restringir regras, evitar PII duplicada e revisar retenção e LGPD. | #10 |
| UX-10 | **P1 — reparo implementado** | **Observado antes do PR #16:** clique duplo podia disparar inícios paralelos; falha ao despublicar era apresentada como sucesso; tradução atrasada podia entrar noutra sessão. **Agora:** trava in-flight, erro recuperável e predicado de sessão original testado. | Adicionar testes E2E com Firebase simulado/Emulator e validar falhas reais. | #12 |
| QUAL-11 | **P2** | **Executado:** CI offline e 25 testes unitários no PR #16. **Relatado por Claude:** 79 testes E2E e 52 screenshots comparativos; sem artefatos reproduzidos nesta auditoria. | CI de regras no Emulator, testes browser/a11y, evidências e critérios de aceite separados. | #13 |
| DOC-12 | **P2** | **Observado:** `docs/AUDITORIA.md` ainda descreve o estado da reorganização do Claude, anterior ao PR #16; ausência de especificação e manuais rastreáveis na versão original. | Manter este relatório como suplemento datado, revisar README, requisitos, diagramas, manual e ADR. | #14 |

## 4. Notas técnicas adicionais

### 4.1 Regras do Firebase e fronteiras de confiança

A proposta JSON é sintaticamente válida mas **não** é comprovadamente a configuração em vigor. No RTDB, regras de escrita concedidas em um nó pai podem dar permissões a descendentes; portanto **não** basta uma validação de tamanho em `.validate` para impedir abuso de volume ou acesso arbitrário. A rota pública precisa ter regras efetivas, autenticação/prova de origem e proteção de taxa adequadas ao modelo escolhido. A UI não substitui autorização no serviço.

Evitar publicar a proposta de `docs/firebase/database.rules.proposta.json` ou um novo `database.rules.json` sem comparar com as regras atuais e executar a matriz de negações no Emulator.

### 4.2 Operações de presença

No PR #16, os serviços passaram a construir mapas de atualização em `public/js/services/session-updates.js` e executar **uma** operação `update(ref(database), updates)` para presença, índice reverso e exclusões relacionadas. O helper rejeita segmentos de caminho inválidos e é testável sem Firebase. Se uma operação multicaminho for negada pelas regras, o RTDB a rejeita como unidade. **A ausência de teste no Emulator é uma limitação explícita.** Um mediador que lê uma lista antiga de participantes ainda pode deixar um índice criado depois dessa leitura; esse cenário exige modelagem e teste de concorrência.

### 4.3 Ciclo de sessão e tradução

O PR #16 adicionou bloqueio de início/encerramento assíncrono e desabilitação real do botão ao iniciar. Se a despublicação falhar, não anuncia encerramento concluído; mantém a sessão no frontend para nova tentativa. A tradução pública captura o ID da sessão no início da requisição e só grava flashcard se a mesma sessão permanecer ativa quando a resposta chegar.

Essas proteções **não** impedem dois mediadores simultâneos de sobrescreverem `current_session`. Não remover ou reestruturar esse nó sem plano de compatibilidade e regras testadas.

### 4.4 Código morto e vulnerabilidades históricas

A auditoria **original** do PDF inclui `innerHTML` com texto de banco e credencial potencialmente exposta no histórico. O código refatorado usa `h()` com nós de texto e não apresenta as antigas escritas `innerHTML` nos módulos de páginas examinados. Isso reduz o vetor de XSS armazenado no frontend; não é declaração geral de ausência de XSS nem de segurança da aplicação. A credencial histórica não desaparece com o commit de refatoração.

## 5. Matriz de teste obrigatória para próxima fase

| Fluxo | Anônimo | Aluno | Mediador | Admin | Falha/reconexão |
| --- | --- | --- | --- | --- | --- |
| `users` e papéis | negar | ler próprio | acesso mínimo necessário | administrar | revogação imediata |
| `meetings` (temas) | negar | negar | CRUD | CRUD | recuperar validação |
| `meeting_sessions` | negar dados privados | ler apenas sessões autorizadas | CRUD autorizado | CRUD | exclusão e índice atômicos |
| `flashcards` | somente fluxo público protegido | só decks de presença | gerenciar | gerenciar | negar abuso e sobrescrita |
| `student_reviews` | negar | só próprio UID | somente o necessário | política explícita | etapas não forjáveis |
| `current_session` | ler metadados mínimos | ler quando necessário | publicar com posse | administrar | dois mediadores/offline |
| Render/Gemini | limitar sem divulgar segredo | payload validado | endpoint autenticado | auditoria/cotas | timeout/429/503 |

**Nenhuma célula é declarada aprovada** até ser executada contra Emulator/backend isolados, com registros de setup, conta, regra e resultado. Testes de UI não substituem testes negativos de regras.

## 6. Critérios de GO/NO-GO para produção

- [ ] Credencial histórica verificada e rotacionada/revogada, se aplicável.
- [ ] Backend público de tradução e gravação aprovado com autenticação/antiabuso.
- [ ] Regras **reais** RTDB exportadas, auditadas e cobertas por testes permitidos/negados.
- [ ] Ambiente staging isolado, sem chance de mutar produção por engano.
- [ ] Concorrência de dois mediadores e desconexões resolvida.
- [ ] Leitura por presença, minimização de PII e retenção revisadas.
- [ ] E2E de login, contas, temas, sessão, tradutor, estudo e SRS com quatro perfis.
- [ ] Plano de backup/rollback e release autorizado por responsável.
- [ ] Revisão cruzada Gemini e revisão técnica/humana concluídas.

**Resultado atual: NO-GO para deploy.** Merge de documentação e correções localizadas na `main` é diferente de publicar no Firebase e está autorizado pelo pedido do responsável.

## 7. Rastreabilidade por IA

- **Claude:** propôs auditoria original e modularização; PDF histórico, PR #2.
- **ChatGPT:** revisão de integridade, PR #3; correções de integridade/UX com testes, PR #16; este relatório.
- **Gemini:** ainda não executou revisão cruzada neste fluxo. Seu papel planejado não deve ser registrado como concluído.
- **Responsável do fork:** solicitou merge e priorização; somente ele pode confirmar ações em Firebase/Google Cloud e autorizar release.

Não apresentar as afirmações de testes originalmente relatadas pelo Claude como testes reexecutados por ChatGPT. Não há afirmação de que sistemas externos foram testados.
