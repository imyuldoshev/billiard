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
  - [x] Zarur papkalar: `src/lib`, `src/api`, `src/state`, `src/auth`, `src/ui`
  - [x] `package.json` ga `@supabase/supabase-js` qo'shish

- [x] **1.2 — TypeScript tiplari yozish (`src/types.ts`)**
  - [x] `Table` tipi (id, occupied, startTime, customerName, customRate, isPaused, pauseStartTime, totalPauseDurationMs, barOrders)
  - [x] `Session` tipi (id, tableId, customerName, durationMs, pauseDurationMs, amount, barAmount, totalAmount, paymentMethod, startedAt, endedAt)
  - [x] `BarItem` tipi (id, name, price, category, isActive)
  - [x] `BarOrder` tipi (itemId, name, price, qty)
  - [x] `DailyReport` tipi (id, reportDate, shiftStart, shiftEnd, totalSessions, gameRevenue, barRevenue, totalRevenue, cashAmount, cardAmount)
  - [x] `MonthlyReport` tipi (id, year, month, reportLabel, totalSessions, totalRevenue, workingDays)
  - [x] `AppState` tipi (hourlyRate, tables, history, barItems, dailyReports, monthlyReports)
  - [x] `UserRole` tipi: `'admin' | 'worker'`

- [x] **1.3 — Supabase client (`src/lib/supabase.ts`)**
  - [x] `createClient` bilan supabase instance
  - [x] Realtime channel (`table-changes`) subscribe
  - [x] Environment variables (`.env` fayl): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - [x] `.env.example` fayl yaratish

- [x] **1.4 — Hozirgi kodni modullarga bo'lish**
  - [x] `src/lib/calculations.ts` — `calcCost`, `formatDuration`, `formatMoney`, `formatDateTime`
  - [x] `src/state/store.ts` — global state, `loadState`, `saveState`
  - [x] `src/api/sessions.ts` — `saveSessionToSupabase`, `loadSessionsFromSupabase`
  - [x] `src/auth/auth.ts` — login, logout (Supabase Auth ga o'tish)
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

## BOSQICH 2: Supabase Auth (Login Tizimi)

> Hozirgi localStorage login o'rniga haqiqiy auth.

- [x] **2.1 — Supabase da foydalanuvchilar yaratish**
  - [x] Boshliq uchun email/parol hisob (rol: admin)
  - [x] Ishchi uchun email/parol hisob (rol: worker)
  - [x] `user_metadata` da `{ role: 'admin' | 'worker' }` qo'yish

- [x] **2.2 — `src/auth/auth.ts` — Supabase Auth**
  - [x] `signIn(email, password)` funksiyasi
  - [x] `signOut()` funksiyasi
  - [x] `getCurrentUser()` — hozirgi foydalanuvchi va roli
  - [x] `onAuthStateChange` — sessiya yangilanishini kuzatish

- [x] **2.3 — Login UI yangilanishi**
  - [x] Login formasi: email + parol (hozir username + parol)
  - [x] Xato xabarlari Supabase dan kelishi
  - [x] Muvaffaqiyatli login da — rolga qarab UI ko'rsatish

- [x] **2.4 — Rolga asosida UI**
  - [x] Boshliq: barcha funksiyalar ko'rinadi (hisobot, arxiv, admin panel)
  - [x] Ishchi: faqat stollar va bar ko'rinadi

- [x] **2.5 — Supabase RLS yangilanishi**
  - [x] `table_sessions` — faqat authenticated foydalanuvchilar
  - [x] `bar_items` — read: hammaga, write: faqat admin
  - [x] `daily_reports` — faqat admin
  - [x] `monthly_reports` — faqat admin

---

## BOSQICH 3: Supabase Realtime (2 Qurilma Sinxron)

- [ ] **3.1 — `table_sessions` Realtime**
  - [ ] Yangi session qo'shilganda — boshqa qurilmada ham ko'rinsin
  - [ ] `INSERT` event — history va stats yangilansin

- [ ] **3.2 — Active sessions Realtime**
  - [ ] Faol stollar holatini Supabase da saqlash (yangi jadval yoki hozirgi)
  - [ ] Bir qurilmada stol boshlansa — boshqasida ham "Band" ko'rinsin
  - [ ] Bir qurilmada stol to'xtatilsa — boshqasida ham yangilansin

- [ ] **3.3 — Bar buyurtmalari Realtime**
  - [ ] `bar_orders` Realtime subscribe

- [ ] **3.4 — Sinxronizatsiya testi**
  - [ ] Ikki brouzer oynasida bir vaqtda ochib test qilish
  - [ ] Bitta qurilmada boshlash, ikkinchisida to'xtatish

---

## BOSQICH 4: Ma'lumotlar Bazasi Yangilanishi

> DATABASE.md ga qarang — to'liq SQL yozilgan

- [ ] **4.1 — `table_sessions` yangilanishi**
  - [ ] `pause_duration_ms` ustuni qo'shish
  - [ ] `bar_amount` ustuni qo'shish
  - [ ] `payment_method` ustuni qo'shish
  - [ ] `total_amount` computed column qo'shish

- [ ] **4.2 — `bar_items` jadvali yaratish**
- [ ] **4.3 — `bar_orders` jadvali yaratish**
- [ ] **4.4 — `daily_reports` jadvali yaratish**
- [ ] **4.5 — `monthly_reports` jadvali yaratish**

- [ ] **4.6 — Supabase Edge Function (Avtomatik Arxivlash)**
  - [ ] `supabase/functions/daily-archive/index.ts` yozish
  - [ ] Har kuni 09:00 da (UTC+5 = 04:00 UTC) ishga tushishi
  - [ ] Yangi smena boshida: oldingi smenani `daily_reports` ga saqlash
  - [ ] Har oyning 1-sanasida: avvalgi oyni `monthly_reports` ga saqlash
  - [ ] `table_sessions` dan 30 kundan eski yozuvlarni o'chirish

- [ ] **4.7 — pg_cron sozlash**
  - [ ] Har kuni 04:00 UTC da Edge Function ni chaqirish

---

## BOSQICH 5: Pauza Funksiyasi

> FEATURES.md — Pauza bo'limiga qarang

- [ ] **5.1 — State yangilanishi**
  - [ ] `table` ob'ektiga `isPaused`, `pauseStartTime`, `totalPauseDurationMs` qo'shish
  - [ ] `getEffectiveDuration(table)` funksiyasi yozish (pauza ayirilgan holda)

- [ ] **5.2 — UI yangilanishi**
  - [ ] "Band" stol kartasida 2 ta tugma: `[⏸ Pauza]` va `[⏹ To'xtatish]`
  - [ ] Pauza holatida: `[▶ Davom]` va `[⏹ To'xtatish]`
  - [ ] Pauza holatida karta sariq rangga o'tadi
  - [ ] Status pill: "Pauza ⏸" deb ko'rinadi
  - [ ] Timer pauzada muzlab turadi

- [ ] **5.3 — Checkout yangilanishi**
  - [ ] Pauza davomiyligi alohida ko'rsatiladi
  - [ ] Narx faqat haqiqiy o'yin vaqtiga hisoblanadi

- [ ] **5.4 — Supabase ga pauza vaqtini saqlash**
  - [ ] `pause_duration_ms` session ga yoziladi

---

## BOSQICH 6: Bar Moduli

> FEATURES.md — Bar bo'limiga qarang

- [ ] **6.1 — `src/api/bar.ts`**
  - [ ] `loadBarItems()` — Supabase dan mahsulotlar yuklash
  - [ ] `addBarItem(item)` — yangi mahsulot qo'shish (faqat admin)
  - [ ] `updateBarItem(id, data)` — narx yoki nom o'zgartirish
  - [ ] `deleteBarItem(id)` — mahsulotni o'chirish (soft delete)
  - [ ] `saveBarOrders(sessionId, orders)` — buyurtmalarni saqlash

- [ ] **6.2 — Admin panelda Bar boshqaruvi**
  - [ ] "Bar mahsulotlari" bo'limi qo'shish
  - [ ] Mahsulot qo'shish formasi: nom, narx, kategoriya
  - [ ] Mavjud mahsulotlar ro'yxati (o'chirish / narx o'zgartirish)

- [ ] **6.3 — Stol kartasida bar tugmasi**
  - [ ] Faqat "Band" stollarda ko'rinadigan `[🍺 Bar]` tugma
  - [ ] Stol kartasida bar summasi: `Bar: 15 000 so'm`

- [ ] **6.4 — `src/ui/renderBar.ts` — Bar modali**
  - [ ] Mahsulotlar kategoriya bo'yicha guruhlangan
  - [ ] `+` / `-` tugmalar, miqdor ko'rsatiladi
  - [ ] Savat: mahsulot nomi | miqdor | narxi
  - [ ] Savat jami summasi
  - [ ] `[Qo'shish]` tugma — stol ga biriktiriladi

- [ ] **6.5 — `src/ui/renderCheckout.ts` — Checkout yangilanishi**
  - [ ] O'yin narxi + Bar narxi + JAMI — uchta qator
  - [ ] `[💵 Naqt]` va `[💳 Karta]` tugmalari

---

## BOSQICH 7: To'lov Usuli

- [ ] **7.1 — `paymentMethod: 'cash' | 'card'` state ga qo'shish**
- [ ] **7.2 — Checkout UI yangilanishi** (Bosqich 6.5 da birgalikda)
- [ ] **7.3 — `table_sessions` da `payment_method` saqlash**
- [ ] **7.4 — Tarix jadvalida "To'lov usuli" ustuni qo'shish**
  - [ ] 💵 Naqt yoki 💳 Karta icon bilan

---

## BOSQICH 8: Hisobot Tizimi Yangilanishi

> FEATURES.md — Hisobot bo'limiga qarang

- [ ] **8.1 — Smena vaqtini to'g'rilash (09:00 — 09:00)**
  - [ ] `getCurrentShiftStart()` funksiyasi yozish
  - [ ] Header dagi "Kunlik tushum" shu shiftni hisoblashi
  - [ ] `getDailyRevenuePeriodStart()` ni yangi logika bilan almashtirish

- [ ] **8.2 — `src/api/reports.ts`**
  - [ ] `saveDailyReport(report)` — kunlik hisobotni Supabase ga saqlash
  - [ ] `saveMonthlyReport(report)` — oylik hisobotni saqlash
  - [ ] `loadDailyReports(limit)` — oxirgi 30 kungi hisobotlar
  - [ ] `loadMonthlyReports(limit)` — oxirgi 12 oylik hisobotlar
  - [ ] `checkAndArchiveShift()` — smena o'zgarganda arxivlash

- [ ] **8.3 — `src/ui/renderReports.ts` — Arxiv UI**
  - [ ] "Kunlik arxiv" bo'limi (gorizontal scroll, har kun bir card)
  - [ ] Kunlik card: sana, o'yinlar soni, tushum, naqt/karta bo'linmasi
  - [ ] Card bosilganda: o'sha kunning o'yinlari modali
  - [ ] "Oylik arxiv" bo'limi (vertical list, har oy bir card)
  - [ ] Oylik card: oy nomi, jami tushum, o'yinlar soni, ish kunlari

- [ ] **8.4 — Hisobot triggerlari**
  - [ ] Sahifa ochilganda smena o'tganligi tekshiriladi
  - [ ] O'tgan smena avtomatik arxivlanadi (daily_reports ga)
  - [ ] 1-sana tekshiriladi — oylik hisobot arxivlanadi (monthly_reports ga)

- [ ] **8.5 — CSV eksport yangilanishi**
  - [ ] Bar summasi va to'lov usuli ustunlari qo'shish

---

## BOSQICH 9: Hosting (Production)

- [ ] **9.1 — Vercel yoki Netlify ga deploy**
  - [ ] `npm run build` — dist/ papkasi
  - [ ] Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - [ ] Custom domain (ixtiyoriy)

- [ ] **9.2 — PWA sozlash**
  - [ ] `manifest.json` yangilanishi (4 ta stol ikoni va b.)
  - [ ] Service Worker yangilanishi (Vite bilan mos kelishi)

---

## BOSQICH 10: Kelajakda (Hozircha Rejalashtirilmagan)

- [ ] Ovozli bildirishnomalar (stol boshlanganda / to'xtatilganda)
- [ ] Stolni boshqa stolga ko'chirish (Transfer)
- [ ] Chek chiqarish (termal printer uchun Print)
- [ ] Dark / Light rejim toggle
- [ ] Oy oxirida SMS yoki Telegram orqali hisobot yuborish
