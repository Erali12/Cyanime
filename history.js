// history.js - Единый центр управления историей CyAnime (Supabase Edition)
import { supabase } from "./supabase-config.js";

const historyContainer = document.getElementById('history-list');

// 1. ГЛОБАЛЬНАЯ ФУНКЦИЯ (для watch.js и консоли)
window.saveToHistoryCloud = async function(uid, animeData) {
    if (!uid || !animeData.id) {
        console.warn("⚠️ [HISTORY] Сохранение невозможно: нет UID или ID аниме");
        return;
    }

    console.log("📡 [HISTORY] Отправка в облако Supabase...", animeData.n);

    try {
        // Получаем текущую историю пользователя
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('history_data')
            .eq('id', uid)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        let history = profile?.history_data || [];
        
        // Чистим старые записи об этом аниме
        history = history.filter(item => item.id !== animeData.id);
        
        // Добавляем свежую запись в начало
        history.unshift({
            ...animeData,
            last_updated: Date.now() 
        });

        // Лимит 50 записей
        if (history.length > 50) history.pop();

        // Отправляем обновленный массив обратно
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ history_data: history })
            .eq('id', uid);

        if (updateError) throw updateError;
        console.log("✅ [HISTORY] Прогресс успешно сохранен в Supabase");
    } catch (e) {
        console.error("❌ [HISTORY] Ошибка записи в облако:", e.message);
    }
};

// 2. ЭКСПОРТ
export const saveToHistoryCloud = window.saveToHistoryCloud;

// 3. ОТОБРАЖЕНИЕ СПИСКА
if (historyContainer) {
    async function loadHistoryList() {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            console.log("👤 [HISTORY] Загрузка списка для:", user.email);
            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('history_data')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                const history = profile?.history_data || [];
                
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
            } catch (e) {
                console.error(" Ошибка рендера:", e);
                historyContainer.innerHTML = '<div class="empty-msg">Ошибка связи с облаком.</div>';
            }
        } else {
            historyContainer.innerHTML = '<div class="empty-msg">Войдите в аккаунт, чтобы видеть историю.</div>';
        }
    }
    loadHistoryList();
}