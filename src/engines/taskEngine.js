import { checkAnswer } from './answerChecker.js';
import { getTheory } from './theoryEngine.js';
import { checkAnswerRemotely } from '../services/attemptService.js';
import { isSupabaseConfigured } from '../services/supabaseClient.js';

export async function evaluateTask(task, answer, attemptId) {
  if (task.demoOnly && !isSupabaseConfigured()) return checkAnswer(task, answer);
  if (isSupabaseConfigured()) return checkAnswerRemotely(task, answer, attemptId);
  throw new Error('Проверка реальных заданий недоступна: подключите Supabase Edge Function.');
}

export function getTaskTheory(task, theory) {
  return getTheory(task, theory);
}
