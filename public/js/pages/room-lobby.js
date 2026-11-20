import { joinLiveRoom, sendRoomMessage, watchRoomChat, watchRooms } from '../services/live-rooms.service.js';
import { byId, h, replaceContent } from '../ui/dom.js';

export function initRoomLobby(uid) {
  const list = byId('room-list');
  const view = byId('room-view');
  const status = byId('room-status');
  const chat = byId('room-chat');
  const input = byId('room-message');
  const send = byId('send-room-message');
  let rooms = {};
  let selectedId = null;
  let joining = false;
  let sending = false;
  let stopChat;
  let requestedId = new URLSearchParams(location.search).get('sala');

  function showRoom() {
    const room = rooms[selectedId];
    byId('room-topic').textContent = room.topic;
    byId('room-slide').textContent = room.slide;
    send.disabled = sending || !room.online;
    status.textContent = room.online ? '' : 'Aguardando o mediador reconectar.';
  }

  function showList(message) {
    const onlineRooms = Object.entries(rooms).filter(([, room]) => room.online === true);
    replaceContent(list, onlineRooms.map(([id, room]) => h('li', null,
      h('button', { class: 'home-btn home-btn-secondary', type: 'button', onclick: () => enterRoom(id) },
        `Entrar em ${room.topic}`))));
    status.textContent = message ?? (onlineRooms.length ? '' : 'Nenhum círculo ao vivo.');
  }

  function leaveRoom(message) {
    stopChat?.();
    stopChat = null;
    selectedId = null;
    view.classList.add('hidden');
    list.classList.remove('hidden');
    input.value = '';
    chat.replaceChildren();
    showList(message);
  }

  async function enterRoom(id) {
    if (joining || selectedId || !rooms[id]?.online) return;
    joining = true;
    status.textContent = 'Entrando na sala…';
    try {
      await joinLiveRoom(id, uid);
      if (!rooms[id]) {
        showList('A sala foi encerrada.');
        return;
      }
      selectedId = id;
      list.classList.add('hidden');
      view.classList.remove('hidden');
      showRoom();
      byId('leave-room').focus();
      stopChat = watchRoomChat(id, (messages) => {
        const hostUid = rooms[id]?.hostUid;
        replaceContent(chat, messages.map(({ senderUid, text }) => {
          const sender = senderUid === uid ? 'Você' : senderUid === hostUid ? 'Mediador' : 'Participante';
          return h('li', null, h('strong', null, `${sender} `), text);
        }));
        chat.scrollTop = chat.scrollHeight;
      }, () => leaveRoom('O chat desta sala foi desconectado.'));
    } catch {
      showList('Falha ao entrar na sala. Tente novamente.');
    } finally {
      joining = false;
    }
  }

  byId('leave-room').addEventListener('click', () => {
    leaveRoom();
    list.querySelector('button')?.focus();
  });
  byId('room-chat-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = selectedId;
    const text = input.value.trim();
    if (!id || !rooms[id]?.online || !text || sending) return;
    sending = true;
    send.disabled = true;
    try {
      await sendRoomMessage(id, uid, text);
      if (selectedId === id && input.value.trim() === text) input.value = '';
    } catch {
      if (selectedId === id) status.textContent = 'Falha ao enviar a mensagem. Tente novamente.';
    } finally {
      sending = false;
      send.disabled = !rooms[selectedId]?.online;
    }
  });

  byId('live-rooms').classList.remove('hidden');
  watchRooms((updatedRooms) => {
    rooms = updatedRooms;
    if (selectedId) {
      if (rooms[selectedId]) showRoom();
      else leaveRoom('A sala foi encerrada.');
      return;
    }
    const openId = requestedId;
    requestedId = null;
    showList(openId && !rooms[openId]?.online ? 'A sala não está disponível.' : undefined);
    if (openId) enterRoom(openId);
  }, () => leaveRoom('Falha ao carregar os círculos ao vivo.'));
}
