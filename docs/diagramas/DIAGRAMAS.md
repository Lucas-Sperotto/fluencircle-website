# Diagramas técnicos — FluenCircle

**Fonte:** código da branch `feat/claude-hardening-entrega` (19/11/2026), sobre a main pós-PRs #2, #16 e #26.
Diagramas em Mermaid, renderizáveis no GitHub e conferidos com `mmdc` (mermaid-cli) nesta entrega.

- **AS-IS** = comportamento implementado no código desta branch (testado com Firebase **simulado**; Emulator pendente).
- **TO-BE** = proposta, **não implementada**.
- Nada aqui descreve as regras **ativas** em produção (desconhecidas).

## D1 — Contexto (AS-IS)

```mermaid
flowchart LR
    V["Visitante"] --> PT["Circle Tradutor público"]
    A["Aluno"] --> WEB["Site FluenCircle (8 páginas)"]
    M["Mediador"] --> WEB
    AD["Administrador"] --> WEB
    WEB --> ENV{"Endereço local?"}
    PT --> ENV
    ENV -- "sim" --> EMU[("Firebase Emulator\nprojeto demo-fluencircle-audit")]
    ENV -- "não" --> PROD[("Firebase de produção\nAuth + RTDB")]
    PT --> API["Backend Render (código não acessível)"]
    WEB --> API
    API --> GEM["Gemini"]
```

**Leitura:** o tradutor público lê `current_session`; gravar card sem login é **negado pela proposta de regras** e
desligado no Emulator. Em produção a tentativa direta existe só por compatibilidade com regras desconhecidas.

## D2 — Camadas do frontend (AS-IS)

```mermaid
flowchart TB
    HTML["8 páginas HTML"] --> PAGES["pages/ (um script por tela)"]
    HTML --> UI["ui/ (moldura, selo de ambiente, DOM seguro, diálogos)"]
    PAGES --> UI
    PAGES --> DOMAIN["domain/ (puro: SRS, posse da sessão, índice do aluno, erros)"]
    PAGES --> SERVICES["services/ (único acesso a banco e backend)"]
    UI --> CORE["core/ (SDK Firebase, papéis, navegação)"]
    SERVICES --> CORE
    SERVICES --> DOMAIN
    CORE --> CONFIG["config/ (ambiente, Firebase, limites)"]
    UI --> CONFIG
    SERVICES --> DB[("Realtime Database")]
    SERVICES --> BACKEND["Backend de tradução"]
```

`scripts/verify-architecture.mjs` impede import do CDN fora de `core/`, caminhos do banco fora de `services/`,
imports em `domain/` e sinks HTML.

## D3 — Modelo lógico de dados (AS-IS)

```mermaid
erDiagram
    USER ||--o{ ATTENDANCE : "presente em"
    SESSION ||--o{ ATTENDANCE : registra
    USER ||--o{ USER_SESSION : "índice próprio"
    SESSION ||--o{ USER_SESSION : resume
    THEME ||--o{ SESSION : inspira
    SESSION ||--o{ FLASHCARD : contem
    USER ||--o{ REVIEW : acompanha
    SESSION ||--o| CURRENT_SESSION : "publicada como"
    USER {
      string uid PK
      string firstName
      string lastName
      string email
      string role
    }
    THEME {
      string themeId PK
      string topic
      array questions
    }
    SESSION {
      string sessionId PK
      string templateId FK
      string topic
      string startedAt
      string mediatorEmail
    }
    ATTENDANCE {
      string sessionId FK
      string uid FK
      string addedAt
    }
    USER_SESSION {
      string uid FK
      string sessionId FK
      string topic
      string startedAt
    }
    FLASHCARD {
      string cardId PK
      string sessionId FK
      string front
      string back
      string topic
    }
    REVIEW {
      string uid FK
      string sessionId FK
      number stage
      string stage1CompletedAt
      string stage2CompletedAt
      string stage3CompletedAt
    }
    CURRENT_SESSION {
      string sessionId FK
      string topic
      string presenterId
      number version
      string takeoverOf
    }
```

**Observações:** o RTDB é uma árvore JSON, não um banco relacional. `ATTENDANCE` = `meeting_sessions/{id}/attendees/{uid}`
(só `addedAt`; dados antigos podem ter nome/e-mail). `USER_SESSION` = `user_sessions/{uid}/{id}` (resumo; antigo: `true`).
`CURRENT_SESSION` tem também `startedAt` e `live/{presenterId}`.

## D4 — Tradutor público (AS-IS)

```mermaid
sequenceDiagram
    actor V as Visitante
    participant C as circle-translator.page.js
    participant T as translate.service.js
    participant API as Backend Render
    participant DB as RTDB (regras)
    V->>C: Digita texto e pede tradução
    C->>T: translateText(texto)
    T->>API: POST /api/gemini/generate {prompt}
    alt backend indisponível
        API-->>T: erro
        C-->>V: "Não foi possível traduzir agora" (nada é gravado)
    else tradução ok
        API-->>T: {text}
        C-->>V: mostra a tradução
        alt ambiente Emulator
            C-->>V: "não salva flashcards automaticamente"
        else produção (compatibilidade) e sessão de origem ainda no ar
            C->>DB: addFlashcard (sem login)
            alt regra permite (regras ativas desconhecidas)
                DB-->>C: ok → "Flashcard salvo"
            else regra nega (proposta)
                DB-->>C: PERMISSION_DENIED → "flashcard não foi salvo"
            end
        end
    end
```

## D5 — Tradução pública com backend controlado (TO-BE)

```mermaid
sequenceDiagram
    actor V as Visitante
    participant WEB as Tradutor público
    participant BE as Backend controlado
    participant DB as RTDB (Admin SDK)
    participant AI as Gemini
    V->>WEB: Pede tradução
    WEB->>BE: POST /api/v1/public-translations {text, sessionId} + App Check + Idempotency-Key
    BE->>BE: valida tamanho, origem, App Check, limites por IP/sessão e teto de custo
    BE->>AI: prompt fixo no servidor + texto
    AI-->>BE: tradução
    BE->>DB: confere current_session no ar e sessionId
    alt sessão no ar
        BE->>DB: grava {front: texto, back: tradução} na sessão
        BE-->>WEB: 201 {translation, saved: true}
    else sessão mudou ou caiu
        BE-->>WEB: 200 {translation, saved: false}
    end
    WEB-->>V: exibe como texto
```

Contrato completo: `docs/backend/CONTRATO_BACKEND.md`.

## D6 — Ciclo da publicação no tradutor, por aba (AS-IS, ADR-003)

```mermaid
stateDiagram-v2
    [*] --> Livre
    Livre --> NoAr : publicar (versão 1)
    NoAr --> Assumida : outra tela confirma assumir
    NoAr --> SemConexao : queda de rede
    SemConexao --> NoAr : rede volta e ainda é a dona
    SemConexao --> Assumida : outra tela publicou
    NoAr --> Livre : a dona encerra
    Assumida --> [*]
    note right of NoAr : outra tela que cancela não muda nada
    note left of Assumida : segue salvando presença e cards na própria sessão
```

Transações e regras: publicar grava versão 1 (ou +1 sobre dono ausente); assumir exige versão +1 e `takeoverOf`;
a queda dispara o `onDisconnect` que apaga só `live/{aba}`; só a dona remove o nó.

## D7 — Revisão espaçada (AS-IS)

```mermaid
flowchart LR
    S["Sessão iniciada"] --> W1["24 h"]
    W1 --> R1["Etapa 1"]
    R1 --> W7["7 dias após a etapa 1"]
    W7 --> R2["Etapa 2"]
    R2 --> W30["30 dias após a etapa 2"]
    W30 --> R3["Etapa 3 — concluído"]
```

Regra de domínio em `domain/srs.js`. A proposta de regras só aceita avançar **uma** etapa por vez, com carimbo ISO,
em sessão de que o aluno participou; prazos não são verificáveis nas regras (datas em texto).

## D8 — Casos de uso (AS-IS)

```mermaid
flowchart TB
    V["Visitante"] --> UC1["Traduzir"]
    S["Aluno"] --> UC2["Autenticar"]
    S --> UC3["Revisar os próprios decks"]
    M["Mediador"] --> UC2
    M --> UC4["Gerenciar temas"]
    M --> UC5["Conduzir sessão (com posse do tradutor)"]
    M --> UC6["Registrar presença sem PII"]
    M --> UC7["Editar flashcards e histórico"]
    AD["Admin"] --> UC8["Gerenciar contas (com desfazer)"]
    AD --> UC4
    AD --> UC5
    AD --> UC7
    UC5 --> UC6
    UC5 --> UC1
```

## D9 — Exclusão atômica de sessão (AS-IS)

```mermaid
sequenceDiagram
    actor M as Mediador
    participant UI as sessions.page.js
    participant S as sessions.service.js
    participant RTDB as RTDB (regras)
    M->>UI: Confirma exclusão
    UI->>S: deleteSession(id, presentes)
    S->>RTDB: update(raiz, {sessão, cards, índices: null})
    alt todos os caminhos autorizados
        RTDB-->>UI: sucesso atômico
    else algum caminho negado
        RTDB-->>UI: erro, nada é apagado
    end
```

## D10 — Seleção de ambiente (AS-IS, ADR-002)

```mermaid
flowchart TD
    L["Página carregada"] --> H{"location.hostname"}
    H -- "localhost, 127.0.0.1, [::1], *.localhost" --> E["Emulator: projeto demo, Auth 9099, RTDB 9000"]
    E --> B["Selo amarelo no rodapé"]
    E --> T1["Tradutor público não grava cards"]
    H -- "qualquer outro" --> P["Produção: fluentech-1e18a"]
    P --> T2["Tradutor tenta gravação direta (compatibilidade)"]
```

## D11 — Publicar e assumir o tradutor (AS-IS, ADR-003)

```mermaid
sequenceDiagram
    actor B as Mediador B
    participant P as presentation.page.js
    participant S as sessions.service.js
    participant DB as RTDB (regras)
    B->>P: Iniciar
    P->>S: getCurrentSession()
    S-->>P: sessão de A no ar
    P->>B: "Já existe uma sessão no tradutor" (Cancelar / Assumir)
    B->>P: Assumir
    P->>S: createSession() e publishCurrentSession(takeover)
    S->>DB: runTransaction(current_session): versão +1, takeoverOf = aba de A
    DB-->>S: regra confere versão e takeoverOf
    S->>DB: onDisconnect(live/abaB).remove()
    DB-->>P: aba de A recebe "Outra tela assumiu"
```

## D12 — Leitura mínima do aluno (AS-IS, ADR-004)

```mermaid
sequenceDiagram
    participant F as flashcards.page.js
    participant DB as RTDB (regras)
    F->>DB: get user_sessions/{uid}
    DB-->>F: {sessão: {topic, startedAt} | true}
    par para cada sessão do índice
        F->>DB: get flashcards/{sessão}
    and só para entradas antigas (true)
        F->>DB: get meeting_sessions/{sessão}/topic e /startedAt
    end
    F->>DB: get student_reviews/{uid}
    Note over F,DB: nunca lê meeting_sessions inteiro, presenças alheias ou todos os cards
```

## D13 — Verificações na CI (AS-IS configurado)

```mermaid
flowchart LR
    PR["Pull request / push na main"] --> OFF["offline: unitários, sintaxe, estáticos, arquitetura, sincronia e simulador de regras"]
    PR --> EMUJ["rules-emulator: Java 21 + Emulator (projeto demo) + tests/rules"]
    PR --> E2E["e2e: Playwright + Firebase simulado + acessibilidade básica"]
    OFF --> R["Resultado no PR"]
    EMUJ --> R
    E2E --> R
    R -. "nenhum deploy, nenhum segredo" .-> X["decisão humana"]
```

## D14 — Salas por código e QR (TO-BE, ADR-003)

```mermaid
flowchart LR
    MED["Tela de apresentação"] --> CODE["Gera código ABC123 e QR local"]
    CODE --> ROOM[("active_sessions/ABC123\nposse, versão, presença")]
    VIS["Visitante"] --> URL["circle-translator.html?sala=ABC123"]
    URL --> ROOM
    OLD["QR antigo, sem ?sala"] --> CUR[("current_session = sala padrão")]
```

## Validação

- [x] Sintaxe conferida com `mmdc` nesta entrega (ver `docs/entrega/MATRIZ_DE_TESTES.md`).
- [ ] Atores e permissões confirmados pelos responsáveis e pelo job `rules-emulator`.
- [ ] Atualizar sempre que mudar esquema, endpoint, fluxo ou papel.
