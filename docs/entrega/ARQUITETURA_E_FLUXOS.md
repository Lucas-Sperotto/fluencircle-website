# Arquitetura e fluxos — visão para quem vai continuar o projeto

Estado descrito: branch `feat/claude-hardening-entrega` (19/11/2026). **AS-IS** = implementado neste código;
**TO-BE** = proposto. Diagramas numerados (D1–D14) estão em [`docs/diagramas/DIAGRAMAS.md`](../diagramas/DIAGRAMAS.md);
decisões em `docs/engenharia/ADR-001` a `ADR-004`.

## 1. Visão geral (AS-IS)

```text
Navegador (8 páginas HTML, módulos ES, sem build)
  ├─ Firebase Authentication (e-mail e senha)              ─┐  local → Firebase Emulator (projeto demo)
  ├─ Firebase Realtime Database (regras = autorização)      ─┘  outro endereço → produção (fluentech-1e18a)
  └─ Backend de tradução no Render → Gemini (código não acessível; contrato TO-BE em docs/backend/)
```

Não há servidor próprio no repositório: toda regra de acesso a dados precisa estar nas **regras do Realtime
Database** (proposta testada em `firebase/rules/`) ou, no futuro, no backend.

## 2. Camadas do frontend (`public/js/`) — diagrama D2

| Camada | Pode importar | Papel |
| --- | --- | --- |
| `config/` | só `config/` | ambiente (Emulator × produção), configuração do Firebase, endereço do backend, limites |
| `core/` | `config/` | único ponto que importa o SDK do Firebase (CDN 10.8.0); papéis; navegação; cache visual da sessão |
| `domain/` | nada | regras puras e testáveis em Node |
| `services/` | `core/`, `domain/`, `config/` | único acesso ao banco (caminhos em `db-paths.js`) e ao backend |
| `ui/` | `core/`, `domain/`, `config/` | componentes de interface; DOM sempre por `h()` (nada de `innerHTML` com dados) |
| `pages/` | todas | um script por página; liga HTML, serviços e componentes |

`scripts/verify-architecture.mjs` falha a CI se essas fronteiras forem violadas.

## 3. Catálogo de módulos

| Módulo | Responsabilidade |
| --- | --- |
| `config/app.config.js` | endereço do backend, limite de 300 caracteres, tempos de aviso |
| `config/environment.js` | **seleção de ambiente** por endereço; selo; modo do tradutor público (ADR-002) |
| `config/firebase.config.js` | configuração web de produção e do Emulator (projeto `demo-fluencircle-audit`) |
| `core/firebase.js` | app + Realtime Database; conecta ao Emulator em ambiente local; reexporta funções do SDK |
| `core/firebase-auth.js` | Auth principal e secundária (cadastro sem deslogar o admin); conecta ao Auth Emulator |
| `core/roles.js`, `core/navigation.js`, `core/session-cache.js` | papéis, páginas e cache visual de papel/e-mail |
| `domain/srs.js` | revisão espaçada 1/7/30 dias; dados inválidos nunca contam como concluído |
| `domain/presentation-lock.js` | **posse da sessão ativa**: publicar, assumir, encerrar, reconectar (ADR-003) |
| `domain/user-sessions.js` | **índice do aluno** (formato novo e antigo) e ordem dos decks (ADR-004) |
| `domain/active-session.js` | tradução atrasada não vai para sessão trocada |
| `domain/errors.js` | reconhece negação por regra (`PERMISSION_DENIED`) |
| `domain/format.js`, `questions.js`, `translation.js`, `users.js` | datas, perguntas, prompt de tradução, nomes |
| `services/sessions.service.js` | sessões, **publicação com posse por transação**, presença, índice do aluno |
| `services/session-updates.js` | mapas de escrita multicaminho (presença + índice; exclusão) |
| `services/account-creation.js` | criação de conta **com desfazer** se o perfil falhar |
| `services/users.service.js`, `auth.service.js` | perfis, bloqueio, login e verificação de acesso |
| `services/flashcards.service.js`, `reviews.service.js`, `themes.service.js` | cards, progresso, temas |
| `services/translate.service.js` | chamada ao backend de tradução (AS-IS: envia `{prompt}`) |
| `services/db-paths.js` | nomes dos nós do banco (`meetings` = temas, `meeting_sessions` = sessões) |
| `ui/app-shell.js` | cabeçalho e menu por papel |
| `ui/environment-badge.js` | selo do ambiente de teste |
| `ui/dom.js`, `toast.js`, `loader.js`, `confirm-dialog.js`, `dropdown.js`, `card-stack.js` | DOM seguro e componentes |
| `pages/*.page.js` e `pages/presentation/*` | telas; a sessão ao vivo é dividida em seletor de tema, slides, presença e tradutor |

## 4. Dados no Realtime Database — diagrama D3

```text
users/{uid}                        firstName, lastName, email, role, createdAt, updatedAt
deleted_users/{uid}                deletedAt, deletedBy                      (bloqueio de login)
meetings/{temaId}                  topic, questions[], createdAt, updatedAt  (TEMAS)
meeting_sessions/{sessaoId}        templateId, topic, startedAt, mediatorEmail,
                                   attendees/{uid}: { addedAt }               (sem PII; antigos podem ter name/email)
current_session                    sessionId, topic, startedAt, presenterId, version, takeoverOf?,
                                   live/{presenterId}: true                   (lido pelo tradutor público)
flashcards/{sessaoId}/{cardId}     front, back, topic, sessionId, createdAt
student_reviews/{uid}/{sessaoId}   stage (1..3), lastReviewedAt, stageNCompletedAt
user_sessions/{uid}/{sessaoId}     { topic, startedAt }                      (índice do aluno; antigo: true)
```

Quem lê e grava o quê: [`docs/engenharia/MATRIZ_DE_ACESSO.md`](../engenharia/MATRIZ_DE_ACESSO.md).

## 5. Fluxos principais (AS-IS)

1. **Login** (`auth.html`): Firebase Auth → `resolveAccess` lê `deleted_users/{uid}` e `users/{uid}` (as regras
   permitem ler os próprios) → sem perfil ou revogado: sai e mostra o motivo.
2. **Página interna**: `initProtectedPage()` espera o Auth, confirma o papel no banco e barra quem não pode.
3. **Sessão ao vivo** (D6, D11): escolher tema → se outra tela estiver no tradutor, perguntar → criar sessão →
   publicar `current_session` por **transação** com posse desta aba → `onDisconnect` só em `live/{aba}` → presença
   (`attendees` + `user_sessions` numa escrita) → cards pelo tradutor interno → encerrar (só a dona remove).
4. **Tradutor público** (D4): lê `current_session` (só sessão no ar); traduz pelo backend; gravar card depende do
   ambiente (Emulator: não tenta; produção: tentativa direta, que a proposta de regras nega e a tela explica).
5. **Estudo** (D12): o aluno lê `user_sessions/{uid}` e os decks das próprias sessões; ao terminar a pilha com a etapa
   liberada, grava +1 em `student_reviews/{uid}/{sessão}` (a regra só aceita +1).
6. **Contas**: admin cria conta na instância secundária e grava o perfil; se o perfil falhar, a conta é desfeita.
7. **Exclusão de sessão** (D9): sessão, cards e índices numa escrita multicaminho.

## 6. Frontend × backend

| Hoje (AS-IS) | Proposto (TO-BE) |
| --- | --- |
| Navegador monta o prompt e chama `POST /api/gemini/generate {prompt}` sem token | Navegador envia só o texto; backend monta o prompt, aplica App Check, limites e teto de custo |
| Tradutor público tenta gravar card direto (produção) ou não grava (Emulator) | `POST /api/v1/public-translations` traduz e grava pelo Admin SDK só na sessão no ar, com idempotência |
| Contas criadas no navegador (com desfazer) | Contas criadas e revogadas no backend (Admin SDK, custom claims) |
| Um tradutor público por vez (`current_session`) | Salas por código/QR (`active_sessions/{código}`) mantendo o QR atual |

## 7. Testes por camada

| Camada | Onde | Ferramenta |
| --- | --- | --- |
| `domain/` e serviços puros | `tests/unit/` | `node --test` |
| Regras do banco | `tests/rules/` | Firebase Emulator (oficial) ou simulador local |
| Interface + integração com regras simuladas | `tests/e2e/` | Playwright com Firebase simulado |
| Arquitetura e referências | `scripts/verify-*.mjs` | Node |

Resultados desta entrega: [`MATRIZ_DE_TESTES.md`](MATRIZ_DE_TESTES.md).
