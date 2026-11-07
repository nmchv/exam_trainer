import { LOCAL_STATE_KEY } from '../config.js';

function readStore() {
  try {
    const raw = localStorage.getItem(LOCAL_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    throw new Error(`Не удалось прочитать локальные данные: ${error.message}`);
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(store));
  } catch (error) {
    throw new Error(`Не удалось сохранить локальные данные: ${error.message}`);
  }
}

export function getLocalState(key, fallback = null) {
  const store = readStore();
  return store[key] ?? fallback;
}

export function setLocalState(key, value) {
  const store = readStore();
  store[key] = value;
  writeStore(store);
}

export function removeLocalState(key) {
  const store = readStore();
  delete store[key];
  writeStore(store);
}
