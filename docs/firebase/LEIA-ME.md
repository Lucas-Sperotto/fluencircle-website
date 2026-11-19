# Firebase: regras do banco e configuração do hosting

Dois arquivos de **proposta** — nada aqui é aplicado automaticamente:

- `database.rules.proposta.json` — **rascunho NÃO APTO A DEPLOY**: não concede mais escrita anônima direta em flashcards. O tradutor público ainda usa o SDK para salvar e receberá erro se estas regras forem aplicadas sem um backend seguro. Outras permissões amplas ainda exigem revisão.
- `firebase.json.exemplo` — hosting com cabeçalhos de segurança e cache.

## Antes de tudo: versionar o que está em produção

As regras atuais estão só no console do Firebase. Exporte-as e coloque no Git **antes** de mudar qualquer coisa, para ter um ponto de volta:

1. Console do Firebase → Realtime Database → Regras: copie o conteúdo para `database.rules.json` na raiz do repositório.
2. Faça o mesmo com o `firebase.json` local usado no deploy.
3. Commit: `git add database.rules.json firebase.json && git commit -m "Versiona regras e hosting atuais"`.

## Modelo de acessos pretendido (NÃO TESTADO)

Este arquivo é **rascunho para auditoria**, não representa regras ativas de produção. Continua contendo leituras amplas e validações incompletas. **Não há garantia de compatibilidade com a UI atual**, especialmente no salvamento público de flashcards:

| Nó | Leitura | Escrita |
| --- | --- | --- |
| `users` | o próprio perfil; a lista toda só mediador e admin | só admin; papel validado (`student`, `mediator`, `admin`) |
| `deleted_users` | o próprio uid | só admin |
| `meetings` (temas) | mediador e admin | mediador e admin |
| `meeting_sessions` | quem tem perfil em `users` | mediador e admin |
| `current_session` | público (o tradutor precisa) | mediador e admin |
| `flashcards` | quem tem perfil em `users` | mediador e admin; **visitante não cria** card diretamente no RTDB nesta proposta de contenção |
| `student_reviews/{uid}` | o próprio aluno | o próprio aluno |
| `user_sessions/{uid}` | o próprio aluno, mediador e admin | mediador e admin |

O papel é lido de `users/{uid}/role`. Contas criadas fora do painel (sem perfil em `users`) e contas excluídas (sem perfil) ficam sem acesso aos dados.

**Limite desta etapa:** para o site atual funcionar, qualquer usuário com perfil ainda lê todas as sessões e todos os flashcards. Restringir isso exige a mudança de leitura descrita no item 2 de "Limitações conhecidas" em `docs/ARQUITETURA.md`.

## Testar antes de publicar

1. Instale o Emulator Suite: `firebase init emulators` (Realtime Database).
2. Copie a proposta para `database.rules.json` e rode `firebase emulators:start --only database,hosting`.
3. Aponte `public/js/config/firebase.config.js` para o emulador num ramo de testes, ou use o Simulador de Regras do console com um usuário de cada papel.
4. Percorra o checklist de `docs/MIGRACAO.md` com cada papel e com o tradutor sem login.

## Publicação BLOQUEADA

**NÃO copie este rascunho para `database.rules.json` nem execute `firebase deploy`.** Primeiro exporte as regras ativas, modele a persistência pública via backend autorizado, restrinja leitura por presença, valide esquemas e execute a matriz de negações no Firebase Emulator. É indispensável um plano de migração do tradutor, pois a proposta bloqueia a escrita anônima direta.

Consulte `docs/operacao/SEGURANCA_E_DEPLOY.md` e Issues #5, #7, #8, #9, #10, #15. **Merge deste arquivo não libera publicação.**

A CSP de exemplo inclui tanto `*.firebaseio.com` quanto `*.firebasedatabase.app` (HTTPS/WSS), mas precisa de testes na origem real e preview de Hosting antes de qualquer ativação.

## Cabeçalhos do hosting (`firebase.json.exemplo`)

Adiciona `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` e cache para JS, CSS e imagens. A CSP libera só as origens que o site usa (gstatic, Google Fonts, cdnjs, Firebase e o backend no Render) e bloqueia scripts inline — o código novo não usa nenhum.

Teste num canal de pré-visualização antes de publicar, porque uma CSP restritiva demais quebra o site sem aviso:

```bash
firebase hosting:channel:deploy teste-csp
```

Abra o endereço gerado, use o site com o console do navegador aberto e procure erros de "Content Security Policy".

## Fora do código (console e backend)

- Revogar a credencial que ficou no histórico do Git (ver `docs/AUDITORIA.md`).
- Restringir a API key do Firebase aos domínios do site (Google Cloud Console → Credenciais).
- Ativar o App Check para o Realtime Database.
- No backend: verificar o ID token do Firebase, montar o prompt no servidor e limitar requisições por IP.
