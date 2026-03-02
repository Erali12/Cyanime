// watch.js - Команда CyAnime (Полная синхронизация + Интерфейс + Облако)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const wParams = new URLSearchParams(window.location.search);
const animeId = wParams.get('id'); 
const token = 'cc25b08a2d09435ad1818ce358fd407d';

let currentAnimeName = "";
let currentVoice = "";
let currentUserUid = null;
let saveInterval = null;

// --- СЛУШАЕМ АВТОРИЗАЦИЮ ---
onAuthStateChanged(auth, (user) => { 
    if (user) {
        currentUserUid = user.uid; //
        console.log("✅ [DEBUG] Пользователь авторизован:", user.uid);
        init(); 
    } else {
        currentUserUid = null;
        console.log("⚠️ [DEBUG] Гостевой режим");
        init(); // Инициализируем даже для гостей, чтобы плеер работал
    }
});

// --- ЛОГИКА СОХРАНЕНИЯ В ОБЛАКО ---
async function saveProgress(episode, time = 0) {
    if (!currentUserUid || !animeId || !currentAnimeName || !episode) return;

    const userRef = doc(db, "users", currentUserUid); //
    
    try {
        const userSnap = await getDoc(userRef); //
        let history = [];
        
        if (userSnap.exists()) {
            history = userSnap.data().h || []; // Ключ 'h' для истории
        }
        
        // Удаляем старую запись об этом аниме, чтобы поднять новую в начало
        history = history.filter(item => item.id !== animeId);
        
        history.unshift({
            id: animeId,
            n: currentAnimeName,
            v: currentVoice || "Оригинал",
            e: episode.toString(),
            t: Date.now(),
            time: Math.floor(time) // Сохраняем целые секунды
        });

        if (history.length > 50) history.pop();

        await setDoc(userRef, { h: history }, { merge: true }); //
        console.log(`☁️ Синхронизация: ${episode} сер. | ${Math.floor(time)} сек.`);
    } catch (e) {
        console.error("❌ Ошибка Firestore:", e);
    }
}

// --- ИНИЦИАЛИЗАЦИЯ ДАННЫХ ---
async function init() {
    if (!animeId) return;
    try {
        let response = await fetch(`https://kodikapi.com/search?token=${token}&id=${animeId}&with_material_data=true`); //
        let data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const firstResult = data.results[0];
            const shikiId = firstResult.shikimori_id;

            if (shikiId) {
                const allRes = await fetch(`https://kodikapi.com/search?token=${token}&shikimori_id=${shikiId}&with_material_data=true`); //
                const allData = await allRes.json();
                if (allData.results && allData.results.length > 0) {
                    updateUI(allData.results);
                    return;
                }
            }
            updateUI(data.results);
        }
    } catch (e) { console.error("Ошибка API:", e); }
}

// --- ЗАПОЛНЕНИЕ ИНТЕРФЕЙСА ---
async function updateUI(results) {
    const a = results[0];
    const main = a.material_data || {};
    currentAnimeName = main.anime_title || a.title; //
    
    // Текстовые поля
    const elements = {
        'title': currentAnimeName,
        'meta': `${a.type} | ${main.shikimori_rating || 0} ★ | ${main.year || a.year}`,
        'description': main.description || "Описания нет.",
        'pass-duration': ` ${main.duration || '?'} мин.`,
        'pass-year': main.year || a.year || 'Неизвестно',
        'pass-director': main.directors ? main.directors.join(', ') : 'Неизвестно',
        'pass-studio': main.studios ? main.studios.join(', ') : 'Неизвестно',
        'pass-genres': (main.anime_genres || main.genres || []).join(', ') || 'Неизвестно',
        'pass-author': (main.writers || main.authors || []).join(', ') || 'Неизвестно'
    };

    for (let id in elements) {
        const el = document.getElementById(id);
        if (el) el.innerText = elements[id];
    }

    if (main.poster_url && document.getElementById('poster')) {
        document.getElementById('poster').src = main.poster_url; //
    }

    const lastEp = a.last_episode || main.episodes_aired || a.episodes_count || '?';
    const totalEp = main.episodes_total || main.all_episodes || '?';
    const epEl = document.getElementById('pass-episodes');
    if (epEl) epEl.innerText = totalEp === 1 ? ` Фильм` : ` ${lastEp} / ${totalEp} серий`;

    renderTranslations(results);
    loadPlayer(a.link);
    if (main.anime_title && document.getElementById('franchise-list')) renderFranchise(main.anime_title);
}

// --- ПЛЕЕР С ПОДДЕРЖКОЙ ОБЛАКА ---
async function loadPlayer(link) {
    const iframe = document.getElementById('main-iframe');
    
    // 1. Проверка локально
    let savedEpisode = localStorage.getItem(`ep_${animeId}`);
    let savedTime = localStorage.getItem(`time_${animeId}`);

    // 2. Если локально пусто — запрашиваем облако
    if (!savedEpisode && currentUserUid) {
        try {
            const userSnap = await getDoc(doc(db, "users", currentUserUid));
            if (userSnap.exists()) {
                const history = userSnap.data().h || [];
                const lastData = history.find(item => item.id === animeId);
                if (lastData) {
                    savedEpisode = lastData.e;
                    savedTime = lastData.time;
                    console.log("☁️ Подтянуто из Firebase:", savedEpisode, "сер.");
                }
            }
        } catch (e) { console.error("Ошибка облака:", e); }
    }

    savedEpisode = savedEpisode || "1";
    savedTime = savedTime || "0";
    
    let finalLink = link.startsWith('http') ? link : `https:${link}`;
    const separator = finalLink.includes('?') ? '&' : '?';
    
    iframe.src = `${finalLink}${separator}episode=${savedEpisode}&time=${savedTime}&translations=false`;
    
    // Запускаем опрос плеера каждые 10 секунд
    if (saveInterval) clearInterval(saveInterval);
    saveInterval = setInterval(() => {
        iframe.contentWindow.postMessage({ key: 'kodik_player_get_info' }, '*');
    }, 10000);
}

// --- ОЗВУЧКИ ---
function renderTranslations(results) {
    const container = document.getElementById('translation-list');
    if (!container) return;
    container.innerHTML = ''; 

    results.forEach((item, index) => {
        const btn = document.createElement('button');
        btn.className = 'translation-btn';
        btn.innerText = item.translation.title; 
        btn.onclick = () => {
            document.querySelectorAll('.translation-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentVoice = item.translation.title;
            loadPlayer(item.link);
        };
        if (index === 0) { btn.classList.add('active'); currentVoice = item.translation.title; }
        container.appendChild(btn);
    });
}

// --- ФРАНШИЗА ---
async function renderFranchise(title) {
    const container = document.getElementById('franchise-list');
    if (!container) return;
    try {
        const res = await fetch(`https://kodikapi.com/search?token=${token}&title=${encodeURIComponent(title)}&types=anime-serial,anime&with_material_data=true`); //
        const data = await res.json();
        if (!data.results) return;
        container.innerHTML = '';
        const sorted = data.results.sort((x, y) => (x.year || 0) - (y.year || 0));
        const seenShiki = new Set();
        sorted.forEach(item => {
            if (!seenShiki.has(item.shikimori_id)) {
                seenShiki.add(item.shikimori_id);
                const div = document.createElement('div');
                div.className = 'franchise-item';
                if (item.id === animeId) div.classList.add('active');
                div.innerText = `${item.title} (${item.year})`;
                div.onclick = () => { window.location.href = `watch.html?id=${item.id}`; };
                container.appendChild(div);
            }
        });
    } catch (e) { console.error("Ошибка франшизы:", e); }
}

// --- СЛУШАЕМ ПЛЕЕР ---
window.addEventListener('message', (e) => {
    if (e.data.key === 'kodik_player_video_info') {
        const ep = e.data.value.episode;
        const time = e.data.value.time; //
        
        if (ep) {
            localStorage.setItem(`ep_${animeId}`, ep);
            localStorage.setItem(`time_${animeId}`, time);
            
            // Если имя аниме загрузилось — сохраняем
            if (currentAnimeName) {
                saveProgress(ep, time);
            }
        }
    }
});