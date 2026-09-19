# FEATURES — Feature lar Texnik Tavsifi

> Stack: Vite + TypeScript + Supabase Realtime
> Qaror sanasi: 18-sentabr 2026

---

## 1. BAR MODULI

### Maqsad
Mijozlar o'yin paytida buyurtma qilgan ichimlik va taomlarni
stol seansiga biriktirib hisoblash. Hisob-kitob yakunida
o'yin vaqti + bar jami ko'rsatiladi.

### User Flow (Oqim)
```
Mahsulot qo'shiladi
       |
Stol "Band" holati  -->  [🍺 Bar] tugmasi paydo bo'ladi
       |
[🍺 Bar] bosiladi  -->  Bar modali ochiladi
       |
Mahsulotlar ro'yxati:
  [Choy 5 000 so'm  [+] ]
  [Kofe 8 000 so'm  [+] ]
  [Chips 6 000 so'm [+] ]
       |
"+" bosilganda savatga qo'shiladi
       |
[Qo'shish] bosilganda stol ga biriktiriladi
       |
Stol kartasida:
  Joriy narx: 45 000 so'm
  Bar: 15 000 so'm
       |
[To'xtatish] bosilganda Checkout:
  O'yin vaqti:  01:30:00
  O'yin narxi:  45 000 so'm
  Bar narxi:    15 000 so'm
  ─────────────────────────
  JAMI:         60 000 so'm
  [💵 Naqt]   [💳 Karta]
```

### TypeScript Tiplari
```typescript
// src/types.ts

interface BarItem {
  id: string;
  name: string;
  price: number;
  category: 'ichimlik' | 'taom' | 'boshqa';
  isActive: boolean;
}

interface BarOrder {
  itemId: string;
  name: string;   // snapshot — mahsulot nomi keyin o'zgarsa buzilmasin
  price: number;  // snapshot — narx keyin o'zgarsa buzilmasin
  qty: number;
}

interface Table {
  id: number;
  occupied: boolean;
  startTime: number | null;
  customerName: string;
  customRate: number | null;
  isPaused: boolean;
  pauseStartTime: number | null;
  totalPauseDurationMs: number;
  barOrders: BarOrder[];  // <-- yangi
}
```

### Supabase Jadvallari
- `bar_items` — mahsulotlar katalogi (DATABASE.md)
- `bar_orders` — seans buyurtmalari (DATABASE.md)

### Funksiyalar (`src/api/bar.ts`)
```typescript
loadBarItems(): Promise<BarItem[]>
addBarItem(item: Omit<BarItem, 'id'>): Promise<void>
updateBarItem(id: string, data: Partial<BarItem>): Promise<void>
deleteBarItem(id: string): Promise<void>        // soft delete (isActive=false)
saveBarOrders(sessionId: string, orders: BarOrder[]): Promise<void>
```

---

## 2. PAUZA FUNKSIYASI

### Maqsad
Mijoz tanaffus qilganda yoki vaqtincha chiqib ketganda
timer to'xtab turadi, qaytganda davom etadi.
Narx faqat haqiqiy o'yin vaqtiga hisoblanadi.

### UI Holatlari
```
Band holat (normal):
  ┌──────────────────┐
  │  1-stol  [Band]  │
  │  Ali             │
  │  01:25:33        │ ← timer ishlaydi
  │  43 000 so'm     │
  │  [⏸ Pauza] [⏹ To'xtatish] │
  └──────────────────┘

Pauza holati:
  ┌──────────────────┐  ← sariq rang
  │  1-stol  [Pauza ⏸] │
  │  Ali             │
  │  01:25:33        │ ← timer muzlaydi
  │  43 000 so'm     │
  │  [▶ Davom] [⏹ To'xtatish] │
  └──────────────────┘
```

### Matematik Mantiq
```typescript
// src/lib/calculations.ts

function getEffectiveDuration(table: Table): number {
  if (!table.startTime) return 0;

  const now = Date.now();
  let pausedMs = table.totalPauseDurationMs;

  // Agar hozir pauza holatida bo'lsa — joriy pauza vaqtini ham qo'shish
  if (table.isPaused && table.pauseStartTime) {
    pausedMs += now - table.pauseStartTime;
  }

  return (now - table.startTime) - pausedMs;
}

// Pauza boshlash
function pauseTable(table: Table): Table {
  return {
    ...table,
    isPaused: true,
    pauseStartTime: Date.now()
  };
}

// Pauza davom ettirish
function resumeTable(table: Table): Table {
  const pauseDuration = table.pauseStartTime
    ? Date.now() - table.pauseStartTime
    : 0;
  return {
    ...table,
    isPaused: false,
    pauseStartTime: null,
    totalPauseDurationMs: table.totalPauseDurationMs + pauseDuration
  };
}
```

### Checkout da Pauza
```
O'yin vaqti:    01:30:00
  (Pauza:         00:10:00)
O'yin narxi:    36 000 so'm  ← 80 daqiqa uchun (90 - 10)
Bar narxi:      15 000 so'm
─────────────────────────────
JAMI:           51 000 so'm
```

---

## 3. HISOBOT TIZIMI

### 3.1 Smena Tushunchasi (09:00 — 09:00)

Klub 09:00 dan ertasi kuni 09:00 gacha ishlaydi.
Hisobot ham shu 24 soatlik "smena" asosida hisoblanadi.

```typescript
// src/lib/calculations.ts

function getCurrentShiftStart(): Date {
  const now = new Date();
  const shiftStart = new Date(now);
  shiftStart.setHours(9, 0, 0, 0);

  // Agar hozirgi soat 09:00 dan oldin bo'lsa — kechagi smena
  if (now.getTime() < shiftStart.getTime()) {
    shiftStart.setDate(shiftStart.getDate() - 1);
  }
  return shiftStart;
}

function getShiftLabel(shiftStart: Date): string {
  // "17-sentabr" formatida
  const months = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
  ];
  return `${shiftStart.getDate()}-${months[shiftStart.getMonth()]}`;
}
```

### 3.2 Avtomatik Arxivlash

**Trigger:** Sahifa har yangilanishi / har soatlik tick da tekshiriladi.

```typescript
// src/api/reports.ts

async function checkAndArchiveShift(): Promise<void> {
  const currentShiftStart = getCurrentShiftStart();
  const lastArchivedDate = await getLastDailyReportDate();

  // Agar joriy smena yangi bo'lsa va hali arxivlanmagan bo'lsa
  if (currentShiftStart > lastArchivedDate) {
    await archivePreviousShift(lastArchivedDate);
  }

  // 1-sana tekshirish — oylik hisobot
  const today = new Date();
  if (today.getDate() === 1) {
    const lastMonth = today.getMonth() === 0 ? 12 : today.getMonth();
    const lastYear = today.getMonth() === 0
      ? today.getFullYear() - 1
      : today.getFullYear();
    await archiveMonthIfNeeded(lastYear, lastMonth);
  }
}
```

### 3.3 Kunlik Arxiv Card UI
```
┌─────────────────────────────────────┐
│  📅 17-sentabr 2026                 │
│  09:00 — 18-sentabr 09:00          │
│                                     │
│  O'yinlar:   23 ta                 │
│  O'yin:      450 000 so'm          │
│  Bar:         50 000 so'm          │
│  ─────────────────────────         │
│  Tushum:     500 000 so'm          │
│                                     │
│  💵 Naqt: 320 000  💳 Karta: 180 000 │
└─────────────────────────────────────┘
```

### 3.4 Oylik Arxiv Card UI
```
┌─────────────────────────────────────┐
│  📅 Sentabr 2026                   │
│                                     │
│  Ish kunlari: 30                   │
│  O'yinlar:    142 ta               │
│  ─────────────────────────         │
│  Jami tushum: 5 200 000 so'm       │
│                                     │
│  💵 Naqt: 3.1M  💳 Karta: 2.1M     │
└─────────────────────────────────────┘
```

### 3.5 Auto-delete Mantig'i
```
1. Har kuni 09:00 da:
   - Kechagi smena daily_reports ga saqlanadi
   - daily_reports da 30 kundan eski yozuvlar o'chiriladi (ixtiyoriy)

2. Har oyning 1-sanasida (09:00 da):
   - Avvalgi oyning daily_reports lari yig'ilib monthly_reports ga saqlanadi
   - table_sessions dan 30 kundan eski yozuvlar O'CHIRILADI
   - bar_orders kaskad (cascade) o'chiriladi

Natija: Supabase dagi table_sessions har doim faqat 30 kunlik data saqlaydi.
        Ammo daily_reports va monthly_reports arxivda abadiy qoladi.
```

---

## 4. TO'LOV USULI

### Maqsad
Har bir seans yakunida qanday to'lov qilingani belgilanadi
va tarixda saqlanadi.

### Checkout Tugmalari
```
  [💵 Naqt]    [💳 Karta]

  Tugma bosilganda:
  - paymentMethod = 'cash' | 'card'
  - session yopiladi va saqlanadi
```

### Tarix Jadvali
```
| Stol    | Mijoz | Tugash          | Vaqt    | O'yin    | Bar     | Jami     | To'lov |
|---------|-------|-----------------|---------|----------|---------|----------|--------|
| 1-stol  | Ali   | 17.09 18:30     | 1:30:00 | 45 000   | 15 000  | 60 000   | 💵     |
| 2-stol  | —     | 17.09 19:15     | 0:45:00 | 22 500   | 0       | 22 500   | 💳     |
| 3-stol  | Vali  | 17.09 20:00     | 2:00:00 | 60 000   | 8 000   | 68 000   | 💵     |
```

---

## 5. SUPABASE REALTIME (2 QURILMA SINXRON)

### Maqsad
Ikki xil qurilmada bir vaqtda foydalanilganda ma'lumotlar sinxron bo'lishi kerak.
Bir qurilmada o'zgarish bo'lsa — ikkinchisida ham darhol yangilanadi.

### Subscribe Kanallar
```typescript
// src/lib/supabase.ts

// 1. Yakunlangan seanslar (table_sessions)
supabase.channel('sessions')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'table_sessions'
  }, (payload) => {
    // Yangi seans qo'shildi — history va stats yangilansin
    onNewSession(payload.new as Session);
  })
  .subscribe();

// 2. Bar buyurtmalari (bar_orders)
supabase.channel('bar-orders')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'bar_orders'
  }, (payload) => {
    onNewBarOrder(payload.new);
  })
  .subscribe();
```

> **Muhim:** Faol stollar holati (start/pause/stop) hozircha
> localStorage + Supabase sinxronizatsiya orqali boshqariladi.
> Kelajakda alohida `active_sessions` jadvali qo'shilishi mumkin.
