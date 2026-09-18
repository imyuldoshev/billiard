# STACK — Texnologiya Qaror Hujjati

> Qaror qabul qilingan sana: 18-sentabr 2026
> Holat: TASDIQLANGAN ✅

---

## Tanlangan Stack: Vite + TypeScript + Supabase

| Soha | Texnologiya | Sabab |
|------|-------------|-------|
| Build tool | **Vite** | Tez, yengil, Node.js ekotizimi |
| Til | **TypeScript** | Xatolarni oldindan topish, katta loyihada zarur |
| UI | **Vanilla TS (DOM)** | React shart emas, loyiha o'lchami uchun yetarli |
| Stil | **CSS (hozirgi saqlangan)** | Dizayn tayyor, o'zgartirish kerak emas |
| DB | **Supabase (PostgreSQL)** | Hozir ishlamoqda, saqlanadi |
| Real-time | **Supabase Realtime** | 2 qurilma bir vaqtda sinxron ishlashi uchun |
| Auth | **Supabase Auth** | Boshliq va ishchi uchun alohida login |
| Hosting | **Vercel yoki Netlify** | Bepul, Vite bilan mos |

---

## Nima Uchun React Emas?

| Savol | Javob |
|-------|-------|
| Foydalanuvchilar soni | 2 ta (boshliq + ishchi) |
| Qurilmalar | Har biri o'z qurilmasida |
| Komponentlar soni | 6-8 ta (kichik) |
| O'rganish xarajati | React o'rganishga vaqt ketadi, natija bir xil |
| Xulosa | Vanilla TS + Supabase Realtime yetarli |

---

## Loyiha Tuzilishi (v2 — Yangi)

```
bilyard/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
│
├── src/
│   ├── main.ts              ← Ishga tushirish nuqtasi
│   ├── types.ts             ← Barcha TypeScript tipler
│   │
│   ├── lib/
│   │   ├── supabase.ts      ← Supabase client va Realtime
│   │   ├── calculations.ts  ← Narx, vaqt, pauza hisoblash
│   │   └── formatters.ts    ← Para, vaqt, sana formatlash
│   │
│   ├── state/
│   │   └── store.ts         ← Global holat (tables, barItems, reports)
│   │
│   ├── api/
│   │   ├── sessions.ts      ← table_sessions CRUD
│   │   ├── bar.ts           ← bar_items, bar_orders CRUD
│   │   └── reports.ts       ← daily_reports, monthly_reports CRUD
│   │
│   ├── auth/
│   │   └── auth.ts          ← Supabase Auth (login, logout, ruxsatlar)
│   │
│   └── ui/
│       ├── renderGrid.ts    ← Stollar panjara
│       ├── renderCard.ts    ← Bitta stol kartasi
│       ├── renderBar.ts     ← Bar modali
│       ├── renderCheckout.ts← Hisob-kitob modali
│       ├── renderReports.ts ← Kunlik/oylik arxiv
│       ├── renderHeader.ts  ← Header (tushum, band stollar)
│       └── renderAdmin.ts   ← Admin paneli
│
├── public/
│   ├── sw.js               ← Service Worker (PWA)
│   └── manifest.json       ← PWA manifest
│
├── supabase/
│   ├── migrations/          ← SQL migratsiyalar
│   │   ├── 001_init.sql     ← Boshlangich schema
│   │   ├── 002_bar.sql      ← Bar jadvallari
│   │   └── 003_reports.sql  ← Hisobot jadvallari
│   └── functions/
│       └── daily-archive/   ← Edge Function (avtomatik arxivlash)
│           └── index.ts
│
└── docs/                    ← Shu papka
    ├── README.md
    ├── TASKS.md
    ├── STACK.md
    ├── FEATURES.md
    └── DATABASE.md
```

---

## Boshliq va Ishchi Ruxsatlari (Auth)

### Supabase Auth Rollari

| Funksiya | Boshliq (admin) | Ishchi (worker) |
|----------|-----------------|-----------------|
| Stolni boshlash | ✅ | ✅ |
| Stolni to'xtatish | ✅ | ✅ |
| Pauza qilish | ✅ | ✅ |
| Bar buyurtma | ✅ | ✅ |
| Bar mahsulotlarini boshqarish | ✅ | ❌ |
| Hisobotlarni ko'rish | ✅ | ❌ |
| Arxivni ko'rish | ✅ | ❌ |
| Soatbay narxni o'zgartirish | ✅ | ❌ |
| Admin paneli | ✅ | ❌ |

### Supabase da Rol Tizimi
```sql
-- auth.users jadvalida metadata orqali
-- Har bir foydalanuvchi uchun:
{ "role": "admin" }  -- boshliq
{ "role": "worker" } -- ishchi
```

---

## Supabase Realtime — Sinxronizatsiya

Ikki qurilmada bir vaqtda ishlash uchun Realtime subscribe:

```typescript
// src/lib/supabase.ts
supabase
  .channel('table-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'table_sessions'
  }, (payload) => {
    // Bir qurilmada o'zgarish bo'lsa — ikkinchisida ham yangilanadi
    handleRealtimeChange(payload);
  })
  .subscribe();
```

**Qanday ishlaydi:**
1. Ishchi 1-stolni boshladi
2. Supabase ga yoziladi
3. Boshliqning qurilmasiga Realtime event keladi
4. Boshliqning ekranida 1-stol "Band" bo'lib ko'rinadi
5. — va aksincha

---

## O'tish Rejasi (Vanilla JS → Vite + TS)

1. `npm create vite@latest` bilan yangi loyiha skeleton yaratish
2. Hozirgi `style.css` ni `src/` ga ko'chirish (o'zgartirilmaydi)
3. `script.js` ni modullarga bo'lib TypeScript ga o'tkazish
4. Supabase client ni yangi tarzda ulash
5. Realtime subscribe qo'shish
6. Auth tizimini Supabase Auth ga o'tkazish
7. Yangi featurelarni qo'shish (bar, pauza, hisobotlar)
