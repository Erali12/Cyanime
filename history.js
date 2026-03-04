// history.js - История просмотров CyAnime
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";

const historyContainer = document.getElementById('history-list');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        try {
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const history = userSnap.data().h || [];

                if (history.length === 0) {
                    historyContainer.innerHTML = '<div class="empty-msg">Вы еще ничего не смотрели.</div>';
                    return;
                }

                historyContainer.innerHTML = '';
                history.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'history-item';
                    card.innerHTML = `
                        <div class="history-info">
                            <h3>${item.n}</h3>
                            <p>Остановились на <span class="cyan-text">${item.e} серии</span></p>
                            <small>${item.v}</small>
                        </div>
                        <button class="btn-cyan-small" onclick="location.href='watch.html?id=${item.id}'">
                            Продолжить
                        </button>
                    `;
                    historyContainer.appendChild(card);
                });
            } else {
                historyContainer.innerHTML = '<div class="empty-msg">История пока пуста.</div>';
            }
        } catch (e) {
            console.error("Ошибка загрузки истории:", e);
            // Если ошибка прав доступа - сообщим аккуратно
            if (e.code === 'permission-denied') {
                historyContainer.innerHTML = '<div class="empty-msg">Доступ к истории запрещен.</div>';
            } else {
                historyContainer.innerHTML = '<div class="empty-msg">Ошибка связи с облаком.</div>';
            }
        }
    } else {
        historyContainer.innerHTML = '<div class="empty-msg">Войдите в аккаунт, чтобы сохранять историю.</div>';
    }
});