export function createChatService(storage) {
  if (!storage || typeof storage !== 'object') {
    throw new Error('storage required');
  }
  return {
    async listChatsForUser(userId) {
      return storage.chats.listForUser(userId);
    },
    async getChat(chatId) {
      return storage.chats.get(chatId);
    },
  };
}
