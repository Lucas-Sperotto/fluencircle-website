# PR #2: avaliação e porte para a arquitetura atual

**Data:** 19/11/2026
**Autor da avaliação e do porte:** Claude
**PR avaliado:** fluencircle/fluencircle-website#2, 5 commits de Igor de Andrade Tafarello (21/10 a 18/11/2026), base `dd8a9d8`
**Branch do porte:** `feat/planos-agenda-pr2`, sobre `main` `da51788`

## 1. Por que não fazer merge direto

O PR foi escrito sobre o código **anterior** à modularização: os monólitos `js/presentation.js`, `js/admin.js`, `js/script.js` e `css/style.css`. Nenhum desses arquivos existe mais na `main`. Um merge geraria conflito em quase todos os arquivos. Pior: se fosse "resolvido", traria de volta o que a reorganização removeu:

- `innerHTML` com dados do banco;
- `style=` e `<style>` no HTML;
- import do SDK fora de `core/`;
- caminhos do banco fora de `services/`.

Por isso cada funcionalidade foi **avaliada**. As que eram compatíveis foram **reimplementadas**. As que exigem decisão de produto ou de backend ficaram documentadas abaixo.

## 2. O que o PR traz, item por item

| # | Funcionalidade do PR #2 | Situação | Onde está agora / motivo |
| --- | --- | --- | --- |
| 1 | Plano como atributo do usuário (coluna, seletor, busca em Acessos) | ✅ **Portado** | `admin.page.js`, `users.service.js`, regra `users/{uid}/planId` |
| 2 | Catálogo de planos (`plans.html`/`plans.js`, que o próprio PR apagou no último commit) | ✅ **Portado** | `plans.html`, `pages/plans.page.js`, aba "Planos" (só admin edita) |
| 3 | Agenda semanal: tema e link por horário (`weekly_sessions`) | ✅ **Portado** | aba "Agenda da semana"; ADR-005 |
| 4 | Agenda do participante na home (`script.js`, que o PR desligou da `index.html`) | ✅ **Portado** | `home.page.js` + `ui/week-slot-card.js` |
| 5 | Estilo dos badges de plano e do modal | ✅ **Portado** (adaptado) | `css/pages/admin.css`, `css/pages/plans.css` |
| 6 | Várias salas ao vivo ao mesmo tempo (`current_session/{id}`) e "Participar" pelo aluno | ⏸️ **Não portado: decisão de produto** | Contraria o ADR-003 (uma sessão ativa, com posse e versão) e o ADR-004 (o aluno não grava presença). Ver §4. |
| 7 | Chat da sessão (`meeting_sessions/{id}/chat`) e comando `fc:` do "Fluêncio" | ⏸️ **Não portado** | Depende do item 6 (o aluno precisa estar na sala) e tem falhas de segurança (§3) |
| 8 | Voz WebRTC em malha (Socket.IO + `/api/ice-servers` no backend) | ⏸️ **Não portado: backend não verificável** | O contrato do backend (`docs/backend/CONTRATO_BACKEND.md`) só documenta tradução. Os eventos `entrar-sala`, `sinalizacao` e outros não podem ser verificados daqui. |
| 9 | Novo layout da apresentação (+1.000 linhas de CSS) e "Círculos" na `index.html` | ⏸️ **Não portado** | É o visual dos itens 6–8. Sem eles não há o que exibir. |
| 10 | Menu: tira "Home" e aponta "Iniciar sessão"/"Círculos" para `index.html` | ⏸️ **Não portado** | Também depende do item 6. O menu atual ganhou "Planos e agenda". |

## 3. Problemas encontrados no código do PR (para quem retomar os itens 6–10)

Todos foram verificados por leitura do código em `3c6e7f0`.

- **XSS armazenado no chat.** Mensagens do Fluêncio são montadas com `innerHTML` usando `originalWord`, `replyToName` e `text`:
  - `originalWord` e `replyToName` vêm de outro participante;
  - `text` vem do Gemini, que repete o que foi pedido.
  Qualquer participante injetaria HTML/JS em todos os navegadores da sala.
- **PII em nó público.** `current_session` tem leitura aberta (o tradutor público usa). O PR grava nele `attendees` com nome, e-mail e foto, além de `mediatorEmail`. Isso expõe dados pessoais a qualquer visitante, sem login.
- **Escritas recusadas pelas regras atuais.** Ficariam bloqueadas, por esquema ou por papel:
  - presença gravada pelo próprio aluno em `current_session`, `meeting_sessions/.../attendees` e `user_sessions`;
  - `current_session/{id}` com várias salas;
  - `chat`;
  - flashcards criados por aluno.
  O PR só funcionaria com regras abertas.
- **Quem é o mediador** é decidido no navegador, comparando e-mails (`isSessionHost`). Não há posse nem versão como no ADR-003.
- **Prompt montado no navegador** com o texto do usuário, e a resposta do Gemini gravada pelo cliente. Isso permite prompt injection e spam no deck. O caminho seguro está no plano do backend (`docs/backend/CONTRATO_BACKEND.md`).
- **Socket.IO por CDN sem SRI**, URL do backend fixa no código e `DEBUG_VOICE = true` (logs de diagnóstico em produção).
- **Referências quebradas** no estado final do PR:
  - `index.html` carrega `js/notifications.js`, que não existe no PR;
  - `plans.js` e `plans.html` foram apagados, mas `admin.js` e `script.js` continuam lendo `plans`.
- **Chave de semana** baseada na semana do mês. Corrigida no porte (ISO 8601, ADR-005).

## 4. Proposta para os itens 6–10 (precisa de decisão humana)

O que o PR quer é uma "sala" em que o aluno entra sozinho, conversa por voz e chat e salva flashcards. Fazer isso com segurança exige:

1. **ADR novo** substituindo o ADR-003 por várias salas: `live_rooms/{roomId}` com posse e versão por sala. O dado público do tradutor fica separado e sem PII.
2. **Entrada do aluno com regra própria:**
   - o aluno grava **apenas** a própria presença `{ addedAt }`, e só numa sala aberta;
   - o índice `user_sessions` continua gravado junto, numa escrita multicaminho validada.
3. **Chat:**
   - mensagens `{ uid, text ≤ 500, createdAt }`, gravadas só por quem está na sala e com `senderUid === auth.uid`;
   - exibição com `textContent`;
   - o "Fluêncio" responde **pelo backend**, que é quem grava a resposta e o flashcard.
4. **Voz:**
   - documentar e testar o contrato Socket.IO do backend;
   - credenciais TURN temporárias emitidas pelo backend;
   - Socket.IO com SRI ou servido localmente;
   - logs desligados por padrão.
5. **Testes:** regras (aluno entra só na própria presença, não lê PII), E2E com duas abas e testes de contrato do backend.

## 5. Verificação do porte

Comandos executados no branch `feat/planos-agenda-pr2`:

| Comando | Resultado |
| --- | --- |
| `npm test` | 99 testes, 0 falhas |
| `npm run rules:check` | JSON em sincronia com a fonte |
| `npm run test:rules:sim` | 79 testes, 0 falhas (14 novos de planos e agenda) |
| `E2E_CHROME_PATH=/usr/bin/google-chrome npm run test:e2e` | 50 testes, 0 falhas (5 novos de planos + a11y de `plans.html`) |
| `node scripts/verify-static.mjs` | 9 páginas, 0 referências ausentes |
| `node scripts/verify-architecture.mjs` | 52 módulos, 0 violações |
| `npm run test:rules` (Firebase Emulator) | **Não executado aqui**: `firebase-tools` indisponível no ambiente. Fica para o job `rules-emulator` da CI. |

Nada foi publicado: nem regras nem deploy. Nenhum dado de produção foi lido ou alterado. Todos os testes usam dados sintéticos.


## 6. Revisão independente posterior — ChatGPT (19/11/2026)

O Git bundle enviado pelo responsável foi verificado contra a base exata `da51788186261d3c013770ab9dae6a9ebbd8ce9f` e contém os **oito commits originais** da implementação de Claude, encerrando em `3e71fc959827c40f15f9f688dcf471edd03333b1`. O porte mantém as funcionalidades 1–5; os itens 6–10 não foram incorporados, pois representam mudança de produto e de backend, não um merge automático seguro do PR histórico.

**Achado corrigido:** os índices dos horários eram inferidos por sua posição no formulário. Ao apagar/reordenar linhas, uma chave de `weekly_sessions` podia passar a apontar para outra aula. A correção utiliza índices persistidos, em `domain/plans.js`, mantendo buracos no objeto `sessions`; a UI exige confirmação quando um encontro existente tem dia/horário alterado ou é removido. Temas de horários removidos continuam armazenados até uma migração planejada e não são apagados automaticamente.

**Outro ajuste:** requisições de semanas antigas não substituem a agenda da semana atualmente selecionada; o modal captura a chave da semana no momento da abertura.

**Testes executados por ChatGPT na cópia local do código recebido:** `npm test` **103/103**, `npm run test:rules:sim` **79/79**, `npm run rules:check` aprovado, `node scripts/verify-static.mjs` com 9 páginas/35 referências e `node scripts/verify-architecture.mjs` com 52 módulos/0 violações, além de `node --check`. Os 50 E2E do relatório Claude são **relatados**, não reexecutados neste ambiente sem Playwright instalado. Testes do Firebase Emulator e E2E oficiais serão avaliados na CI do PR e seus resultados documentados separadamente.

**Segurança/produção:** regras ativas de produção e backend Render não foram inspecionados; não houve deploy. A mudança não autoriza publicação de regras ou migrações, nem a integração dos módulos inseguros de chat/voz do PR histórico.
