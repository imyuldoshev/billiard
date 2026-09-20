import { supabase } from "../lib/supabase";
import type { BarItem, BarOrder } from "../types";

export async function loadBarItems(): Promise<BarItem[]> {
  const userId = localStorage.getItem("currentUser");
  if (!userId) return [];

  if (
    !import.meta.env.VITE_SUPABASE_URL ||
    !import.meta.env.VITE_SUPABASE_URL.startsWith("http")
  )
    return [];
  const { data, error } = await supabase
    .from("bar_items")
    .select("*")
    .eq("user_id", userId)
    .order("name");
  if (error) {
    console.error("Bar mahsulotlarini yuklashda xatolik:", error);
    return [];
  }
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    category: row.category,
    isActive: row.is_active,
  }));
}

export async function addBarItem(
  item: Omit<BarItem, "id" | "isActive">,
): Promise<BarItem | null> {
  const userId = localStorage.getItem("currentUser");
  if (!userId) return null;

  const localFallback: BarItem = {
    id: "local_" + Date.now().toString(),
    name: item.name,
    price: item.price,
    category: item.category,
    isActive: true,
  };
  if (
    !import.meta.env.VITE_SUPABASE_URL ||
    !import.meta.env.VITE_SUPABASE_URL.startsWith("http")
  )
    return localFallback;
  const { data, error } = await supabase
    .from("bar_items")
    .insert({ 
      name: item.name, 
      price: item.price, 
      category: item.category,
      user_id: userId
    })
    .select()
    .single();

  if (error) {
    console.error("Mahsulot qo`shishda xatolik, lokal saqlanadi:", error);
    return localFallback;
  }
  return {
    id: data.id,
    name: data.name,
    price: Number(data.price),
    category: data.category,
    isActive: data.is_active,
  };
}

export async function updateBarItem(
  id: string,
  updates: Partial<BarItem>,
): Promise<boolean> {
  const userId = localStorage.getItem("currentUser");
  if (!userId) return false;

  if (
    !import.meta.env.VITE_SUPABASE_URL ||
    !import.meta.env.VITE_SUPABASE_URL.startsWith("http")
  )
    return false;
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.price !== undefined) dbUpdates.price = updates.price;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { error } = await supabase
    .from("bar_items")
    .update(dbUpdates)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Mahsulotni yangilashda xatolik, lokal o`zgaradi:", error);
    return true; // RLS xatolik bo'lsa ham lokalda o'chirish uchun
  }
  return true;
}

export async function saveBarOrders(
  sessionId: string,
  orders: BarOrder[],
): Promise<void> {
  if (orders.length === 0) return;
  if (
    !import.meta.env.VITE_SUPABASE_URL ||
    !import.meta.env.VITE_SUPABASE_URL.startsWith("http")
  )
    return;
  const rows = orders.map((o) => ({
    session_id: sessionId,
    item_id: o.itemId,
    item_name: o.name,
    item_price: o.price,
    quantity: o.qty,
  }));

  const { error } = await supabase.from("bar_orders").insert(rows);
  if (error) {
    console.error("Bar buyurtmalarini saqlashda xatolik:", error);
  }
}
