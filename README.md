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

## Como rodar localmente (sempre isolado da produção)

Os módulos ES não funcionam abrindo o arquivo direto (`file://`): sirva por HTTP. **Em `localhost`/`127.0.0.1` o site
usa sempre o Firebase Emulator** com o projeto fictício `demo-fluencircle-audit` e mostra um selo amarelo no rodapé
(`public/js/config/environment.js`). Não há como apontar a máquina local para a produção sem alterar código.

```bash
npm install                # Node 20+ e Java 21+ (o Emulator do firebase-tools 15 exige Java 21)
npm run emulators          # terminal 1: Auth, Realtime Database, Hosting (http://127.0.0.1:5050) e UI (4000)
npm run emulators:seed     # terminal 2: contas e dados sintéticos (senha: fluencircle-demo)
```

Sem Java, ainda é possível abrir as páginas com `npm run serve` (http://localhost:5501), mas sem banco elas
ficam sem dados. Detalhes e contas de demonstração: [`docs/firebase/LEIA-ME.md`](docs/firebase/LEIA-ME.md).

## Testes

```bash
npm test                          # unitários (domain/, serviços puros, configuração, simulador) — sem rede
npm run test:rules                # regras RTDB no Firebase Emulator (prova oficial; precisa de npm install + Java 21)
npm run test:rules:sim            # mesma matriz no simulador local (pré-verificação offline; não é o Emulator)
npm run rules:check               # JSON das regras em sincronia com a fonte comentada
node scripts/verify-static.mjs    # arquivos locais e JSON de configuração
node scripts/verify-architecture.mjs  # camadas e sinks HTML proibidos
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

Desenvolvimento local usa **somente o Firebase Emulator** (seleção automática por endereço). A CI roda testes offline e o Emulator dentro do runner, com projeto `demo-*`; ela não publica hosting, regras ou funções e não usa segredos.

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
- [`prompts/GEMINI_REVISAO_INDEPENDENTE.md`](prompts/GEMINI_REVISAO_INDEPENDENTE.md) — roteiro original da revisão cruzada
- [`docs/auditorias/GEMINI_AUDITORIA.md`](docs/auditorias/GEMINI_AUDITORIA.md) — revisão Gemini recebida e seus 9 achados
- [`docs/auditorias/GEMINI_TESTES.md`](docs/auditorias/GEMINI_TESTES.md) — testes próprios versus logs de terceiros
- [`docs/auditorias/GEMINI_FINDINGS.json`](docs/auditorias/GEMINI_FINDINGS.json) — catálogo estruturado dos achados
- [`docs/auditorias/GEMINI_HANDOFF.md`](docs/auditorias/GEMINI_HANDOFF.md) — decisões pendentes e recomendações
- [`docs/auditorias/CHATGPT_REVISAO_FINAL_GEMINI_2026-11-19.md`](docs/auditorias/CHATGPT_REVISAO_FINAL_GEMINI_2026-11-19.md) — confronto final da revisão com o código
- [`docs/processo/ENTREGA_FINAL_2026-11-19.md`](docs/processo/ENTREGA_FINAL_2026-11-19.md) — status de PRs, testes e pendências de produção

## Licença

MIT — veja [`LICENSE`](LICENSE).
