# Auditoria técnica — situação após a reorganização

Auditoria do commit `dd8a9d8` (21/10/2026) e o que a reorganização para a arquitetura A resolveu. O relatório completo, com evidências por linha, foi entregue à parte; aqui fica o registro para o repositório.

**Legenda:** ✅ corrigido no código · 🟡 mitigado no código, falta ação fora dele · ⏳ pendente (console do Firebase, Google Cloud ou backend)

## Segurança

| # | Severidade | Achado | Situação |
| --- | --- | --- | --- |
| 1 | Crítica | O tradutor público grava flashcards sem login, e as telas internas exibiam esses textos com `innerHTML`: qualquer visitante podia injetar script na sessão de alunos, mediadores e admin. | 🟡 Nenhum texto é mais interpretado como HTML, o que neutraliza o script injetado. O tradutor grava pelo SDK com texto limitado a 300 caracteres. **Falta:** publicar regras que só permitam criar cards na sessão ativa, com tamanho validado (`docs/firebase/`). |
| 2 | Alta | `innerHTML` com dados do banco em 11 pontos. | ✅ Zero usos. Elementos são montados com `h()` (`js/ui/dom.js`). |
| 3 | Alta | Autorização só no navegador; a guarda das páginas só agia se houvesse papel em cache. | 🟡 As páginas esperam o papel confirmado no banco e sempre barram quem não tem permissão. **Falta:** regras do banco por papel (proposta pronta). |
| 4 | Alta | `database.rules.json` e `firebase.json` fora do Git. | 🟡 `.gitignore` ajustado; proposta de regras e de hosting em `docs/firebase/`. **Falta:** exportar as regras atuais do console e versionar. |
| 5 | Alta | Uma credencial (`apiKey` com prefixo `AQ.`) esteve em `public/js/env.js` entre os commits `6c8f017` (21/09/2026) e `d680b33` (29/09/2026) e continua no histórico público. | ⏳ Revogar/rotacionar a chave no Google Cloud e conferir o uso no período. Apagar o arquivo não a remove do histórico. |
| 6 | Média | Cadastro aberto: como o admin cria contas pelo navegador, qualquer pessoa com a chave pública também consegue criar uma conta. | 🟡 Pela proposta de regras, conta sem perfil em `users` não lê nada. **Falta:** criar e excluir contas no backend (Admin SDK) e desligar o cadastro público. |
| 7 | Média | O backend (`/api/gemini/generate`) aceita qualquer prompt, sem autenticação. | ⏳ No backend: rota que recebe só o texto, prompt no servidor, verificação do ID token, limite por IP e CORS restrito. No cliente o prompt foi unificado. |
| 8 | Média | Injeção de prompt: o texto do usuário entra direto no prompt e a resposta vira flashcard. | 🟡 A resposta é exibida sempre como texto. **Falta:** prompt no servidor. |
| 9 | Baixa | Exclusão só lógica: a conta continua válida no Firebase Auth. | 🟡 A revogação agora é uma escrita atômica (perfil + bloqueio). **Falta:** desativar/excluir a conta com o Admin SDK. |
| 10 | Baixa | LGPD: nome e e-mail de cada participante ficam em `attendees`, legíveis por todos os alunos. | ⏳ Guardar só `attendees/{uid}: true` e restringir a leitura (ver `ARQUITETURA.md`). |

## Bugs

| Bug | Situação |
| --- | --- |
| Texto com aspas cortado ao editar e salvar perguntas e flashcards (perda de dados) | ✅ |
| Cabeçalho deslocado depois de encerrar a sessão | ✅ |
| `toggleDropdown`: validação que nunca disparava e posições `left`/`top` erradas | ✅ |
| `notifications.js` inexistente carregado em 6 páginas (404) | ✅ |
| `initAuthGuard()` duas vezes na home (logout em dobro, leituras dobradas) | ✅ |
| Remover presença deixava `user_sessions` para trás | ✅ |
| `current_session` dependia do `beforeunload` | ✅ `onDisconnect` + republicação ao reconectar. O nó continua único (limitação de modelo de dados). |
| Campo Sobrenome aninhado dentro de Nome | ✅ |
| `<footer>` fora do `<body>` | ✅ |
| Borda invisível nos campos do tradutor | ✅ |
| Excluir flashcard falhava em silêncio | ✅ |
| Rótulos que mudavam sozinhos e "Participante"/"Aluno" | ✅ |

## Redundância e código sem uso

| Antes | Agora |
| --- | --- |
| Cabeçalho + menu copiados em 6 páginas (318 linhas) | `js/ui/app-shell.js` |
| Configuração do Firebase em 3 lugares | `js/config/firebase.config.js` |
| Cliente do tradutor e prompt duplicados (e divergentes) | `services/translate.service.js` + `domain/translation.js` |
| 3 modais de exclusão + modal de encerrar | `ui/confirm-dialog.js` |
| Guarda de papel copiada em 4 páginas; chave do cache escrita em 7 lugares | `pages/shared/page-setup.js`; `core/session-cache.js` |
| Nome de exibição calculado 6 vezes; rótulos de papel em 3 lugares | `domain/users.js`; `core/roles.js` |
| 11 de 12 exports de `app.js` sem uso; listeners para ids inexistentes | removidos |
| ≈830 linhas de CSS morto (115 regras) e 7 regras duplicadas | removidas |
| 60 atributos `style=` no HTML e estilos montados em strings no JS | zero; classes em `css/overrides/` |
| 210 KB de arquivos sem referência | removidos |

Em linhas de código efetivo (sem comentários e linhas em branco), o JavaScript caiu de 2.225 para 2.119 e o CSS de 2.972 para 2.561, já incluindo o código que estava dentro do `circle-translator.html`. O código ganhou funções novas no caminho (diálogo acessível, `onDisconnect`, tratamento de erros) e JSDoc nas funções públicas.

## Pendências de desempenho e qualidade

- A tela de flashcards ainda baixa todas as sessões e todos os cards (comportamento herdado). Caminho em `ARQUITETURA.md`, "Limitações conhecidas", item 2.
- SDK do Firebase fixado na 10.8.0 (01/02/2024); a versão mais recente é a 13.3.0 (11/11/2026). A troca agora é feita em um só lugar (`js/core/`), mas pede teste completo.
- Font Awesome inteiro é baixado para 34 ícones.

## Como a reorganização foi verificada

| Verificação | Resultado |
| --- | --- |
| 79 checagens funcionais de ponta a ponta (login, papéis, temas, sessão ao vivo, tradutor público, revisão espaçada, sessões, acessos, teclado), com Firebase e backend simulados | versão nova 79/79; versão original 62/79 — as 17 falhas são exatamente os defeitos desta lista |
| 52 capturas de tela (26 cenários × desktop e celular) comparadas pixel a pixel com a versão original | 37 idênticas; as 15 restantes diferem só onde houve correção |
| Lógica de revisão espaçada e de busca/ordenação de usuários comparada com a original em entradas aleatórias | 20.000/20.000 e 6.000/6.000 resultados iguais |
| Testes unitários (`npm test`) | 16/16 |
| Regra de camadas (nenhum import "para cima"; só `core/` importa o CDN) | sem violações |

Limite: os testes usam um Firebase simulado. As regras reais do banco e o backend não puderam ser exercitados; por isso o checklist de `MIGRACAO.md` deve ser feito num ambiente de testes antes do deploy.
