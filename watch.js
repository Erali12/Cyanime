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

// 1. 🚀 ЗАПУСКАЕМ ЗАГРУЗКУ СРАЗУ! (Больше не ждем Firebase)
if (animeId) {
    init();
} else {
    const desc = document.getElementById('description');
    if (desc) desc.innerText = "⚠️ Ошибка: Аниме не найдено (нет ID в ссылке).";
}

// 2. Слушаем авторизацию ТОЛЬКО для истории просмотров
onAuthStateChanged(auth, (user) => { 
    currentUserUid = user ? user.uid : null;
    console.log(user ? "✅ Юзер авторизован" : "⚠️ Гость");
});

// 3. ФУНКЦИЯ СОХРАНЕНИЯ
function triggerSave(episode) {
    if (!animeId) return; 

    // Сохраняем локально всегда
    localStorage.setItem(`ep_${animeId}`, episode);

    // В облако только если вошли в аккаунт
    if (currentUserUid && typeof window.saveToHistoryCloud === "function") {
        window.saveToHistoryCloud(currentUserUid, {
            id: animeId,
            n: currentAnimeName || "Аниме",
            v: currentVoice || "Стандарт",
            e: episode.toString(),
            t: 0
        });
    }
}

// 4. ИНИЦИАЛИЗАЦИЯ ДАННЫХ
async function init() {
    try {
        let response = await fetch(`https://kodikapi.com/search?token=${token}&id=${animeId}&with_material_data=true`);
        let data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const firstRes = data.results[0];
            const shikiId = firstRes.shikimori_id;

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

// 5. ЗАПОЛНЕНИЕ ИНТЕРФЕЙСА
function updateUI(results) {
    const a = results[0];
    if (!a) return;

    const main = a.material_data || {};
    currentAnimeName = main.anime_title || a.title;
    
    const setVal = (id, val) => { 
        const el = document.getElementById(id);
        if(el) el.innerText = val; 
    };
    
    setVal('title', currentAnimeName);
    setVal('description', main.description || "Описания нет.");
    setVal('meta', `${(a.type || 'Аниме').toUpperCase()} • ${main.shikimori_rating || 0} ★ • ${main.year || a.year || ''}`);
    
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
    
    // Запускаем плеер с первой озвучкой
    const firstVoice = a.translation?.title || "Стандарт";
    loadPlayer(a.link, firstVoice);
}

// 6. ЗАГРУЗКА ПЛЕЕРА (Улучшенная безопасность ссылок)
function loadPlayer(link, translationTitle) {
    const iframe = document.getElementById('main-iframe');
    if (!iframe || !link) return;

    currentVoice = translationTitle;
    
    // Надежное склеивание ссылки
    let finalLink = link.startsWith('http') ? link : `https:${link}`;
    const separator = finalLink.includes('?') ? '&' : '?';
    
    // api=true нужно для получения серии, translations=false убираем, чтобы не ломать плеер
    iframe.src = `${finalLink}${separator}episode=${currentEpisode}&api=true`;

    if (saveInterval) clearInterval(saveInterval);
    saveInterval = setInterval(() => {
        iframe.contentWindow.postMessage({ key: 'kodik_player_get_info' }, '*');
        triggerSave(currentEpisode);
    }, 15000);
}

// 7. КНОПКИ ОЗВУЧЕК
function renderTranslations(results) {
    const container = document.getElementById('translation-list');
    if (!container) return;
    container.innerHTML = ''; 
    
    results.forEach((item) => {
        if (!item.translation) return; // Защита от битых данных Kodik
        
        const voiceTitle = item.translation.title;
        const btn = document.createElement('button');
        btn.className = 'translation-btn' + (voiceTitle === currentVoice ? ' active' : '');
        btn.innerText = voiceTitle; 
        
        btn.onclick = () => {
            document.querySelectorAll('.translation-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadPlayer(item.link, voiceTitle);
        };
        container.appendChild(btn);
    });
}

// 8. ХРОНОЛОГИЯ (ФРАНШИЗА)
async function renderFranchise(title) {
    const container = document.getElementById('franchise-list');
    if (!container) return;
    try {
        const res = await fetch(`https://kodikapi.com/search?token=${token}&title=${encodeURIComponent(title)}&types=anime-serial,anime`);
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
    } catch (e) {}
}

// 9. СЛУШАТЕЛЬ СООБЩЕНИЙ ОТ ПЛЕЕРА
window.addEventListener('message', (e) => {
    let data = e.data;
    // Иногда Kodik шлет данные строкой, пытаемся распарсить
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