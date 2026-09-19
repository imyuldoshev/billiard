# TASKS — Vazifalar Royxati

> Stack: Vite + TypeScript + Supabase Realtime
> Qaror sanasi: 18-sentabr 2026

> Holat belgilari:
> - [ ] Bajarilmagan
> - [/] Jarayonda
> - [x] Bajarildi

---

## BOSQICH 1: Loyihani Vite + TS ga Ko'chirish

> Eng birinchi bajariladigan bosqich. Barcha keyingi ishlar shu poydevorga quriladi.

- [x] **1.1 — Vite + TypeScript loyiha yaratish**
  - [x] `npm create vite@latest bilyard-v2 -- --template vanilla-ts`
  - [x] Zarur papkalar: `src/lib`, `src/api`, `src/state`, `src/ui`
  - [x] `package.json` ga `@supabase/supabase-js` qo'shish

- [x] **1.2 — TypeScript tiplari yozish (`src/types.ts`)**
  - [x] `Table` tipi (id, occupied, startTime, customerName, customRate, isPaused, pauseStartTime, totalPauseDurationMs, barOrders)
  - [x] `Session` tipi (id, tableId, customerName, durationMs, pauseDurationMs, amount, barAmount, totalAmount, paymentMethod, startedAt, endedAt)
  - [x] `BarItem` tipi (id, name, price, category, isActive)
  - [x] `BarOrder` tipi (itemId, name, price, qty)
  - [x] `DailyReport` tipi (id, reportDate, shiftStart, shiftEnd, totalSessions, gameRevenue, barRevenue, totalRevenue, cashAmount, cardAmount)
  - [x] `MonthlyReport` tipi (id, year, month, reportLabel, totalSessions, totalRevenue, workingDays)
  - [x] `AppState` tipi (hourlyRate, tables, history, barItems, dailyReports, monthlyReports)

- [x] **1.3 — Supabase client (`src/lib/supabase.ts`)**
  - [x] `createClient` bilan supabase instance
  - [x] Realtime channel (`table-changes`) subscribe
  - [x] Environment variables (`.env` fayl): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - [x] `.env.example` fayl yaratish

- [x] **1.4 — Hozirgi kodni modullarga bo'lish**
  - [x] `src/lib/calculations.ts` — `calcCost`, `formatDuration`, `formatMoney`, `formatDateTime`
  - [x] `src/state/store.ts` — global state, `loadState`, `saveState`
  - [x] `src/api/sessions.ts` — `saveSessionToSupabase`, `loadSessionsFromSupabase`
  - [x] `src/ui/renderGrid.ts` — stollar panjara
  - [x] `src/ui/renderHeader.ts` — tushum, band stollar
  - [x] `src/ui/renderCard.ts` — bitta stol kartasi
  - [x] `src/main.ts` — hammasini birlashtirib ishga tushirish

- [x] **1.5 — Hozirgi `style.css` ni `src/` ga ko'chirish**
  - [x] CSS o'zgartirilmaydi, shu holatida ishlatiladi

- [x] **1.6 — Stollar sonini 4 taga o'zgartirish**
  - [x] `TABLE_COUNT = 4` qilib o'rnatish

- [x] **1.7 — Build va test**
  - [x] `npm run dev` — dev server ishlasin
  - [x] `npm run build` — production build xatosiz bo'lsin
  - [x] Hozirgi barcha funksiyalar (start, stop, checkout, CSV, oylik) ishlashi kerak

---

## BOSQICH 2: Supabase Realtime (2 Qurilma Sinxron)

- [ ] **2.1 — `table_sessions` Realtime**
  - [ ] Yangi session qo'shilganda — boshqa qurilmada ham ko'rinsin
  - [ ] `INSERT` event — history va stats yangilansin

- [ ] **2.2 — Active sessions Realtime**
  - [ ] Faol stollar holatini Supabase da saqlash (yangi jadval yoki hozirgi)
  - [ ] Bir qurilmada stol boshlansa — boshqasida ham "Band" ko'rinsin
  - [ ] Bir qurilmada stol to'xtatilsa — boshqasida ham yangilansin

- [ ] **2.3 — Bar buyurtmalari Realtime**
  - [ ] `bar_orders` Realtime subscribe

- [ ] **2.4 — Sinxronizatsiya testi**
  - [ ] Ikki brouzer oynasida bir vaqtda ochib test qilish
  - [ ] Bitta qurilmada boshlash, ikkinchisida to'xtatish

---

## BOSQICH 3: Ma'lumotlar Bazasi Yangilanishi

> DATABASE.md ga qarang — to'liq SQL yozilgan

- [x] **3.1 — `table_sessions` yangilanishi**
  - [x] `pause_duration_ms` ustuni qo'shish
  - [x] `bar_amount` ustuni qo'shish
  - [x] `payment_method` ustuni qo'shish
  - [x] `total_amount` computed column qo'shish

- [x] **3.2 — `bar_items` jadvali yaratish**
- [x] **3.3 — `bar_orders` jadvali yaratish**
- [x] **3.4 — `daily_reports` jadvali yaratish**
- [x] **3.5 — `monthly_reports` jadvali yaratish**

- [x] **3.6 — Supabase Edge Function (Avtomatik Arxivlash)**
  - [x] `supabase/functions/daily-archive/index.ts` yozish
  - [x] Har kuni 09:00 da (UTC+5 = 04:00 UTC) ishga tushishi
  - [x] Yangi smena boshida: oldingi smenani `daily_reports` ga saqlash
  - [x] Har oyning 1-sanasida: avvalgi oyni `monthly_reports` ga saqlash
  - [x] `table_sessions` dan 30 kundan eski yozuvlarni o'chirish

- [x] **3.7 — pg_cron sozlash**
  - [x] Har kuni 04:00 UTC da Edge Function ni chaqirish

---

## BOSQICH 4: Pauza Funksiyasi

> FEATURES.md — Pauza bo'limiga qarang

- [x] **4.1 — State yangilanishi**
  - [x] `table` ob'ektiga `isPaused`, `pauseStartTime`, `totalPauseDurationMs` qo'shish
  - [x] `getEffectiveDuration(table)` funksiyasi yozish (pauza ayirilgan holda)

- [x] **4.2 — UI yangilanishi**
  - [x] "Band" stol kartasida 2 ta tugma: `[⏸ Pauza]` va `[⏹ To'xtatish]`
  - [x] Pauza holatida: `[▶ Davom]` va `[⏹ To'xtatish]`
  - [x] Pauza holatida karta sariq rangga o'tadi
  - [x] Status pill: "Pauza ⏸" deb ko'rinadi
  - [x] Timer pauzada muzlab turadi

- [x] **4.3 — Checkout yangilanishi**
  - [x] Pauza davomiyligi alohida ko'rsatiladi
  - [x] Narx faqat haqiqiy o'yin vaqtiga hisoblanadi

- [x] **4.4 — Supabase ga pauza vaqtini saqlash**
  - [x] `pause_duration_ms` session ga yoziladi

---

## BOSQICH 5: Bar Moduli

> FEATURES.md — Bar bo'limiga qarang

- [x] **5.1 — `src/api/bar.ts`**
  - [x] `loadBarItems()` — Supabase dan mahsulotlar yuklash
  - [x] `addBarItem(item)` — yangi mahsulot qo'shish
  - [x] `updateBarItem(id, data)` — narx yoki nom o'zgartirish
  - [x] `deleteBarItem(id)` — mahsulotni o'chirish (soft delete)
  - [x] `saveBarOrders(sessionId, orders)` — buyurtmalarni saqlash

- [x] **5.2 — Bar boshqaruvi ui**
  - [x] "Bar mahsulotlari" bo'limi qo'shish
  - [x] Mahsulot qo'shish formasi: nom, narx, kategoriya
  - [x] Mavjud mahsulotlar ro'yxati (o'chirish / narx o'zgartirish)

- [x] **5.3 — Stol kartasida bar tugmasi**
  - [x] Faqat "Band" stollarda ko'rinadigan `[🍺 Bar]` tugma
  - [x] Stol kartasida bar summasi: `Bar: 15 000 so'm`

- [x] **5.4 — `src/ui/renderBar.ts` — Bar modali**
  - [x] Mahsulotlar kategoriya bo'yicha guruhlangan
  - [x] `+` / `-` tugmalar, miqdor ko'rsatiladi
  - [x] Savat: mahsulot nomi | miqdor | narxi
  - [x] Savat jami summasi
  - [x] `[Qo'shish]` tugma — stol ga biriktiriladi

- [x] **5.5 — `src/ui/renderCheckout.ts` — Checkout yangilanishi**
  - [x] O'yin narxi + Bar narxi + JAMI — uchta qator
  - [x] `[💵 Naqt]` va `[💳 Karta]` tugmalari

---

## BOSQICH 6: To'lov Usuli

- [x] **6.1 — `paymentMethod: 'cash' | 'card'` state ga qo'shish**
- [x] **6.2 — Checkout tugmalari bilan to'lov usulini saqlash**
- [x] **6.3 — Supabase `table_sessions` dagi `payment_method` ga moslash**
- [x] **6.4 — Tarix jadvalida "To'lov usuli" ustuni qo'shish**
  - [x] 💵 Naqt yoki 💳 Karta icon bilan

---

## BOSQICH 7: Hisobot Tizimi Yangilanishi

> FEATURES.md — Hisobot bo'limiga qarang

- [x] **7.1 — Smena vaqtini to'g'rilash (09:00 — 09:00)**
  - [x] `getCurrentShiftStart()` funksiyasi yozish
  - [x] Header dagi "Kunlik tushum" shu shiftni hisoblashi
  - [x] `getDailyRevenuePeriodStart()` ni yangi logika bilan almashtirish

- [x] **7.2 — `src/api/reports.ts`**
  - [x] `saveDailyReport(report)` — kunlik hisobotni Supabase ga saqlash
  - [x] `saveMonthlyReport(report)` — oylik hisobotni saqlash
  - [x] `loadDailyReports(limit)` — oxirgi 30 kungi hisobotlar
  - [x] `loadMonthlyReports(limit)` — oxirgi 12 oylik hisobotlar
  - [x] `checkAndArchiveShift()` — smena o'zgarganda arxivlash

- [x] **7.3 — `src/ui/renderReports.ts` — Arxiv UI**
  - [x] "Kunlik arxiv" bo'limi (gorizontal scroll, har kun bir card)
  - [x] Kunlik card: sana, o'yinlar soni, tushum, naqt/karta bo'linmasi
  - [x] Card bosilganda: o'sha kunning o'yinlari modali (Hozircha faqat card qilindi)
  - [x] "Oylik arxiv" bo'limi (vertical list, har oy bir card)
  - [x] Oylik card: oy nomi, jami tushum, o'yinlar soni, ish kunlari

- [x] **7.4 — Hisobot triggerlari**
  - [x] Sahifa ochilganda smena o'tganligi tekshiriladi
  - [x] O'tgan smena avtomatik arxivlanadi (daily_reports ga)
  - [x] 1-sana tekshiriladi — oylik hisobot arxivlanadi (monthly_reports ga)

- [x] **7.5 — CSV eksport yangilanishi**
  - [x] Bar summasi va to'lov usuli ustunlari qo'shish

---

## BOSQICH 8: Hosting (Production)

- [x] **8.1 — Vercel yoki Netlify ga deploy**
  - [x] `npm run build` — dist/ papkasi
  - [x] Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - [x] Custom domain (ixtiyoriy)

- [x] **8.2 — PWA sozlash**
  - [x] `manifest.json` yangilanishi
  - [x] Service Worker yangilanishi (Vite bilan mos kelishi)

---

## BOSQICH 9: Kelajakda (Hozircha Rejalashtirilmagan)

- [ ] Ovozli bildirishnomalar (stol boshlanganda / to'xtatilganda)
- [ ] Stolni boshqa stolga ko'chirish (Transfer)
- [ ] Chek chiqarish (termal printer uchun Print)
- [ ] Dark / Light rejim toggle
- [ ] Oy oxirida SMS yoki Telegram orqali hisobot yuborish
