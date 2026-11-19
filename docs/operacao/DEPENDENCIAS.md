# Dependências do FluenCircle

Consulta: 19/11/2026. Versões de ferramentas conferidas no registro npm nesta data; nada foi instalado por IA no
ambiente de produção.

## 1. Em produção (carregadas pelo navegador)

| Dependência | Versão | Onde é usada | Observação |
| --- | --- | --- | --- |
| Firebase JS SDK (app, auth, database) | **10.8.0** via `www.gstatic.com` | só `public/js/core/firebase.js` e `core/firebase-auth.js` | Linha atual é a 13 (a `@firebase/rules-unit-testing` 6.0.0 já exige `firebase ^13`). Atualizar = trocar a versão nas duas URLs e rodar E2E + Emulator. |
| Font Awesome Free | 6.5.0 via cdnjs | ícones (CSS) | Licenças: ícones CC BY 4.0, fontes SIL OFL 1.1, código MIT |
| Google Fonts — Montserrat | — | tipografia | SIL OFL |
| Backend de tradução (Render) | desconhecida | `config/app.config.js` | Código não acessível; contrato proposto em `docs/backend/CONTRATO_BACKEND.md` |

O site não tem etapa de build nem dependências npm em tempo de execução.

## 2. Desenvolvimento e testes (`devDependencies`)

| Pacote | Versão fixada | Para quê | Requisitos |
| --- | --- | --- | --- |
| `firebase-tools` | 15.37.0 | Emulator (Auth, RTDB, Hosting) | Node ≥ 20; **Java 21+** para os emuladores |
| `@firebase/rules-unit-testing` | 5.0.1 | testes de regras no Emulator | Node ≥ 20; peer `firebase ^12` |
| `firebase` | ^12.0.0 | só para os testes de regras (Node) | — |
| `playwright` | 1.63.0 | testes E2E | `npx playwright install chromium` baixa o navegador |

Licenças: `firebase-tools` MIT; `firebase` e `@firebase/rules-unit-testing` Apache-2.0; `playwright` Apache-2.0.

**Pendência:** não há `package-lock.json` (o ambiente da implementação não tinha rede). Gerar com `npm install` numa
máquina com rede, revisar e commitar; depois trocar `npm install` por `npm ci` na CI.

Alternativa registrada: `@firebase/rules-unit-testing` 6.0.0 exige `firebase ^13` e **Node ≥ 24.12**; adotar junto
com a migração do SDK do site para a linha 13.

## 3. Ferramentas

| Ferramenta | Versão mínima | Uso |
| --- | --- | --- |
| Node.js | 20 (CI usa 22) | testes, scripts, Emulator |
| Java (JDK) | 21 | Firebase Emulator (firebase-tools 15) |
| Git | qualquer recente | versionamento |
| Python 3 | opcional | `npm run serve` (servidor estático simples) |
| Navegador Chromium/Chrome | o do Playwright | E2E; `E2E_CHROME_PATH` permite usar um Chrome já instalado |

## 4. GitHub Actions

`actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-java@v4` (Temurin 21), `actions/cache@v4`
(binários do Emulator). Nenhum job usa segredos nem publica nada.

## 5. Política de atualização

- Ferramentas de teste com versão **exata**; atualizar em PR próprio, com a suíte completa verde.
- SDK do navegador: atualizar só com E2E e Emulator verdes e teste em staging (troca de versão maior pode mudar
  comportamento de transação e reconexão).
- Revisar avisos de segurança (`npm audit`) no PR, sem aplicar `--force` automaticamente.
