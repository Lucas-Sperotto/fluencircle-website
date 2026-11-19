# ADR-004 — Leitura mínima do aluno e presença sem dados pessoais

**Estado:** aceita para o código e para a proposta de regras; **dados de produção não migrados** e regras **não publicadas**.
**Data:** 19/11/2026 · **Issue:** #10 · **Implementação:** Claude · **Revisão:** pendente (ChatGPT) e aceite humano.

## Contexto (AS-IS antes desta mudança)

- `flashcards.page.js` baixava **todas** as sessões (`meeting_sessions`) e **todos** os cards (`flashcards`) e filtrava
  no navegador pela presença do aluno (FC-07, PRIV-09).
- Cada presença (`meeting_sessions/{id}/attendees/{uid}`) guardava **nome e e-mail**. Como o aluno precisava ler a
  coleção inteira, qualquer aluno podia obter nome, e-mail e frequência de colegas (contraria CA-06).
- O índice `user_sessions/{uid}/{sessionId}` já existia, mas só com `true`.

## Decisão

1. **O aluno parte do próprio índice.** `user_sessions/{uid}/{sessionId}` passa a guardar `{ topic, startedAt }` —
   o suficiente para montar o deck e calcular a revisão espaçada. A tela lê esse índice e, para cada sessão,
   `flashcards/{sessionId}`. Leituras em paralelo; falha em uma sessão não derruba a lista.
2. **Presença sem PII.** Novas presenças gravam só `{ addedAt }`. Nome e e-mail ficam no perfil (`users`), que só a
   equipe lê. A gaveta de presença mostra nomes a partir da lista de alunos já carregada pela equipe.
3. **Regras coerentes** (`firebase/rules/database.rules.source.mjs`):
   - `meeting_sessions` e `flashcards` inteiros: só equipe;
   - `flashcards/{sessão}`: equipe ou quem participou **e tem perfil**;
   - `meeting_sessions/{sessão}/topic` e `/startedAt`: quem participou (para entradas antigas do índice);
   - `attendees/{uid}`: só `addedAt`; `user_sessions/{uid}/{sessão}`: só `{topic, startedAt}`; ambos gravados juntos.
4. **Compatibilidade:** entradas antigas `true` e presenças antigas com nome/e-mail continuam funcionando
   (leitura). Nenhuma escrita nova pode recriá-las.
5. **Sem `.indexOn`.** Nenhuma tela usa consulta (`orderByChild`/`equalTo`): tudo é leitura por chave. Índices
   do RTDB só ajudam consultas; adicionar sem consulta não reduz leitura (observação já feita na revisão ChatGPT do FC-07).
   Se a lista da equipe for paginada por data, aí sim `meeting_sessions/.indexOn: ["startedAt"]`.

## Alternativas consideradas

| Alternativa | Por que não agora |
| --- | --- |
| Consulta `orderByChild('attendees/{uid}')` | Exige `.indexOn` por uid (inviável) e regras baseadas em consulta; continua expondo o nó da sessão |
| Nó `session_summaries/{id}` separado | Duplicaria o resumo para todos; o índice por aluno já existe e já é escrito junto com a presença |
| Ler só os campos `topic`/`startedAt` de cada sessão | É o que fazemos para entradas antigas; como regra geral dobraria o número de leituras |

## Medição sintética (não é medição de produção)

`node scripts/benchmarks/read-volume.mjs` (200 sessões, 60 alunos, 12 presentes e 15 cards por sessão; dados
determinísticos): para o aluno com mais presenças (52 sessões), o volume lido cai de **767,3 KiB** em 2 leituras
para **128,0 KiB** em 53 leituras pequenas paralelas (**−83,3%**), e as presenças de outras pessoas expostas
caem de **2.348** para **0**. Não mede latência nem custo real do Firebase.

## Migração de dados existentes (NÃO executada)

`scripts/migrations/plan-privacy-migration.mjs <backup.json>` gera, **offline**, um plano de `update` que:
remove `name`/`email` das presenças antigas, cria/atualiza `user_sessions` com o resumo e **só relata** índices
órfãos. Aplicação: pessoa autorizada, com privilégio administrativo (que ignora regras), após backup testado e
primeiro em staging. Backups e planos com dados reais **não** entram no Git.

## Consequências e pendências

- ✅ Testes: `tests/unit/user-sessions.test.js`, `session-updates.test.js`, `privacy-migration.test.js`;
  `tests/rules/privacidade.rules.test.mjs` (12 casos); `tests/e2e/privacidade.e2e.test.mjs` (lista exata de caminhos
  lidos pela aluna). Emulator: **pendente de execução na CI**.
- ⚠️ O resumo no índice é cópia: se o tema de uma sessão mudar, o índice não acompanha (hoje a interface não edita
  tema de sessão realizada).
- ⚠️ Mediadores continuam lendo nome e e-mail de todos os perfis (necessário para a presença). Futuro: diretório só
  com nome de exibição.
- ⚠️ **LGPD — decisões humanas em aberto:** prazo de retenção de presença, progresso (`student_reviews`) e cards;
  o que fazer com esses dados quando uma conta é revogada; base legal e aviso de privacidade do tradutor público.
  Registrado em `docs/entrega/LIMITACOES_E_PENDENCIAS.md`.
