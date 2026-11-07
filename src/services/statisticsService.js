import { getRemoteProgress } from './progressService.js';
import { summarizeProgress } from '../engines/statisticsEngine.js';

export async function getRemoteStatistics() {
  const remote = await getRemoteProgress();
  const attempts = remote.attempts.filter((attempt) => attempt.status === 'completed').map((attempt) => ({
    ...attempt,
    finishedAt: attempt.finished_at,
    score: Number(attempt.score ?? 0),
    maxScore: Number(attempt.max_score ?? 0),
    percentage: Number(attempt.percentage ?? 0)
  }));
  const taskProgress = Object.fromEntries(remote.taskProgress.map((item) => [item.task_id, {
    attempts: Number(item.attempts_count),
    correct: Number(item.correct_count)
  }]));
  const summary = summarizeProgress({ attempts, taskProgress, mistakes: [] });
  return {
    ...summary,
    mistakes: remote.taskProgress
      .filter((item) => Number(item.correct_count) < Number(item.attempts_count))
      .map((item) => item.task_id)
  };
}
