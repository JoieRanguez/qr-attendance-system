import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB5hC1aFxhDmMnQA4lGtewBNyMwD1Faplg",
  authDomain: "qr-attendance-system-6deba.firebaseapp.com",
  projectId: "qr-attendance-system-6deba",
  storageBucket: "qr-attendance-system-6deba.firebasestorage.app",
  messagingSenderId: "482774513318",
  appId: "1:482774513318:web:7aa1b0e1d771b9a27c2667"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);