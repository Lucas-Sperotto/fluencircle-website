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
npm test             # testes unitários de domain/ e mapas de serviços (Node 20+, sem dependências)
node scripts/verify-static.mjs   # verifica arquivos locais e propostas JSON
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

## Publicação: BLOQUEADA até auditoria de segurança

**NÃO execute deploy em produção a partir deste snapshot.** O merge na `main` preserva um baseline para engenharia e auditoria, não uma release. As regras reais do Firebase ainda precisam ser exportadas/testadas; o tradutor público, o backend Render e sessões simultâneas possuem riscos abertos. Consulte [gates de implantação](docs/operacao/SEGURANCA_E_DEPLOY.md) e [auditoria independente](docs/auditorias/AUDITORIA_INDEPENDENTE_2026-11-18.md).

Ambientes de desenvolvimento devem utilizar **projeto Firebase de staging ou Emulator isolado**. A CI executa somente verificações offline; ela não publica hosting, regras ou funções.

## Segurança

O navegador não é barreira de segurança: esconder botões por papel é só conveniência. A proteção dos dados depende das **regras do Realtime Database**. Ações pendentes (credencial no histórico, regras reais, tradução pública, backend, privacidade e concorrência) estão no [relatório independente](docs/auditorias/AUDITORIA_INDEPENDENTE_2026-11-18.md). O arquivo [`docs/AUDITORIA.md`](docs/AUDITORIA.md) é o relato **histórico da reorganização do Claude** e não substitui a revisão independente.

## Documentação

- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — camadas, fluxos, modelo de dados e próximos passos
- [`docs/AUDITORIA.md`](docs/AUDITORIA.md) — achados da auditoria e o que foi corrigido
- [`docs/MIGRACAO.md`](docs/MIGRACAO.md) — de onde veio cada arquivo e o que mudou de comportamento
- [`docs/firebase/LEIA-ME.md`](docs/firebase/LEIA-ME.md) — regras do banco e configuração do hosting
- [`docs/auditorias/AUDITORIA_INDEPENDENTE_2026-11-18.md`](docs/auditorias/AUDITORIA_INDEPENDENTE_2026-11-18.md) — análise independente, riscos P0/P1 e critérios GO/NO-GO
- [`docs/operacao/SEGURANCA_E_DEPLOY.md`](docs/operacao/SEGURANCA_E_DEPLOY.md) — staging, segredos, regras, backup e autorização de release
- [`docs/engenharia/REQUISITOS_E_CASOS_DE_USO.md`](docs/engenharia/REQUISITOS_E_CASOS_DE_USO.md) — requisitos e casos de uso por papel
- [`docs/usuario/MANUAL_DO_USUARIO.md`](docs/usuario/MANUAL_DO_USUARIO.md) — guia para visitante, aluno, mediador e administrador
- [`docs/diagramas/DIAGRAMAS.md`](docs/diagramas/DIAGRAMAS.md) — 9 diagramas Mermaid (AS-IS e TO-BE)
- [`docs/engenharia/ADR-001-ARQUITETURA.md`](docs/engenharia/ADR-001-ARQUITETURA.md) — decisão de preservar módulos sem build
- [`docs/processo/CHANGELOG_IA.md`](docs/processo/CHANGELOG_IA.md) — autoria atribuída e trilha de PRs por IA
- [`prompts/GEMINI_REVISAO_INDEPENDENTE.md`](prompts/GEMINI_REVISAO_INDEPENDENTE.md) — roteiro de revisão cruzada independente

## Licença

MIT — veja [`LICENSE`](LICENSE).
