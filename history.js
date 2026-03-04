// history.js - Единый центр управления историей CyAnime
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";

const historyContainer = document.getElementById('history-list');

// 1. ГЛОБАЛЬНАЯ ФУНКЦИЯ (для watch.js и консоли)
window.saveToHistoryCloud = async function(uid, animeData) {
    if (!uid || !animeData.id) {
        console.warn("⚠️ [HISTORY] Сохранение невозможно: нет UID или ID аниме");
        return;
    }

    console.log("📡 [HISTORY] Отправка в облако...", animeData.n);
    const userRef = doc(db, "users", uid);

    try {
        const userSnap = await getDoc(userRef);
        let history = userSnap.exists() ? (userSnap.data().h || []) : [];
        
        // Чистим старые записи об этом аниме
        history = history.filter(item => item.id !== animeData.id);
        
        // Добавляем свежую запись в начало
        history.unshift({
            ...animeData,
            last_updated: Date.now() 
        });

        // Лимит 50 записей
        if (history.length > 50) history.pop();

        await setDoc(userRef, { h: history }, { merge: true });
        console.log("✅ [HISTORY] Прогресс успешно сохранен в Firestore");
    } catch (e) {
        console.error("❌ [HISTORY] Ошибка записи в облако:", e.message);
    }
};

// 2. ЭКСПОРТ (для тех, кто импортирует как модуль)
export const saveToHistoryCloud = window.saveToHistoryCloud;

// 3. ОТОБРАЖЕНИЕ СПИСКА (только если есть контейнер на странице)
if (historyContainer) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("👤 [HISTORY] Загрузка списка для:", user.email);
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
                                <h3>${item.n || 'Аниме'}</h3>
                                <p>Остановились на <span class="cyan-text">${item.e || 1} серии</span></p>
                                <small>${item.v || 'Озвучка по умолчанию'}</small>
                            </div>
                            <button class="btn-cyan-small" onclick="location.href='watch.html?id=${item.id}'">
                                Продолжить
                            </button>
                        `;
                        historyContainer.appendChild(card);
                    });
                }
            } catch (e) {
                console.error(" Ошибка рендера:", e);
                historyContainer.innerHTML = '<div class="empty-msg">Ошибка связи с облаком.</div>';
            }
        } else {
            historyContainer.innerHTML = '<div class="empty-msg">Войдите в аккаунт, чтобы видеть историю.</div>';
        }
    });
}