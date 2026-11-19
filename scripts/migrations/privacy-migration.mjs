/**
 * @file Plano de migração de privacidade (Issue #10) — funções puras.
 *
 * Entrada: a árvore de um BACKUP exportado do Realtime Database (JSON).
 * Saída: um mapa de updates multicaminho para revisão humana. Nada aqui
 * conecta ao Firebase. O plano deve ser aplicado por pessoa autorizada, com
 * privilégio administrativo (que ignora as regras), depois de backup testado
 * e primeiro em staging.
 *
 * O plano:
 * 1. remove `name` e `email` de presenças antigas (mantém `addedAt`; se faltar,
 *    usa o início da sessão e registra);
 * 2. garante `user_sessions/{uid}/{sessionId} = { topic, startedAt }` para cada
 *    presença (cria o que falta e atualiza entradas antigas `true`);
 * 3. só RELATA índices órfãos (sessão inexistente ou sem a presença): apagar
 *    dado é decisão humana.
 */

/**
 * @param {object} database árvore completa do backup
 * @returns {{ updates: Record<string, unknown>, stats: object, orphans: string[] }}
 */
export function planPrivacyMigration(database) {
  const sessions = database?.meeting_sessions || {};
  const index = database?.user_sessions || {};
  const updates = {};
  const stats = { sessions: 0, attendees: 0, piiRemoved: 0, addedAtFilled: 0, indexCreated: 0, indexUpgraded: 0 };

  for (const [sessionId, session] of Object.entries(sessions)) {
    if (!session || typeof session !== 'object') continue;
    stats.sessions++;
    const summary = { topic: String(session.topic || ''), startedAt: String(session.startedAt || '') };
    for (const [uid, attendee] of Object.entries(session.attendees || {})) {
      stats.attendees++;
      const base = `meeting_sessions/${sessionId}/attendees/${uid}`;
      if (attendee && typeof attendee === 'object') {
        if ('name' in attendee || 'email' in attendee) {
          updates[`${base}/name`] = null;
          updates[`${base}/email`] = null;
          stats.piiRemoved++;
        }
        if (!attendee.addedAt && summary.startedAt) {
          updates[`${base}/addedAt`] = summary.startedAt;
          stats.addedAtFilled++;
        }
      }
      const current = index[uid]?.[sessionId];
      if (current === undefined || current === null) {
        updates[`user_sessions/${uid}/${sessionId}`] = summary;
        stats.indexCreated++;
      } else if (current === true) {
        updates[`user_sessions/${uid}/${sessionId}`] = summary;
        stats.indexUpgraded++;
      }
    }
  }

  const orphans = [];
  for (const [uid, entries] of Object.entries(index)) {
    for (const sessionId of Object.keys(entries || {})) {
      if (!sessions[sessionId]?.attendees?.[uid]) orphans.push(`user_sessions/${uid}/${sessionId}`);
    }
  }
  return { updates, stats, orphans };
}
