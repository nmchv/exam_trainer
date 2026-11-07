import { getSupabaseConfig } from '../config.js';

let clientPromise;

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}

export async function getSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    throw new Error('Supabase не настроен. Заполните public/config.js публичным URL и anon key проекта.');
  }
  clientPromise ??= import('https://esm.sh/@supabase/supabase-js@2')
    .then(({ createClient }) => createClient(url, anonKey));
  return clientPromise;
}
