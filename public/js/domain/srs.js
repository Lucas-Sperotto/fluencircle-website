/**
 * @file Revisão espaçada (SRS) dos flashcards: marcos de 1, 7 e 30 dias.
 *
 * Funções puras: não acessam DOM nem Firebase, então podem ser testadas
 * isoladamente (ver tests/unit/srs.test.mjs).
 *
 * Regra de negócio:
 * - Etapa 0 → 1: liberada 24 h depois do início da sessão (`startedAt`).
 * - Etapa 1 → 2: liberada 7 dias depois da conclusão da etapa 1 (`stage1CompletedAt`).
 * - Etapa 2 → 3: liberada 30 dias depois da conclusão da etapa 2 (`stage2CompletedAt`).
 * - Etapa 3: vocabulário consolidado, nada mais a revisar.
 */

const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/**
 * Configuração de cada etapa pendente, na ordem. O índice é o número da etapa atual.
 * `startField` é o campo de `student_reviews` a partir do qual a espera é contada
 * (null = início da sessão).
 */
const STAGES = Object.freeze([
  {
    name: 'Revisão 1 Dia',
    waitMs: DAY_MS,
    startField: null,
    progress: 0,
    readyText: 'Pronto para revisar!',
    remainingText: (ms) => `${Math.ceil(ms / HOUR_MS)}h`,
  },
  {
    name: 'Revisão 7 Dias',
    waitMs: 7 * DAY_MS,
    startField: 'stage1CompletedAt',
    progress: 33,
    readyText: 'Pronto para revisar!',
    remainingText: (ms) => `${Math.ceil(ms / DAY_MS)}d`,
  },
  {
    name: 'Revisão 30 Dias',
    waitMs: 30 * DAY_MS,
    startField: 'stage2CompletedAt',
    progress: 66,
    readyText: 'Revisão final disponível!',
    remainingText: (ms) => `${Math.ceil(ms / DAY_MS)} dia(s)`,
  },
]);

/** Etapa em que o vocabulário é considerado consolidado. */
export const FINAL_STAGE = STAGES.length;

/** Mensagem exibida ao concluir cada etapa. */
export const STAGE_COMPLETION_MESSAGES = Object.freeze({
  1: '🎉 Etapa de 1 Dia concluída! Próximo marco de revisão: 7 dias.',
  2: '🔥 Etapa de 7 Dias concluída! Retenção semanal garantida. Próximo marco: 30 dias!',
  3: '🏆 Maestria Total (30 dias)! Este vocabulário agora faz parte da sua memória de longo prazo!',
});

/**
 * @typedef {Object} SrsStatus
 * @property {number} stage etapa concluída até agora (0 a 3)
 * @property {string} targetStageName nome da próxima revisão
 * @property {boolean} isDue a próxima revisão já está liberada
 * @property {string} timeRemainingText tempo restante ou mensagem de "pronto"
 * @property {number} progressPercent 0, 33, 66 ou 100
 */

/**
 * Calcula em que ponto da curva de revisão um aluno está para uma sessão.
 *
 * @param {{ startedAt?: string }} session sessão de conversação
 * @param {{ stage?: number, stage1CompletedAt?: string, stage2CompletedAt?: string } | undefined} reviewData
 *        registro de `student_reviews/{uid}/{sessionId}`
 * @param {number} [now] instante de referência em ms (injetável para testes)
 * @returns {SrsStatus}
 */
export function calculateSRSStatus(session, reviewData, now = Date.now()) {
  const stage = reviewData?.stage || 0;
  // Só números inteiros indicam etapa pendente; qualquer outro valor conta como concluído.
  const config = Number.isInteger(stage) ? STAGES[stage] : undefined;

  if (!config) {
    return {
      stage,
      targetStageName: 'Concluído',
      isDue: false,
      timeRemainingText: 'Vocabulário Consolidado!',
      progressPercent: 100,
    };
  }

  const sessionTime = new Date(session.startedAt || 0).getTime();
  const startValue = config.startField ? reviewData?.[config.startField] : null;
  const startTime = startValue ? new Date(startValue).getTime() : sessionTime;
  const elapsed = now - startTime;
  const isDue = elapsed >= config.waitMs;

  return {
    stage,
    targetStageName: config.name,
    isDue,
    timeRemainingText: isDue ? config.readyText : config.remainingText(config.waitMs - elapsed),
    progressPercent: config.progress,
  };
}

/**
 * Diz se terminar a pilha agora avança o aluno para a próxima etapa.
 * @param {SrsStatus} srs
 */
export function canAdvanceStage(srs) {
  return srs.isDue && srs.stage < FINAL_STAGE;
}

/**
 * Monta o registro a gravar em `student_reviews/{uid}/{sessionId}` ao concluir uma etapa.
 * @param {number} currentStage
 * @param {string} nowIso data atual em ISO 8601
 */
export function buildStageCompletion(currentStage, nowIso) {
  const nextStage = currentStage + 1;
  return {
    stage: nextStage,
    lastReviewedAt: nowIso,
    [`stage${nextStage}CompletedAt`]: nowIso,
  };
}
