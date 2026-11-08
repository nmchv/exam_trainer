import { LOCAL_STATE_KEY } from '../config.js';
import { createUuid } from '../utils/uuid.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';
import { getLocalState, removeLocalState, setLocalState } from './storageManager.js';

const ACTIVE_KEY = 'activeAttempt';
let remoteSaveQueue = Promise.resolve();

export function createAttempt({ examId, mode, tasks, durationMinutes = null, id = createUuid() }) {
  return {
    id,
    examId,
    mode,
    taskIds: tasks.map((task) => task.id),
    attemptTaskIds: Object.fromEntries(tasks.map((task) => [task.id, createUuid()])),
    tasks,
    answers: {},
    checks: {},
    currentIndex: 0,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    durationMinutes,
    deadline: durationMinutes ? Date.now() + durationMinutes * 60_000 : null,
    finishedAt: null
  };
}

export function restoreAttempt() {
  const attempt = getLocalState(ACTIVE_KEY);
  return attempt?.status === 'in_progress' ? attempt : null;
}

export function saveAttempt(attempt) {
  setLocalState(ACTIVE_KEY, attempt);
  return attempt;
}

export function clearActiveAttempt() {
  removeLocalState(ACTIVE_KEY);
}

export function saveAttemptRemotely(attempt) {
  const operation = remoteSaveQueue.then(() => saveAttemptSnapshot(attempt));
  remoteSaveQueue = operation.catch(() => undefined);
  return operation;
}

async function saveAttemptSnapshot(attempt) {
  if (!isSupabaseConfigured()) return null;
  const supabase = await getSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Войдите в аккаунт, чтобы сохранять попытку в Supabase.');
  const payload = {
    id: attempt.id,
    user_id: authData.user.id,
    exam_id: attempt.examId,
    mode: attempt.mode,
    status: attempt.status,
    started_at: attempt.startedAt,
    state: {
      task_ids: attempt.taskIds,
      current_index: attempt.currentIndex,
      deadline: attempt.deadline
    }
  };
  const { data: existingAttempt, error: lookupError } = await supabase.from('attempts')
    .select('id').eq('id', attempt.id).maybeSingle();
  if (lookupError) throw lookupError;
  const attemptWrite = existingAttempt
    ? supabase.from('attempts').update({ state: payload.state }).eq('id', attempt.id)
    : supabase.from('attempts').insert(payload);
  const { error } = await attemptWrite;
  if (error) throw error;
  const taskRows = attempt.tasks.map((task, position) => ({
    id: attempt.attemptTaskIds[task.id],
    attempt_id: attempt.id,
    task_id: task.id,
    variant_id: task.variantId ?? null,
    position,
    max_score: Number(task.maxScore ?? 1)
  }));
  const { error: tasksError } = await supabase.from('attempt_tasks').upsert(taskRows, { onConflict: 'id' });
  if (tasksError) throw tasksError;
  const answerRows = Object.entries(attempt.answers).map(([taskId, userAnswer]) => ({
    id: attempt.attemptTaskIds[taskId],
    attempt_task_id: attempt.attemptTaskIds[taskId],
    user_answer: userAnswer,
    answered_at: new Date().toISOString()
  }));
  if (answerRows.length) {
    const { error: answersError } = await supabase.from('attempt_answers').upsert(answerRows, { onConflict: 'attempt_task_id' });
    if (answersError) throw answersError;
  }
  return true;
}

export async function getRemoteUnfinishedAttempt() {
  const supabase = await getSupabaseClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!userData.user) return null;
  const { data: attempt, error } = await supabase.from('attempts')
    .select('id, exam_id, mode, status, started_at, state, task_rows:attempt_tasks(id, task_id, variant_id, position, max_score, answers:attempt_answers(user_answer))')
    .eq('user_id', userData.user.id)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return attempt;
}

export async function checkAnswerRemotely(task, answer, attemptId) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('check-answer', {
    body: { taskId: task.id, answer, attemptId }
  });
  if (error) throw error;
  if (!data || (typeof data.correct !== 'boolean' && !(data.correct === null && data.manualReview))) {
    throw new Error('Сервис проверки вернул некорректный ответ.');
  }
  return data;
}

export async function finishAttemptRemotely(attempt) {
  await saveAttemptRemotely(attempt);
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('finish-attempt', {
    body: { attemptId: attempt.id }
  });
  if (error) throw error;
  if (!data?.result || !Array.isArray(data.result.results)) {
    throw new Error('Сервис завершения попытки вернул некорректный результат.');
  }
  return data;
}

export function getLocalAttemptStoreKey() {
  return LOCAL_STATE_KEY;
}
