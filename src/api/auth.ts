import { supabase } from "../lib/supabase";

export async function checkPhoneExists(phone: string): Promise<boolean> {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_URL.startsWith("http")) return false;
  
  const { data, error } = await supabase
    .from("users")
    .select("phone")
    .eq("phone", phone)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

export async function registerUser(phone: string, pin: string): Promise<boolean> {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_URL.startsWith("http")) return false;
  
  const { error } = await supabase.from("users").insert({
    phone,
    pin
  });

  if (error) {
    console.error("Ro'yxatdan o'tishda xatolik:", error);
    return false;
  }
  return true;
}

export async function verifyPin(phone: string, pin: string): Promise<boolean> {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_URL.startsWith("http")) return false;
  
  const { data, error } = await supabase
    .from("users")
    .select("pin")
    .eq("phone", phone)
    .maybeSingle();

  if (error || !data) return false;
  
  return data.pin === pin;
}
