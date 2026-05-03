// Мок Firestore для демо-сборки
import type { Firestore } from 'firebase/firestore';

export const getFirestore = (): Firestore => ({} as Firestore);
export const collection = () => ({});
export const addDoc = async () => ({});
export const query = () => ({});
export const orderBy = () => ({});
export const onSnapshot = (_q: any, cb: (snap: any) => void) => {
  cb({ docs: [] });
  return () => {};
};
export const serverTimestamp = () => new Date();
export const writeBatch = () => ({ set: () => {}, commit: async () => {} });
export const doc = () => ({});
export const getDocFromServer = async () => ({});
