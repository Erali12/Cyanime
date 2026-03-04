// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

export const firebaseConfig = {
    apiKey: "AIzaSyArmd5exJXyzQUjmCorgYJ4Dp8ABoDL5H4",
    authDomain: "cyanime-b815d.firebaseapp.com",
    projectId: "cyanime-b815d",
    storageBucket: "cyanime-b815d.firebasestorage.app",
    messagingSenderId: "164002168918",
    appId: "1:164002168918:web:4a2ebb5295a996a41efbf7",
    measurementId: "G-826HJ3706B"
};

// 1. Инициализация приложения
const app = initializeApp(firebaseConfig);

// 2. Инициализация Auth
const auth = getAuth(app);

// 3. 🔥 Инициализация Firestore с обходом сетевых блокировок (Long Polling)
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
});

export { app, auth, db };