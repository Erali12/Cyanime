// history.js
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const historyContainer = document.getElementById('history-list');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            let history = data.h || []; // Допустим, 'h' - это наш массив истории

            if (history.length === 0) {
                historyContainer.innerHTML = '<div class="empty-msg">Вы еще ничего не смотрели.</div>';
                return;
            }

            // 1. АНТИ-ПОВТОР + СОРТИРОВКА (Самое свежее сверху)
            // Мы разворачиваем массив, чтобы последние были первыми
            const uniqueHistory = [];
            const seenIds = new Set();

            for (let i = history.length - 1; i >= 0; i--) {
                if (!seenIds.has(history[i].id)) {
                    uniqueHistory.push(history[i]);
                    seenIds.add(history[i].id);
                }
            }

            // 2. ОТРИСОВКА
            historyContainer.innerHTML = '';
            uniqueHistory.forEach(item => {
                const card = document.createElement('div');
                card.className = 'history-item';
                card.innerHTML = `
                    <p>Вы остановились на <span class="cyan-text">${item.e || '?'}</span> серии 
                    аниме <span class="cyan-text">"${item.n}"</span> 
                    в озвучке <span class="cyan-text">${item.v}</span></p>
                    <button class="btn-cyan-small" onclick="location.href='player.html?id=${item.id}'">Продолжить</button>
                `;
                historyContainer.appendChild(card);
            });
        }
    } else {
        historyContainer.innerHTML = '<div class="empty-msg">Войдите, чтобы видеть историю.</div>';
    }
});