# ADR-003 — Posse por aba na sessão ativa (`current_session`) e caminho para salas por código

**Estado:** aceita para o código e para a proposta de regras; **não publicada** no Firebase real.
**Data:** 19/11/2026 · **Issue:** #9 · **Implementação:** Claude (PR "concorrência da sessão ativa") · **Revisão:** pendente (ChatGPT) e aceite humano.

## Contexto (AS-IS antes desta mudança)

`current_session` é um nó único, lido sem login pelo tradutor público (`circle-translator.html`) para saber em
qual sessão salvar as traduções. Cada aba que apresentava fazia `onDisconnect(current_session).remove()` e, ao
reconectar, regravava o nó inteiro. Consequências confirmadas no código (FC-04 / DATA-06):

1. dois mediadores (ou duas abas) se sobrescreviam em silêncio;
2. a queda de uma aba **antiga** apagava a sessão publicada **depois** por outra tela;
3. a reconexão de uma aba antiga republicava uma sessão que já tinha sido substituída.

## Opções consideradas

| Opção | Prós | Contras | Decisão |
| --- | --- | --- | --- |
| A. Manter o nó único com **posse por aba**, `version`, presença por aba e transação | Compatível com o tradutor e com o QR code atuais; corrige os três problemas; testável no Emulator | Continua havendo **uma** sessão pública por vez; qualquer membro da equipe ainda consegue apagar o nó | **Adotada agora** |
| B. **Salas por código** (`active_sessions/{codigo}`) e tradutor com `?sala=` | Várias sessões simultâneas de verdade; isolamento natural | Muda URL/QR, fluxo do visitante e regras; exige migração e comunicação | **Caminho futuro (TO-BE)**, plano abaixo |
| C. Bloqueio por tempo (lease/TTL) sem presença | Simples de explicar | Precisa de relógio confiável e renovação periódica; regras do RTDB não leem datas ISO | Descartada |

## Decisão

Formato do nó (campos novos são aditivos; o tradutor lê só `sessionId` e `topic`):

```text
current_session: {
  sessionId, topic, startedAt,          // como antes
  presenterId: "<id aleatório da aba>", // posse
  version: <inteiro ≥ 1>,               // cresce de 1 em 1 na troca de dono
  takeoverOf?: "<dono anterior>",       // só quando alguém ASSUMIU uma apresentação viva
  live: { "<presenterId>": true }       // presença da aba dona
}
```

- **Publicar** usa `runTransaction` com `publishTransaction()` (`domain/presentation-lock.js`). Se outra aba estiver
  no ar, nada é gravado; a tela pergunta e só então publica com `takeover`.
- Cada aba registra `onDisconnect` **somente** em `live/{presenterId}`. Uma aba antiga que cai não toca a nova.
- **Reconectar:** registra de novo o `onDisconnect` (ele dispara uma vez) e, por transação, restaura a presença
  apenas se ainda for a dona; senão mostra "outra tela assumiu".
- **Encerrar:** transação que só remove o nó se esta aba for a dona.
- **Regras** (`firebase/rules/database.rules.source.mjs`): exigem o formato, versão +1 na troca de dono,
  `takeoverOf` correto para substituir apresentação viva, presença apenas do dono e nada de campos extras;
  aceitam substituir o formato antigo (sem `version`).

## Consequências e riscos residuais

- ✅ Testado: `tests/unit/presentation-lock.test.js` (decisões puras), `tests/rules/sessao-ativa.rules.test.mjs`
  (dois mediadores, duas abas, desconexão, retorno, formato antigo, esquema) e `tests/e2e/concorrencia.e2e.test.mjs`
  (interface). No Emulator: **pendente de execução na CI**.
- ⚠️ Qualquer membro da equipe consegue **apagar** `current_session` pela API (a regra não sabe qual aba pede a
  remoção). O cliente só apaga o próprio. Teste explícito registra o risco.
- ⚠️ A regra do RTDB é avaliada quando o `onDisconnect` é **registrado**, não quando dispara. O desenho não depende
  disso: a remoção de uma chave de presença que já não existe é inofensiva.
- ⚠️ Se a aba fechar entre publicar e registrar o `onDisconnect` (milissegundos), a presença fica "viva"; a próxima
  pessoa precisa confirmar "assumir". Não há bloqueio permanente.
- ℹ️ O tradutor público mostra uma sessão por vez — limitação de produto, resolvida só pela opção B.

## Plano de migração para salas por código e QR (TO-BE, não implementado)

1. **Modelo:** `active_sessions/{codigo}` com o mesmo formato acima (posse, versão, presença); código curto
   (ex.: 6 caracteres sem ambiguidade) gerado na tela de apresentação; `current_session` mantido como "sala padrão".
2. **Tradutor:** `circle-translator.html?sala=ABC123` lê `active_sessions/ABC123`; sem parâmetro, continua lendo
   `current_session` — **o QR code e os links atuais seguem válidos**.
3. **Tela de apresentação:** mostra código e QR da sala (QR gerado localmente, sem serviço externo).
4. **Regras:** mesmas condições por sala; leitura pública só da sala pedida (`active_sessions/$codigo`), nunca da lista.
5. **Testes:** repetir `sessao-ativa.rules.test.mjs` por sala + E2E com duas salas simultâneas.
6. **Implantação:** staging → comunicação aos mediadores → produção; rollback = voltar ao tradutor sem `?sala=`.
7. **Backend controlado (Issue #8):** a gravação pública de cards por sala deve passar pelo backend, que valida a
   sala ativa e aplica limites.
