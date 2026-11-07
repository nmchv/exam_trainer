export function summarizeProgress(progress) {
  const attempts = progress?.attempts ?? [];
  const average = attempts.length
    ? Math.round(attempts.reduce((sum, item) => sum + item.percentage, 0) / attempts.length)
    : 0;
  const solved = Object.values(progress?.taskProgress ?? {})
    .reduce((sum, item) => sum + item.attempts, 0);
  const topicSource = progress?.topicProgress && Object.keys(progress.topicProgress).length
    ? progress.topicProgress
    : progress?.taskProgress ?? {};
  const topics = Object.entries(topicSource).map(([label, item]) => ({
    label,
    attempts: item.attempts,
    accuracy: item.attempts ? Math.round(item.correct / item.attempts * 100) : 0
  }));
  return { attempts: attempts.length, average, solved, topics, latest: attempts.slice(0, 5) };
}
