/**
 * @file Medição SINTÉTICA do volume que a tela de flashcards de um aluno baixa,
 * antes e depois da leitura por índice (Issue #10).
 *
 *   node scripts/benchmarks/read-volume.mjs [sessões] [alunos] [presentes/sessão] [cards/sessão]
 *
 * Mede bytes do JSON lido e número de leituras, com dados gerados de forma
 * determinística (mesma semente = mesmo resultado). Não mede latência real de
 * rede nem custo do Firebase: é uma estimativa proporcional, sem serviço externo.
 */
const [sessionsCount = 200, studentsCount = 60, attendeesPerSession = 12, cardsPerSession = 15] = process.argv.slice(2).map(Number);

let seed = 20261119;
const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const bytes = (value) => (value === undefined || value === null ? 0 : Buffer.byteLength(JSON.stringify(value)));

const students = Array.from({ length: studentsCount }, (_, i) => `aluno-${String(i).padStart(3, '0')}`);
const meetingSessions = {};
const flashcards = {};
const userSessions = {};
for (let s = 0; s < sessionsCount; s++) {
  const id = `sessao-${String(s).padStart(4, '0')}`;
  const startedAt = new Date(Date.UTC(2026, 0, 1) + s * 86400000).toISOString();
  const topic = `Tema sintético ${s % 37}`;
  const attendeesLegacy = {};
  const picked = new Set();
  while (picked.size < Math.min(attendeesPerSession, studentsCount)) picked.add(students[Math.floor(random() * studentsCount)]);
  for (const uid of picked) {
    attendeesLegacy[uid] = { name: `Pessoa ${uid}`, email: `${uid}@example.test`, addedAt: startedAt };
    (userSessions[uid] ||= {})[id] = { topic, startedAt };
  }
  meetingSessions[id] = { templateId: `tema-${s % 37}`, topic, startedAt, mediatorEmail: 'mediador@example.test', attendees: attendeesLegacy };
  flashcards[id] = Object.fromEntries(Array.from({ length: cardsPerSession }, (_, c) => [`card-${c}`, { front: `palavra ${c} da sessão ${s}`, back: `tradução ${c}`, topic, sessionId: id, createdAt: startedAt }]));
}

// Aluno com mais presenças (pior caso realista).
const student = Object.entries(userSessions).sort((a, b) => Object.keys(b[1]).length - Object.keys(a[1]).length)[0][0];
const mine = Object.keys(userSessions[student]);

const before = { reads: 2, bytes: bytes(meetingSessions) + bytes(flashcards) };
const after = { reads: 1 + mine.length, bytes: bytes(userSessions[student]) + mine.reduce((total, id) => total + bytes(flashcards[id]), 0) };
const exposedBefore = Object.values(meetingSessions).reduce((total, session) => total + Object.keys(session.attendees).filter((uid) => uid !== student).length, 0);

const kb = (n) => `${(n / 1024).toFixed(1)} KiB`;
console.log(`Dados sintéticos: ${sessionsCount} sessões, ${studentsCount} alunos, ${attendeesPerSession} presentes/sessão, ${cardsPerSession} cards/sessão.`);
console.log(`Aluno medido: ${student} (${mine.length} sessões). Leitura de student_reviews/{uid} é igual nos dois casos e não entra na soma.`);
console.table([
  { abordagem: 'antes: meeting_sessions + flashcards inteiros', leituras: before.reads, volume: kb(before.bytes), 'presenças de outras pessoas expostas': exposedBefore },
  { abordagem: 'depois: user_sessions/{uid} + flashcards/{sessão}', leituras: after.reads, volume: kb(after.bytes), 'presenças de outras pessoas expostas': 0 },
]);
console.log(`Redução de volume: ${(100 * (1 - after.bytes / before.bytes)).toFixed(1)}% · leituras passam de ${before.reads} grandes para ${after.reads} pequenas (em paralelo).`);
