// watch.js - Плеер и интерфейс просмотра CyAnime
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { auth } from "./firebase-config.js";
import { saveToHistoryCloud } from "./history.js";

const wParams = new URLSearchParams(window.location.search);
const animeId = wParams.get('id'); 
const token = 'cc25b08a2d09435ad1818ce358fd407d'; 

let currentAnimeName = "";
let currentVoice = "";
let currentUserUid = null;
let saveInterval = null;

// Слушаем авторизацию
onAuthStateChanged(auth, (user) => { 
    currentUserUid = user ? user.uid : null;
    console.log(user ? "✅ Юзер авторизован" : "⚠️ Гость");
    init(); 
});

// --- СОХРАНЕНИЕ ---
function triggerSave(episode, time = 0, season = "1") {
    if (!animeId || !currentUserUid) return;

    // 1. Локально (для быстрого подхвата плеером)
    localStorage.setItem(`ep_${animeId}`, episode);
    localStorage.setItem(`time_${animeId}`, Math.floor(time));

    // 2. В облако (через history.js)
    saveToHistoryCloud(currentUserUid, {
        id: animeId,
        n: currentAnimeName || "Аниме",
        v: currentVoice || "Стандарт",
        e: episode.toString(),
        s: season,
        time: Math.floor(time)
    });
}

// --- ИНИЦИАЛИЗАЦИЯ ---
async function init() {
    if (!animeId) return;
    try {
        let response = await fetch(`https://kodikapi.com/search?token=${token}&id=${animeId}&with_material_data=true`);
        let data = await response.json();
        if (data.results && data.results.length > 0) {
            const shikiId = data.results[0].shikimori_id;
            if (shikiId) {
                // Если есть ID Шикимори, ищем все озвучки этого тайтла
                const allRes = await fetch(`https://kodikapi.com/search?token=${token}&shikimori_id=${shikiId}&with_material_data=true`);
                const allData = await allRes.json();
                updateUI(allData.results);
            } else {
                updateUI(data.results);
            }
        }
    } catch (e) { console.error("Ошибка API:", e); }
}

// --- ЗАПОЛНЕНИЕ ИНТЕРФЕЙСА ---
function updateUI(results) {
    const a = results[0];
    const main = a.material_data || {};
    currentAnimeName = main.anime_title || a.title;
    
    // Основное
    if(document.getElementById('title')) document.getElementById('title').innerText = currentAnimeName;
    if(document.getElementById('description')) document.getElementById('description').innerText = main.description || "Описания нет.";
    if(document.getElementById('meta')) document.getElementById('meta').innerText = `${a.type.toUpperCase()} • ${main.shikimori_rating || 0} ★ • ${main.year || a.year}`;
    if(document.getElementById('poster')) document.getElementById('poster').src = main.poster_url || 'Assets/Cyanime.jpg';

    // ЗАПОЛНЕНИЕ ПАСПОРТА
    const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val; };
    
    setVal('pass-duration', `${main.duration || '?'} мин.`);
    setVal('pass-episodes', `${a.last_episode || '?'} / ${main.episodes_total || '?'}`);
    setVal('pass-year', main.year || a.year || '—');
    setVal('pass-genres', (main.anime_genres || main.genres || []).slice(0, 3).join(', ') || '—');
    setVal('pass-studio', (main.anime_studios || []).join(', ') || '—');
    setVal('pass-director', (main.anime_directors || []).join(', ') || '—');
    setVal('pass-author', '—'); // В Kodik API авторов манги обычно нет

    renderTranslations(results);
    renderFranchise(currentAnimeName);
    loadPlayer(a.link);
}

// --- ПЛЕЕР ---
function loadPlayer(link) {
    const iframe = document.getElementById('main-iframe');
    if (!iframe) return;

    let savedEp = localStorage.getItem(`ep_${animeId}`) || "1";
    let savedTime = localStorage.getItem(`time_${animeId}`) || "0";

    let finalLink = link.startsWith('http') ? link : `https:${link}`;
    const separator = finalLink.includes('?') ? '&' : '?';
    
    iframe.src = `${finalLink}${separator}episode=${savedEp}&start_from=${savedTime}&translations=false`;

    // Интервал опроса плеера (раз в 10 сек)
    if (saveInterval) clearInterval(saveInterval);
    saveInterval = setInterval(() => {
        iframe.contentWindow.postMessage({ key: 'kodik_player_get_info' }, '*');
    }, 10000);
}

// --- КНОПКИ ОЗВУЧЕК ---
function renderTranslations(results) {
    const container = document.getElementById('translation-list');
    if (!container) return;
    container.innerHTML = ''; 
    results.forEach((item, index) => {
        const btn = document.createElement('button');
        btn.className = 'translation-btn' + (index === 0 ? ' active' : '');
        btn.innerText = item.translation.title; 
        btn.onclick = () => {
            // Снимаем активный класс со всех и даем этой
            document.querySelectorAll('.translation-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentVoice = item.translation.title;
            loadPlayer(item.link);
        };
        if (index === 0) currentVoice = item.translation.title;
        container.appendChild(btn);
    });
}

// --- ХРОНОЛОГИЯ ---
async function renderFranchise(title) {
    const container = document.getElementById('franchise-list');
    if (!container) return;
    try {
        const res = await fetch(`https://kodikapi.com/search?token=${token}&title=${encodeURIComponent(title)}&types=anime-serial,anime`);
        const data = await res.json();
        if (data.results) {
            container.innerHTML = '';
            data.results.slice(0, 5).forEach(item => {
                const div = document.createElement('div');
                div.className = 'franchise-item' + (item.id == animeId ? ' active' : '');
                div.innerText = `${item.title} (${item.year})`;
                div.onclick = () => { if(item.id != animeId) location.href = `watch.html?id=${item.id}`; };
                container.appendChild(div);
            });
        }
    } catch (e) {}
}

// --- СЛУШАТЕЛЬ ПЛЕЕРА ---
window.addEventListener('message', (e) => {
    let data = e.data;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch (err) { return; } }

    if (data.key === 'kodik_player_video_info') {
        const val = data.value;
        if (val && val.episode) {
            triggerSave(val.episode, val.time, val.season);
        }
    }
});