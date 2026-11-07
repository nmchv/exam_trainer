export function createState(initial = {}) {
  let value = Object.freeze({ ...initial });
  const subscriptions = new Set();

  return {
    get() {
      return value;
    },
    update(patch) {
      value = Object.freeze({ ...value, ...patch });
      for (const subscriber of subscriptions) subscriber(value);
      return value;
    },
    subscribe(subscriber) {
      subscriptions.add(subscriber);
      return () => subscriptions.delete(subscriber);
    }
  };
}
