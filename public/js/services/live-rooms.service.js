import { database, ref, set, push, update, onValue, onDisconnect, query, orderByKey, limitToLast } from '../core/firebase.js';
import { DB_PATHS, dbPath } from './db-paths.js';

const roomRef = (id, ...parts) => ref(database, dbPath(DB_PATHS.liveRooms, id, ...parts));
const chatRef = (id) => ref(database, dbPath(DB_PATHS.liveRoomChat, id));

export function watchRooms(onRooms, onError) {
  return onValue(ref(database, DB_PATHS.liveRooms), (snapshot) => onRooms(snapshot.val() || {}), onError);
}

export async function openLiveRoom({ id, topic, hostUid }) {
  const onlineRef = roomRef(id, 'online');
  const disconnect = onDisconnect(onlineRef);
  const close = () => update(ref(database), {
    [dbPath(DB_PATHS.liveRooms, id)]: null,
    [dbPath(DB_PATHS.liveRoomMembers, id)]: null,
    [dbPath(DB_PATHS.liveRoomChat, id)]: null,
  });

  await set(roomRef(id), { topic, hostUid, slide: topic });
  try {
    await disconnect.remove();
    await set(onlineRef, true);
  } catch (error) {
    await close().catch((cleanupError) => console.error('Falha ao descartar sala:', cleanupError));
    throw error;
  }

  let disconnected = false;
  let closing = false;
  let stopped = false;
  const stopConnection = onValue(ref(database, '.info/connected'), async (snapshot) => {
    if (!snapshot.val()) {
      disconnected = true;
      return;
    }
    if (!disconnected || stopped) return;
    disconnected = false;
    try {
      await disconnect.remove();
      if (!closing && !stopped) await set(onlineRef, true);
    } catch (error) {
      if (!stopped) console.error('Falha ao reabrir sala após reconexão:', error);
    }
  });

  return {
    updateSlide: (text) => set(roomRef(id, 'slide'), text),
    async stop() {
      closing = true;
      try {
        await close();
        stopped = true;
        stopConnection();
        await disconnect.cancel().catch(() => {});
      } finally {
        closing = false;
      }
    },
  };
}

export function joinLiveRoom(id, uid) {
  return set(ref(database, dbPath(DB_PATHS.liveRoomMembers, id, uid)), true);
}

export function watchRoomChat(id, onMessages, onError) {
  const recent = query(chatRef(id), orderByKey(), limitToLast(50));
  return onValue(recent, (snapshot) => {
    const messages = [];
    snapshot.forEach((child) => { messages.push(child.val()); });
    onMessages(messages);
  }, onError);
}

export function sendRoomMessage(id, senderUid, text) {
  return set(push(chatRef(id)), { senderUid, text });
}
