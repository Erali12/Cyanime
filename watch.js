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
let isInitialized = false; // Флаг, чтобы не запускать init дважды

// 1. Слушаем авторизацию
onAuthStateChanged(auth, (user) => { 
    currentUserUid = user ? user.uid : null;
    console.log(user ? "✅ Юзер авторизован" : "⚠️ Гость");
    
    // Запускаем только один раз
    if (!isInitialized) {
        init(); 
        isInitialized = true;
    }
});

// 2. ФУНКЦИЯ СОХРАНЕНИЯ
function triggerSave(episode) {
    if (!animeId || !currentUserUid) return; 

    localStorage.setItem(`ep_${animeId}`, episode);

    if (typeof window.saveToHistoryCloud === "function") {
        window.saveToHistoryCloud(currentUserUid, {
            id: animeId,
            n: currentAnimeName || "Аниме",
            v: currentVoice || "Стандарт",
            e: episode.toString(),
            t: 0
        });
    }
}

// 3. ИНИЦИАЛИЗАЦИЯ ДАННЫХ
async function init() {
    if (!animeId) return;
    try {
        // Поиск по ID
        let response = await fetch(`https://kodikapi.com/search?token=${token}&id=${animeId}&with_material_data=true`);
        let data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const firstRes = data.results[0];
            const shikiId = firstRes.shikimori_id;

            // Если есть Shikimori ID, тянем все озвучки для этого аниме
            if (shikiId) {
                const allRes = await fetch(`https://kodikapi.com/search?token=${token}&shikimori_id=${shikiId}&with_material_data=true`);
                const allData = await allRes.json();
                updateUI(allData.results);
            } else {
                updateUI(data.results);
            }
        } else {
            console.error("Аниме не найдено в базе Kodik");
        }
    } catch (e) { 
        console.error("Ошибка API Kodik:", e); 
    }
}

// 4. ЗАПОЛНЕНИЕ ИНТЕРФЕЙСА
function updateUI(results) {
    const a = results[0];
    const main = a.material_data || {};
    currentAnimeName = main.anime_title || a.title;
    
    const setVal = (id, val) => { 
        const el = document.getElementById(id);
        if(el) el.innerText = val; 
    };
    
    setVal('title', currentAnimeName);
    setVal('description', main.description || "Описания нет.");
    setVal('meta', `${a.type.toUpperCase()} • ${main.shikimori_rating || 0} ★ • ${main.year || a.year}`);
    
    const posterImg = document.getElementById('poster');
    if(posterImg) posterImg.src = main.poster_url || 'Assets/Cyanime.jpg';

    // Паспорт аниме
    setVal('pass-duration', `${main.duration || '?'} мин.`);
    setVal('pass-episodes', `${a.last_episode || '?'} / ${main.episodes_total || '?'}`);
    setVal('pass-year', main.year || a.year || '—');
    setVal('pass-genres', (main.anime_genres || main.genres || []).slice(0, 3).join(', ') || '—');
    setVal('pass-studio', (main.anime_studios || []).join(', ') || '—');
    setVal('pass-director', (main.anime_directors || []).join(', ') || '—');

    renderTranslations(results);
    renderFranchise(currentAnimeName);
    
    // Загружаем первую доступную озвучку в плеер
    loadPlayer(a.link, a.translation.title);
}

// 5. ЗАГРУЗКА ПЛЕЕРА
function loadPlayer(link, translationTitle) {
    const iframe = document.getElementById('main-iframe');
    if (!iframe) return;

    currentVoice = translationTitle;
    
    // Формируем чистую ссылку
    let finalLink = link.startsWith('http') ? link : `https:${link}`;
    
    // Убираем лишние параметры, которые могут ломать плеер
    const urlObj = new URL(finalLink);
    urlObj.searchParams.set('episode', currentEpisode);
    urlObj.searchParams.set('api', 'true');
    // translations=false часто ломает загрузку, если ID специфичный. Лучше убрать или оставить true.
    
    iframe.src = urlObj.toString();

    // Интервал автосохранения
    if (saveInterval) clearInterval(saveInterval);
    saveInterval = setInterval(() => {
        // Запрос инфы у плеера
        iframe.contentWindow.postMessage({ key: 'kodik_player_get_info' }, '*');
        triggerSave(currentEpisode);
    }, 15000);
}

// 6. КНОПКИ ОЗВУЧЕК
function renderTranslations(results) {
    const container = document.getElementById('translation-list');
    if (!container) return;
    container.innerHTML = ''; 
    
    results.forEach((item) => {
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

// 7. ХРОНОЛОГИЯ (ФРАНШИЗА)
async function renderFranchise(title) {
    const container = document.getElementById('franchise-list');
    if (!container) return;
    try {
        const res = await fetch(`https://kodikapi.com/search?token=${token}&title=${encodeURIComponent(title)}&types=anime-serial,anime`);
        const data = await res.json();
        if (data.results) {
            container.innerHTML = '';
            // Фильтруем дубликаты по названию, чтобы хронология была красивой
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
    } catch (e) {}
}

// 8. СЛУШАТЕЛЬ СООБЩЕНИЙ ОТ ПЛЕЕРА
window.addEventListener('message', (e) => {
    let data = e.data;
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