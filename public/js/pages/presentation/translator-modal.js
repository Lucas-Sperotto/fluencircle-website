/**
 * @file Tradutor da sessão ao vivo: traduz pelo backend e salva o par como flashcard.
 */
import { translateText } from '../../services/translate.service.js';
import { addFlashcard } from '../../services/flashcards.service.js';
import { TRANSLATOR_MAX_LENGTH } from '../../config/app.config.js';
import { byId, setBusy } from '../../ui/dom.js';
import { showToast } from '../../ui/toast.js';

/** Classe que marca o botão "Salvar Flashcard" como indisponível (sem tradução atual). */
const INACTIVE = 'unactive';

/**
 * @param {() => { id: string, topic: string } | null} getActiveSession sessão em andamento
 */
export function createTranslatorModal(getActiveSession) {
  const modal = byId('translator-modal');
  const openButton = byId('open-translator-btn');
  const closeButton = byId('close-translator-btn');
  const sourceInput = byId('normal-text');
  const resultInput = byId('translated-text');
  const translateButton = byId('translate-btn');
  const saveButton = byId('add-flashcards-btn');
  sourceInput.maxLength = TRANSLATOR_MAX_LENGTH;

  const setSaveEnabled = (enabled) => {
    saveButton.classList.toggle(INACTIVE, !enabled);
    saveButton.setAttribute('aria-disabled', String(!enabled));
  };

  function open() {
    modal.classList.remove('hidden');
    sourceInput.value = '';
    resultInput.value = '';
    setSaveEnabled(false);
    sourceInput.focus();
  }

  function close() {
    modal.classList.add('hidden');
  }

  async function translate() {
    const text = sourceInput.value.trim();
    if (!text) {
      sourceInput.focus();
      return;
    }
    setSaveEnabled(false);
    resultInput.value = 'Traduzindo...';
    translateButton.disabled = true;
    try {
      resultInput.value = await translateText(text);
      setSaveEnabled(Boolean(resultInput.value));
    } catch (error) {
      console.error('Erro no tradutor:', error);
      resultInput.value = 'Erro ao traduzir';
      showToast('Falha na conexão do tradutor.', 'error');
    } finally {
      translateButton.disabled = false;
    }
  }

  async function saveFlashcard() {
    const session = getActiveSession();
    if (!session) {
      showToast('Nenhuma sessão ativa.', 'error');
      return;
    }
    const front = sourceInput.value.trim();
    const back = resultInput.value.trim();
    if (!front || !back || saveButton.classList.contains(INACTIVE)) return;

    const restore = setBusy(saveButton, 'Salvando...');
    try {
      await addFlashcard(session.id, { front, back, topic: session.topic });
      showToast(`Card "${front}" adicionado aos Flashcards!`, 'success');
      close();
    } catch (error) {
      console.error('Erro ao salvar card:', error);
      showToast('Erro ao salvar no banco.', 'error');
    } finally {
      restore();
    }
  }

  openButton.addEventListener('click', (event) => {
    event.stopPropagation();
    open();
  });
  closeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    close();
  });
  modal.addEventListener('click', (event) => {
    if (!event.target.closest('.modal')) close();
  });
  translateButton.addEventListener('click', (event) => {
    event.stopPropagation();
    translate();
  });
  // Qualquer tecla invalida a tradução atual (o texto pode ter mudado). Enter traduz de novo.
  sourceInput.addEventListener('keyup', (event) => {
    setSaveEnabled(false);
    if (event.key === 'Enter') translate();
  });
  saveButton.addEventListener('click', (event) => {
    event.stopPropagation();
    saveFlashcard();
  });

  return { close, isOpen: () => !modal.classList.contains('hidden') };
}
