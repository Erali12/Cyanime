// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, _enableProperties } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyArmd5exJXyzQUjmCorgYJ4Dp8ABoDL5H4",
    authDomain: "cyanime-b815d.firebaseapp.com",
    projectId: "cyanime-b815d",
    storageBucket: "cyanime-b815d.firebasestorage.app",
    messagingSenderId: "164002168918",
    appId: "1:164002168918:web:4a2ebb5295a996a41efbf7",
    measurementId: "G-826HJ3706B"
};

// Инициализация
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Настройка базы с усиленным соединением и кэшем
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true, // Обход блокировок
    localCache: persistentLocalCache()  // Чтобы данные не пропадали при обновлении
});

export { app, auth, db, firebaseConfig }; // Добавил экспорт конфига на всякий случай