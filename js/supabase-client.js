/**
 * Supabase Client Configuration
 * 
 * ВАЖНО: Используются только ПУБЛИЧНЫЕ ключи Supabase, безопасные для frontend.
 * 
 * Получение ключей:
 * 1. Откройте https://app.supabase.com
 * 2. Выберите проект
 * 3. Settings → API → Project URL и anon public key
 * 4. Замените значения ниже на ваши
 */

// ⚠️ ЗАМЕНИ ЭТИ ЗНАЧЕНИЯ НА СВОИ КЛЮЧИ SUPABASE
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key';

// Инициализация Supabase клиента
let supabaseClient = null;

try {
  if (!window.supabase) {
    console.error('❌ Supabase библиотека не загружена. Проверьте <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> в <head>');
  } else {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase инициализирован');
  }
} catch (error) {
  console.error('❌ Ошибка инициализации Supabase:', error);
}
