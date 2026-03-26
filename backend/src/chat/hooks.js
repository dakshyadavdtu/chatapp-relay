let onMessageCreated = () => {};

export function setOnMessageCreated(handler) {
  onMessageCreated = typeof handler === 'function' ? handler : () => {};
}

export function notifyMessageCreated(message) {
  try {
    onMessageCreated(message);
  } catch {}
}

