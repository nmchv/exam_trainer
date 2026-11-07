import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, getBearerToken, jsonResponse } from '../_shared/http.ts';

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  const token = getBearerToken(request);
  if (!token) return jsonResponse({ error: 'Authentication required' }, 401);
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return jsonResponse({ error: 'Function is not configured' }, 500);

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: authError } = await client.auth.getUser(token);
  if (authError || !userData.user) return jsonResponse({ error: 'Invalid or expired session' }, 401);
  const { data: attempts, error: attemptsError } = await client.from('attempts')
    .select('id, exam_id, mode, status, started_at, finished_at, score, max_score, percentage')
    .eq('user_id', userData.user.id)
    .order('started_at', { ascending: false })
    .limit(50);
  if (attemptsError) return jsonResponse({ error: 'Unable to load statistics' }, 500);
  const { data: progress, error: progressError } = await client.from('task_progress')
    .select('exam_id, task_id, attempts_count, correct_count, last_attempt_at')
    .eq('user_id', userData.user.id);
  if (progressError) return jsonResponse({ error: 'Unable to load task progress' }, 500);
  return jsonResponse({ attempts, taskProgress: progress });
});
