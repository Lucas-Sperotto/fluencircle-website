# Migração para a arquitetura modular

Este documento registra de onde veio cada parte do código, o que foi removido e o que mudou de comportamento. Base: commit `dd8a9d8` (21/10/2026).

## Como aplicar

```bash
git checkout -b reorganizacao-arquitetura
git apply --index fluencircle-reorganizacao.diff   # ou copie o conteúdo do .zip por cima
npm test
npm run serve                                      # teste local em http://localhost:5501
```

Depois de aplicar, o arquivo local `public/js/firebase.js` (que ficava fora do Git) **não é mais usado** e pode ser apagado: a configuração está em `public/js/config/firebase.config.js`.

## De onde veio cada arquivo

| Antes | Agora |
| --- | --- |
| `js/firebase.js` (fora do Git) | `js/config/firebase.config.js` + `js/core/firebase.js` + `js/core/firebase-auth.js` |
| `js/auth.js` | `js/services/auth.service.js` (login e papel), `js/ui/app-shell.js` (badge e menu por papel), `js/pages/shared/page-setup.js` (guarda das páginas), `js/ui/toast.js` |
| `js/auth-page.js` | `js/pages/login.page.js` |
| `js/script.js` | `js/pages/home.page.js` (os atalhos viraram links no HTML) |
| `js/menu.js` | `js/ui/app-shell.js` + CSS (`:hover` e `:focus-within`) |
| `js/app.js` | `js/ui/dropdown.js` (`toggleDropdown` corrigido); o resto não era usado |
| `js/gemini.js` | `js/services/translate.service.js` + `js/domain/translation.js` |
| `js/cards.js` | `js/pages/flashcards.page.js`, `js/ui/card-stack.js`, `js/domain/srs.js`, `js/services/reviews.service.js` |
| `js/set-meeting.js` | `js/pages/themes.page.js` + `js/services/themes.service.js` |
| `js/manage-meetings.js` | `js/pages/sessions.page.js` + `js/services/sessions.service.js` + `js/services/flashcards.service.js` |
| `js/presentation.js` | `js/pages/presentation/` (`presentation.page.js`, `theme-picker.js`, `slides.js`, `attendance.js`, `translator-modal.js`) |
| `js/admin.js` | `js/pages/admin.page.js` + `js/services/users.service.js` |
| script dentro de `circle-translator.html` | `js/pages/circle-translator.page.js` |
| `<style>` dentro de `circle-translator.html` | `css/pages/circle-translator.css` |
| `css/style.css` (3.505 linhas) | `css/main.css` + 19 arquivos em `base/`, `layout/`, `components/`, `pages/`, `responsive/`, `overrides/` |
| cabeçalho e menu copiados em 6 HTML | `js/ui/app-shell.js` |
| 3 modais de exclusão + modal de encerrar sessão | `js/ui/confirm-dialog.js` |

## O que foi removido

- `js/notifications.js` era carregado por 6 páginas, mas o arquivo não existia (erro 404 em toda navegação).
- 11 dos 12 exports de `app.js`, os listeners de `script.js` para ids inexistentes, `window.backToHome`, `getUserRole()`, imports e variáveis sem uso.
- 115 regras CSS sem uso (cerca de 830 linhas), quase todas da página de Planos removida em `dd8a9d8`, e 7 regras duplicadas.
- `assets/auth-image.png` (200 KB) e os dois PDFs `money__consumerism…`, sem referência.
- Elementos sem estilo nem função: `.ball` na tela de login, `.card-shadow` nos flashcards, bloco `.alert` em `set-meeting.html`.

## Mudanças de comportamento (intencionais)

**Correções**

1. Perguntas e flashcards com aspas (`"`) não são mais cortados ao editar e salvar.
2. Ao encerrar uma sessão, o cabeçalho volta à posição certa.
3. `current_session` é apagado pelo servidor (`onDisconnect`) se a aba do mediador fechar ou a conexão cair, e republicado ao reconectar. Antes dependia do `beforeunload`, que falha com frequência.
4. Remover a presença de um aluno, ou excluir uma sessão, também limpa o índice `user_sessions`.
5. "Sair" na home não dispara mais o logout duas vezes.
6. No cadastro de contas, "Sobrenome" deixou de ficar aninhado dentro de "Nome".
7. A borda dos campos do tradutor público aparece (antes `border: var(--border-color)` não desenhava nada).
8. Botões não trocam mais de texto sozinhos depois de salvar ("Salvar" → "Salvar Tema"; "Salvar Flashcard" → "Adicionar ao Flash Card").
9. Ao concluir de novo um deck já revisado, o aviso mostra o prazo real do próximo marco (antes: "Próximo marco em Pronto para revisar!").
10. Falhas ao excluir um flashcard ou salvar o progresso agora geram aviso, em vez de silêncio.

**Segurança**

11. Nenhum texto vindo do banco ou do usuário é interpretado como HTML (nomes, temas, perguntas, flashcards, respostas do Gemini).
12. As páginas restritas esperam o papel ser confirmado no banco antes de carregar dados e sempre barram quem não tem permissão. Antes, sem papel em cache, um aluno que abrisse `admin.html` direto via a lista de usuários.
13. O tradutor público grava pelo SDK do Firebase (mesmas permissões de antes), limita o texto a 300 caracteres e usa a configuração central.

**Interface e textos**

14. Um único diálogo de confirmação para excluir e encerrar; fecha com Esc, "Cancelar" ou clique fora, e o foco começa em "Cancelar".
15. O papel `student` aparece como "Aluno" em todo lugar (antes, "Participante" no formulário de contas).
16. O logo leva à home em todas as páginas internas (antes, só nos flashcards).
17. Texto corrigido em Temas: "utilizados nas sessões".
18. Prompt de tradução unificado: o tradutor público ganhou a regra 7 e a palavra repetida ("bidirecional bidirecional") saiu.
19. "Salvar Flashcard" sem tradução aparece esmaecido; título de tema vazio fica com borda vermelha por 2 s.

**Acessibilidade**

20. Botões de voltar, tradutor e participantes viraram `<button>`; cards de decks, temas e sessões funcionam com Tab e Enter; a barra lateral expande com o teclado; ícones ganharam `aria-label`; o login aceita gerenciadores de senha (`autocomplete`); o tradutor declara `lang="pt-BR"`.

**Repositório**

21. `.gitignore`: `database.rules.json` e `firebase.json` deixaram de ser ignorados (as regras precisam ser versionadas); `public/js/firebase.js` saiu da lista porque não existe mais.
22. Classes renomeadas: `non-avaiable-message` → `not-available-message`; `hideOnMobile` → `hide-on-mobile`.

## Checklist de verificação antes do deploy

- [ ] `npm test` passa.
- [ ] Login com aluno, mediador e admin; cada um vê só os atalhos do seu papel.
- [ ] Mediador: criar tema com aspas na pergunta, iniciar sessão, marcar presença, traduzir e salvar flashcard, encerrar.
- [ ] Tradutor público em outra aba mostra "Sessão ativa" e salva a tradução na sessão.
- [ ] Aluno: estudar um deck pendente e conferir o avanço da etapa.
- [ ] Admin: criar, editar e excluir uma conta de teste.
- [ ] Celular: menu inferior, login e flashcards.
