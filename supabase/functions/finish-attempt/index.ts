import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkAnswerValue, corsHeaders, getBearerToken, jsonResponse } from '../_shared/http.ts';

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  const token = getBearerToken(request);
  if (!token) return jsonResponse({ error: 'Authentication required' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return jsonResponse({ error: 'Function is not configured' }, 500);
  const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !userData.user) return jsonResponse({ error: 'Invalid or expired session' }, 401);

  let body: { attemptId?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }
  if (typeof body.attemptId !== 'string') return jsonResponse({ error: 'attemptId is required' }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: attempt, error: attemptError } = await admin.from('attempts')
    .select('id, user_id, exam_id, mode, status')
    .eq('id', body.attemptId)
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (attemptError) return jsonResponse({ error: 'Unable to load attempt' }, 500);
  if (!attempt) return jsonResponse({ error: 'Attempt not found' }, 404);
  if (attempt.status === 'completed') return jsonResponse({ error: 'Attempt is already completed' }, 409);

  const { data: taskRows, error: tasksError } = await admin.from('attempt_tasks')
    .select('id, task_id, position')
    .eq('attempt_id', attempt.id)
    .order('position');
  if (tasksError) return jsonResponse({ error: 'Unable to load attempt tasks' }, 500);
  if (!taskRows?.length) return jsonResponse({ error: 'Attempt contains no tasks' }, 400);

  const results = [];
  for (const row of taskRows) {
    const [{ data: answerRow, error: answerError }, { data: key, error: keyError }] = await Promise.all([
      admin.from('attempt_answers').select('id, user_answer').eq('attempt_task_id', row.id).maybeSingle(),
      admin.from('task_answer_keys').select('answer, check_rules, max_score, manual_check, explanation')
        .eq('task_id', row.task_id).eq('exam_id', attempt.exam_id).maybeSingle(),
    ]);
    if (answerError || keyError) return jsonResponse({ error: 'Unable to load attempt result data' }, 500);
    if (!key) return jsonResponse({ error: `Answer key is missing for task ${row.task_id}` }, 422);

    const manualReview = key.manual_check || key.answer === null;
    const check = manualReview
      ? { correct: null, partial: 0 }
      : checkAnswerValue(answerRow?.user_answer, key.answer, key.check_rules ?? {});
    const maxScore = Number(key.max_score ?? 1);
    const awardedScore = check.correct ? maxScore : check.partial * maxScore;
    results.push({
      taskId: row.task_id,
      correct: check.correct,
      awardedScore,
      maxScore,
      manualReview,
      explanation: key.explanation ?? '',
    });

    const { error: taskUpdateError } = await admin.from('attempt_tasks')
      .update({ awarded_score: awardedScore }).eq('id', row.id);
    if (taskUpdateError) return jsonResponse({ error: 'Unable to save task score' }, 500);
    if (answerRow) {
      const { error: answerUpdateError } = await admin.from('attempt_answers')
        .update({ is_correct: check.correct, awarded_score: awardedScore }).eq('id', answerRow.id);
      if (answerUpdateError) return jsonResponse({ error: 'Unable to save answer result' }, 500);
    }

    const { data: prior, error: priorError } = await admin.from('task_progress').select('id, attempts_count, correct_count')
      .eq('user_id', userData.user.id).eq('exam_id', attempt.exam_id).eq('task_id', row.task_id).maybeSingle();
    if (priorError) return jsonResponse({ error: 'Unable to load previous task progress' }, 500);
    const progress = {
      user_id: userData.user.id,
      exam_id: attempt.exam_id,
      task_id: row.task_id,
      attempts_count: Number(prior?.attempts_count ?? 0) + 1,
      correct_count: Number(prior?.correct_count ?? 0) + (check.correct === true ? 1 : 0),
      last_attempt_at: new Date().toISOString(),
    };
    const { error: progressError } = await admin.from('task_progress').upsert(progress, { onConflict: 'user_id,exam_id,task_id' });
    if (progressError) return jsonResponse({ error: 'Unable to update task progress' }, 500);
  }

  const score = results.reduce((sum, item) => sum + item.awardedScore, 0);
  const maxScore = results.reduce((sum, item) => sum + item.maxScore, 0);
  const percentage = maxScore ? Math.round(score / maxScore * 100) : 0;
  const { data: scoringRules, error: scoringError } = await admin.from('exam_scoring_rules')
    .select('grade_scale').eq('exam_id', attempt.exam_id).maybeSingle();
  if (scoringError) return jsonResponse({ error: 'Unable to load scoring rules' }, 500);
  const grade = attempt.mode === 'exam'
    ? (scoringRules?.grade_scale ?? []).find((item: { min: number; max: number }) =>
      score >= item.min && score <= item.max
    )?.grade ?? null
    : null;
  const { error: finishError } = await admin.from('attempts').update({
    status: 'completed',
    finished_at: new Date().toISOString(),
    score,
    max_score: maxScore,
    percentage,
  }).eq('id', attempt.id).eq('user_id', userData.user.id);
  if (finishError) return jsonResponse({ error: 'Unable to finish attempt' }, 500);

  return jsonResponse({ result: { results, score, maxScore, percentage, grade } });
});
