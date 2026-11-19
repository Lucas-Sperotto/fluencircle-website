# Backup, restauração e rollback — procedimento proposto

> **Estado: PROPOSTO, NÃO EXECUTADO.** Nenhuma IA acessou o Firebase real. Todos os comandos abaixo são para a
> pessoa operadora do projeto, com permissão própria, fora da CI. Backups contêm dados pessoais: **nunca** vão para
> o Git, Issues, PRs ou chats.

## 1. O que guardar antes de qualquer mudança em produção

| Item | Como obter (operador) | Onde guardar |
| --- | --- | --- |
| Banco (RTDB) completo | Console → Realtime Database → ⋮ → **Exportar JSON**, ou `firebase database:get / --project <projeto> > backup-AAAAMMDD.json` | armazenamento privado com controle de acesso |
| Regras **ativas** do RTDB | Console → Realtime Database → Regras: copiar o texto integral | arquivo versionado **após** conferir que não há segredo (ex.: `docs/firebase/producao/database.rules.ativas.json`) |
| Versão publicada do Hosting | Console → Hosting → histórico de versões (anotar a versão atual) | registro da mudança (Issue/PR) |
| Contas do Auth | `firebase auth:export contas.json --project <projeto>` | **segredo** (hashes de senha): cofre, nunca no repositório |

## 2. Testar a restauração (em staging, nunca em produção)

1. Criar/usar um projeto de **staging** separado (decisão humana; ainda não existe).
2. `firebase database:set / backup-AAAAMMDD.json --project <staging>` (ou importar pelo console do staging).
3. Publicar no staging as regras e o hosting que se pretende levar à produção.
4. Rodar o roteiro de demonstração do `docs/entrega/GUIA_DO_ALUNO.md` e os E2E apontados para o staging.
5. Registrar resultado, data e quem executou.

## 3. Rollback

| Mudança | Como desfazer |
| --- | --- |
| Regras do RTDB | Republicar o arquivo de regras ativas guardado no passo 1 (console → Regras → colar → Publicar). O RTDB não guarda histórico de regras: sem esse arquivo não há volta garantida. |
| Hosting | Console → Hosting → histórico → **reverter** para a versão anotada. |
| Migração de privacidade (`scripts/migrations/`) | Restaurar do backup apenas `meeting_sessions/*/attendees` e `user_sessions` (update multicaminho gerado a partir do backup), em staging antes. |
| Gravação pública direta no tradutor | `publicTranslatorSavesFlashcards` em `public/js/config/environment.js` + novo deploy do hosting. |
| Posse da sessão ativa (ADR-003) | Exige rollback conjunto de regras **e** hosting (o formato de `current_session` mudou). |

## 4. Ordem recomendada para a publicação desta entrega (quando autorizada)

1. Backup completo e regras ativas exportadas (passo 1) — **bloqueante**.
2. Comparar regras ativas × proposta; decidir cada diferença (duas pessoas).
3. Staging: regras propostas + hosting desta branch + carga do backup → E2E e roteiro manual.
4. Staging: aplicar o plano de migração de privacidade gerado do backup do staging; repetir os testes.
5. Decidir o modo do tradutor público (gravação direta desligada ou backend controlado pronto).
6. Produção, na mesma ordem, com janela combinada, monitoramento e os passos da seção 3 prontos.
