import { supabase } from '../lib/supabase';
import { state, saveState } from '../state/store';
import type { Session } from '../types';

let sessionRefreshInProgress = false;

export async function saveSessionToSupabase(session: Session) {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_URL.startsWith('http')) return;
  const { error } = await supabase.from('table_sessions').insert({
    id: session.id,
    table_id: session.tableId,
    customer_name: session.customerName || '',
    started_at: new Date(session.startedAt).toISOString(),
    ended_at: new Date(session.endedAt).toISOString(),
    duration_ms: session.durationMs,
    amount: Math.round(session.amount),
    pause_duration_ms: session.pauseDurationMs,
    bar_amount: Math.round(session.barAmount),
    total_amount: Math.round(session.totalAmount),
    payment_method: session.paymentMethod || 'cash'
  });
  if (error) console.error('Supabase seansni saqlashda xatolik:', error);
}

export async function loadSessionsFromSupabase(onComplete?: () => void) {
  if (sessionRefreshInProgress) {
    if (onComplete) onComplete();
    return;
  }
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_URL.startsWith('http')) {
    if (onComplete) onComplete();
    return;
  }
  sessionRefreshInProgress = true;

  const { data, error } = await supabase
    .from('table_sessions')
    .select('id, table_id, customer_name, started_at, ended_at, duration_ms, amount, pause_duration_ms, bar_amount, total_amount, payment_method')
    .order('ended_at', { ascending: false })
    .limit(500);

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
    pauseDurationMs: Number(session.pause_duration_ms),
    barAmount: Number(session.bar_amount),
    totalAmount: Number(session.total_amount || session.amount),
    paymentMethod: session.payment_method
  }));

  const remoteIds = new Set(remoteHistory.map(s => s.id));
  const localOnlyHistory = state.history.filter(s => !remoteIds.has(s.id));
  
  state.history = [...remoteHistory, ...localOnlyHistory].sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
  
  localOnlyHistory.forEach(saveSessionToSupabase);
  saveState();
  
  sessionRefreshInProgress = false;
  if (onComplete) onComplete();
}

export async function deleteSessionFromSupabase(id: string) {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_URL.startsWith('http')) return true;
  const { error } = await supabase.from('table_sessions').delete().eq('id', id);
  if (error) {
    console.error('Seansni ochirishda xatolik:', error);
    return false;
  }
  return true;
}
