// Testes da revisão espaçada (public/js/domain/srs.js). Rode com: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSRSStatus,
  canAdvanceStage,
  buildStageCompletion,
  DAY_MS,
  FINAL_STAGE,
} from '../../public/js/domain/srs.js';

const HOUR_MS = 60 * 60 * 1000;
const STARTED_AT = '2026-11-10T19:00:00.000Z';
const start = Date.parse(STARTED_AT);
const session = { startedAt: STARTED_AT };

test('etapa 0: espera 24 h a partir do início da sessão', () => {
  assert.deepEqual(calculateSRSStatus(session, undefined, start + 20 * HOUR_MS), {
    stage: 0,
    targetStageName: 'Revisão 1 Dia',
    isDue: false,
    timeRemainingText: '4h',
    progressPercent: 0,
  });
});

test('etapa 0: liberada quando completa 24 h', () => {
  const status = calculateSRSStatus(session, undefined, start + DAY_MS);
  assert.equal(status.isDue, true);
  assert.equal(status.timeRemainingText, 'Pronto para revisar!');
});

test('etapa 1: conta 7 dias a partir da conclusão da etapa 1', () => {
  const review = { stage: 1, stage1CompletedAt: '2026-11-12T10:00:00.000Z' };
  const now = Date.parse(review.stage1CompletedAt) + 6 * DAY_MS;
  assert.deepEqual(calculateSRSStatus(session, review, now), {
    stage: 1,
    targetStageName: 'Revisão 7 Dias',
    isDue: false,
    timeRemainingText: '1d',
    progressPercent: 33,
  });
});

test('etapa 1 sem data de conclusão usa o início da sessão', () => {
  const status = calculateSRSStatus(session, { stage: 1 }, start + 7 * DAY_MS);
  assert.equal(status.isDue, true);
});

test('etapa 2: prazo em "dia(s)" e mensagem de revisão final', () => {
  const review = { stage: 2, stage2CompletedAt: '2026-11-01T00:00:00.000Z' };
  const done = Date.parse(review.stage2CompletedAt);
  assert.equal(calculateSRSStatus(session, review, done + 10 * DAY_MS).timeRemainingText, '20 dia(s)');
  const due = calculateSRSStatus(session, review, done + 30 * DAY_MS);
  assert.equal(due.isDue, true);
  assert.equal(due.timeRemainingText, 'Revisão final disponível!');
  assert.equal(due.progressPercent, 66);
});

test('somente etapa 3 válida indica conclusão', () => {
  const status = calculateSRSStatus(session, { stage: FINAL_STAGE }, start);
  assert.equal(status.targetStageName, 'Concluído');
  assert.equal(status.progressPercent, 100);
  assert.equal(status.isDue, false);
});

test('etapas malformadas ou adulteradas não recebem conclusão e não avançam', () => {
  for (const stage of [4, -1, 1.5, '1', NaN, true]) {
    const status = calculateSRSStatus(session, { stage }, start + 90 * DAY_MS);
    assert.equal(status.progressPercent, 0, `stage=${JSON.stringify(stage)}`);
    assert.equal(status.invalidState, true);
    assert.equal(canAdvanceStage(status), false);
  }
});

test('datas inválidas bloqueiam avanço sem produzir NaN na interface', () => {
  for (const bad of ['', 'não é data', null]) {
    const status = calculateSRSStatus({ startedAt: bad }, undefined, start + DAY_MS);
    assert.equal(status.invalidState, true);
    assert.equal(status.isDue, false);
    assert.equal(status.timeRemainingText, 'Data de revisão inválida');
  }
  const status = calculateSRSStatus(session, { stage: 1, stage1CompletedAt: 'inválido' }, start + 30 * DAY_MS);
  assert.equal(status.invalidState, true);
  assert.equal(canAdvanceStage(status), false);
});

test('buildStageCompletion rejeita etapas e datas inválidas', () => {
  for (const stage of [-1, 3, 4, 1.5, '1']) {
    assert.throws(() => buildStageCompletion(stage, '2026-11-19T10:00:00Z'), RangeError);
  }
  assert.throws(() => buildStageCompletion(0, 'invalida'), TypeError);
});

test('canAdvanceStage só libera etapa vencida e não final', () => {
  assert.equal(canAdvanceStage({ isDue: true, stage: 0 }), true);
  assert.equal(canAdvanceStage({ isDue: false, stage: 0 }), false);
  assert.equal(canAdvanceStage({ isDue: true, stage: FINAL_STAGE }), false);
});

test('buildStageCompletion grava a próxima etapa com a data', () => {
  assert.deepEqual(buildStageCompletion(1, '2026-11-18T15:00:00.000Z'), {
    stage: 2,
    lastReviewedAt: '2026-11-18T15:00:00.000Z',
    stage2CompletedAt: '2026-11-18T15:00:00.000Z',
  });
});
