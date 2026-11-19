# Runbook de segurança e implantação — FluenCircle

**Ambiente:** desenvolvimento/CI estático como padrão. **Estado de produção:** BLOQUEADO até os gates de auditoria independente. Este documento **não é** um script de deploy.

## Segurança operacional

**1. Produção e segredos.** O arquivo `public/js/config/firebase.config.js` referencia um projeto real. Não testar cadastro, presença, exclusões ou traduções com dados reais. Não gravar chaves em `.env` versionado, Issues ou PRs; a configuração web pública do Firebase e a chave de API de backend são categorias diferentes. Investigar a credencial do histórico por canal privado.

**2. Staging/Emulator.** Preparar projeto/instância isolados e dados sintéticos. Documentar projectId/host de teste sem segredos, contas (anônimo/aluno/mediador/admin), versão de regras, dataset, portas e instruções de reset. O script `npm test` e a CI atual não estabelecem conexão com Firebase, de propósito.

**3. Backup e restauração.** Antes de qualquer migração de esquema (índices de presença, mudança de sessão global, papéis), exportar backup seguro do RTDB, documentar procedimento de restauração testado em staging e janela de rollback. Não exportar PII para repositório público.

**4. Mudanças de regras.** Versionar arquivo exato das regras ativas após sanitização apropriada. Comparar com proposta, revisar por duas pessoas, criar testes positivos/negativos no Emulator. Nunca fazer `firebase deploy --only database` a partir da proposta não aprovada.

**5. Backend.** Necessária revisão do repositório do serviço Render: entrada de prompts, credenciais, CORS, logging, tamanho, rate limit, cotas, autenticação e App Check. O frontend não consegue compensar uma rota pública ilimitada.

**6. Release.** Conferir Issue, PR, aprovação, status CI, teste de integração, documentos atualizados, owners, versão de rollback e evidências. Deploy só por ação humana explícita e monitoramento posterior (falhas, custos, acesso anônimo).

## Comandos apenas de verificação offline

```bash
npm test
find public/js tests scripts -type f \( -name '*.js' -o -name '*.mjs' \) -print0 | xargs -0 -n1 node --check
node scripts/verify-static.mjs
```

Esses comandos podem rodar no clone sem modificar dados externos. Não incluem `firebase serve`, `firebase deploy`, script de alteração de banco nem testes em produção.

## Registro de decisão

| Critério | Estado nesta auditoria |
| --- | --- |
| CI offline | Aprovado para PR #16; 25 testes |
| Firebase real exportado/testado | **Pendente** |
| Escrita pública com proteção contra abuso | **Pendente** |
| Credencial antiga operacionalmente avaliada | **Pendente** |
| Backend Render auditado | **Pendente** |
| Mediadores concorrentes | **Pendente** |
| LGPD e leitura mínima | **Pendente** |
| E2E e regressão visual | **Pendente** |
| Autorização humana para deploy | **Ausente** |

**Decisão:** NO-GO para deploy. Aberto para revisão e merges de código/documentação com escopo e testes explícitos.
