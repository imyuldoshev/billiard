const AUTH_KEY = 'bilyard-klub-auth-v1';
const SESSION_KEY = 'bilyard-klub-authed-v1';

export const authState = {
  username: 'admin',
  password: 'admin123',
  googleClientId: ''
};

export function normalizeAuthValue(value: any) {
  return typeof value === 'string' ? value.trim() : '';
}

export function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.username === 'string' && normalizeAuthValue(parsed.username)) authState.username = normalizeAuthValue(parsed.username);
        if (typeof parsed.password === 'string' && normalizeAuthValue(parsed.password)) authState.password = normalizeAuthValue(parsed.password);
        if (typeof parsed.googleClientId === 'string') authState.googleClientId = parsed.googleClientId.trim();
      }
    } else {
      saveAuth();
    }
  } catch (e) {
    console.error('Login ma\'lumotlarini yuklashda xatolik:', e);
  }
}

export function saveAuth() {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(authState));
  } catch (e) {
    console.error('Login ma\'lumotlarini saqlashda xatolik:', e);
  }
}

export function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === 'true' || localStorage.getItem(SESSION_KEY) === 'true';
}

export function setLoggedIn(value: boolean, remember: boolean = false) {
  if (value) {
    if (remember) localStorage.setItem(SESSION_KEY, 'true');
    else sessionStorage.setItem(SESSION_KEY, 'true');
  } else {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  }
}
