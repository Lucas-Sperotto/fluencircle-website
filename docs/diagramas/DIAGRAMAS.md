# Diagramas técnicos — FluenCircle

**Fonte:** main após reorganização Claude (PR #2) e reparos localizados de integridade/UX por ChatGPT (PR #16). Diagramas em Mermaid, renderizáveis no GitHub e editáveis como texto. **AS-IS** significa comportamento identificado no código; **TO-BE** significa sugestão, não funcionalidade existente.

## D1 — Contexto da aplicação (AS-IS)

```mermaid
flowchart LR
    G["Visitante"] --> PT["Circle Tradutor público"]
    A["Aluno"] --> WEB["Site FluenCircle multipágina"]
    M["Mediador"] --> WEB
    AD["Administrador"] --> WEB
    M --> PT
    PT --> DB[("Firebase Realtime Database")]
    WEB --> AUTH["Firebase Authentication"]
    WEB --> DB
    PT --> API["Backend Render: Gemini"]
    WEB --> API
    API --> GEM["Serviço Gemini"]
```

**Pontos de atenção:** `PT → DB` permite gravação sem login conforme o código/proposta; o acesso de `WEB → DB` depende de regras ativas não analisadas. `API` foi visto somente pelo contrato consumido no frontend.

## D2 — Camadas do frontend reorganizado (AS-IS)

```mermaid
flowchart TB
    HTML["8 páginas HTML"] --> PAGES["pages/ (controladores)"]
    HTML --> UI["ui/ (shell e componentes)"]
    PAGES --> UI
    PAGES --> DOMAIN["domain/ (funções puras)"]
    PAGES --> SERVICES["services/ (DB e API)"]
    UI --> CORE["core/ (autenticação, sessão, SDK)"]
    SERVICES --> CORE
    SERVICES --> DOMAIN
    CORE --> CONFIG["config/"]
    SERVICES --> DB[("Realtime Database")]
    SERVICES --> BACKEND["Backend de tradução"]
```

**Regra alvo:** o domínio não depende de browser nem de Firebase; operações de banco ficam em `services/`. Conferir imports em CI e criar ADR da escolha sem build versus Vite.

## D3 — Modelo lógico de dados (AS-IS, inferido do código)

```mermaid
erDiagram
    USER ||--o{ USER_SESSION : participa
    SESSION ||--o{ USER_SESSION : possui
    THEME ||--o{ SESSION : inspira
    SESSION ||--o{ FLASHCARD : contem
    USER ||--o{ REVIEW : acompanha
    SESSION ||--o{ REVIEW : eh_revisada_em
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
    FLASHCARD {
      string cardId PK
      string sessionId FK
      string front
      string back
      string topic
    }
    USER_SESSION {
      string uid FK
      string sessionId FK
      boolean attended
    }
    REVIEW {
      string uid FK
      string sessionId FK
      number stage
      string stage1CompletedAt
      string stage2CompletedAt
      string stage3CompletedAt
    }
```

**Observação:** ERD é representação conceitual: Firebase RTDB é uma árvore JSON, não SGBD relacional. O índice de presença é duplicado em `meeting_sessions/{id}/attendees` e `user_sessions/{uid}/{id}`. Há também `deleted_users` e nó singular `current_session` (não mostrados nas entidades principais).

## D4 — Sequência de tradução pública (AS-IS)

```mermaid
sequenceDiagram
    actor V as Visitante
    participant C as circle-translator.page.js
    participant T as translate.service.js
    participant API as Backend Render
    participant DB as Firebase RTDB
    V->>C: Digita texto e solicita tradução
    C->>T: translateText(texto)
    T->>API: POST /api/gemini/generate {prompt}
    API-->>T: {text: tradução}
    T-->>C: tradução
    C-->>V: Exibe resultado
    alt Sessão de origem ainda está ativa
        C->>DB: addFlashcard(sessionId original, frente, verso)
        DB-->>C: confirmação ou erro
    else Sessão encerrada ou alterada durante a tradução
        Note over C: Não grava flashcard na sessão nova
    end
```

**Risco:** o fluxo atual não autentica o visitante na gravação do banco nem envia token de identificação ao backend de tradução. Ações de segurança são necessárias antes de publicação.

## D5 — Tradução pública com segurança (TO-BE proposto)

```mermaid
sequenceDiagram
    actor V as Visitante
    participant WEB as Frontend
    participant EDGE as Backend de tradução controlado
    participant DB as Firebase RTDB
    participant AI as Gemini
    V->>WEB: Solicita tradução
    WEB->>EDGE: POST /translate {text, sessionCode?}
    EDGE->>EDGE: Validar tamanho, origem, limites e proteção antiabuso
    EDGE->>AI: Prompt fixo no servidor + texto
    AI-->>EDGE: Tradução
    alt Associar à sessão autorizada
        EDGE->>DB: Criar cartão validado com privilégio mínimo
        DB-->>EDGE: confirmação
    end
    EDGE-->>WEB: {text} ou erro controlado
    WEB-->>V: Exibe tradução sem interpretar HTML
```

**Decisão pendente:** gravação automática pode exigir opt-in/moderação, proteção por sessão ou autenticação anônima. O diagrama não é autorização para construir endpoint privilegiado sem revisão de ameaças.

## D6 — Ciclo de vida da sessão (TO-BE para eliminar concorrência)

```mermaid
stateDiagram-v2
    [*] --> Preparada
    Preparada --> Ativa : start autorizado e ownership adquirido
    Ativa --> Reconectando : conexão interrompida
    Reconectando --> Ativa : reconecta e ownership válido
    Reconectando --> Expirada : lease/TTL termina
    Ativa --> Encerrada : mediador proprietário encerra
    Ativa --> Expirada : TTL/timeout
    Encerrada --> [*]
    Expirada --> [*]
```

**Critérios:** IDs únicos, associação ao mediador, encerramento condicional, expiração e testes A/B concorrentes. Não usar remoção cega de um nó global compartilhado.

## D7 — Revisão espaçada (AS-IS)

```mermaid
flowchart LR
    S["Sessão iniciada"] --> W1["Esperar 24 horas"]
    W1 --> R1["Etapa 1: revisar deck"]
    R1 --> W7["Esperar 7 dias desde conclusão da etapa 1"]
    W7 --> R2["Etapa 2: revisar deck"]
    R2 --> W30["Esperar 30 dias desde conclusão da etapa 2"]
    W30 --> R3["Etapa 3: revisar deck"]
    R3 --> DONE["Concluído"]
```

**Regra de domínio:** `domain/srs.js`; o avanço é gravado em `student_reviews/{uid}/{sessionId}`. Necessário testar avanço concorrente e resistência a registros manipulados no cliente.

## D8 — Mapa resumido de casos de uso (AS-IS)

```mermaid
flowchart TB
    V["Visitante"] --> UC1["Traduzir"]
    S["Aluno"] --> UC2["Autenticar"]
    S --> UC3["Revisar cartões"]
    M["Mediador"] --> UC2
    M --> UC4["Gerenciar temas"]
    M --> UC5["Conduzir sessão"]
    M --> UC6["Registrar presença"]
    M --> UC7["Editar flashcards e histórico"]
    AD["Admin"] --> UC8["Gerenciar usuários/papéis"]
    AD --> UC4
    AD --> UC5
    AD --> UC7
    UC5 --> UC6
    UC5 --> UC1
```

## Validação antes de aceitar diagramas

- [ ] Nomes dos nós e contratos checados contra código após merge.
- [ ] Atores e permissões confirmados por responsáveis e regras do Emulator.
- [ ] Todas as mudanças TO-BE registradas em Issues/ADRs.
- [ ] Diagramas atualizados sempre que mudar esquema, endpoint, fluxo ou papel.
## D9 — Exclusão atômica de sessão (AS-IS após PR #16)

```mermaid
sequenceDiagram
    actor M as Mediador
    participant UI as sessions.page.js
    participant S as sessions.service.js
    participant MAP as session-updates.js
    participant RTDB as Firebase RTDB
    M->>UI: Confirmar exclusão
    UI->>S: deleteSession(id, attendees)
    S->>MAP: buildDeleteSessionUpdates(id, attendees)
    MAP-->>S: caminhos sessão, cards e índices = null
    S->>RTDB: update(root, mapa multicaminho)
    alt todos caminhos autorizados
        RTDB-->>S: sucesso atômico
        S-->>UI: sucesso
    else algum caminho negado
        RTDB-->>S: erro e sem escrita parcial
        S-->>UI: erro, não declarar sucesso
    end
```

**Limite:** a atomicidade do RTDB exige aceitação de todos os caminhos. Índices introduzidos concorrentemente após a leitura dos participantes ainda precisam de reconciliação. A CI offline apenas testa a construção do mapa.
