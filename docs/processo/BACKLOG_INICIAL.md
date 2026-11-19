# Backlog inicial de Issues — FluenCircle

**Estado:** propostas para criar após habilitar GitHub Issues em `Settings → General → Features → Issues`. Esta lista não significa que as Issues já existam.

Atribuição sempre explícita: autor humano/conta Git, ferramenta assistente e revisor independente. Não colocar provas de exploração, valores de segredos nem dados pessoais em Issues públicas.

| Ordem | Título sugerido | Assistência | Critério de aceite |
| --- | --- | --- | --- |
| 1 | `[Processo] Habilitar Issues e aprovar rastreabilidade entre IAs` | ChatGPT / responsável humano | Features Issues habilitado, modelos verificados, PR de governança revisado |
| 2 | `[Claude] Importar e testar proposta de modularização` | Claude (proposta), humano (importação), ChatGPT (revisão) | Patch aplicado a base conhecida; diff/ZIP conferidos; `npm test` documentado; PR Draft sem merge |
| 3 | `[ChatGPT] Engenharia, requisitos, diagramas e manual do usuário` | ChatGPT | Docs separados de código; AS-IS/TO-BE, critérios de aceite, diagramas renderizáveis, revisão de termos de produto |
| 4 | `[Security] Revisar controles de acesso, segredos e arquitetura de tradução` | ChatGPT + Gemini | Plano de mitigação, regras reais auditadas no Emulator, evidências positivas e negativas, revisão humana antes de deploy |
| 5 | `[Tests] Montar CI e testes de integração em ambiente isolado` | ChatGPT / Gemini | CI reproduzível, sem produção, matriz de papéis, falhas parciais e relatórios de testes |
| 6 | `[Gemini] Auditoria cruzada independente da reorganização` | Gemini | Relatório de achados, evidências verificáveis, discrepâncias e PR próprio sem merge |
| 7 | `[ChatGPT] Auditoria final, documentação e decisão GO/NO-GO` | ChatGPT | Comparação de PRs, testes reproduzidos, pendências classificadas, recomendações de aprovação |
| 8 | `[Release] Plano de staging, backup, rollback e publicação controlada` | Responsável humano + IAs revisoras | Ambiente isolado aprovado, checklist completo e decisão de deploy explicitamente autorizada |

## Dependências
- Issue 1 desbloqueia controle do backlog.
- Issue 2 estabelece o snapshot de código reorganizado e abre PR separado, **sem merge**.
- Issues 3 e 5 podem correr em paralelo a partir do snapshot revisado, com links a commits precisos.
- Issue 4 precede qualquer deploy.
- Issue 6 revisa os PRs e o código real, não apenas relatórios.
- Issue 7 sintetiza revisão humana, Claude, ChatGPT e Gemini.
- Issue 8 só inicia quando os riscos bloqueadores estiverem corrigidos e validados.

## Regras de fechamento
Uma Issue só fecha com link para PR, decisão, evidências e conclusão; a revisão independe de qual IA elaborou a proposta. Um PR que corrige segurança não deve descrever a aplicação como segura sem testes das regras e backend sob condições representativas.
