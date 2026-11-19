/**
 * Planos e agenda semanal (public/js/domain/plans.js) — funções puras.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isoWeekKey, weekDays, addWeeks, weekRangeLabel, slotKey, planSessions, buildWeekAgenda,
  validatePlanInput, formatPlanPrice, planScheduleSummary, isSafeMeetLink, isValidPlanId,
} from '../../public/js/domain/plans.js';

describe('semana ISO', () => {
  test('quinta-feira comum', () => assert.equal(isoWeekKey(new Date(2026, 10, 19)), '2026-W47'));
  test('segunda e domingo pertencem à mesma semana', () => {
    assert.equal(isoWeekKey(new Date(2026, 10, 16)), '2026-W47');
    assert.equal(isoWeekKey(new Date(2026, 10, 22)), '2026-W47');
    assert.equal(isoWeekKey(new Date(2026, 10, 23)), '2026-W48');
  });
  test('viradas de ano (semana 53 e semana 1 do ano seguinte)', () => {
    assert.equal(isoWeekKey(new Date(2021, 0, 3)), '2020-W53');
    assert.equal(isoWeekKey(new Date(2024, 11, 30)), '2025-W01');
    assert.equal(isoWeekKey(new Date(2026, 0, 1)), '2026-W01');
  });
  test('weekDays vai de segunda a domingo e respeita a virada de mês', () => {
    const days = weekDays(new Date(2026, 10, 29)); // domingo
    assert.deepEqual(days.map((d) => d.short), ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']);
    assert.deepEqual(days.map((d) => d.monthDay), [23, 24, 25, 26, 27, 28, 29]);
    assert.deepEqual(weekDays(new Date(2026, 11, 2)).map((d) => d.monthDay), [30, 1, 2, 3, 4, 5, 6]);
  });
  test('addWeeks e rótulo da semana', () => {
    assert.equal(isoWeekKey(addWeeks(new Date(2026, 10, 19), 1)), '2026-W48');
    assert.equal(isoWeekKey(addWeeks(new Date(2026, 10, 19), -47)), '2025-W52');
    assert.equal(weekRangeLabel(new Date(2026, 10, 19)), '16/11 a 22/11');
  });
});

describe('horários e agenda', () => {
  const plans = {
    planoA: { name: 'Essencial', price: 120, sessions: [{ dayOfWeek: 3, startTime: '18:00', endTime: '18:50' }, { dayOfWeek: 1, startTime: '19:00', endTime: '19:50' }] },
    // lista vinda do RTDB como objeto, com buraco no índice 1
    planoB: { name: 'Intensivo', price: 200, sessions: { 0: { dayOfWeek: 0, startTime: '10:00', endTime: '10:50' }, 2: { dayOfWeek: 1, startTime: '18:00', endTime: '18:50' } } },
  };

  test('slotKey mantém o formato do PR #2', () => assert.equal(slotKey('planoA', 3, 0), 'planoA_3_0'));
  test('planSessions preserva o índice original', () => {
    assert.deepEqual(planSessions(plans.planoB).map((s) => s.index), [0, 2]);
    assert.deepEqual(planSessions({}), []);
  });
  test('agenda ordena segunda→domingo e por horário, com tema e link da semana', () => {
    const agenda = buildWeekAgenda({
      plans,
      date: new Date(2026, 10, 19),
      schedule: {
        planoA_3_0: { topicId: 't1', topicTitle: 'Travel', questions: ['Beach?', 7], meetLink: 'https://meet.example.test/abc' },
        planoB_1_2: { themeTopic: 'Legado', videoLink: 'javascript:alert(1)' },
      },
    });
    assert.deepEqual(agenda.map((a) => a.slotKey), ['planoB_1_2', 'planoA_1_1', 'planoA_3_0', 'planoB_0_0']);
    const wed = agenda[2];
    assert.equal(wed.topic, 'Travel');
    assert.deepEqual(wed.questions, ['Beach?']);
    assert.equal(wed.meetLink, 'https://meet.example.test/abc');
    assert.equal(wed.monthDay, 18);
    assert.equal(agenda[0].topic, 'Legado', 'aceita os nomes alternativos do PR #2');
    assert.equal(agenda[0].meetLink, '', 'link que não é https é descartado');
    assert.equal(agenda[1].topic, '');
  });
  test('links seguros e ids de plano', () => {
    assert.equal(isSafeMeetLink('https://meet.google.com/abc-defg-hij'), true);
    assert.equal(isSafeMeetLink('http://inseguro.example.test'), false);
    assert.equal(isSafeMeetLink('https://x.test/"><script>'), false);
    assert.equal(isValidPlanId('-Nabc_123'), true);
    assert.equal(isValidPlanId('a/b'), false);
    assert.equal(isValidPlanId(''), false);
  });
});

describe('formulário de plano', () => {
  const base = { name: ' Essencial ', price: '89,90', description: '', sessions: [{ dayOfWeek: '3', startTime: '18:00', endTime: '18:50' }] };
  test('normaliza nome, preço com vírgula e dia', () => {
    const result = validatePlanInput(base);
    assert.equal(result.ok, true);
    assert.deepEqual(result.value, { name: 'Essencial', price: 89.9, sessions: [{ dayOfWeek: 3, startTime: '18:00', endTime: '18:50' }] });
  });
  test('recusa nome vazio, preço inválido, sem horários e horário invertido', () => {
    assert.equal(validatePlanInput({ ...base, name: '  ' }).ok, false);
    assert.equal(validatePlanInput({ ...base, price: '' }).ok, false);
    assert.equal(validatePlanInput({ ...base, price: '-1' }).ok, false);
    assert.equal(validatePlanInput({ ...base, sessions: [] }).ok, false);
    const inverted = validatePlanInput({ ...base, sessions: [{ dayOfWeek: 1, startTime: '19:00', endTime: '18:00' }] });
    assert.deepEqual(inverted.errors, ['Horário 1: o fim deve ser depois do início.']);
    assert.equal(validatePlanInput({ ...base, sessions: [{ dayOfWeek: 7, startTime: '9:00', endTime: '18:00' }] }).errors.length, 2);
  });
  test('preço e resumo de horários', () => {
    assert.equal(formatPlanPrice(120), 'R$ 120');
    assert.equal(formatPlanPrice(89.9), 'R$ 89,90');
    assert.equal(planScheduleSummary({ sessions: [{ dayOfWeek: 0, startTime: '10:00', endTime: '10:50' }, { dayOfWeek: 3, startTime: '18:00', endTime: '18:50' }] }),
      'Qua 18:00–18:50 · Dom 10:00–10:50');
  });
});
