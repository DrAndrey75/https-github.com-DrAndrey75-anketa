// Мок Firebase Auth для демо-сборки
import type { Auth } from 'firebase/auth';

export const getAuth = (): Auth => ({} as Auth);
export const onAuthStateChanged = (_auth: any, callback: (user: null) => void) => {
  setTimeout(() => callback(null), 30);
  return () => {};
};
export const signInWithPopup = async () => ({});
export class GoogleAuthProvider {}
export const signOut = async () => {};
