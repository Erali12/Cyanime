// history.js - Единый центр управления историей CyAnime (Supabase Edition)
import { supabase } from "./supabase-config.js";

const historyContainer = document.getElementById('history-list');

// 1. ГЛОБАЛЬНАЯ ФУНКЦИЯ (для watch.js/player.js)
window.saveToHistoryCloud = async function(uid, animeData) {
    if (!uid || !animeData.id) {
        console.warn("⚠️ [HISTORY] Сохранение невозможно: нет UID или ID аниме");
        return;
    }

    console.log(`📡 [HISTORY] Отправка в облако: ${animeData.n} | Серия: ${animeData.e}`);

    try {
        // Получаем текущую историю пользователя
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('history_data')
            .eq('id', uid)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        let history = profile?.history_data || [];
        
        // Чистим старые записи об этом аниме (чтобы оно поднялось наверх списка)
        history = history.filter(item => item.id !== animeData.id);
        
        // Добавляем свежую запись в начало
        history.unshift({
            ...animeData,
            last_updated: Date.now() 
        });

        // Лимит 50 записей, чтобы база не раздувалась
        if (history.length > 50) history.pop();

        // Отправляем обновленный массив обратно
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ history_data: history })
            .eq('id', uid);

        if (updateError) throw updateError;
        // Убрал консоль лог успеха, чтобы не спамить каждые 15 сек
    } catch (e) {
        console.error("❌ [HISTORY] Ошибка записи в облако:", e.message);
    }
};

// 2. ЭКСПОРТ (чтобы работало при импортах)
export const saveToHistoryCloud = window.saveToHistoryCloud;

// 3. ОТОБРАЖЕНИЕ СПИСКА (работает только если мы на странице истории)
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
                    historyContainer.innerHTML = '<div class="empty-msg" style="text-align:center; padding: 40px; color: var(--text-color); opacity: 0.6;">Вы еще ничего не смотрели.</div>';
                    return;
                }

                historyContainer.innerHTML = '';
                history.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'history-item';
                    card.style.display = 'flex';
                    card.style.gap = '15px';
                    card.style.alignItems = 'center';
                    card.style.background = 'var(--bg-input)';
                    card.style.padding = '15px';
                    card.style.borderRadius = '10px';
                    card.style.marginBottom = '15px';
                    
                    // Теперь у нас есть постер (item.p), используем его!
                    const posterSrc = item.p || 'Assets/Cyanime.jpg';
                    
                    card.innerHTML = `
                        <img src="${posterSrc}" alt="poster" style="width: 60px; height: 85px; object-fit: cover; border-radius: 6px;">
                        <div class="history-info" style="flex: 1;">
                            <h3 style="margin: 0 0 5px 0; color: var(--text-color);">${item.n || 'Аниме'}</h3>
                            <p style="margin: 0 0 5px 0; font-size: 14px;">Остановились на <span style="color: var(--accent-color); font-weight: bold;">${item.e || 1} серии</span></p>
                            <small style="opacity: 0.6;">${item.v || 'Озвучка по умолчанию'}</small>
                        </div>
                        <button class="btn-cyan-small" onclick="location.href='watch.html?id=${item.id}'" style="white-space: nowrap;">
                            Продолжить
                        </button>
                    `;
                    historyContainer.appendChild(card);
                });
            } catch (e) {
                console.error("❌ Ошибка рендера истории:", e);
                historyContainer.innerHTML = '<div class="empty-msg">Ошибка связи с облаком.</div>';
            }
        } else {
            historyContainer.innerHTML = '<div class="empty-msg" style="text-align:center; padding: 40px;">Войдите в аккаунт, чтобы видеть историю.</div>';
        }
    }
    loadHistoryList();
}