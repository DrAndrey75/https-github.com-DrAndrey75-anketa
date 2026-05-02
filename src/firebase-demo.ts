// Используется только при VITE_DEMO=true (скриншоты, локальная демонстрация)
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

export const auth = {
  onAuthStateChanged: (_observer: any) => {
    setTimeout(() => _observer(null), 30);
    return () => {};
  }
} as unknown as Auth;

export const db = {} as Firestore;
