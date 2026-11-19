/**
 * @file Cache do perfil na `sessionStorage`.
 *
 * Guarda papel e e-mail do usuário logado para que o cabeçalho e o menu
 * apareçam corretos já no primeiro instante, antes da resposta do Firebase.
 * O cache é só visual: a cada página o papel é confirmado no banco.
 *
 * As chaves mantêm o prefixo antigo (`fluentech_`) para não deslogar
 * visualmente quem já está com o site aberto durante a atualização.
 */
const KEYS = Object.freeze({
  role: 'fluentech_user_role',
  email: 'fluentech_user_email',
});

/** Lê um valor sem quebrar quando o armazenamento está indisponível (modo privado, iframes). */
function read(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* armazenamento indisponível: o site funciona sem o cache */
  }
}

function erase(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* idem */
  }
}

export const sessionCache = Object.freeze({
  /** @returns {string|null} */
  getRole: () => read(KEYS.role),
  /** @param {string} role */
  setRole: (role) => write(KEYS.role, role),
  /** @returns {string|null} */
  getEmail: () => read(KEYS.email),
  /** @param {string} email */
  setEmail: (email) => write(KEYS.email, email),
  /** Apaga apenas as chaves deste site. */
  clear: () => {
    erase(KEYS.role);
    erase(KEYS.email);
  },
});
