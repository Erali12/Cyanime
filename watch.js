// watch.js - Плеер и интерфейс просмотра CyAnime
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

const wParams = new URLSearchParams(window.location.search);
const animeId = wParams.get('id'); 
const token = 'cc25b08a2d09435ad1818ce358fd407d'; 

let currentAnimeName = "";
let currentVoice = "";
let currentUserUid = null;
let saveInterval = null;
let currentEpisode = localStorage.getItem(`ep_${animeId}`) || "1";

// 1. Инициализация при загрузке
if (animeId) {
    init();
} else {
    const desc = document.getElementById('description');
    if (desc) desc.innerText = "⚠️ Ошибка: ID аниме отсутствует в ссылке.";
}

// 2. Отслеживание пользователя
onAuthStateChanged(auth, (user) => { 
    currentUserUid = user ? user.uid : null;
});

// 3. Сохранение прогресса
function triggerSave(episode) {
    if (!animeId) return; 
    localStorage.setItem(`ep_${animeId}`, episode);

    // Если есть функция облачного сохранения в firebase-check.js
    if (currentUserUid && typeof window.saveToHistoryCloud === "function") {
        window.saveToHistoryCloud(currentUserUid, {
            id: animeId,
            n: currentAnimeName,
            v: currentVoice,
            e: episode.toString()
        });
    }
}

// 4. Основная загрузка данных
async function init() {
    try {
        // Первый запрос для получения базовых данных и Shikimori ID
        let res = await fetch(`https://kodikapi.com/search?token=${token}&id=${animeId}&with_material_data=true`);
        let data = await res.json();
        
        if (data.results && data.results.length > 0) {
            const base = data.results[0];
            const shikiId = base.shikimori_id;

            // Если есть ShikiID, тянем все доступные озвучки для этого тайтла
            if (shikiId) {
                const allRes = await fetch(`https://kodikapi.com/search?token=${token}&shikimori_id=${shikiId}&with_material_data=true`);
                const allData = await allRes.json();
                updateUI(allData.results);
            } else {
                updateUI(data.results);
            }
        }
    } catch (e) { 
        console.error("Kodik API Error:", e); 
    }
}

// 5. Обновление интерфейса
function updateUI(results) {
    const a = results[0];
    const main = a.material_data || {};
    currentAnimeName = main.anime_title || a.title;
    
    // Вспомогательная функция для заполнения текста
    const fill = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val; };

    fill('title', currentAnimeName);
    fill('description', main.description || "Описание временно отсутствует.");
    fill('meta', `${(a.type || 'Аниме').toUpperCase()} • ${main.shikimori_rating || 0} ⭐ • ${main.year || a.year}`);
    
    const poster = document.getElementById('poster');
    if(poster) poster.src = main.poster_url || 'Assets/Cyanime.jpg';

    // Заполнение "Паспорта"
    fill('pass-duration', `${main.duration || '?'} мин.`);
    fill('pass-episodes', `${a.last_episode || '?'} / ${main.episodes_total || '?'}`);
    fill('pass-year', main.year || a.year || '—');
    fill('pass-genres', (main.anime_genres || []).join(', ') || '—');
    fill('pass-studio', (main.anime_studios || []).join(', ') || '—');
    fill('pass-director', (main.anime_directors || []).join(', ') || '—');
    fill('pass-author', '—'); // В Kodik API автора обычно нет в явном виде

    renderTranslations(results);
    renderFranchise(currentAnimeName);
    
    // Грузим плеер (первая озвучка по списку)
    loadPlayer(a.link, a.translation.title);
}

// 6. Управление плеером
function loadPlayer(link, voiceTitle) {
    const iframe = document.getElementById('main-iframe');
    if (!iframe || !link) return;

    currentVoice = voiceTitle;
    let finalLink = link.startsWith('http') ? link : `https:${link}`;
    const sep = finalLink.includes('?') ? '&' : '?';
    
    // Собираем ссылку с эпизодом
    iframe.src = `${finalLink}${sep}episode=${currentEpisode}&api=true`;

    // Интервал для опроса плеера (обновление текущей серии)
    if (saveInterval) clearInterval(saveInterval);
    saveInterval = setInterval(() => {
        iframe.contentWindow.postMessage({ key: 'kodik_player_get_info' }, '*');
    }, 15000);
}

// 7. Отрисовка кнопок озвучки
function renderTranslations(results) {
    const container = document.getElementById('translation-list');
    if (!container) return;
    container.innerHTML = '';
    
    results.forEach(item => {
        if (!item.translation) return;
        const btn = document.createElement('button');
        btn.className = 'translation-btn' + (item.translation.title === currentVoice ? ' active' : '');
        btn.innerText = item.translation.title;
        btn.onclick = () => {
            document.querySelectorAll('.translation-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadPlayer(item.link, item.translation.title);
        };
        container.appendChild(btn);
    });
}

// 8. Поиск хронологии (франшизы)
async function renderFranchise(title) {
    const container = document.getElementById('franchise-list');
    if (!container) return;
    try {
        // Очищаем название от лишних символов для лучшего поиска
        const cleanTitle = title.split('/')[0].trim();
        const res = await fetch(`https://kodikapi.com/search?token=${token}&title=${encodeURIComponent(cleanTitle)}&types=anime-serial,anime`);
        const data = await res.json();
        
        if (data.results) {
            container.innerHTML = '';
            const seen = new Set();
            data.results.forEach(item => {
                if (!seen.has(item.title)) {
                    const div = document.createElement('div');
                    div.className = 'franchise-item' + (item.id == animeId ? ' active' : '');
                    div.innerText = `${item.title} (${item.year})`;
                    div.onclick = () => { if(item.id != animeId) location.href = `watch.html?id=${item.id}`; };
                    container.appendChild(div);
                    seen.add(item.title);
                }
            });
        }
    } catch (e) { console.warn("Franchise error"); }
}

// 9. Слушатель сообщений от плеера Kodik
window.addEventListener('message', (e) => {
    let data = e.data;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (err) { return; }
    }

    if (data.key === 'kodik_player_video_info' || data.key === 'kodik_player_time_update') {
        if (data.value && data.value.episode) {
            const newEp = data.value.episode.toString();
            if (newEp !== currentEpisode) {
                currentEpisode = newEp;
                triggerSave(currentEpisode);
            }
        }
    }
});