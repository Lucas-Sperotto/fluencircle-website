/**
 * @file Criação de conta com compensação (Issue #8) — orquestração sem Firebase.
 *
 * No navegador, criar uma conta são DUAS escritas em serviços diferentes:
 * a conta no Firebase Auth e o perfil em `users/{uid}`. Antes, se o perfil
 * falhasse (regra, rede, validação), sobrava uma conta de login sem perfil
 * ("órfã"). Agora a falha do perfil desfaz a conta recém-criada.
 *
 * Limite: se o desfazer também falhar, a conta órfã é informada com o uid para
 * o operador remover. A solução definitiva é criar contas no backend com o
 * Admin SDK (docs/backend/CONTRATO_BACKEND.md).
 *
 * As etapas são injetadas, então a lógica é testável sem Firebase.
 */

/** Erro de criação de conta com o resultado da compensação. */
export class AccountCreationError extends Error {
  /**
   * @param {string} message
   * @param {{ code: string, rolledBack: boolean, orphanUid: string|null, cause?: unknown }} details
   */
  constructor(message, { code, rolledBack, orphanUid, cause }) {
    super(message, { cause });
    this.name = 'AccountCreationError';
    this.code = code;
    this.rolledBack = rolledBack;
    this.orphanUid = orphanUid;
  }
}

async function safeSignOut(signOutSecondary) {
  try {
    await signOutSecondary();
  } catch (error) {
    // A instância secundária é isolada: falhar aqui não afeta a sessão do admin.
    console.warn('Falha ao encerrar a sessão auxiliar de cadastro:', error);
  }
}

/**
 * @param {Object} steps
 * @param {() => Promise<{ uid: string }>} steps.createAuthUser cria a conta (instância secundária)
 * @param {(uid: string) => Promise<void>} steps.writeProfile grava o perfil (sessão do admin)
 * @param {(user: { uid: string }) => Promise<void>} steps.deleteAuthUser desfaz a conta criada
 * @param {() => Promise<void>} steps.signOutSecondary sai da instância secundária
 * @returns {Promise<string>} uid da conta criada
 * @throws {AccountCreationError|Error} erro do Auth (ex.: e-mail em uso) ou do perfil, com compensação
 */
export async function createAccountWithRollback({ createAuthUser, writeProfile, deleteAuthUser, signOutSecondary }) {
  const user = await createAuthUser();
  try {
    await writeProfile(user.uid);
  } catch (profileError) {
    let rolledBack = false;
    try {
      await deleteAuthUser(user);
      rolledBack = true;
    } catch (deleteError) {
      console.error('Não foi possível desfazer a conta de login criada:', deleteError);
    }
    await safeSignOut(signOutSecondary);
    throw new AccountCreationError(
      rolledBack
        ? 'O perfil não pôde ser gravado e a conta de login criada foi desfeita.'
        : 'O perfil não pôde ser gravado e a conta de login criada ficou sem perfil.',
      { code: 'profile-write-failed', rolledBack, orphanUid: rolledBack ? null : user.uid, cause: profileError },
    );
  }
  await safeSignOut(signOutSecondary);
  return user.uid;
}
