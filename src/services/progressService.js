import { getSupabaseClient } from './supabaseClient.js';

export async function getRemoteProgress() {
  const supabase = await getSupabaseClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!userData.user) throw new Error('Войдите в аккаунт для просмотра синхронизированного прогресса.');
  const { data, error } = await supabase.functions.invoke('get-statistics', { body: {} });
  if (error) throw error;
  if (!data || !Array.isArray(data.attempts) || !Array.isArray(data.taskProgress)) {
    throw new Error('Сервис статистики вернул некорректный ответ.');
  }
  return data;
}

export async function getUserSettings() {
  const supabase = await getSupabaseClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!userData.user) throw new Error('Войдите в аккаунт для загрузки настроек.');
  const { data, error } = await supabase.from('user_settings')
    .select('settings').eq('user_id', userData.user.id).maybeSingle();
  if (error) throw error;
  return data?.settings ?? {};
}

export async function saveUserSettings(settings) {
  const supabase = await getSupabaseClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!userData.user) throw new Error('Войдите в аккаунт для сохранения настроек.');
  const { data: current, error: lookupError } = await supabase.from('user_settings')
    .select('user_id').eq('user_id', userData.user.id).maybeSingle();
  if (lookupError) throw lookupError;
  const query = current
    ? supabase.from('user_settings').update({ settings, updated_at: new Date().toISOString() }).eq('user_id', userData.user.id)
    : supabase.from('user_settings').insert({ user_id: userData.user.id, settings });
  const { error } = await query;
  if (error) throw error;
}
