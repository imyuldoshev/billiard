import { supabase } from "../lib/supabase";

export async function checkPhoneExists(phone: string): Promise<boolean> {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_URL.startsWith("http")) {
    // Supabase sozlanmagan — lokal tekshiruv
    return !!localStorage.getItem("offline_pin_" + phone);
  }
  
  try {
    const { data, error } = await supabase
      .from("users")
      .select("phone")
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      // Tarmoq xatosi — localdan tekshiramiz
      return !!localStorage.getItem("offline_pin_" + phone);
    }
    return !!data;
  } catch (e) {
    // Oflayn — lokal xotiradan tekshiramiz
    return !!localStorage.getItem("offline_pin_" + phone);
  }
}

export async function registerUser(phone: string, pin: string): Promise<boolean> {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_URL.startsWith("http")) return false;
  
  try {
    const { error } = await supabase.from("users").insert({
      phone,
      pin
    });

    if (error) {
      console.error("Ro'yxatdan o'tishda xatolik:", error);
      return false;
    }
    // Lokal xotiraga oflayn kirish uchun saqlab qo'yamiz (btoa bilan engil shifrlab)
    localStorage.setItem("offline_pin_" + phone, btoa(pin));
    return true;
  } catch (e) {
    return false; // Oflayn ro'yxatdan o'tib bo'lmaydi
  }
}

export async function verifyPin(phone: string, pin: string): Promise<boolean> {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_URL.startsWith("http")) return false;
  
  try {
    const { data, error } = await supabase
      .from("users")
      .select("pin")
      .eq("phone", phone)
      .maybeSingle();

    if (error || !data) return false;
    
    if (data.pin === pin) {
      localStorage.setItem("offline_pin_" + phone, btoa(pin));
      return true;
    }
    return false;
  } catch (e) {
    // Tarmoq xatosi (Oflayn rejim). Lokal xotiradan tekshiramiz
    const savedPin = localStorage.getItem("offline_pin_" + phone);
    if (savedPin && atob(savedPin) === pin) {
      return true;
    }
    return false;
  }
}
