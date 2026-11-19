/**
 * @file Aviso flutuante (toast) no canto da tela. Único para o site todo.
 */
import { TOAST_DURATION_MS } from '../config/app.config.js';

const TOAST_ID = 'app-toast';

/**
 * @param {string} message
 * @param {'success'|'error'|'info'} [type]
 */
export function showToast(message, type = 'success') {
  let toast = document.getElementById(TOAST_ID);
  if (!toast) {
    toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast toast-${type} toast-visible`;
  clearTimeout(toast.hideTimer);
  toast.hideTimer = setTimeout(() => toast.classList.remove('toast-visible'), TOAST_DURATION_MS);
}
