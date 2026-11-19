# Handoff Gemini → ChatGPT / mantenedor

- **Origem:** revisão atribuída a Gemini, encaminhada no chat em 19/11/2026, normalizada para Git sem afirmar execução externa.
- **Branch de origem:** `audit/gemini-revisao`.
- **Base original da análise:** `469aaecb767bec2d552d05faf7323fd407fb303a`.
- **Decisão:** **NO-GO** para produção.

## Entregáveis

`GEMINI_AUDITORIA.md` (análise e classificação de nove achados), `GEMINI_TESTES.md` (matriz executado × log pré-gerado × não executado), `GEMINI_FINDINGS.json` (nove objetos rastreáveis), `GEMINI_HANDOFF.md` (este encaminhamento).

Os arquivos resultam de **transcrição editorial fiel ao conteúdo técnico fornecido**, com padronização de Markdown/JSON e remoção de marcadores de formatação sem destino. Não são arquivos binários originais produzidos diretamente pelo runtime Gemini. A origem intelectual do conteúdo da revisão foi atribuída a Gemini; a importação foi executada com auxílio ChatGPT.

## O que Gemini não verificou

A revisão não leu integralmente os módulos JS e HTML, não executou Node, npm, Git nem Firebase Emulator no próprio ambiente e não inspecionou RTDB/GCP/Render reais. Os logs offline vieram do pacote. Comparações históricas de Claude não constituem prova E2E reproduzida.

## Opções que requerem decisão humana

1. **Tradução pública:** backend com Admin SDK e controle antiabuso (recomendado pelo Gemini) ou Anonymous Auth + App Check, com cota e regra estrita. Não publicar regras que permitam escrita anônima direta.
2. **Dados do aluno:** definir contratualmente se só vê sessões em que esteve presente, e como moderadores consultam participantes de sua turma.
3. **Sessões ao vivo:** uma sessão global com lock/ownerUid versus várias salas `active_sessions/{codigo}`.
4. **SRS:** progressão de etapa precisa considerar registros legados e autorizações de escrita no RTDB.

## Ordem de trabalho sugerida

- **P0 / Operador:** coletar regras **ativas** e confirmar estado da credencial histórica por canal privado.
- **P0 / Código:** fechar escrita pública no rascunho e evitar deploy acidental, controlar backend público, reduzir leituras e schemas.
- **P1:** corrigir exemplo de CSP; confirmar HTML/JS XSS; isolar concorrência e testar desconexões no Emulator.
- **P2:** endurecer SRS, implementar testes de regras e E2E, verificar registros legados e desempenho.

**A integração dos documentos à main não aprova nenhum deploy.** A etapa final de ChatGPT deve registrar os reparos efetivamente testados em PRs separados e atualizar a Issue #21.
