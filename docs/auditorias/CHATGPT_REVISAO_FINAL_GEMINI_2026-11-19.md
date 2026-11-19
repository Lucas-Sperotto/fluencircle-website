# Revisão final ChatGPT das conclusões Gemini (FC-01 a FC-09)

**Data:** 19/11/2026 · **Autor desta complementação:** ChatGPT (GPT-6) · **Fonte revisada:** revisão Gemini encaminhada pelo mantenedor e registrada em `GEMINI_*.md/json`.

**Código efetivamente inspecionado:** snapshot exato `469aaecb767bec2d552d05faf7323fd407fb303a` (111 arquivos conferidos por SHA-256), incluindo `public/js/`, oito `public/*.html`, `tests/unit/` e propostas `docs/firebase/`. Alterações de contenção desta fase estão na branch `fix/chatgpt-pos-gemini-srs-csp-rules`.

## Evidências de execução

- **Reexecutado pelo ChatGPT localmente, não pelo Gemini:** `npm test` no snapshot: **25/25 aprovados**; `verify-static.mjs`: 8 HTML, 31 referências, 0 ausentes; `verify-architecture.mjs`: 42 módulos, 0 sinks HTML proibidos por esse verificador. `node --check`: aprovado.
- **Reexecutado após os ajustes equivalentes na cópia local:** **30/30 testes**; checagens estáticas, arquitetura e sintaxe aprovadas. A validação no GitHub Actions do commit publicado será registrada no PR antes do merge.
- **Não executado:** Firebase Emulator/RTDB real, Render, Google Cloud, login real, E2E/preview do Hosting. Nenhuma mudança de produção foi realizada.

## Conclusões detalhadas

| ID | Parecer após inspeção direta adicional | Ação nesta etapa | Restante |
| --- | --- | --- | --- |
| **FC-01** | **CONFIRMADO no rascunho original.** O filho `flashcards/$sessionId/$cardId/.write` autorizava novos cards sem `auth` quando a sessão coincidia. A regra pai permite staff. | **Removida somente a regra filha de escrita anônima do rascunho**, mais teste de regressão estática e documentação incompatível com tradutor público. | Rascunho **não é deployável**; persistência pública precisa do backend e testes Emulator. Issue #5. |
| **FC-02** | **CONFIRMADO no rascunho**, não nas regras reais: leituras amplas em `meeting_sessions`, `flashcards` e `users` para mediadores; validação de esquema incompleta. | Documentado e bloqueado. | Exportar regras ativas; redirecionar consultas e criar matriz RBAC no Emulator. Issues #7, #10. |
| **FC-03** | **INSPECIONADO no frontend atual:** não foram encontrados `innerHTML`/ `outerHTML`/ `insertAdjacentHTML` em execução nos 42 módulos JS; oito HTML usam imports de módulos e links estáticos. `h()` usa `append` com nós/texto, e `app-shell.js` usa `PAGES` constantes nos href. | Manteve-se o gate estático. | `h()` é um helper genérico que usa `setAttribute` sem validar URLs: não foi identificado fluxo de valor não confiável para `href/src`, mas testes DOM/XSS e monitoramento de atributos futuros são necessários. Issue #13. |
| **FC-04** | **CONFIRMADO em código:** `sessions.service.js` publica no singleton `current_session`, usa `onDisconnect(currentRef).remove()`, e em reconexão republica o payload. Risco realista de duas abas/mediadores. | Sem migração de esquema sem Emulator. | Posse por UID/código, transações, compatibilidade de tradutor. Issue #9. |
| **FC-05** | **CONFIRMADO no cliente:** `translate.service.js` envia `{prompt: buildTranslationPrompt(text)}` por fetch sem header ID Token. O backend externo não foi lido. | Documentado. | Revisar repositório e controle real de Render. Issue #8. |
| **FC-06** | **CONFIRMADO no rascunho:** validação `stage` apenas numérica 0–3. **Achado adicional verificado no cliente:** `srs.js` classificava stage 4, negativo e string como "Concluído" e podia exibir prazo inválido quando `startedAt` não era data válida. | **Corrigido apenas no cliente**, com testes de dados corrompidos e datas, sem perder fallback para registros legados válidos; nenhuma regra real alterada. | Progresso monotônico, carimbos de tempo, atomicidade de writes e compatibilidade no Emulator. Issue #25 + #7. |
| **FC-07** | **CONFIRMADO:** não há `.indexOn` no rascunho; `flashcards.page.js:43-59` lê `listSessions()`, `listAllFlashcards()` e só então filtra por `attendees` do cliente. | Diagnóstico. | Corrigir *queries e regras de acesso*, depois adicionar índices **compatíveis com as consultas**; somente adicionar `.indexOn` não reduz leitura de nós inteiros. Issue #10. |
| **FC-08** | **CONFIRMADO como lacuna de evidência:** `docs/AUDITORIA.md` foi marcado explicitamente como histórico antes do Gemini, sem comprovar 79 E2E/52 capturas. | Reforçada a ressalva da persistência pública no documento histórico. | E2E reproduzível e situação da credencial histórica no GCP. Issue #6, #13. |
| **FC-09** | **CONFIRMADO no exemplo:** CSP só tinha `*.firebaseio.com`, mas serviços RTDB regionais usam `*.firebasedatabase.app`. | Acrescentados `https://*.firebasedatabase.app` e `wss://*.firebasedatabase.app` no exemplo e teste offline. | Teste CSP com banco de **staging** em preview; não publicar diretamente em produção. Issue #24. |

## Análise das regras RTDB

O Firebase documenta que `.read` e `.write` **são herdadas** a partir de regras pais e que `.validate` é avaliada separadamente, sem essa herança. Assim, uma permissão positiva no pai pode conceder acesso a filhos; um validador de tamanho não é controle de quantidade ou de custo.

- Referência oficial: https://firebase.google.com/docs/database/security/core-syntax
- Regras de validação e seus limites: https://firebase.google.com/docs/database/security/rules-conditions
- URLs RTDB por região: https://firebase.google.com/docs/database/locations

**Ponto central:** não aplicar `docs/firebase/database.rules.proposta.json` em produção. A remoção da escrita anônima é uma **contenção no rascunho**, mas quebra o salvamento automático de flashcards no tradutor público **se essas regras forem implantadas sem mudar backend**. O site em produção não foi modificado por esta revisão.

## Fluxo de aprovação separado

1. **Código/Docs na main:** somente após CI offline passar e PR rastreável.
2. **Firebase/Render/Hosting:** precisam de aprovação operacional explícita, regras reais exportadas, banco e usuários sintéticos no Emulator, testes E2E e rollback.
3. **Release:** continua **NO-GO** até correção e evidência dos riscos FC-01/02/04/05/09 e das pendências de credenciais.

## Rastreabilidade

- **Claude:** refatoração e auditoria histórica; relato de E2E não reproduzido.
- **Gemini:** FC-01…FC-09, revisão cruzada recebida no chat, sem testes dinâmicos.
- **ChatGPT:** revisão direta adicional do frontend, 25 testes reexecutados no baseline, correções de SRS, CSP e proposta RTDB, 30 testes equivalentes locais; CI do PR vinculada ao commit.
- **Responsável humano:** decide alterações de regras reais, backend, credenciais e deploy.

**Decisão ao fim desta revisão de código: NO-GO para produção.**
