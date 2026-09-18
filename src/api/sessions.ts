import { supabase } from '../lib/supabase';
import { state, saveState } from '../state/store';
import type { Session } from '../types';

let sessionRefreshInProgress = false;

export async function saveSessionToSupabase(session: Session) {
  const { error } = await supabase.from('table_sessions').insert({
    id: session.id,
    table_id: session.tableId,
    customer_name: session.customerName || '',
    started_at: new Date(session.startedAt).toISOString(),
    ended_at: new Date(session.endedAt).toISOString(),
    duration_ms: session.durationMs,
    amount: session.amount
  });
  if (error) console.error('Supabase seansni saqlashda xatolik:', error);
}

export async function loadSessionsFromSupabase(onComplete?: () => void) {
  if (sessionRefreshInProgress) return;
  sessionRefreshInProgress = true;

  const { data, error } = await supabase
    .from('table_sessions')
    .select('id, table_id, customer_name, started_at, ended_at, duration_ms, amount')
    .order('ended_at', { ascending: false });

  if (error) {
    console.error('Supabase tarixini yuklashda xatolik:', error);
    sessionRefreshInProgress = false;
    return;
  }

  const remoteHistory: Session[] = data.map((session: any) => ({
    id: session.id,
    tableId: session.table_id,
    customerName: session.customer_name || null,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    durationMs: Number(session.duration_ms),
    amount: Number(session.amount),
    pauseDurationMs: 0,
    barAmount: 0,
    totalAmount: Number(session.amount),
    paymentMethod: null
  }));

  const remoteIds = new Set(remoteHistory.map(s => s.id));
  const localOnlyHistory = state.history.filter(s => !remoteIds.has(s.id));
  
  state.history = [...remoteHistory, ...localOnlyHistory].sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
  
  localOnlyHistory.forEach(saveSessionToSupabase);
  saveState();
  
  sessionRefreshInProgress = false;
  if (onComplete) onComplete();
}
