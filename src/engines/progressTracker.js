import { getLocalState, setLocalState } from '../services/storageManager.js';

const EMPTY_PROGRESS = { attempts: [], taskProgress: {}, topicProgress: {}, mistakes: [] };

export function getProgress() {
  return { ...EMPTY_PROGRESS, ...getLocalState('progress', EMPTY_PROGRESS) };
}

export function recordAttempt(attempt, result) {
  const progress = getProgress();
  progress.attempts.unshift({
    id: attempt.id,
    examId: attempt.examId,
    mode: attempt.mode,
    score: result.score,
    maxScore: result.maxScore,
    percentage: result.percentage,
    finishedAt: new Date().toISOString(),
    taskIds: attempt.taskIds,
    details: {
      attempt: {
        id: attempt.id,
        examId: attempt.examId,
        mode: attempt.mode,
        tasks: attempt.tasks,
        taskIds: attempt.taskIds,
        answers: attempt.answers,
        durationMinutes: attempt.durationMinutes,
        startedAt: attempt.startedAt
      },
      result
    }
  });
  for (const item of result.results) {
    const current = progress.taskProgress[item.taskId] ?? { attempts: 0, correct: 0 };
    current.attempts += 1;
    if (item.correct === true) current.correct += 1;
    progress.taskProgress[item.taskId] = current;
    if (item.correct === false && !progress.mistakes.includes(item.taskId)) progress.mistakes.push(item.taskId);
    if (item.correct === true) progress.mistakes = progress.mistakes.filter((id) => id !== item.taskId);
    const task = attempt.tasks.find((candidate) => candidate.id === item.taskId);
    for (const tag of task?.tags ?? []) {
      const topic = progress.topicProgress[tag] ?? { attempts: 0, correct: 0 };
      topic.attempts += 1;
      if (item.correct === true) topic.correct += 1;
      progress.topicProgress[tag] = topic;
    }
  }
  setLocalState('progress', progress);
  return progress;
}

export function getMistakeIds() {
  return getProgress().mistakes;
}
