import { storageNotReady } from './notReady.js';

export function createStorage() {
  const n = () => storageNotReady();

  return {
    ready: false,
    chats: {
      async get(_chatId) {
        n();
      },
      async listForUser(_userId) {
        n();
      },
    },
    messages: {
      async append(_record) {
        n();
      },
      async getById(_messageId) {
        n();
      },
      async listByChatId(_chatId, _opts) {
        n();
      },
    },
    rooms: {
      async get(_id) {
        n();
      },
    },
  };
}
