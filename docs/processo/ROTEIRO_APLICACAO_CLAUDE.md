# Roteiro controlado — proposta Claude

**Status:** procedimento de importação; **nenhuma alteração funcional da proposta foi aplicada por este documento**.

## Base e proveniência
- Upstream: `fluencircle/fluencircle-website`
- Commit base exato: `dd8a9d8560d6b7fb8d93e7c259cef05f3b799e42`
- Fork: `Lucas-Sperotto/fluencircle-website`
- Branch já criada: `refactor/claude-modularizacao`
- Entrada 1: `fluencircle-reorganizacao.diff` (SHA-256: `16c5a71d5f9cbc051bb15a906de16a5048181930f11f4f222ab76b60518ce2fb`)
- Entrada 2: `fluencircle-website-reorganizado.zip` (SHA-256: `9c6239732cb3f7b7e85efc0dfe11011952aaa9adae15a8057195abdac0b52f3f`)
- Autor da **proposta**: Claude, conforme materiais encaminhados pelo responsável; quem executar o `git commit` será o autor Git do commit.

## Aplicação pelo terminal no diretório do fork
Copie `fluencircle-reorganizacao.diff` para o diretório-raiz do clone; execute em bash/WSL:

```bash
git clone https://github.com/Lucas-Sperotto/fluencircle-website.git
cd fluencircle-website
git remote add upstream https://github.com/fluencircle/fluencircle-website.git
git fetch origin
git switch --track origin/refactor/claude-modularizacao
git rev-parse HEAD  # deve começar por dd8a9d8; se divergir, interrompa

# Copie o diff baixado PARA a pasta atual antes de continuar.
git apply --check fluencircle-reorganizacao.diff
git apply --index fluencircle-reorganizacao.diff
git diff --cached --check
git diff --cached --stat
git status --short
npm test

# Leia o diff de mudanças, revise dados sensíveis e confirme o staging antes do commit.
git diff --cached --name-status
git commit -m "refactor(claude): reorganize frontend into modular layers"
git push origin refactor/claude-modularizacao
```

Se o clone já existir, **não faça novo clone**: verifique estado limpo com `git status`, atualize `origin` e faça checkout da branch criada. Se `git apply --check` falhar, não use `--force`, não misture manualmente ZIP e patch; registre o erro e revise a divergência.

O arquivo `.diff` é um artefato de entrada **local**, não deve ser adicionado ao commit automaticamente. A revisão do código deve examinar qualquer configuração pública, possíveis segredos, URLs de produção e alterações de regras.

## PR da proposta
Abra PR **Draft**, origem `refactor/claude-modularizacao` → destino `main`, com título `[Claude][Refactor] Modularização original do FluenCircle`.

Na descrição:
- Referencie Issue de refatoração (quando Issues estiver habilitado).
- Informe a origem Claude e os dois SHA-256 acima.
- Liste arquivos adicionados, removidos e migrados.
- Anexe o resultado verdadeiro de `npm test`, versão Node e verificações não realizadas.
- Não afirme que testes de Firebase, login real, E2E ou visual foram executados se não puder demonstrá-los.
- Registre riscos P0/P1 remanescentes e marque **NÃO APROVADO PARA DEPLOY**.
- Solicite revisão cruzada antes de mesclar.

## Atenção à execução
O código recebido possui configuração apontando para um Firebase real. **Não execute manualmente operações com dados, interface administrativa ou scripts que gravem no banco**, nem `firebase deploy`, sem antes isolar ambiente de desenvolvimento.

## Próximos PRs
Os documentos de auditoria, requisitos, manuais e diagramas do ChatGPT devem entrar em branch de documentação separada, rastreados por Issue. A revisão Gemini deve produzir relatório e, quando couber, correções em branch própria.
