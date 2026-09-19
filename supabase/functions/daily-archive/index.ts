import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date();
  const todayShiftStart = new Date(now);
  todayShiftStart.setHours(9, 0, 0, 0);
  if (now < todayShiftStart) {
    todayShiftStart.setDate(todayShiftStart.getDate() - 1);
  }

  const prevShiftEnd = new Date(todayShiftStart);
  const prevShiftStart = new Date(todayShiftStart);
  prevShiftStart.setDate(prevShiftStart.getDate() - 1);

  // 1. Kechagi smenaning seanslarini yig'ish
  const { data: sessions } = await supabase
    .from('table_sessions')
    .select('amount, bar_amount, total_amount, payment_method')
    .gte('ended_at', prevShiftStart.toISOString())
    .lt('ended_at',  prevShiftEnd.toISOString());

  if (sessions && sessions.length > 0) {
    const gameRevenue = sessions.reduce((s, r) => s + Number(r.amount), 0);
    const barRevenue  = sessions.reduce((s, r) => s + Number(r.bar_amount), 0);
    const cashAmount  = sessions
      .filter(r => r.payment_method === 'cash')
      .reduce((s, r) => s + Number(r.total_amount), 0);
    const cardAmount  = sessions
      .filter(r => r.payment_method === 'card')
      .reduce((s, r) => s + Number(r.total_amount), 0);

    // 2. daily_reports ga saqlash
    await supabase.from('daily_reports').upsert({
      report_date:     prevShiftStart.toISOString().slice(0, 10),
      shift_start:     prevShiftStart.toISOString(),
      shift_end:       prevShiftEnd.toISOString(),
      total_sessions:  sessions.length,
      game_revenue:    gameRevenue,
      bar_revenue:     barRevenue,
      cash_amount:     cashAmount,
      card_amount:     cardAmount
    }, { onConflict: 'report_date' });
  }

  // 3. Oylik tekshirish (1-sana bo'lsa)
  if (now.getDate() === 1) {
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const startOfLastMonth = new Date(lastYear, lastMonth - 1, 1, 9, 0, 0);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1, 9, 0, 0);

    const { data: dailyReports } = await supabase
      .from('daily_reports')
      .select('total_sessions, game_revenue, bar_revenue, cash_amount, card_amount')
      .gte('shift_start', startOfLastMonth.toISOString())
      .lt('shift_start', endOfLastMonth.toISOString());

    if (dailyReports && dailyReports.length > 0) {
      const totalSessions = dailyReports.reduce((s, r) => s + Number(r.total_sessions), 0);
      const gameRevenue = dailyReports.reduce((s, r) => s + Number(r.game_revenue), 0);
      const barRevenue = dailyReports.reduce((s, r) => s + Number(r.bar_revenue), 0);
      const cashAmount = dailyReports.reduce((s, r) => s + Number(r.cash_amount), 0);
      const cardAmount = dailyReports.reduce((s, r) => s + Number(r.card_amount), 0);
      
      const months = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
      const reportLabel = `${months[lastMonth - 1]} ${lastYear}`;

      await supabase.from('monthly_reports').upsert({
        year: lastYear,
        month: lastMonth,
        report_label: reportLabel,
        total_sessions: totalSessions,
        working_days: dailyReports.length,
        game_revenue: gameRevenue,
        bar_revenue: barRevenue,
        cash_amount: cashAmount,
        card_amount: cardAmount
      }, { onConflict: 'year, month' });
    }
  }

  // 4. table_sessions dan 30 kundan eski yozuvlarni o'chirish
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  await supabase
    .from('table_sessions')
    .delete()
    .lt('ended_at', cutoffDate.toISOString());

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
