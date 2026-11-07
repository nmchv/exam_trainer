const listeners = new Map();

export const eventBus = {
  on(type, listener) {
    if (typeof listener !== 'function') throw new TypeError('Listener must be a function');
    const bucket = listeners.get(type) ?? new Set();
    bucket.add(listener);
    listeners.set(type, bucket);
    return () => bucket.delete(listener);
  },
  emit(type, detail) {
    for (const listener of listeners.get(type) ?? []) listener(detail);
  },
  clear() {
    listeners.clear();
  }
};
