export const chatState = {
  activeChatId: null,
};

export function setActiveChatId(chatId) {
  chatState.activeChatId = chatId;
}
