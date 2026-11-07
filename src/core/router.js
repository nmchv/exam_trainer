const knownRoutes = new Set([
  'home', 'dashboard', 'exams', 'training', 'theory', 'test', 'results',
  'profile', 'errors', 'progress', 'history'
]);

export function parseRoute(hash = globalThis.location?.hash ?? '') {
  const [route = 'home', ...parts] = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return {
    name: knownRoutes.has(route) ? route : 'home',
    params: parts.map((part) => decodeURIComponent(part))
  };
}

export function navigate(route, ...params) {
  const path = [route, ...params].map((part) => encodeURIComponent(part)).join('/');
  globalThis.location.hash = `/${path}`;
}

export function subscribeToRoute(listener) {
  const handle = () => listener(parseRoute());
  globalThis.addEventListener('hashchange', handle);
  handle();
  return () => globalThis.removeEventListener('hashchange', handle);
}
