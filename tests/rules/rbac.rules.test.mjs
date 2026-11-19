/**
 * Matriz de acesso (RBAC) das regras propostas, com casos PERMITIDOS e NEGADOS
 * para visitante, aluno A/B, mediador A/B, admin, conta sem perfil e conta
 * revogada. Dados 100% sintéticos (tests/fixtures/synthetic-data.mjs).
 *
 * Executar: `npm run test:rules` (Emulator) ou `npm run test:rules:sim`
 * (simulador local, apenas pré-verificação).
 */
import { describe, test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRulesEnv } from './support/rules-env.mjs';
import { ACTORS, SESSIONS, buildSyntheticDatabase } from '../fixtures/synthetic-data.mjs';

const env = await createRulesEnv();
const { studentA, studentB, mediatorA, mediatorB, admin, noProfile, revoked } = ACTORS;
const NOW = '2026-11-19T12:00:00.000Z';

const validProfile = (overrides = {}) => ({ firstName: 'Nova', lastName: 'Pessoa', email: 'nova.pessoa@example.test', role: 'student', createdAt: NOW, ...overrides });
const validTheme = (overrides = {}) => ({ topic: 'Music', questions: ['What do you listen to?'], createdAt: NOW, updatedAt: NOW, ...overrides });
const validSession = (actor, overrides = {}) => ({ templateId: 'tema-viagem', topic: 'Travel', startedAt: NOW, mediatorEmail: actor.email, ...overrides });
const validCard = (sessionId, overrides = {}) => ({ front: 'suitcase', back: 'mala', topic: 'Travel', sessionId, createdAt: NOW, ...overrides });

describe(`${env.label} RBAC e esquema — regras propostas`, () => {
  before(() => env.seed(buildSyntheticDatabase()));
  beforeEach(() => env.seed(buildSyntheticDatabase()));
  after(() => env.cleanup());

  describe('raiz', () => {
    test('visitante não lê nem grava a raiz', async () => {
      const visitor = env.as(null);
      await env.denied(visitor.get('/'));
      await env.denied(visitor.set('/qualquer', 1));
    });
    test('mesmo o admin não lê a raiz inteira (negação padrão)', async () => {
      await env.denied(env.as(admin).get('/'));
    });
  });

  describe('users e escalada de privilégio', () => {
    test('aluno lê o próprio perfil, não o de outro aluno nem a lista', async () => {
      const ana = env.as(studentA);
      assert.equal((await env.allowed(ana.get(`users/${studentA.uid}`))).role, 'student');
      await env.denied(ana.get(`users/${studentB.uid}`));
      await env.denied(ana.get('users'));
    });
    test('visitante não lê perfis', async () => {
      await env.denied(env.as(null).get(`users/${studentA.uid}`));
    });
    test('mediador e admin leem a lista (busca de alunos e tela de acessos)', async () => {
      await env.allowed(env.as(mediatorA).get('users'));
      await env.allowed(env.as(admin).get('users'));
    });
    test('aluno não altera o próprio papel para admin', async () => {
      await env.denied(env.as(studentA).set(`users/${studentA.uid}/role`, 'admin'));
      await env.denied(env.as(studentA).update(`users/${studentA.uid}`, { role: 'mediator' }));
    });
    test('mediador não cria nem edita perfis', async () => {
      await env.denied(env.as(mediatorA).set('users/novo-uid', validProfile()));
      await env.denied(env.as(mediatorA).set(`users/${studentA.uid}/role`, 'mediator'));
    });
    test('admin cria perfil válido e edita nome/papel', async () => {
      const elisa = env.as(admin);
      await env.allowed(elisa.set('users/novo-uid', validProfile()));
      await env.allowed(elisa.update(`users/${studentA.uid}`, { firstName: 'Ana Maria', role: 'mediator', updatedAt: NOW }));
    });
    test('admin não grava papel inexistente, campo extra, e-mail inválido ou perfil sem e-mail', async () => {
      const elisa = env.as(admin);
      await env.denied(elisa.set('users/x1', validProfile({ role: 'superuser' })));
      await env.denied(elisa.set('users/x2', validProfile({ isAdmin: true })));
      await env.denied(elisa.set('users/x3', validProfile({ email: 'sem-arroba' })));
      const { email, ...withoutEmail } = validProfile();
      await env.denied(elisa.set('users/x4', withoutEmail));
    });
    test('conta sem perfil lê o próprio caminho (descobre que não tem perfil) e nada mais', async () => {
      const fabio = env.as(noProfile);
      assert.equal(await env.allowed(fabio.get(`users/${noProfile.uid}`)), null);
      await env.denied(fabio.get('users'));
      await env.denied(fabio.get('meeting_sessions'));
    });
  });

  describe('deleted_users (revogação lógica)', () => {
    test('conta revogada lê a própria entrada para o login recusar acesso', async () => {
      const gabi = env.as(revoked);
      assert.ok(await env.allowed(gabi.get(`deleted_users/${revoked.uid}`)));
      await env.denied(gabi.get('meeting_sessions'));
      await env.denied(gabi.get(`flashcards/${SESSIONS.anaOnly}`));
    });
    test('aluno não lê entradas de outros nem a lista', async () => {
      await env.denied(env.as(studentA).get(`deleted_users/${revoked.uid}`));
      await env.denied(env.as(studentA).get('deleted_users'));
    });
    test('admin revoga numa escrita atômica; mediador não', async () => {
      const revoke = { [`users/${studentB.uid}`]: null, [`deleted_users/${studentB.uid}`]: { deletedAt: NOW, deletedBy: admin.email } };
      await env.denied(env.as(mediatorA).update('/', revoke));
      await env.allowed(env.as(admin).update('/', revoke));
      assert.equal(await env.adminGet(`users/${studentB.uid}`), null);
    });
  });

  describe('meetings (temas)', () => {
    test('visitante e aluno não leem temas; mediador lê', async () => {
      await env.denied(env.as(null).get('meetings'));
      await env.denied(env.as(studentA).get('meetings'));
      await env.allowed(env.as(mediatorB).get('meetings'));
    });
    test('aluno não cria tema; mediador cria tema válido', async () => {
      await env.denied(env.as(studentA).set('meetings/novo', validTheme()));
      await env.allowed(env.as(mediatorA).set('meetings/novo', validTheme()));
    });
    test('esquema: título obrigatório e curto, ao menos uma pergunta, sem campos extras', async () => {
      const carla = env.as(mediatorA);
      await env.denied(carla.set('meetings/t1', validTheme({ topic: '' })));
      await env.denied(carla.set('meetings/t2', validTheme({ topic: 'x'.repeat(201) })));
      await env.denied(carla.set('meetings/t3', validTheme({ questions: null })));
      await env.denied(carla.set('meetings/t4', validTheme({ owner: 'x' })));
      await env.denied(carla.set('meetings/t5', validTheme({ questions: { abc: 'pergunta' } })));
    });
  });

  describe('meeting_sessions e presença', () => {
    test('visitante não lê sessões', async () => {
      await env.denied(env.as(null).get('meeting_sessions'));
    });
    test('mediador cria sessão registrando o PRÓPRIO e-mail', async () => {
      await env.allowed(env.as(mediatorA).set('meeting_sessions/nova', validSession(mediatorA)));
      await env.denied(env.as(mediatorA).set('meeting_sessions/falsa', validSession(mediatorA, { mediatorEmail: mediatorB.email })));
    });
    test('aluno não cria, altera nem apaga sessão', async () => {
      await env.denied(env.as(studentA).set('meeting_sessions/nova', validSession(studentA)));
      await env.denied(env.as(studentA).set(`meeting_sessions/${SESSIONS.anaOnly}/topic`, 'Outro'));
      await env.denied(env.as(studentA).remove(`meeting_sessions/${SESSIONS.anaOnly}`));
    });
    test('presença e índice reverso só entram juntos (update multicaminho)', async () => {
      const carla = env.as(mediatorA);
      const entry = { name: 'Bruno Aluno', email: studentB.email, addedAt: NOW };
      await env.denied(carla.set(`meeting_sessions/${SESSIONS.anaOnly}/attendees/${studentB.uid}`, entry));
      await env.denied(carla.set(`user_sessions/${studentB.uid}/${SESSIONS.anaOnly}`, true));
      await env.allowed(carla.update('/', {
        [`meeting_sessions/${SESSIONS.anaOnly}/attendees/${studentB.uid}`]: entry,
        [`user_sessions/${studentB.uid}/${SESSIONS.anaOnly}`]: true,
      }));
    });
    test('presença não aceita uid sem perfil', async () => {
      await env.denied(env.as(mediatorA).update('/', {
        [`meeting_sessions/${SESSIONS.anaOnly}/attendees/${noProfile.uid}`]: { addedAt: NOW },
        [`user_sessions/${noProfile.uid}/${SESSIONS.anaOnly}`]: true,
      }));
    });
    test('exclusão atômica de sessão, cards e índices: mediador sim, aluno não', async () => {
      const removal = {
        [`meeting_sessions/${SESSIONS.both}`]: null,
        [`flashcards/${SESSIONS.both}`]: null,
        [`user_sessions/${studentA.uid}/${SESSIONS.both}`]: null,
        [`user_sessions/${studentB.uid}/${SESSIONS.both}`]: null,
      };
      await env.denied(env.as(studentA).update('/', removal));
      await env.allowed(env.as(mediatorB).update('/', removal));
      assert.equal(await env.adminGet(`flashcards/${SESSIONS.both}`), null);
    });
  });

  describe('current_session (lida pelo tradutor público)', () => {
    const live = { sessionId: SESSIONS.both, topic: 'Travel', startedAt: NOW };
    test('visitante lê, mas não publica nem apaga', async () => {
      await env.seed({ ...buildSyntheticDatabase(), current_session: live });
      await env.allowed(env.as(null).get('current_session'));
      await env.denied(env.as(null).set('current_session', live));
      await env.denied(env.as(null).remove('current_session'));
    });
    test('aluno não publica; mediador publica sessão existente', async () => {
      await env.denied(env.as(studentA).set('current_session', live));
      await env.allowed(env.as(mediatorB).set('current_session', live));
    });
    test('não publica sessão inexistente nem campos extras (PII)', async () => {
      await env.denied(env.as(mediatorA).set('current_session', { ...live, sessionId: 'nao-existe' }));
      await env.denied(env.as(mediatorA).set('current_session', { ...live, mediatorEmail: mediatorA.email }));
    });
  });

  describe('flashcards', () => {
    test('VISITANTE NÃO CRIA FLASHCARD DIRETO NO BANCO (Issue #5)', async () => {
      await env.seed({ ...buildSyntheticDatabase(), current_session: { sessionId: SESSIONS.both, topic: 'Travel', startedAt: NOW } });
      await env.denied(env.as(null).set(`flashcards/${SESSIONS.both}/card-anonimo`, validCard(SESSIONS.both)));
    });
    test('aluno não cria, edita nem apaga cards', async () => {
      const ana = env.as(studentA);
      await env.denied(ana.set(`flashcards/${SESSIONS.anaOnly}/novo`, validCard(SESSIONS.anaOnly)));
      await env.denied(ana.update(`flashcards/${SESSIONS.anaOnly}/card-ana-1`, { back: 'errado' }));
      await env.denied(ana.remove(`flashcards/${SESSIONS.anaOnly}/card-ana-1`));
    });
    test('mediador cria, edita e apaga cards válidos', async () => {
      const carla = env.as(mediatorA);
      await env.allowed(carla.set(`flashcards/${SESSIONS.anaOnly}/novo`, validCard(SESSIONS.anaOnly)));
      await env.allowed(carla.update(`flashcards/${SESSIONS.anaOnly}/novo`, { front: 'luggage', back: 'bagagem' }));
      await env.allowed(carla.remove(`flashcards/${SESSIONS.anaOnly}/novo`));
    });
    test('esquema do card: tamanhos, sessionId coerente, sessão existente e sem extras', async () => {
      const carla = env.as(mediatorA);
      await env.denied(carla.set(`flashcards/${SESSIONS.anaOnly}/a`, validCard(SESSIONS.anaOnly, { front: '' })));
      await env.denied(carla.set(`flashcards/${SESSIONS.anaOnly}/b`, validCard(SESSIONS.anaOnly, { back: 'x'.repeat(501) })));
      await env.denied(carla.set(`flashcards/${SESSIONS.anaOnly}/c`, validCard(SESSIONS.both)));
      await env.denied(carla.set('flashcards/sessao-inexistente/d', validCard('sessao-inexistente')));
      await env.denied(carla.set(`flashcards/${SESSIONS.anaOnly}/e`, validCard(SESSIONS.anaOnly, { author: 'x' })));
    });
    test('conta sem perfil e conta revogada não leem cards', async () => {
      await env.denied(env.as(noProfile).get(`flashcards/${SESSIONS.anaOnly}`));
      await env.denied(env.as(revoked).get(`flashcards/${SESSIONS.anaOnly}`));
    });
  });

  describe('student_reviews (revisão espaçada)', () => {
    const advance = (stage) => ({ stage, lastReviewedAt: NOW, [`stage${stage}CompletedAt`]: NOW });
    test('aluno avança 0→1 em sessão de que participou (update como reviews.service.js)', async () => {
      await env.allowed(env.as(studentA).update(`student_reviews/${studentA.uid}/${SESSIONS.both}`, advance(1)));
    });
    test('aluno avança 1→2 no registro existente', async () => {
      await env.allowed(env.as(studentA).update(`student_reviews/${studentA.uid}/${SESSIONS.anaOnly}`, advance(2)));
    });
    test('não pula, não regride, não regrava a mesma etapa e não passa de 3', async () => {
      const ana = env.as(studentA);
      await env.denied(ana.update(`student_reviews/${studentA.uid}/${SESSIONS.both}`, advance(2)));
      await env.denied(ana.update(`student_reviews/${studentA.uid}/${SESSIONS.anaOnly}`, advance(1)));
      await env.denied(ana.set(`student_reviews/${studentA.uid}/${SESSIONS.anaOnly}`, { stage: 0, lastReviewedAt: NOW }));
      await env.denied(ana.update(`student_reviews/${studentA.uid}/${SESSIONS.anaOnly}`, { lastReviewedAt: NOW }));
      await env.seed({ ...buildSyntheticDatabase(), student_reviews: { [studentA.uid]: { [SESSIONS.anaOnly]: { stage: 3, stage3CompletedAt: NOW, lastReviewedAt: NOW } } } });
      await env.denied(ana.update(`student_reviews/${studentA.uid}/${SESSIONS.anaOnly}`, advance(4)));
    });
    test('exige carimbo da etapa, data ISO e nenhum campo extra', async () => {
      const ana = env.as(studentA);
      const path = `student_reviews/${studentA.uid}/${SESSIONS.both}`;
      await env.denied(ana.update(path, { stage: 1, lastReviewedAt: NOW }));
      await env.denied(ana.update(path, { ...advance(1), lastReviewedAt: 'ontem' }));
      await env.denied(ana.update(path, { ...advance(1), bonus: 10 }));
    });
    test('aluno não grava progresso de sessão de que não participou', async () => {
      await env.denied(env.as(studentA).update(`student_reviews/${studentA.uid}/${SESSIONS.brunoOnly}`, advance(1)));
    });
    test('aluno não lê nem grava o progresso de outro aluno', async () => {
      await env.denied(env.as(studentB).get(`student_reviews/${studentA.uid}`));
      await env.denied(env.as(studentB).update(`student_reviews/${studentA.uid}/${SESSIONS.both}`, advance(1)));
    });
    test('mediador não altera progresso de aluno, mas registra o próprio estudo', async () => {
      await env.denied(env.as(mediatorA).update(`student_reviews/${studentA.uid}/${SESSIONS.both}`, advance(1)));
      await env.allowed(env.as(mediatorA).update(`student_reviews/${mediatorA.uid}/${SESSIONS.both}`, advance(1)));
    });
    test('conta sem perfil não grava progresso', async () => {
      await env.denied(env.as(noProfile).update(`student_reviews/${noProfile.uid}/${SESSIONS.anaOnly}`, advance(1)));
    });
  });

  describe('user_sessions (índice de presença)', () => {
    test('cada aluno lê só o próprio índice', async () => {
      await env.allowed(env.as(studentA).get(`user_sessions/${studentA.uid}`));
      await env.denied(env.as(studentA).get(`user_sessions/${studentB.uid}`));
      await env.denied(env.as(null).get(`user_sessions/${studentA.uid}`));
    });
    test('aluno não se inscreve sozinho em sessão', async () => {
      await env.denied(env.as(studentA).update('/', {
        [`meeting_sessions/${SESSIONS.brunoOnly}/attendees/${studentA.uid}`]: { addedAt: NOW },
        [`user_sessions/${studentA.uid}/${SESSIONS.brunoOnly}`]: true,
      }));
    });
  });
});
