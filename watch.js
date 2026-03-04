// watch.js - Команда CyAnime (Полная интеграция)
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
        currentUserUid = user.uid;
        console.log("✅ [AUTH] Пользователь:", user.uid);
    } else {
        currentUserUid = null;
        console.warn("⚠️ [AUTH] Гостевой режим");
    }
    init(); // Запуск после проверки юзера
});

// --- ЛОГИКА СОХРАНЕНИЯ (LocalStorage + Firebase) ---
async function saveProgress(episode, time = 0, season = "1") {
    if (!animeId || !currentUserUid) return;

    const epStr = episode.toString();
    const timeSec = Math.floor(time);

    // 1. Локальное сохранение (всегда работает)
    localStorage.setItem(`ep_${animeId}`, epStr);
    localStorage.setItem(`time_${animeId}`, timeSec);
    localStorage.setItem(`season_${animeId}`, season);

    // 2. Облачное сохранение
    // Если имя аниме еще не пришло из API, ставим "Загрузка..." вместо того, чтобы прерывать код
    const safeName = currentAnimeName || "Загрузка..."; 

    console.log(`💾 [FIREBASE TRY] Сохраняю: ${safeName}, ${epStr} серия, ${timeSec} сек.`);

    const userRef = doc(db, "users", currentUserUid);
    try {
        const userSnap = await getDoc(userRef);
        let history = userSnap.exists() ? (userSnap.data().h || []) : [];
        
        history = history.filter(item => item.id !== animeId);
        history.unshift({
            id: animeId,
            n: safeName,
            v: currentVoice || "Оригинал",
            e: epStr,
            s: season,
            t: Date.now(),
            time: timeSec 
        });

        if (history.length > 50) history.pop();
        await setDoc(userRef, { h: history }, { merge: true });
        console.log("✅ [FIREBASE SUCCESS] Данные в облаке!");
    } catch (e) {
        console.error("❌ [FIREBASE ERROR] Ошибка записи:", e);
    }
}

// --- ИНИЦИАЛИЗАЦИЯ ДАННЫХ ---
async function init() {
    if (!animeId) return;
    try {
        let response = await fetch(`https://kodikapi.com/search?token=${token}&id=${animeId}&with_material_data=true`);
        let data = await response.json();
        if (data.results && data.results.length > 0) {
            const shikiId = data.results[0].shikimori_id;
            if (shikiId) {
                const allRes = await fetch(`https://kodikapi.com/search?token=${token}&shikimori_id=${shikiId}&with_material_data=true`);
                const allData = await allRes.json();
                updateUI(allData.results);
            } else {
                updateUI(data.results);
            }
        }
    } catch (e) { console.error("❌ [INIT] Ошибка API:", e); }
}

// --- ЗАПОЛНЕНИЕ ИНТЕРФЕЙСА ---
async function updateUI(results) {
    const a = results[0];
    const main = a.material_data || {};
    currentAnimeName = main.anime_title || a.title;
    
    // Массовое заполнение полей
    const fields = {
        'title': currentAnimeName,
        'meta': `${a.type} | ${main.shikimori_rating || 0} ★ | ${main.year || a.year}`,
        'description': main.description || "Описания нет.",
        'pass-duration': ` ${main.duration || '?'} мин.`,
        'pass-year': main.year || a.year || 'Неизвестно',
        'pass-genres': (main.anime_genres || main.genres || []).join(', '),
        'pass-episodes': main.episodes_total === 1 ? 'Фильм' : `${a.last_episode || '?'} / ${main.episodes_total || '?'}`
    };

    for (let id in fields) {
        const el = document.getElementById(id);
        if (el) el.innerText = fields[id];
    }

    const poster = document.getElementById('poster');
    if (poster && main.poster_url) poster.src = main.poster_url;

    renderTranslations(results);
    renderFranchise(currentAnimeName);
    
    // Загружаем плеер с первым результатом
    loadPlayer(a.link);
}

// --- ПЛЕЕР: ТЕПЕРЬ С ПАРАМЕТРАМИ ИЗ ИНСТРУКЦИИ ---
async function loadPlayer(link) {
    const iframe = document.getElementById('main-iframe');
    if (!iframe) return;

    let savedEp = localStorage.getItem(`ep_${animeId}`);
    let savedTime = localStorage.getItem(`time_${animeId}`);
    let savedSeason = localStorage.getItem(`season_${animeId}`) || "1";

    // Тянем из облака, если нет локально
    if (!savedEp && currentUserUid) {
        const userSnap = await getDoc(doc(db, "users", currentUserUid));
        if (userSnap.exists()) {
            const lastData = (userSnap.data().h || []).find(item => item.id === animeId);
            if (lastData) {
                savedEp = lastData.e;
                savedTime = lastData.time;
                savedSeason = lastData.s || "1";
            }
        }
    }

    // Подготовка ссылки
    let finalLink = link.startsWith('http') ? link : `https:${link}`;
    const separator = finalLink.includes('?') ? '&' : '?';
    
    // Параметры из твоей инструкции:
    // episode, season, start_from
    const params = new URLSearchParams({
        episode: savedEp || "1",
        season: savedSeason,
        start_from: savedTime || "0",
        translations: "false", // фиксируем текущую озвучку
        auto_translation: "false" 
    });

    iframe.src = `${finalLink}${separator}${params.toString()}`;

    // Запуск опроса плеера (раз в 10 сек)
    if (saveInterval) clearInterval(saveInterval);
    saveInterval = setInterval(() => {
        iframe.contentWindow.postMessage({ key: 'kodik_player_get_info' }, '*');
    }, 10000);
}

// --- ОЗВУЧКИ (Твоя логика) ---
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

// --- ФРАНШИЗА (Твоя логика) ---
async function renderFranchise(title) {
    const container = document.getElementById('franchise-list');
    if (!container) return;
    try {
        const res = await fetch(`https://kodikapi.com/search?token=${token}&title=${encodeURIComponent(title)}&types=anime-serial,anime&with_material_data=true`);
        const data = await res.json();
        if (!data.results) return;
        
        container.innerHTML = '';
        const seenShiki = new Set();
        data.results
            .sort((x, y) => (x.year || 0) - (y.year || 0))
            .forEach(item => {
                if (!seenShiki.has(item.shikimori_id)) {
                    seenShiki.add(item.shikimori_id);
                    const div = document.createElement('div');
                    div.className = `franchise-item ${item.id === animeId ? 'active' : ''}`;
                    div.innerText = `${item.title} (${item.year})`;
                    div.onclick = () => { window.location.href = `watch.html?id=${item.id}`; };
                    container.appendChild(div);
                }
            });
    } catch (e) { console.error("❌ [FRANCHISE] Ошибка:", e); }
}

// --- ОБРАБОТКА ОТВЕТОВ ПЛЕЕРА ---
window.addEventListener('message', (e) => {
    let data = e.data;
    
    // Плеер иногда шлет данные строкой, нужно превратить их в объект
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (err) { return; }
    }

    if (data.key === 'kodik_player_video_info') {
        const val = data.value;
        const ep = val.episode;
        const time = val.time || 0;
        const season = val.season || "1";
        
        if (ep) {
            console.log(`📥 [PLAYER DATA] Получено: серия ${ep}, время ${time}`);
            saveProgress(ep, time, season);
        }
    }
});