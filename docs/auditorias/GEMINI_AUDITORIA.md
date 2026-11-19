# Auditoria técnica independente — revisão Gemini (material encaminhado)

- **Data declarada pelo revisor:** 19/11/2026
- **Origem:** conteúdo de revisão atribuído a Gemini, encaminhado pelo responsável no chat.
- **Base efetivamente examinada pelo Gemini:** `Lucas-Sperotto/fluencircle-website@469aaecb767bec2d552d05faf7323fd407fb303a`.
- **Upstream histórico:** `fluencircle/fluencircle-website@dd8a9d8560d6b7fb8d93e7c259cef05f3b799e42`.
- **Registro:** texto normalizado para Markdown com auxílio ChatGPT, sem afirmar que Gemini publicou commits ou executou serviços externos.
- **Decisão:** **NO-GO para deploy**.

## 1. Escopo e transparência

Gemini informou ter conferido por SHA-256 **111/111 arquivos** contra `EVIDENCIAS/MANIFESTO.json`. Examinou diretamente o manifesto e logs, `package.json`, `AGENTS.md`, a proposta de regras `docs/firebase/database.rules.proposta.json`, `docs/firebase/firebase.json.exemplo`, o runbook e documentos de auditoria.

**Não executou naquele ambiente:** Node/npm/git/firebase-tools; não leu integralmente `public/js/**` ou `public/*.html`; não inspecionou regras **ativas** do RTDB, Firebase Emulator, código Render, navegador/E2E ou credencial no GCP. Os 25 testes unitários, verificações estáticas e de arquitetura foram **lidos como logs previamente produzidos**, não executados pelo Gemini.

## 2. Inventário relatado

O relatório traz diffstat de **122 caminhos, 9.705 inserções e 7.888 remoções** contra upstream, oito HTML, 42 módulos ES e 20 CSS. O código implementa a **arquitetura A: módulos sem build**. A migração para Vite foi discutida em ADR-001, não executada. Na raiz não há `firebase.json` nem `database.rules.json`. O arquivo `docs/firebase/database.rules.proposta.json` não demonstra as regras efetivamente em produção.

## 3. Achados

| ID | Prioridade | Situação demonstrada | Fonte principal | Ação |
| --- | --- | --- | --- | --- |
| **FC-01** | **P0** | **Confirmado na proposta, não verificado em produção.** `flashcards/$sessionId/$cardId/.write` concede criação enquanto `current_session` coincide, sem `auth != null`, App Check ou limite de quantidade. | `docs/firebase/database.rules.proposta.json`, linha histórica 57 | Impedir escrita anônima direta; backend com Admin SDK + antiabuso ou fluxo protegido, testar Emulator |
| **FC-02** | **P0/P1** | **Confirmado na proposta.** `meeting_sessions/.read` e `flashcards/.read` permitem leitura global a usuários com perfil; `users/.read` permite lista ampla a mediadores; campos arbitrários ainda podem passar por nós sem `.validate`. | Mesmo JSON, linhas históricas 7, 40–43, 53, 79–83 | Exportar regras ativas, restringir acesso por presença, validar esquema e testar quatro papéis |
| **FC-03** | **P1** | **Não verificado por Gemini linha a linha.** CI estática reporta 42 módulos sem sinks proibidos, mas não cobre todos os vetores de atributos ou CSS. | `EVIDENCIAS/verify-architecture.txt`; `public/js/**`, `public/*.html` | Inspeção manual e testes DOM/XSS, sem confundir escape de texto com autorização |
| **FC-04** | **P1** | **Estrutura singleton observada na proposta; corrida real não testada.** `current_session` global e `onDisconnect` podem interferir entre mediadores. | `docs/firebase/database.rules.proposta.json`; `sessions.service.js` a revisar | Posse explícita ou salas por código, transações e testes com duas conexões |
| **FC-05** | **P1** | **Não verificado.** Backend Render/Gemini fora do repositório. | `docs/firebase/firebase.json.exemplo`, origem do Render | Auditar código de servidor, prompt fixo, Firebase ID token/App Check, cotas, rate limit, CORS e erros |
| **FC-06** | **P2** | **Confirmado na proposta, não verificado por Gemini em srs.js.** `stage` aceita qualquer número entre 0 e 3 sem validar ordem nem intervalo. | `student_reviews/$uid/$sessionId/stage/.validate` | Modelar progressão e carimbos de tempo; compatibilizar registros legados |
| **FC-07** | **P2** | **Confirmado na proposta:** sem `.indexOn`, e documentos relatam leitura integral de coleções. | Regras propostas; `docs/firebase/LEIA-ME.md` | Consultas por `user_sessions/{uid}`, índices específicos às queries, benchmark sintético |
| **FC-08** | **P2** | **Confirmado como limitação documental:** 79 E2E e 52 capturas relatadas por Claude sem suíte/reprodução disponível; credencial histórica não rotacionada de modo verificável. | `docs/AUDITORIA.md`, `package.json`, runbook | Tratar relatórios antigos como históricos, criar E2E, confirmar credencial pelo administrador |
| **FC-09** | **P1** | **Confirmado no exemplo:** CSP `connect-src` sem `*.firebasedatabase.app`; a URL regional pode ser bloqueada se publicada como está. | `docs/firebase/firebase.json.exemplo` | Completar origens HTTPS/WSS, testar no preview antes de ativar |

**Precisão importante:** confirmar uma condição na *proposta* não significa demonstrar que a mesma vulnerabilidade esteja explorável no banco ativo. Exemplos de exploração do relatório são cenários possíveis, **não ataques executados**.

## 4. Comparação crítica entre as contribuições

**Claude (PR #2):** decomposição em módulos é útil, mas a proposta de regras manteve escrita pública sem autenticação e leituras globais. As métricas de 79 E2E/52 screenshots permanecem relatos históricos não reproduzidos na suíte do projeto.

**ChatGPT (PRs #3, #16, #17–#20):** documentou problemas de acesso/concorrência e introduziu operações atômicas multicaminho e testes offline. As garantias de segurança de produção nunca foram verificadas no Emulator ou Render.

**Gemini (esta revisão):** detalhou herança de permissões, lacunas de validação de schema, SRS, `.indexOn` e CSP regional. Não examinou integralmente o frontend JS e HTML, o que motiva a auditoria complementar ChatGPT.

## 5. Plano de decisão

1. Operador responsável: obter regras reais, estado do backend e confirmação de credencial, por canal privado.
2. Engenharia: eliminar escrita anônima direta no projeto de regras; preservar fluxo público via backend protegido; restringir leituras por presença; modelar sessões concorrentes.
3. Garantia de qualidade: testes positivos/negativos no Firebase Emulator, E2E/a11y no navegador, compatibilidade e rollback.
4. Segurança: testar CSP em preview, nunca copiar exemplo diretamente para produção.
5. Revisão cruzada com evidências, aprovações humanas e decisão GO/NO-GO separadas do merge Git.

**Resultado Gemini: NO-GO para deploy.**
