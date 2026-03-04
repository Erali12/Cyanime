// history.js - Единый центр управления историей CyAnime
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";

const historyContainer = document.getElementById('history-list');

// --- ФУНКЦИЯ СОХРАНЕНИЯ (Экспортируем для watch.js) ---
export async function saveToHistoryCloud(uid, animeData) {
    if (!uid || !animeData.id) return;

    const userRef = doc(db, "users", uid);
    try {
        const userSnap = await getDoc(userRef);
        let history = userSnap.exists() ? (userSnap.data().h || []) : [];
        
        // 1. Убираем это же аниме из списка, если оно там уже было
        history = history.filter(item => item.id !== animeData.id);
        
        // 2. Добавляем обновленную запись в начало массива
        history.unshift({
            ...animeData,
            last_updated: Date.now() 
        });

        // 3. Ограничиваем историю 50 записями
        if (history.length > 50) history.pop();

        // 4. Записываем в Firestore (merge: true сохраняет настройки темы)
        await setDoc(userRef, { h: history }, { merge: true });
        console.log("✅ [HISTORY-SYSTEM] Прогресс сохранен");
    } catch (e) {
        console.error("❌ [HISTORY-SYSTEM] Ошибка сохранения:", e);
    }
}

// --- ФУНКЦИЯ ОТОБРАЖЕНИЯ (Только для страницы истории) ---
if (historyContainer) {
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
                                <small>${item.v || 'Озвучка по умолчанию'}</small>
                            </div>
                            <button class="btn-cyan-small" onclick="location.href='watch.html?id=${item.id}'">
                                Продолжить
                            </button>
                        `;
                        historyContainer.appendChild(card);
                    });
                } else {
                    historyContainer.innerHTML = '<div class="empty-msg">История пуста.</div>';
                }
            } catch (e) {
                console.error("Ошибка загрузки истории:", e);
                historyContainer.innerHTML = '<div class="empty-msg">Ошибка связи с облаком.</div>';
            }
        } else {
            historyContainer.innerHTML = '<div class="empty-msg">Войдите в аккаунт, чтобы видеть свою историю.</div>';
        }
    });
}