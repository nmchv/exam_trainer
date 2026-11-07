export function scoreAttempt(taskResults, scoring = {}) {
  const results = taskResults.map(({ task, result }) => {
    const maxScore = Number(task.maxScore ?? 1);
    let awardedScore = 0;
    if (result?.manualReview) {
      awardedScore = 0;
    } else if (result?.correct) {
      awardedScore = maxScore;
    } else if (Array.isArray(result?.partialScores)) {
      awardedScore = result.partialScores.reduce((sum, score) => sum + Number(score || 0), 0);
    }
    return { taskId: task.id, awardedScore, maxScore, correct: result?.correct ?? null };
  });
  const score = results.reduce((sum, result) => sum + result.awardedScore, 0);
  const maxScore = results.reduce((sum, result) => sum + result.maxScore, 0);
  const percentage = maxScore ? Math.round((score / maxScore) * 100) : 0;
  const grade = scoring.gradeScale?.find((item) => score >= item.min && score <= item.max)?.grade ?? null;
  return { results, score, maxScore, percentage, grade };
}
