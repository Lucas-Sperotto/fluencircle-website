/**
 * @file Acessos (admin.html): cadastro, edição de papel e exclusão de contas.
 *
 * Restrito a administradores. Limitações conhecidas (docs/AUDITORIA.md):
 * a criação de contas roda no navegador e a exclusão é só lógica (lista de bloqueio).
 */
import { initProtectedPage } from './shared/page-setup.js';
import { listUsers, createUserAccount, updateUserProfile, revokeUser } from '../services/users.service.js';
import { displayName, sortUsersByName, filterUsers, avatarInitial } from '../domain/users.js';
import { ROLES, ROLE_LABELS, roleLabel, normalizeRole } from '../core/roles.js';
import { sessionCache } from '../core/session-cache.js';
import { MIN_PASSWORD_LENGTH } from '../config/app.config.js';
import { h, icon, byId, replaceContent, setBusy } from '../ui/dom.js';
import { applyRoleVisibility } from '../ui/app-shell.js';
import { showToast } from '../ui/toast.js';
import { confirmDialog } from '../ui/confirm-dialog.js';

const tableBody = byId('users-table-body');
const searchInput = byId('admin-search-bar');
const modal = byId('user-form-modal');
const form = byId('user-form');
const modalTitle = byId('user-modal-title');
const firstNameInput = byId('user-firstname');
const lastNameInput = byId('user-lastname');
const emailInput = byId('user-email-input');
const passwordInput = byId('user-password-input');
const passwordField = byId('password-field-container');
const roleSelect = byId('user-role-select');
const saveButton = byId('save-user-btn');

/** Preenchido na inicialização. */
let currentAdmin = null;
/** Lista completa vinda do banco; a busca filtra em memória. */
let allUsers = [];
/** uid em edição; null quando é um cadastro novo. */
let editingUid = null;

const UID_PREVIEW_LENGTH = 14;

function messageRow(text, { error = false } = {}) {
  return h('tr', null, h('td', { colspan: '5', class: `users-table__message${error ? ' users-table__message--error' : ''}` }, text));
}

async function loadUsers() {
  replaceContent(tableBody, messageRow('Carregando perfis...'));
  try {
    allUsers = await listUsers();
    renderTable();
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
    replaceContent(tableBody, messageRow('Erro ao carregar banco de dados.', { error: true }));
  }
}

function renderTable() {
  if (allUsers.length === 0) {
    replaceContent(tableBody, messageRow('Nenhum usuário cadastrado.'));
    return;
  }
  const visible = filterUsers(sortUsersByName(allUsers), searchInput.value);
  if (visible.length === 0) {
    replaceContent(tableBody, messageRow('Nenhum usuário encontrado.'));
    return;
  }
  replaceContent(tableBody, visible.map(renderUserRow));
}

function renderUserRow(user) {
  const name = displayName(user);
  const role = normalizeRole(user.role);
  const uidPreview = user.uid.length > UID_PREVIEW_LENGTH ? `${user.uid.substring(0, UID_PREVIEW_LENGTH)}...` : user.uid;

  const editButton = h('button', { type: 'button', class: 'action-table-btn edit-btn', title: 'Editar Perfil', 'aria-label': `Editar perfil de ${name}` }, icon('fa-pen'));
  const deleteButton = h('button', { type: 'button', class: 'action-table-btn delete-btn', title: 'Excluir Perfil', 'aria-label': `Excluir perfil de ${name}` }, icon('fa-trash'));
  editButton.addEventListener('click', () => openEditModal(user));
  deleteButton.addEventListener('click', () => removeUser(user.uid, name));

  return h('tr', null,
    h('td', { class: 'user-name-cell' },
      h('div', { class: 'user-name-cell__inner' }, h('div', { class: 'user-avatar', 'aria-hidden': 'true' }, avatarInitial(name)), h('span', null, name))),
    h('td', null, user.email || '—'),
    h('td', { class: 'user-uid-cell', title: user.uid }, uidPreview),
    h('td', null, h('span', { class: `badge-${role}` }, roleLabel(role))),
    // O ' ' entre os botões mantém o espaçamento do layout original.
    h('td', { class: 'user-actions-cell' }, editButton, ' ', deleteButton));
}

/** Opções do papel geradas a partir de ROLE_LABELS (antes o texto divergia: "Participante" x "Aluno"). */
function renderRoleOptions() {
  replaceContent(roleSelect, [ROLES.STUDENT, ROLES.MEDIATOR, ROLES.ADMIN].map((role) => h('option', { value: role }, ROLE_LABELS[role])));
}

function openModal() {
  modal.classList.remove('hidden');
  firstNameInput.focus();
}

function closeModal() {
  modal.classList.add('hidden');
}

function openCreateModal() {
  form.reset();
  editingUid = null;
  modalTitle.textContent = 'Novo Perfil';
  emailInput.disabled = false;
  passwordField.classList.remove('hidden');
  passwordInput.required = true;
  openModal();
}

function openEditModal(user) {
  form.reset();
  editingUid = user.uid;
  modalTitle.textContent = 'Modificar Perfil';
  firstNameInput.value = user.firstName || '';
  lastNameInput.value = user.lastName || '';
  emailInput.value = user.email || '';
  emailInput.disabled = true; // trocar e-mail no Firebase Auth exige reautenticação
  roleSelect.value = normalizeRole(user.role);
  passwordField.classList.add('hidden');
  passwordInput.required = false;
  openModal();
}

async function saveUser(event) {
  event.preventDefault();
  const data = {
    firstName: firstNameInput.value.trim(),
    lastName: lastNameInput.value.trim(),
    role: roleSelect.value,
  };

  if (!editingUid && passwordInput.value.length < MIN_PASSWORD_LENGTH) {
    showToast(`A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`, 'error');
    return;
  }

  const restore = setBusy(saveButton, 'Salvando...');
  try {
    if (editingUid) {
      await updateUserProfile(editingUid, data);
      if (editingUid === currentAdmin.uid) {
        sessionCache.setRole(data.role);
        applyRoleVisibility(data.role);
      }
      showToast('Perfil atualizado com sucesso!', 'success');
    } else {
      await createUserAccount({ ...data, email: emailInput.value.trim(), password: passwordInput.value });
      showToast(`Perfil de ${data.firstName} criado com sucesso!`, 'success');
    }
    closeModal();
    await loadUsers();
  } catch (error) {
    console.error('Erro ao salvar usuário:', error);
    showToast(error.code === 'auth/email-already-in-use'
      ? 'Este e-mail já está cadastrado no sistema.'
      : `Erro ao processar requisição: ${error.message}`, 'error');
  } finally {
    restore();
  }
}

async function removeUser(uid, name) {
  if (uid === currentAdmin.uid) {
    showToast('Você não pode excluir sua própria conta de administrador.', 'error');
    return;
  }
  const confirmed = await confirmDialog({
    title: 'Excluir Perfil',
    message: `Tem certeza de que deseja excluir o perfil de ${name}? O usuário perderá acesso imediato.`,
    confirmText: 'Sim, Excluir',
  });
  if (!confirmed) return;
  try {
    await revokeUser(uid, currentAdmin.email || 'admin');
    showToast('Perfil excluído e acesso permanentemente bloqueado!', 'success');
    await loadUsers();
  } catch (error) {
    console.error('Erro ao excluir perfil:', error);
    showToast('Erro ao remover usuário.', 'error');
  }
}

renderRoleOptions();
searchInput.addEventListener('input', renderTable);
byId('open-create-user-modal-btn').addEventListener('click', openCreateModal);
byId('close-user-modal-btn').addEventListener('click', closeModal);
byId('cancel-user-modal-btn').addEventListener('click', closeModal);
form.addEventListener('submit', saveUser);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
});

const session = await initProtectedPage({ allowedRoles: [ROLES.ADMIN], deniedMessage: 'Acesso negado. Página restrita a Administradores.' });
if (session) {
  currentAdmin = session.user;
  await loadUsers();
}
