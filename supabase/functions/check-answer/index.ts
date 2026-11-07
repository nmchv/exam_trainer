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

  let body: { taskId?: unknown; answer?: unknown; attemptId?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }
  if (typeof body.taskId !== 'string' || body.taskId.length > 200 || typeof body.attemptId !== 'string') {
    return jsonResponse({ error: 'taskId and attemptId are required' }, 400);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: attempt, error: attemptError } = await admin.from('attempts')
    .select('id, exam_id, mode, status')
    .eq('id', body.attemptId)
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (attemptError) return jsonResponse({ error: 'Unable to load attempt' }, 500);
  if (!attempt || attempt.status !== 'in_progress') return jsonResponse({ error: 'Attempt not found or already finished' }, 404);
  if (attempt.mode !== 'practice') return jsonResponse({ error: 'Immediate answer checking is not available in exam mode' }, 403);
  const { data: attemptTask, error: attemptTaskError } = await admin.from('attempt_tasks')
    .select('id')
    .eq('attempt_id', attempt.id)
    .eq('task_id', body.taskId)
    .maybeSingle();
  if (attemptTaskError) return jsonResponse({ error: 'Unable to verify task membership' }, 500);
  if (!attemptTask) return jsonResponse({ error: 'Task does not belong to this attempt' }, 403);
  const { data: key, error } = await admin.from('task_answer_keys')
    .select('answer, check_rules, manual_check, explanation')
    .eq('task_id', body.taskId)
    .eq('exam_id', attempt.exam_id)
    .maybeSingle();
  if (error) return jsonResponse({ error: 'Unable to load answer key' }, 500);
  if (!key) return jsonResponse({ error: 'Answer key not found' }, 404);
  if (key.manual_check) return jsonResponse({ correct: null, manualReview: true, feedback: 'Ответ требует ручной проверки.' });

  const { correct } = checkAnswerValue(body.answer, key.answer, key.check_rules ?? {});
  return jsonResponse({
    correct,
    manualReview: false,
    feedback: correct ? 'Верно.' : 'Пока неверно.',
    explanation: key.explanation ?? '',
  });
});
