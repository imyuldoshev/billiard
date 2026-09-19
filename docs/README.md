# Bilyard Klub Boshqaruvi — Loyiha Hujjati

> Oxirgi yangilanish: 18-sentabr 2026
> Stack qaror: Vite + TypeScript + Supabase Realtime ✅

---

## Docs Papkasi Tuzilishi

```
docs/
├── README.md      ← Shu fayl. Umumiy korinish va yo'riqnoma
├── TASKS.md       ← Barcha vazifalar (9 bosqich, checkboxlar bilan)
├── STACK.md       ← Texnologiya qaror va loyiha tuzilishi
├── FEATURES.md    ← Har bir feature texnik tavsifi (kod, UI, mantiq)
└── DATABASE.md    ← Supabase schema, SQL migratsiyalar, auto-delete
```

---

## Loyiha Haqida

**Bilyard Klub Boshqaruvi** — bilyard klubi uchun stollarni, vaqtni,
bar buyurtmalarini va moliyaviy hisobotlarni boshqarish uchun mo'ljallangan
veb ilova.

### Foydalanuvchilar
Loyiha faqat klub egasi tomonidan boshqariladi. Klub egasi barcha qurilmalaridan ulana oladi.

Turli qurilmalar bir vaqtda, real-time sinxron ishlaydi (Supabase Realtime).

---

## Hozirgi Holat (v1)

- [x] 4 ta stol boshqaruvi (start / stop)
- [x] Vaqt va narxni real-time hisoblash
- [x] Mijoz ismi va maxsus narx
- [x] Kunlik tushum (localStorage)
- [x] Bugungi tarix jadvali
- [x] Oylik hisobot + CSV eksport
- [x] Supabase orqali seans saqlash
- [x] PWA (telefonga o'rnatish)

---

## Rejalangan (v2)

| # | Feature | Bosqich |
|---|---------|---------|
| 1 | Vite + TypeScript ga ko'chirish | Bosqich 1 |
| 2 | Supabase Realtime (Sinxron) | Bosqich 2 |
| 3 | Ma'lumotlar bazasi yangilanishi | Bosqich 3 |
| 4 | Pauza funksiyasi | Bosqich 4 |
| 5 | Bar moduli | Bosqich 5 |
| 6 | To'lov usuli (Naqt / Karta) | Bosqich 6 |
| 7 | Hisobot tizimi (09:00 smena, arxiv) | Bosqich 7 |
| 8 | Hosting (Vercel / Netlify) | Bosqich 8 |

---

## Boshlash Uchun Yo'riqnoma

Har bir ish sessionida:
1. `docs/TASKS.md` ni oching
2. Bajarilmagan `[ ]` vazifani toping
3. Vazifaning Feature tavsifini `docs/FEATURES.md` dan o'qing
4. Kerakli DB o'zgarishlarni `docs/DATABASE.md` dan ko'ring
5. Ishni bajaring
6. `docs/TASKS.md` dagi checkboxni `[x]` ga o'zgartiring

---

## Muhim Qarorlar (Arxivlangan)

| Qaror | Tanlangan | Sabab |
|-------|-----------|-------|
| Frontend | Vanilla TS | React shart emas, loyiha kichik |
| Build tool | Vite | Tez, TS qo'llab-quvvatlaydi |
| Ma'lumotlar bazasi | Supabase | Hozir ishlamoqda, saqlanadi |
| Real-time | Supabase Realtime | 2 qurilma sinxron ishlashi uchun |
| Stollar soni | 4 ta | Klub 4 ta stolga ega |
| Smena vaqti | 09:00 — 09:00 | Klub ish vaqti |
| To'lov | Naqt / Karta (print yo'q) | Talab |
| Bar | Ha | Mijozlar buyurtma qiladi |
| Pauza | Ha | Tanaffus uchun kerak |
| Ovoz | Keyinroq | Hozircha shart emas |
