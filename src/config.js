export const APP_NAME = 'Exam Trainer';
export const REGISTRY_PATH = './public/database/registry.json';
export const LOCAL_STATE_KEY = 'exam-trainer-state-v1';
export const SETTINGS_KEY = 'exam-trainer-settings-v1';
export const DEMO_MODE = true;

export function getSupabaseConfig() {
  const config = globalThis.EXAM_TRAINER_CONFIG;
  return {
    url: typeof config?.supabaseUrl === 'string' ? config.supabaseUrl.trim() : '',
    anonKey: typeof config?.supabaseAnonKey === 'string' ? config.supabaseAnonKey.trim() : ''
  };
}
