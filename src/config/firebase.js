// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// AGREGA 'export' AQUÍ
export const firebaseConfig = {
  apiKey: "AIzaSyC00XpZna9PuAJN_dTRMNEom3Tbu1v4Sug",
  authDomain: "tag-go-6f407.firebaseapp.com",
  projectId: "tag-go-6f407",
  storageBucket: "tag-go-6f407.firebasestorage.app",
  messagingSenderId: "947293189855",
  appId: "1:947293189855:web:ae0e33a5db755f1ad2db6a"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);