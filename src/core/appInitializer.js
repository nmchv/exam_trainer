import { loadRegistry } from '../database/registryLoader.js';
import { restoreAttempt } from '../services/attemptService.js';
import { createState } from './state.js';

export async function initializeApp() {
  const [registry, savedAttempt] = await Promise.all([
    loadRegistry(),
    Promise.resolve(restoreAttempt())
  ]);
  return createState({
    registry,
    savedAttempt,
    activeAttempt: null,
    user: null,
    error: null
  });
}
