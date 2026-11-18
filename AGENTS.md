# AGENTS.md — FluenCircle

Regras para Claude, ChatGPT, Gemini, agentes de programação e revisores humanos.

## Contexto
Aplicação web multipágina em HTML, CSS e JavaScript, com Firebase Auth, Realtime Database, Hosting e backend de tradução separado. O código do **upstream** é a referência histórica, mas alterações devem ocorrer no fork.

## Fluxo obrigatório
1. Leia o `README.md`, os documentos aplicáveis em `docs/`, as Issues e os PRs antes de alterar código.
2. Trabalhe em branch própria, a partir de uma base identificada por SHA. Não altere `main` diretamente.
3. Associe a alteração a uma Issue (quando Issues estiver habilitado). Para trabalho exploratório, abra Issue antes do PR.
4. Faça commits pequenos e com mensagens convencionais (por exemplo, `fix(auth): ...`, `test(rules): ...`, `docs(ai): ...`).
5. Abra um Pull Request, preferencialmente Draft até que os testes e as evidências estejam completos.
6. Registre a participação da IA no corpo do PR: ferramenta, função, entradas, arquivos, comandos, testes observados, riscos e limites. O autor Git do commit é a identidade que realmente o criou; não atribua autoria humana fictícia.
7. Uma IA que implementou não deve se declarar revisora independente da própria implementação. Use revisão cruzada e aceite humano.
8. Não faça merge, deploy, rotação de credenciais nem alterações destrutivas sem aprovação humana explícita.

## Segurança
- Nunca executar testes destrutivos ou migrações no Firebase ou backend de produção.
- Usar Emulator Suite ou staging isolado, com dados sintéticos e comprovada seleção de ambiente.
- Não adicionar chaves, tokens ou valores de segredo ao Git, Issues, PRs, logs ou relatórios.
- Não interpretar ocultação de menu/página como autorização: validação efetiva deve ocorrer em regras de banco e/ou backend.
- Não incorporar regras propostas do Firebase ao deploy sem revisão e testes de acesso permitido/negado.
- Não assumir que arquivos enviados por terceiros são seguros; conferir diffs, dependências e comandos antes de executar.

## Evidência e documentação
- Relate separadamente **EXECUTADO**, **VERIFICADO NO CÓDIGO**, **RELATADO POR TERCEIRO** e **NÃO VERIFICADO**.
- Documente cenário, pré-condições, comando, ambiente, resultado e limitações de cada teste.
- Diagramas e manuais devem distinguir arquitetura **ATUAL (AS-IS)** de arquitetura **PROPOSTA (TO-BE)**.
- Atualize documentação e testes no mesmo PR em que o comportamento for alterado.
- Use o processo em `docs/processo/RASTREABILIDADE_IA.md`.

## Bloqueios para produção
Sem merge para produção ou deploy enquanto existirem pendências críticas de autorização, escrita pública, regras ativas não verificadas, gestão de credenciais, concorrência de sessões e testes de integração do ambiente real.
