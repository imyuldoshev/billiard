import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';

export let currentUser: { id: string, email: string, role: UserRole } | null = null;

export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }
  
  if (data.user) {
    const role = (data.user.user_metadata?.role as UserRole) || 'worker';
    currentUser = { id: data.user.id, email: data.user.email || '', role };
  }

  return {};
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Sign out error:", error);
  }
  currentUser = null;
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const role = (session.user.user_metadata?.role as UserRole) || 'worker';
    currentUser = { id: session.user.id, email: session.user.email || '', role };
    return currentUser;
  }
  return null;
}

export function onAuthStateChange(callback: (user: typeof currentUser) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      const role = (session.user.user_metadata?.role as UserRole) || 'worker';
      currentUser = { id: session.user.id, email: session.user.email || '', role };
    } else {
      currentUser = null;
    }
    callback(currentUser);
  });
}
