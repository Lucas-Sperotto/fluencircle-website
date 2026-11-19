// Substituto de https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js nos testes E2E.
// Só registra as apps criadas, para o teste conferir qual projeto a página escolheu.
const apps = new Map();

export function initializeApp(options, name = '[DEFAULT]') {
  if (apps.has(name)) return apps.get(name);
  const app = { name, options: { ...options } };
  apps.set(name, app);
  globalThis.__e2eFirebase = globalThis.__e2eFirebase || { apps: {}, emulators: [] };
  globalThis.__e2eFirebase.apps[name] = { projectId: options?.projectId, databaseURL: options?.databaseURL };
  return app;
}

export function getApp(name = '[DEFAULT]') {
  if (!apps.has(name)) throw new Error(`No Firebase App '${name}'`);
  return apps.get(name);
}

export function getApps() {
  return [...apps.values()];
}
