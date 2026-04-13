/**
 * firebase.js — Inicialización centralizada de Firebase
 * Importar `db` desde aquí en cualquier módulo que necesite Firestore.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDxJr5-Sbc3tsN-iL9hbrvp5ThIkwN5iro",
  authDomain:        "onepiececanal-f8dd1.firebaseapp.com",
  projectId:         "onepiececanal-f8dd1",
  storageBucket:     "onepiececanal-f8dd1.firebasestorage.app",
  messagingSenderId: "178733003276",
  appId:             "1:178733003276:web:38f87dec2e6688cf297429",
  measurementId:     "G-WG3DNDK62S"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export { app };
