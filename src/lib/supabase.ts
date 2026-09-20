import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) {
  console.error("Missing or invalid Supabase environment variables! Using dummy values to prevent crash.");
}

const safeUrl = supabaseUrl?.startsWith('http') ? supabaseUrl : 'https://dummy.supabase.co';
const safeKey = supabaseAnonKey || 'dummy_key';

export const supabase = createClient(safeUrl, safeKey);

export function subscribeToTableChanges(callback: (payload: any) => void) {
  const channel = supabase
    .channel('table-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'table_sessions' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
