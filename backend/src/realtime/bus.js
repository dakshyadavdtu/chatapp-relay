const listeners = {
  messageCreated: new Set(),
};

export function onMessageCreated(fn) {
  if (typeof fn === 'function') {
    listeners.messageCreated.add(fn);
  }
}

export function emitMessageCreated(messageData) {
  for (const fn of listeners.messageCreated) {
    try {
      fn(messageData);
    } catch {}
  }
}

