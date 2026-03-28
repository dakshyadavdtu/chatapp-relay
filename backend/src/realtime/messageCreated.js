let subscriber = () => {};

export function subscribeMessageCreated(handler) {
  subscriber = typeof handler === 'function' ? handler : () => {};
}

export function publishMessageCreated(evt) {
  try {
    subscriber(evt);
  } catch {}
}
