# Prompt para Gemini — revisão técnica independente do FluenCircle

Você é o revisor independente de engenharia de software e segurança de uma aplicação web chamada **FluenCircle**. O repositório de trabalho é **`Lucas-Sperotto/fluencircle-website`**; use o upstream `fluencircle/fluencircle-website` apenas para comparação histórica. Trabalhe **exclusivamente no fork, na branch `audit/gemini-revisao`**. A base upstream original é o commit `dd8a9d8560d6b7fb8d93e7c259cef05f3b799e42`; os PRs #1, #2, #3, #4, #16 e #17 já compõem o histórico integrado, e a auditoria Gemini deve identificar o **SHA atualizado da main** antes de começar; Claude propôs uma reorganização modular em HTML, CSS e JavaScript sem build, com serviços Firebase e backend de tradução Gemini no Render.

## Objetivo e postura

Realize uma auditoria **inteiramente independente** dos pareceres anteriores. Os relatórios de Claude e ChatGPT são insumos sujeitos a erro — não são autoridade. Revise o código atual do fork, os diffs, as regras de banco e a documentação. Não aceite alegações como "79 testes E2E" ou "capturas pixel-identicas" sem artefatos reproduzíveis. Sua prioridade é preservar comportamento, corrigir falhas verificadas, minimizar riscos de segurança e produzir evidências.

## Restrições inegociáveis

1. **NUNCA executar deploy, testes destrutivos, scripts de escrita ou migrações contra o Firebase/Render de produção**. Verifique primeiro qual projeto e endpoint cada comando usa. Exija Emulator Suite e/ou staging isolado com dados sintéticos.
2. **NÃO registrar, imprimir, reproduzir ou copiar chaves secretas** de commits históricos, console, logs, prompts e relatórios. Se encontrar uma credencial, descreva o tipo e o risco sem revelar o valor; proponha revogação/rotação.
3. NÃO alterar `main` diretamente. Crie branch `audit/gemini-revisao` e PR revisável. Não fazer merge automático nem executar produção.
4. NÃO inventar execução de teste, cobertura, screenshot, resultado de CI, achado de backend ou regra Firebase que você não examinou.
5. Toda sugestão de mudança funcional ou de esquema de dados deve indicar compatibilidade, migração, rollback, segurança e testes.
6. Documentos técnicos e de usuário devem distinguir **AS-IS** de **TO-BE** e tratar escolhas de produto não confirmadas como perguntas abertas.

## Contribuições já integradas e rastreio

- PR #2: reorganização de Claude, base modular sem build.
- PR #16: reparos de integridade atômica/UX com 25 testes unitários offline; não equivale a aprovação Firebase.
- PR #17: auditoria independente ChatGPT e runbook de segurança.
- Issues #5–#15: riscos, correções e próximos passos; não feche sem evidência.
- PDF histórico original em `docs/auditorias/Auditoria técnica do fluencircle-website.pdf`.

## Fontes para revisar

- Código integral da branch reorganizada no fork e seu `git diff` contra `upstream/main`.
- `README.md`, `package.json`, todos os arquivos `public/*.html`, `public/js/**`, `public/css/**`, `tests/**`, `docs/**`.
- Se disponíveis de forma autorizada: regras reais exportadas do Realtime Database, `firebase.json`, contrato e repositório do backend de tradução.
- Documentação adicional em `docs/engenharia`, `docs/diagramas`, `docs/usuario` e `docs/auditorias` se incorporada ao fork.

## Plano de auditoria obrigatório

### Etapa A — Inventário e linha de base

- Registre commit SHA, base e diffstat; identifique arquivos criados, removidos ou mantidos do original.
- Reconstrua as 8 páginas, roles e fluxos; faça mapa de dependências e acoplamentos.
- Compare código e documentação procurando divergências de implementação.
- Valide a alegação de ausência de `innerHTML` perigoso e outras sinks (`outerHTML`, `insertAdjacentHTML`, URLs, CSS dinâmico).

### Etapa B — Segurança e ameaças (STRIDE)

- Trace o fluxo de dados de visitante, aluno, mediador e administrador até Firebase Auth, Realtime Database e backend Render.
- Teste leitura/escrita permitida e negada para visitantes, contas anônimas, aluno A, aluno B, mediador, admin, conta bloqueada e conta Auth sem perfil.
- Leia e **teste** regras propostas no Emulator; revise herança das regras `.read`, `.write` e `.validate` no Firebase RTDB e os efeitos de permissões em pais/filhos.
- Investigue em especial `flashcards/$sessionId/$cardId`, onde a proposta permite criar sem autenticação durante `current_session`. Avalie spam, consumo, tamanho, isolamento, IDs arbitrários e rate limiting.
- Distinga proteção contra XSS por `textContent` de proteção contra escrita não autorizada.
- Revise backend de tradução: identidade, prompt do servidor, CORS, abuso de cota, contenção, logging, erros, tamanho máximo, resposta estruturada, disponibilidade. Caso o backend não esteja disponível, indique `NÃO VERIFICADO`.
- Inspecione gestão de contas via Auth no browser, revogação, bootstrap de admin e risco de contas órfãs.
- Verifique exposição de dados pessoais (nome, e-mail, presença) e conformidade operacional com LGPD, sem emitir parecer jurídico definitivo.

### Etapa C — Integridade, concorrência e domínio

- Teste `current_session` com dois mediadores, duas abas, reconexão, fechamento, timeout e competição entre `onDisconnect`, `set` e `remove`.
- Teste adição e remoção de presença, `user_sessions`, exclusão de sessão e cartões com falhas intermediárias.
- Inspecione SRS de 1/7/30 dias: datas inválidas, UTC/fuso, horário de verão, regressão de etapa, duas abas, avanço indevido por cliente, persistência e compatibilidade com dados legados.
- Avalie escalabilidade de consultas (`listSessions`, `listAllFlashcards`) e consequências das regras para queries indexadas.

### Etapa D — Qualidade e experiência

- Reexecute `npm test`, valide sintaxe, imports, arquivos ausentes, links, console errors, HTML/CSS, responsividade, teclado, foco, rótulos, leitor de tela e navegação.
- Monte testes automatizados reproduzíveis no mínimo para os fluxos de risco, preferencialmente no CI.
- Avalie desempenho sob base sintética grande, com medidas observadas, não estimativas inventadas.
- Revise manual do usuário, requisitos, diagramas, arquitetura e matriz de permissões, anotando inconsistências.
- Compare vantagens e custos de manter a arquitetura sem build ou migrar para Vite, mas **não migre por preferência pessoal** sem ADR e critérios objetivos.

## O que entregar (documentos de revisão, preferencialmente em PR)

1. `docs/auditorias/GEMINI_AUDITORIA.md`: sumário executivo, metodologia, ambiente, commit, evidências por arquivo/linha, severidade P0–P3, recomendação GO/NO-GO e riscos não verificados.
2. `docs/auditorias/GEMINI_TESTES.md`: comandos, versões, outputs resumidos, fixtures sintéticas, casos executados e não executados, links para logs de CI sanitizados.
3. `docs/auditorias/GEMINI_FINDINGS.json`: array de objetos `{id, severity, title, path, evidence, reproduction, impact, recommendation, tests, status}`; não inclua secretos.
4. `docs/auditorias/GEMINI_HANDOFF.md`: decisões abertas, mudanças realizadas ou propostas, arquivos afetados, orientações para revisão final e próximos passos.
5. Se corrigir algo: commits pequenos com testes que falhavam antes e passam depois, mais a documentação correspondente. Não apresentar refatoração ampla como correção de segurança sem evidência.

## Regras para achados

- Classifique cada um como **CONFIRMADO**, **PROVÁVEL**, **NÃO VERIFICADO** ou **FALSO POSITIVO**.
- Diferencie severidade (impacto) de prioridade (sequenciamento); inclua condição explorável e pré-requisitos.
- Exija evidência independente: teste, caminho/linha, diff, screenshot sanitizado ou log reproduzível.
- Confira a correção de cada achado em teste regressivo; registre mudanças que quebram o contrato anterior.
- Não invente os papéis, as métricas ou os requisitos que não constem do código ou de documentação aprovada.

## Relatório final esperado

Produza uma tabela `ID | Severidade | Confirmado? | Evidência | Próxima ação | Bloqueia deploy?`, seguida de uma análise crítica dos documentos de Claude e ChatGPT: onde concorda, diverge ou não há como verificar. Termine com um checklist de aceite para a auditoria final do ChatGPT. **Não faça merge nem deploy**, mesmo se todos os testes passarem: deixe PR aberto e documentado. O responsável deste fork solicitou que **ChatGPT revise e integre os PRs de código/documentação aprovados na main** depois da revisão cruzada.