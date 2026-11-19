# FluenCircle — site

Plataforma das sessões de conversação do FluenCircle: o mediador conduz a sessão com slides de perguntas, registra a presença e transforma as dúvidas de vocabulário em flashcards; o aluno revisa esses flashcards em marcos de 1, 7 e 30 dias (revisão espaçada).

Feito com HTML, CSS e JavaScript puros (módulos ES), **sem etapa de build**, sobre Firebase Authentication, Realtime Database e Hosting. A tradução usa um backend próprio no Render, que repassa os pedidos ao Gemini.

## Páginas

| Página | Quem usa | O que faz |
| --- | --- | --- |
| `auth.html` | todos | login |
| `index.html` | logados | atalhos conforme o papel |
| `flash-cards.html` | logados | decks por sessão e modo de estudo com revisão espaçada |
| `presentation.html` | mediador, admin | sessão ao vivo: slides, presença, tradutor e flashcards |
| `set-meeting.html` | mediador, admin | temas e perguntas de apoio |
| `manage-meetings.html` | mediador, admin | histórico de sessões e edição dos flashcards |
| `admin.html` | admin | contas e papéis |
| `circle-translator.html` | público, sem login | tradutor das sessões presenciais (salva flashcards na sessão ativa) |

## Como rodar localmente

Os módulos ES não funcionam abrindo o arquivo direto (`file://`): sirva a pasta `public/` por HTTP.

```bash
npm run serve        # Python: http://localhost:5501
# ou: extensão Live Server do VS Code (porta 5501)
# ou: firebase serve --only hosting
```

O site aponta para o projeto Firebase `fluentech-1e18a` (configuração em `public/js/config/firebase.config.js`). **Rodar localmente usa os dados de produção.** Para testar sem riscos, crie um projeto Firebase de testes e troque os valores desse arquivo.

## Testes

```bash
npm test             # testes unitários da camada domain/ (Node 20+, sem dependências)
```

## Estrutura

```
public/
├── *.html                 uma página por tela (nomes mantidos: links e QR code continuam válidos)
├── assets/                favicon e cursores dos slides
├── css/
│   ├── main.css           único CSS carregado; importa os demais NA ORDEM da cascata
│   ├── base/ layout/ components/ pages/ responsive/
│   └── overrides/         classes que substituíram os antigos atributos style=
└── js/
    ├── config/            configuração (Firebase, backend, limites)
    ├── core/              Firebase (único ponto de contato com o CDN), papéis, sessão, navegação
    ├── domain/            regras puras e testáveis: revisão espaçada, nomes, datas, prompt
    ├── services/          único acesso ao banco e ao backend
    ├── ui/                componentes: moldura, toast, diálogo, dropdown, pilha de cards, DOM seguro
    └── pages/             um script de entrada por página
docs/                      arquitetura, auditoria, migração e propostas para o Firebase
tests/unit/                testes da camada domain/
```

Detalhes e diagrama em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Regras do código

1. **Dados nunca entram em `innerHTML`.** Monte elementos com `h()` de `js/ui/dom.js`: textos viram nós de texto e não são interpretados como HTML.
2. **Só `services/` fala com o banco.** Os nomes dos nós ficam em `services/db-paths.js`.
3. **`domain/` não importa nada.** São funções puras, cobertas por `tests/unit/`.
4. **Toda página interna começa com `initProtectedPage()`**, que exige login, aplica o papel no menu e barra quem não tem permissão.
5. **Sem `style=` no HTML e sem estilos montados em strings no JS.** Estilos novos vão no arquivo CSS da seção; a ordem dos `@import` em `main.css` importa.
6. Comentários e textos em português; nomes no código em inglês.

## Deploy

```bash
firebase deploy --only hosting
```

Recomendado: versionar `database.rules.json` e `firebase.json` (veja `docs/firebase/LEIA-ME.md`) e publicar as regras junto: `firebase deploy --only hosting,database`.

## Segurança

O navegador não é barreira de segurança: esconder botões por papel é só conveniência. A proteção dos dados depende das **regras do Realtime Database**. Ações pendentes (revogar uma credencial que ficou no histórico do Git, publicar regras, ajustar o backend) estão em [`docs/AUDITORIA.md`](docs/AUDITORIA.md).

## Documentação

- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — camadas, fluxos, modelo de dados e próximos passos
- [`docs/AUDITORIA.md`](docs/AUDITORIA.md) — achados da auditoria e o que foi corrigido
- [`docs/MIGRACAO.md`](docs/MIGRACAO.md) — de onde veio cada arquivo e o que mudou de comportamento
- [`docs/firebase/LEIA-ME.md`](docs/firebase/LEIA-ME.md) — regras do banco e configuração do hosting

## Licença

MIT — veja [`LICENSE`](LICENSE).
