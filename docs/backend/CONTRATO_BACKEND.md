# Backend controlado de tradução, gravação pública e contas — contrato proposto (TO-BE)

> **Estado: NÃO IMPLEMENTADO — BLOQUEADO por falta de acesso ao código do backend.**
> Este documento é especificação para o mantenedor/equipe do backend. Não descreve código existente e não deve ser
> lido como evidência de que o Render já faz qualquer uma destas verificações.

## 1. O que se sabe hoje (AS-IS) e o bloqueio

| Item | Situação | Nível de evidência |
| --- | --- | --- |
| Endereço | `https://fluencircle-backend.onrender.com/api/gemini/generate` | VERIFICADO NO CÓDIGO (`public/js/config/app.config.js`) |
| Contrato usado pelo site | `POST { prompt }` → `{ text }`, sem token; o **prompt é montado no navegador** (`domain/translation.js`) | VERIFICADO NO CÓDIGO (`services/translate.service.js`) |
| Origem histórica | a URL aparece no upstream no commit `6093755` (13/10/2026, "deleted .env and connected with internal server") | VERIFICADO NO HISTÓRICO GIT |
| Código do servidor | **não está** no fork nem no upstream; `fluencircle/fluencircle-backend`, `fluencircle/backend`, `fluencircle/fluencircle-api`, `fluencircle/fluencircle-server` e `Lucas-Sperotto/fluencircle-backend` não existem ou não são públicos (`git ls-remote` pede credencial); a página da organização não pôde ser listada (limite de requisições) | EXECUTADO em 19/11/2026 |
| Autenticação, CORS, limites, logs, chave do Gemini no servidor | desconhecidos | **NÃO VERIFICADO** |

**Para desbloquear:** o mantenedor informa onde está o repositório do serviço do Render e concede acesso de
leitura. Nenhuma IA deve "reconstruir" esse backend a partir de suposições (AGENTS.md).

## 2. Modelo de ameaças do tradutor público (STRIDE resumido)

Ativos: decks dos alunos (integridade), custo da API do Gemini, disponibilidade do tradutor, dados das sessões.

| Ameaça | Cenário possível | Controle proposto | Onde |
| --- | --- | --- | --- |
| **S**poofing | Qualquer script chama a API ou grava cards fingindo ser o tradutor | App Check (reCAPTCHA Enterprise) + checagem de origem; a gravação só vale para a sessão **no ar** | backend |
| **T**ampering | Texto montado para manipular o modelo (prompt injection) ou cards com conteúdo arbitrário | prompt **fixo no servidor**; cliente envia só `text` (1–300); o card salvo é o par `{text, tradução}` produzido **pelo próprio backend** | backend |
| **R**epudiation | Abuso sem rastro | log estruturado com id de requisição, IP com hash, sessão e resultado; **sem** o texto bruto | backend |
| **I**nformation disclosure | Erro do servidor expõe stack, chave ou dados | chave só em variável de ambiente; erros genéricos; `current_session` público só com id/título | backend + regras |
| **D**enial of service / custo | Chamadas em massa geram custo no Gemini e spam nos decks | rate limit por IP e por sessão, teto diário de custo, timeout, circuito aberto, `429` com `Retry-After`, limite de cards públicos por sessão | backend |
| **E**levation of privilege | O Admin SDK **ignora as regras** do banco | o backend aplica a autorização: nunca aceita caminho do cliente; escreve só em `flashcards/{sessão no ar}` com esquema validado | backend |

**App Check ou Anonymous Auth, isolados, não substituem rate limiting** (uma pessoa pode gerar muitos tokens).

## 3. Endpoints propostos

Todos sob `https://<backend>/api/v1`, JSON UTF-8, CORS restrito às origens do site (produção e staging), sem `*`.

### 3.1 `POST /public-translations` — traduzir e, se houver sessão no ar, salvar o card (público)

Um único endpoint evita que o cliente envie um "verso" arbitrário: o backend salva o que ele mesmo traduziu.

```http
POST /api/v1/public-translations
Content-Type: application/json
X-Firebase-AppCheck: <token>           (quando o App Check estiver ativo)
Idempotency-Key: <uuid v4 por tentativa do visitante>

{ "text": "suitcase", "sessionId": "<id lido de current_session ou null>" }
```

| Resposta | Quando |
| --- | --- |
| `200 { "translation": "mala", "saved": false }` | traduzido; sem sessão informada |
| `201 { "translation": "mala", "saved": true, "cardId": "…" }` | traduzido e salvo na sessão no ar |
| `200 { "translation": "mala", "saved": false, "reason": "session-not-live" }` | sessão mudou ou caiu (equivale a `canSaveTranslationToSession`) |
| `400` / `413` | texto vazio, não texto ou acima de 300 caracteres |
| `401` | App Check exigido e ausente/inválido |
| `429` + `Retry-After` | limite por IP/sessão/dia atingido |
| `503` / `504` | Gemini indisponível ou acima do tempo limite (sem gravar nada) |

Regras do servidor: conferir `current_session` (sessão existe, `live/{presenterId}` verdadeiro, `sessionId` igual);
gravar `flashcards/{sessionId}/{id}` = `{ front: text, back: translation, topic, sessionId, createdAt }` com o Admin
SDK; mesma `Idempotency-Key` em 24 h devolve o mesmo resultado sem duplicar; limite de cards públicos por sessão.

### 3.2 `POST /translate` — tradução sem gravação (equipe e páginas internas)

Igual a 3.1 sem `sessionId`; para uso autenticado, exigir `Authorization: Bearer <Firebase ID token>` verificado
com `verifyIdToken` e checar o papel em `users/{uid}/role` (ou custom claim).

### 3.3 Contas (Admin SDK)

- `POST /admin/users` `{ firstName, lastName, email, role }` → cria a conta (senha inicial ou link de definição de
  senha), grava o perfil e define custom claim de papel **na mesma operação lógica**, com desfazer em caso de falha.
- `POST /admin/users/{uid}/revoke` → `disabled: true` no Auth, revoga tokens de atualização, grava `deleted_users`.
- Ambos exigem ID token de **admin** verificado no servidor. Permitem desligar o cadastro público por e-mail no projeto.

Enquanto isso não existe, o site desfaz a conta de login quando o perfil falha
(`public/js/services/account-creation.js`, testado) e informa conta órfã ao admin se o desfazer também falhar.

## 4. Observabilidade e limites de custo

- Log JSON por requisição: `requestId`, rota, status, latência, `sessionId`, hash do IP, tokens do Gemini; **sem**
  texto traduzido nem e-mail.
- Métricas: requisições por status, p95 de latência, chamadas e custo diários do Gemini, `429` emitidos, cards
  públicos por sessão.
- Alertas: taxa de `5xx`, 80% do teto diário de custo, pico de `429`.
- Configuração somente por variáveis de ambiente (nomes, nunca valores, no Git): `GEMINI_API_KEY`,
  credencial do Admin SDK (ou identidade gerenciada), `ALLOWED_ORIGINS`, `RATE_LIMIT_PER_IP_MINUTE`,
  `RATE_LIMIT_PER_SESSION`, `DAILY_BUDGET_REQUESTS`, `APP_CHECK_ENFORCE`.

## 5. Testes de contrato que o repositório do backend deve ter

Escritos e executados **no repositório do backend** (não inventados aqui): texto > 300 → `413`; sem App Check com
`APP_CHECK_ENFORCE=true` → `401`; sessão não viva → `saved: false`; mesma `Idempotency-Key` → mesmo `cardId`;
limite excedido → `429` com `Retry-After`; Gemini fora do ar → `503` e nada gravado; origem não permitida → CORS
negado; usuário sem papel admin → `403` nas rotas de contas; log não contém o texto enviado.

## 6. Mudanças no site quando o backend existir

1. `services/translate.service.js`: chamar `POST /public-translations` (público) e `POST /translate` (equipe).
2. `config/environment.js`: trocar `publicTranslatorSavesFlashcards` por um modo `backend` e remover a escrita
   direta do navegador (`addFlashcard` no tradutor público).
3. `domain/translation.js`: o prompt passa para o servidor; o site deixa de enviá-lo.
4. Regras: continuam negando escrita anônima (o backend usa Admin SDK).
5. E2E: o harness já simula o backend; acrescentar os cenários `201`, `429` e `saved: false`.

## 7. App Check (quando houver decisão)

Registrar o app web com reCAPTCHA Enterprise no console; no site, `initializeAppCheck` com o provedor e renovação
automática; no backend, verificar o token com o Admin SDK; monitorar métricas antes de **exigir** App Check no
Realtime Database. Ativar App Check é configuração de produção: decisão e execução humanas.
