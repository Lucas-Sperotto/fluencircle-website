# Auditoria técnica original — transcrição pesquisável

> **Documento-fonte:** `Auditoria técnica do fluencircle-website(1).pdf`, fornecido pelo responsável no contexto da reorganização de Claude em 18/11/2026.
>
> **SHA-256 do PDF original:** `0c38e30bf08870e694c69beb0dc381fbdc7907b8b3e44b43a9e1494c362abc2f`.
>
> **Formato e limites:** transcrição automática do texto das **15 páginas**. As tabelas podem perder alinhamento e os diagramas/gráficos não são reproduzidos aqui. **Não é o próprio arquivo PDF**: a cópia binária original deve ser anexada separadamente ao repositório para arquivo fiel. Não se deve tratar esta transcrição como auditoria pós-refatoração; o escopo do relatório original é a base `dd8a9d8` antes da modularização.
>
> **Responsabilidade:** o conteúdo e as conclusões do relatório são da etapa de auditoria original fornecida pelo responsável; a extração e o registro desta transcrição foram feitos com assistência ChatGPT. Nenhuma afirmação do relatório foi automaticamente aceita como teste independente.



---

## Página 1 de 15

```text
Auditoria técnica do fluencircle-website




Auditoria técnica do fluencircle-website
  ​Nov 18, 2026        ·   ​@Lucas Kriesel Sperotto




Resumo
O site funciona, mas a segurança depende de regras do Firebase que não estão no
repositório, e uma página pública grava no banco sem login. Recomendo uma fase curta de
contenção e, em seguida, a arquitetura B (Vite + JavaScript modular em camadas).

O projeto é uma aplicação de várias páginas (8 HTML, cerca de 7,7 mil linhas) no Firebase
Hosting. Usa Firebase Auth, Realtime Database e um backend no Render que repassa
pedidos ao Gemini.

Riscos mais graves

       Escrita anônima + XSS: circle-translator.html grava flashcards via REST sem
       autenticação, e as telas internas exibem esses dados com innerHTML . Qualquer
       pessoa pode injetar um script que roda na sessão de alunos, mediadores e
       administradores.
       Autorização só no navegador: papéis apenas escondem menus. Cada aluno baixa
       todas as sessões, com nomes e e-mails dos participantes, e todos os flashcards.
       Regras fora do Git: database.rules.json e firebase.json estão no .gitignore ,
       então não há como revisar nem testar quem pode ler ou gravar o quê.
       Credencial no histórico público: uma apiKey ficou em public/js/env.js entre os
       commits 6c8f017 e d680b33 . Apagar o arquivo não a remove do histórico.
       Proxy do Gemini aberto: /api/gemini/generate aceita qualquer prompt, sem token.

Dívida de código em números

       Cerca de 24% do CSS é código morto (≈830 de 3.505 linhas), quase todo da página de
       Planos removida.
       11 dos 12 exports de app.js nunca são usados.
       Cabeçalho e barra lateral estão copiados em 6 páginas (318 linhas); a configuração do
       Firebase, em 3 lugares.


Escopo e limites
       Versão analisada: branch main , commit dd8a9d8 de 21/10/2026, com 30 arquivos: 8
       HTML (1.388 linhas), 1 CSS (3.505), 11 JS (2.794) e 6 imagens/PDFs.




                                                                                      Page 1 of 15
```


---

## Página 2 de 15

```text
Auditoria técnica do fluencircle-website




       Como: leitura integral de todos os arquivos, revisão dos 26 commits e scripts de
       análise estática para CSS sem uso, seletores repetidos, referências quebradas e
        innerHTML com dados.
       Limites: firebase.js , firebase.json e database.rules.json não estão no Git,
       então as permissões foram inferidas do código. O backend do Render não está no
       repositório. Nada foi executado contra o banco de produção.


Arquitetura atual
Cada página HTML carrega seus próprios módulos ES, que falam direto com o Firebase
pelo SDK 10.8.0 via CDN. Não há camada de serviços, build, testes nem documentação.




arquitetura atual · 7 páginas logadas, 1 pública, Firebase e backend

As setas vermelhas são chamadas sem autenticação: o tradutor público lê e grava no
banco, e as duas origens chamam o backend sem token.

Páginas


   Página                                  Script           Quem usa   O que faz

    auth.html                              auth-page.js     todos      login

    index.html                             script.js        todos      home com atalhos por
                                                                       papel




                                                                                              Page 2 of 15
```


---

## Página 3 de 15

```text
Auditoria técnica do fluencircle-website




   Página                                     Script                   Quem usa          O que faz

    flash-cards.html                           cards.js                todos             revisão espaçada em 1, 7 e
                                                                                         30 dias

    presentation.html                          presentation.js         mediador,         conduz a sessão: slides,
                                                                       admin             presença, tradutor e
                                                                                         flashcards

    set-meeting.html                           set-meeting.js          mediador,         cadastro de temas e
                                                                       admin             perguntas

    manage-                                    manage-                 mediador,         histórico de sessões e
   meetings.html                              meetings.js              admin             edição de flashcards

    admin.html                                 admin.js                admin             contas e papéis

    circle-                                   script inline            público, sem      tradutor que salva
   translator.html                                                     login             flashcards na sessão ativa


Compartilhados: auth.js (login, guarda e papéis), menu.js (barra lateral), app.js
(dropdown) e gemini.js (chamada ao backend).

Modelo de dados inferido do código

   users/{uid}                                                firstName, lastName, email, role
   deleted_users/{uid}                                        deletedAt, deletedBy        (bloqueio)
   meetings/{temaId}                                          topic, questions[]          ("Temas")
   meeting_sessions/{sessaoId}                                templateId, topic, startedAt,
                                                              mediatorEmail,
                                                              attendees/{uid}: {name, email}
   current_session                                            sessionId, topic            (nó único)
   flashcards/{sessaoId}/{cardId}                             front, back, topic, createdAt
   student_reviews/{uid}/{sessaoId}                           stage, stageNCompletedAt
   user_sessions/{uid}/{sessaoId}                             true (gravado, nunca lido)


Acessos de que o código precisa para funcionar


   Nó                                      Leitura                                       Escrita

    users                                  o próprio: todos · a lista: mediador, admin   admin

    meetings                               mediador, admin                               mediador, admin

    meeting_sessions                       todos, o nó inteiro                           mediador, admin

    flashcards                             todos, o nó inteiro                           mediador, admin, anônimo




                                                                                                               Page 3 of 15
```


---

## Página 4 de 15

```text
Auditoria técnica do fluencircle-website




   Nó                                      Leitura                                        Escrita

    current_session                        anônimo                                        mediador

    student_reviews                        o próprio aluno                                o próprio aluno

    deleted_users                          o próprio uid                                  admin

    user_sessions                          ninguém                                        mediador


As linhas em negrito são as que expõem dados: se as regras permitem o que o código faz,
qualquer aluno lê as sessões e os flashcards de todos, e qualquer visitante grava
flashcards.


Segurança
O problema central é que o navegador é a única barreira: as telas escondem o que o papel
não permite, mas o banco precisa aceitar leituras e gravações amplas para o código
funcionar. São 10 achados, 1 crítico e 4 altos.


   Severidade            Achado                                    Onde                      Correção

   Crítica               Página pública grava flashcards por       circle-                   Gravar pelo backend
                         REST sem login; as regras precisam        translator.html           (Admin SDK) com
                         aceitar escrita anônima, e o texto vira   L237–243; exibido em      validação e limite de taxa,
                         HTML nas telas internas. Resultado:       cards.js L325 e           ou Anonymous Auth +
                         XSS armazenado ao alcance de              manage-meetings.js        App Check + .validate ;
                         qualquer visitante                        L227                      escapar toda saída

   Alta                   innerHTML com dados do banco em          admin.js L157 ·            textContent ou helper
                         11 pontos: nomes, temas, perguntas,       presentation.js           de template com escape;
                         flashcards e resposta do Gemini           L194, L277, L374–376 ·    regra de lint contra
                                                                   set-meeting.js L87,        innerHTML interpolado
                                                                   L189 · cards.js L244,
                                                                   L325 · manage-
                                                                   meetings.js L107,
                                                                   L227

   Alta                  Autorização no cliente: as guardas só     admin.js L63–69 e 3       Regras por papel; o aluno
                         redirecionam se já houver papel em        cópias; cards.js          lê só
                         cache, e o aluno filtra no navegador      L147–188                   user_sessions/{uid} e
                         as sessões que baixou inteiras                                      as sessões dele

   Alta                  Regras do banco e configuração do         .gitignore L9–15          Versionar
                         hosting fora do Git                                                  database.rules.json e
                                                                                              firebase.json ; testar as
                                                                                             regras no Emulator




                                                                                                                  Page 4 of 15
```


---

## Página 5 de 15

```text
Auditoria técnica do fluencircle-website




   Severidade            Achado                                        Onde                    Correção

   Alta                  Credencial ( apiKey com prefixo               commits 6c8f017         Revogar, gerar outra e
                         AQ. ) em public/js/env.js no                  (21/09) a d680b33       conferir o uso no período
                         histórico público                             (29/09)

   Média                 Cadastro aberto: o admin cria contas           admin.js L20–32,       Criar, desativar e excluir
                         com                                           L284                    contas no backend; papéis
                          createUserWithEmailAndPassword                                       como custom claims;
                         no navegador, então qualquer pessoa                                   desligar o cadastro
                         com a chave pública também                                            público
                         consegue. O app desloga quem não
                         está em users , mas só no navegador

   Média                 Proxy do Gemini sem autenticação               gemini.js L4–10;       Rota /api/translate
                         aceita qualquer prompt, consumindo             circle-                com prompt fixo no
                         a cota do projeto                             translator.html         servidor, limite de
                                                                       L189–201                tamanho, rate limit, CORS
                                                                                               restrito e ID token

   Média                 Injeção de prompt: o texto do usuário          presentation.js        Prompt no servidor com
                         entra cru no prompt e a resposta vira         L590–613                delimitadores; escapar a
                         flashcard                                                             saída

   Baixa                 Exclusão só lógica: a conta segue              admin.js L343–349;     disabled: true ou
                         válida no Auth e o bloqueio é checado          auth.js L61            deleteUser via Admin
                         no navegador                                                          SDK, mais regra que
                                                                                               negue acesso

   Baixa                 Dados pessoais (LGPD): o e-mail de             presentation.js        Guardar só
                         cada participante chega a todos os            L223–228                attendees/{uid}: true ;
                         alunos via attendees                                                  nome e e-mail ficam em
                                                                                               users



A configuração web do Firebase (a chave AIza… ) não é segredo e já está em admin.js e
no tradutor; tirá-la do Git não protege nada. O que protege são as regras, o App Check e a
restrição da chave por domínio no Google Cloud.


Bugs
São 12 defeitos verificados no código; o mais grave perde dados: perguntas e flashcards
com aspas são gravados cortados.


   Onde                                    Problema                               Correção

    set-meeting.js                         Texto com aspas quebra o               Criar o input e atribuir
   L191 · manage-                           value="${…}" . O campo mostra          input.value = texto
   meetings.js                             só o início e, ao salvar, a pergunta
   L230–231                                ou o card é gravado truncado




                                                                                                                   Page 5 of 15
```


---

## Página 6 de 15

```text
Auditoria técnica do fluencircle-website




   Onde                                    Problema                            Correção

    presentation.js                        header.style.left = 'var(--         header.style.left = ''
   L554                                    sidebar-collapsed-width);' : o
                                           ; na string invalida o valor e o
                                           cabeçalho fica deslocado após
                                           encerrar a sessão

    app.js L56–57,                         !reference instanceof               !(x instanceof HTMLElement) ;
   L80–97                                  HTMLElement nunca é verdadeiro      calcular a partir de
                                           (precedência); as posições left     window.innerWidth/innerHeight
                                           e top são calculadas errado

   6 páginas                               Carregam                            Remover a tag
                                           js/notifications.js , que não
                                           existe: um erro 404 a cada
                                           navegação

    script.js L5–6                         Na home, initAuthGuard() roda       Chamar só uma vez, no módulo de
   + auth.js L241                          duas vezes: leituras dobradas e     inicialização
                                           logout() disparado duas vezes
                                           por clique

    presentation.js                        Remover a presença não apaga        Um update() multi-caminho nos
   L245–257                                user_sessions/{uid}/{sessão}        dois nós

    presentation.js                        current_session é único: dois       Sessão ativa por código +
   L431, L532, L561                        mediadores ao mesmo tempo se        onDisconnect().remove()
                                           sobrescrevem, e a escrita
                                           assíncrona no beforeunload
                                           costuma não completar

    admin.html                             Campo Sobrenome aninhado            Restaurar o wrapper
   L132–140                                dentro do bloco Nome: o wrapper
                                           .form-row sumiu, mas o CSS
                                           dele ficou

    auth.html L75–                         <footer> depois de </body>          Mover para dentro do body
   122                                     (HTML inválido)

    circle-                                border: var(--border-color)         border: 1px solid var(--
   translator.html                         só define a cor: nenhuma borda      border-color)
   L22                                     aparece, nem no foco

    manage-                                Excluir um card não trata erro: a   try/catch com aviso
   meetings.js                             falha é silenciosa
   L281–285




                                                                                                           Page 6 of 15
```


---

## Página 7 de 15

```text
Auditoria técnica do fluencircle-website




   Onde                                    Problema                             Correção

   vários                                  Rótulos inconsistentes: "Salvar"     Constantes de texto únicas
                                           vira "Salvar Tema" após salvar;
                                           "Salvar Flashcard" vira "Adicionar
                                           ao Flash Card"; student é
                                           "Participante" no admin e "Aluno"
                                           no resto




Redundâncias
A mesma lógica aparece em até 7 lugares, e as cópias já começaram a divergir: o prompt
de tradução e o menu lateral têm versões diferentes entre páginas.


   Duplicação                                         Ocorrências                Como unificar

   Cabeçalho + barra lateral (53                      6 páginas, 318 linhas      Um único layout: partial no build
   linhas), com divergências de                                                  ou renderAppShell()
    data-page e hidden

    <head> (fontes, ícones,                           8 e 7 páginas              Partial de <head> e componente
   favicon, CSS) e loader                                                        de loader
    .loading-gif

   Configuração do Firebase                           firebase.js ,              config/firebase.config.js
                                                      admin.js L20–28,           lendo variáveis de ambiente
                                                      circle-
                                                      translator.html
                                                      L155–163

    askGemini e o prompt de                           gemini.js +                translate.service.js
   tradução; só um tem a regra 7                      presentation.js            chamando /api/translate ,
   e ambos repetem                                    L590–613; circle-          com o prompt no backend
   "bidirecional bidirecional"                        translator.html
                                                      L189–226

   Guarda de papel e a chave                          4 guardas; a chave         requireRole(['mediator',
    'fluentech_user_role'                             escrita em 7 lugares       'admin']) e constantes

   Modal de confirmação de                            admin.js , set-            Um confirmDialog() ; o
   exclusão                                           meeting.js , manage-       requestDelete de manage-
                                                      meetings.js                meetings.js já é quase isso




                                                                                                               Page 7 of 15
```


---

## Página 8 de 15

```text
Auditoria técnica do fluencircle-website




   Duplicação                              Ocorrências               Como unificar

   Nome de exibição (nome +                6 cálculos em             displayName(user) e
   sobrenome, senão e-mail) e              admin.js e                filterAndSortUsers()
   busca/ordenação de usuários             presentation.js

   Rótulos de papel, com textos            auth.js , admin.js ,      ROLE_LABELS único
   diferentes                              admin.html

   Normalização de questions               set-meeting.js L132–      toQuestionList()
   (array ou objeto)                       137; presentation.js
                                           L112–118

    formatDate em duas                     cards.js L280;            dates.js com as duas opções
   versões                                 manage-meetings.js
                                           L52

   Posicionamento da pilha de              3 cópias em cards.js      applyStackPosition(card,
   cards                                   (L340, L411, L518)        pos)

    calculateSRSStatus com                 cards.js L77–127          Tabela de estágios: espera e
   três ramos quase iguais                                           marco de partida de cada um

   Recolher a barra lateral por            menu.js L41–72            Só CSS: .sidebar:hover,
    mouseenter/leave e                                               .sidebar:focus-within
   também por mousemove

   CSS redefinido                          18 seletores repetidos;   Um bloco por componente
                                           bloco mobile do login
                                           duplicado (L2562 e
                                           L2612)

    <script                                7 páginas                 Remover: os módulos já o
   src="js/firebase.js">                                             importam
   explícito




Código e recursos sem uso
Dá para apagar cerca de 900 linhas e 210 KB de arquivos sem mudar nenhum
comportamento.

       JavaScript
                app.js : 11 dos 12 exports nunca são importados. Só toggleDropdown é usado;
                returnArrayFromDatabase usa a API v8 ( .once() ) e nem funcionaria com o SDK
               v10.




                                                                                                Page 8 of 15
```


---

## Página 9 de 15

```text
Auditoria técnica do fluencircle-website




                script.js : listeners para #open-set-meeting-button , #open-slide-show-
               button e #open-flash-cards-button , ids que não existem; window.backToHome
               nunca é chamado.
                auth.js : getUserRole() sem chamadas; import set sem uso.
                cards.js : import set , referência a #play-cards-btn (inexistente) e parâmetro
                totalCards ignorado.

                presentation.js : slideShowPage (mesmo elemento de slideshowMain ),
                #present-counter inexistente, parâmetro language ignorado e teste typeof
               toggleDropdown sempre verdadeiro.
       HTML: <script src="js/notifications.js"> em 6 páginas; bloco .alert em set-
       meeting.html ; atributo data-file e seu handler em menu.js , que repetem o <a
       href> .
       CSS: 103 regras mortas, cerca de 830 linhas. A maior parte é da página de Planos
       removida no último commit ( plans-* , plan-* , week-* , session-* , schedule-* ,
        tab-* , custom-modal , modal-card ). Fora dela: .srs-progress-* , .action-btn ,
        .edit-theme-btn , .delete-meeting-btn , .showOnMobile , #translation-options ,
        .brand-name , .company-badge .
       Classes sem CSS: unactive , danger-input , alert , ball , ball1 – ball3 e card-
       shadow são aplicadas, mas não mudam nada na tela. O botão "Salvar Flashcard", por
       exemplo, não parece desabilitado.
       Arquivos: assets/auth-image.png (200 KB, o maior do repositório) e os dois PDFs
        money__consumerism… , de conteúdos diferentes, sem nenhuma referência.
       Dados: user_sessions/{uid} é gravado e nunca lido. É justamente o índice que
       resolveria o desempenho e a privacidade da tela de flashcards.
       Repositório: .vscode/settings.json (porta do Live Server) é configuração pessoal;
       a entrada public/.firebaserc do .gitignore aponta para um arquivo que não
       existe.



Qualidade, desempenho e acessibilidade
O maior custo de desempenho é a tela de flashcards, que baixa o histórico inteiro da
plataforma a cada visita; o resto são ajustes pontuais.

Desempenho

        cards.js baixa meeting_sessions e flashcards inteiros ao abrir a tela e de novo
       ao voltar da revisão. O custo cresce com todas as sessões já feitas, não com as do
       aluno.
        manage-meetings.js baixa todos os flashcards só para contar quantos há por sessão.




                                                                                        Page 9 of 15
```


---

## Página 10 de 15

```text
Auditoria técnica do fluencircle-website




       Cada página relê o perfil ( deleted_users + users ); a home faz isso duas vezes.
        menu.js escreve no console a cada movimento do mouse (L57 e L65).

        progressBar.innerHTML += dentro do laço recria a barra a cada card ( cards.js
       L338).
       O SDK do Firebase está fixado na 10.8.0, de 01/02/2024, carregado inteiro por CDN; a
       versão atual é a 13.3.0, de 11/11/2026 (notas de versão). O Font Awesome completo é
       baixado para 34 ícones.

Qualidade do código

       CSS num arquivo só, de 3.505 linhas, com 185 !important ; 175 deles estão no bloco
       mobile, que sobrescreve o desktop em vez de ser pensado junto.
       60 atributos style no HTML, muitos estilos aplicados via JS e 34 cores hexadecimais
       fixas, embora existam variáveis em :root .
       Sem package.json , linter, formatador, testes, CI ou README; indentação
       inconsistente ( admin.js inteiro deslocado).
       Nomes desalinhados com o domínio: meetings guarda Temas e meeting_sessions
       guarda Sessões; o id do <html> identifica a página; há erros como non-avaiable-
       message .
       Comentários desatualizados: auth.js L52–55 diz que o primeiro acesso vira aluno,
       mas o código desloga; outros descrevem o que foi removido, não o porquê do código.
       Erro de sintaxe no CSS: color: var(--third-color); / (L95).

Acessibilidade

       7 elementos clicáveis são <div> sem role nem tabindex (voltar, tradutor,
       participantes, seletor de aluno): não funcionam pelo teclado.
       Os botões da home navegam por JS; links ( <a> ) dariam nova aba e leitura correta por
       leitores de tela.
        autocomplete="off" no login atrapalha gerenciadores de senha; os valores certos
       são email e current-password .
        user-select: none no body impede copiar textos, como uma tradução.

        circle-translator.html declara lang="en" com conteúdo em português.
       Botões só com ícone usam title ; leitores de tela precisam de aria-label .



Propostas de arquitetura
Recomendo a B: mantém HTML, CSS e JavaScript puros, que o projeto já usa, e resolve
duplicação, configuração e testes com uma camada fina de ferramentas. A A serve se não
quiserem nenhum build; a C só compensa se o produto for crescer muito.



                                                                                      Page 10 of 15
```


---

## Página 11 de 15

```text
Auditoria técnica do fluencircle-website




arquitetura B · 5 camadas internas, 3 serviços externos

Cada seta é um import permitido. Domínio não depende de nada, e só Serviços sai da
aplicação, para o Firebase e para o backend.


                                   A · Modular sem build   B · Vite + módulos       C · SPA com
                                                           (recomendada)            framework

   Build                           nenhum                  Vite multipágina         Vite + Vue ou
                                                                                    React

   Layout                          desenhado por JS        partials no build        componentes
   repetido                        ( renderAppShell )

   Configuração                     config.js único        .env +                   .env
                                                           import.meta.env

   SDK do                          CDN, import num só      npm, só o que for        npm
   Firebase                        arquivo                 usado

   Escape de                       helper manual           helper + regra de lint   automático nos
   HTML                                                                             templates

   Testes e lint                   opcionais               ESLint, Vitest,          idem + testes de
                                                           Emulator, CI             componentes



                                                                                                  Page 11 of 15
```


---

## Página 12 de 15

```text
Auditoria técnica do fluencircle-website




                                   A · Modular sem build      B · Vite + módulos     C · SPA com
                                                              (recomendada)          framework

   Esforço                         baixo                      médio                  alto (reescrita das
                                                                                     8 telas)

   Risco de                        baixo                      baixo a médio          alto
   regressão


Estrutura proposta para a B

   fluencircle-website/
   ├── index.html, auth.html, flashcards.html …                       uma entrada por tela
   ├── partials/                           head · header · sidebar
   ├── src/
   │       ├── config/                     firebase.config.js (lê import.meta.env)
   │       ├── core/                       firebase · session · guards · roles
   │       ├── services/                   users · themes · sessions · flashcards
   │       │                               reviews · translate
   │       ├── domain/                     srs · names · questions · dates (funções puras)
   │       ├── ui/                         dom (escape) · toast · confirm-dialog · dropdown
   │       │                               app-shell · card-stack · loader
   │       ├── pages/                      login · home · flashcards · presentation/
   │       │                               themes · sessions · admin · circle-translator
   │       └── styles/                     tokens · base · layout · components/ · pages/
   ├── public/                             favicon e cursores (copiados sem processar)
   ├── tests/                              unit/ (domain) · rules/ (Emulator)
   ├── database.rules.json · firebase.json · .env.example
   └── README.md · docs/ARQUITETURA.md


Regra de dependência: pages usa ui , services e domain ; estes usam core , que usa
 config . domain/ não importa nada, então é testável sem navegador nem Firebase. Só
 services/ conhece os caminhos do banco: renomear um nó muda um arquivo.

A · Modular sem build. A mesma divisão, em
 public/js/{config,core,services,domain,ui,pages} e public/css/ . O layout comum
é desenhado por ui/app-shell.js , e os imports do Firebase ficam só em
 core/firebase.js , o que permite trocar a versão do SDK num lugar. O deploy continua
igual ao de hoje.

C · SPA com framework. Vue 3 ou React, com roteador que aplica guardas por papel e um
store. Pastas por funcionalidade ( features/auth , flashcards , presentation , themes ,
 sessions , admin , translator ) e shared/ . Ganha componentes e escape automático,
mas exige reescrever as 8 telas. Como services/ e domain/ da B migram sem mudança,
escolher a B agora não fecha essa porta.



                                                                                                   Page 12 of 15
```


---

## Página 13 de 15

```text
Auditoria técnica do fluencircle-website




Dados, regras e backend
Esta trilha vale para qualquer das três opções e é a que de fato protege os dados: o
navegador nunca pode ser a última barreira.

   1. Regras versionadas e testadas. Exportar as regras atuais do console para
        database.rules.json , reescrevê-las por papel e cobri-las com testes no Emulator
       Suite. Esboço, supondo papéis em custom claims:

   {
       "rules": {
           "users": {
               ".read": "auth != null && (auth.token.role === 'admin' ||
   auth.token.role === 'mediator')",
         "$uid": {
                    ".read": "auth != null && auth.uid === $uid",
                    ".write": "auth != null && auth.token.role === 'admin'"
               }
           },
           "flashcards": {
               "$sessionId": {
                 ".read": "auth != null && (auth.token.role === 'admin' ||
   auth.token.role === 'mediator' ||
   root.child('user_sessions').child(auth.uid).child($sessionId).exists())",
           ".write": "auth != null && (auth.token.role === 'admin' ||
   auth.token.role === 'mediator')",
                    "$cardId": {
             ".validate": "newData.child('front').isString() &&
   newData.child('front').val().length <= 200 &&
   newData.child('back').isString() && newData.child('back').val().length <=
   300"
                    }
               }
           }
       }
   }


   2. Backend para o que é privilegiado, com Admin SDK no serviço do Render: criar,
       desativar e excluir contas; definir papéis como custom claims; salvar os flashcards do
       tradutor público. A rota /api/translate recebe só o texto, com prompt fixo, limite de
       caracteres, rate limit e CORS restrito; exige ID token na área logada e App Check na
       página pública.
   3. Modelo de dados.
               Usar user_sessions/{uid} como índice: o aluno lê só as próprias sessões e os
               flashcards delas.



                                                                                       Page 13 of 15
```


---

## Página 14 de 15

```text
Auditoria técnica do fluencircle-website




               Gravar e apagar a presença com um único update() multi-caminho (sessão +
               índice).
               Guardar flashcardCount na sessão para listar sem baixar os cards.
               Trocar current_session por active_sessions/{codigo} com
                onDisconnect().remove() ; o tradutor público recebe o código pela URL ou por
               QR ( circle-translator.html?s=AB12 ).
               Guardar attendees/{uid}: true na sessão; nome e e-mail ficam só em users .
               Opcional: renomear meetings para themes e meeting_sessions para sessions
               numa migração única.
   4. Hosting. firebase.json com cabeçalhos de segurança (CSP, X-Content-Type-
       Options , Referrer-Policy ) e cache longo para arquivos com hash.
   5. Credenciais. Revogar a chave do histórico e restringir a API key do Firebase aos
       domínios do site no Google Cloud.


Plano de migração
Cinco fases curtas, cada uma terminando com o site no ar e funcionando. A fase 0
independe da arquitetura e não deveria esperar a decisão.

Fase 0 · Contenção

       Revogar a credencial do histórico e conferir o uso dela
       Exportar as regras do console para database.rules.json e versioná-las
       Fechar a escrita anônima em flashcards
       Trocar os 11 innerHTML com dados por textContent ou helper com escape
       Exigir token e prompt fixo no endpoint do Gemini

Fase 1 · Limpeza sem mudar comportamento

       Apagar código morto, o CSS da página de Planos e os arquivos sem uso
       Corrigir os 12 bugs listados acima
       Centralizar configuração do Firebase, chaves de sessionStorage , papéis e rótulos

Fase 2 · Camadas

        services/ como único acesso ao banco e domain/ com SRS, nomes, datas e
       perguntas
        ui/ compartilhada: layout, toast, confirmação, dropdown e pilha de cards
       Um script de entrada por página, com JSDoc nas funções públicas

Fase 3 · Ferramentas (opção B)




                                                                                       Page 14 of 15
```


---

## Página 15 de 15

```text
Auditoria técnica do fluencircle-website




       Vite multipágina, Firebase via npm e .env ; deploy da pasta dist/
       ESLint, Prettier, Vitest para domain/ , testes de regras e GitHub Actions
       CSS dividido por camada, eliminando os !important do bloco mobile

Fase 4 · Dados e backend

       Gestão de contas via Admin SDK, com custom claims
       Índice user_sessions , flashcardCount e sessão ativa por código
       README e docs/ARQUITETURA.md atualizados


Decisão pendente
Para começar a reorganização (fases 1 a 3 no código, com comentários e documentação),
faltam duas escolhas:

   1. Arquitetura: A, B (recomendada) ou C.
   2. Entrega: um branch com pull request no GitHub, o que exige acesso de escrita ao
       repositório, ou um pacote .zip com o código reorganizado e o diff.

As ações no console do Firebase e do Google Cloud, como revogar a chave e publicar
regras, ficam com quem administra o projeto; os arquivos podem ficar prontos para
revisão.




                                                                                    Page 15 of 15
```
