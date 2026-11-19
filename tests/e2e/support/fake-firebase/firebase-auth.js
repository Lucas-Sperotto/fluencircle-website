// Substituto de firebase-auth.js (CDN) nos testes E2E. As contas ficam no
// processo de teste (Node), compartilhadas entre abas e contextos; a sessão de
// cada app fica no localStorage, como a persistência do SDK real.
const rpc = (op, payload) => globalThis.__e2eRpc(op, payload);
const instances = new Map();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

globalThis.__e2eAuthState = globalThis.__e2eAuthState || {};

function authError(code) {
  return Object.assign(new Error(`Firebase: Error (${code}).`), { code });
}

function storageKey(appName) {
  return `__e2e_auth:${appName}`;
}

function makeUser(record, auth) {
  return { uid: record.uid, email: record.email, _auth: auth, getIdToken: async () => `e2e-token-${record.uid}` };
}

function setCurrentUser(auth, record) {
  auth.currentUser = record ? makeUser(record, auth) : null;
  globalThis.__e2eAuthState[auth.app.name] = record ? { uid: record.uid, email: record.email } : null;
  try {
    if (record) localStorage.setItem(storageKey(auth.app.name), JSON.stringify(record));
    else localStorage.removeItem(storageKey(auth.app.name));
  } catch { /* armazenamento indisponível */ }
  for (const listener of auth.listeners) setTimeout(() => listener(auth.currentUser), 0);
}

export function getAuth(app) {
  const name = app?.name || '[DEFAULT]';
  if (instances.has(name)) return instances.get(name);
  const auth = { app: app || { name }, currentUser: null, listeners: new Set() };
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(storageKey(name)) || 'null'); } catch { saved = null; }
  if (saved) {
    auth.currentUser = makeUser(saved, auth);
    globalThis.__e2eAuthState[name] = { uid: saved.uid, email: saved.email };
  }
  instances.set(name, auth);
  return auth;
}

export function connectAuthEmulator(auth, url) {
  globalThis.__e2eFirebase = globalThis.__e2eFirebase || { apps: {}, emulators: [] };
  globalThis.__e2eFirebase.emulators.push({ service: 'auth', app: auth.app.name, url });
}

export function onAuthStateChanged(auth, callback) {
  auth.listeners.add(callback);
  setTimeout(() => callback(auth.currentUser), 15);
  return () => auth.listeners.delete(callback);
}

export async function signInWithEmailAndPassword(auth, email, password) {
  await delay(10);
  if (!email || !/^[^@\s]+@[^@\s]+$/.test(email)) throw authError('auth/invalid-email');
  if (!password) throw authError('auth/missing-password');
  const result = await rpc('auth.signIn', { email, password });
  if (result.error) throw authError(result.error);
  setCurrentUser(auth, result.user);
  return { user: auth.currentUser };
}

export async function createUserWithEmailAndPassword(auth, email, password) {
  await delay(10);
  const result = await rpc('auth.createUser', { email, password });
  if (result.error) throw authError(result.error);
  setCurrentUser(auth, result.user);
  return { user: auth.currentUser };
}

export async function deleteUser(user) {
  const result = await rpc('auth.deleteUser', { uid: user.uid });
  if (result.error) throw authError(result.error);
  if (user._auth?.currentUser?.uid === user.uid) setCurrentUser(user._auth, null);
}

export async function signOut(auth) {
  await delay(5);
  setCurrentUser(auth, null);
}
