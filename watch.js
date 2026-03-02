// watch.js - Команда CyAnime (Оптимизированная версия)
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
const token = 'cc25b08a2d09435ad1818ce358fd407d'; // Твой токен Kodik

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
        console.warn("⚠️ [AUTH] Гостевой режим (сохранение в облако недоступно)");
    }
    // Запускаем инициализацию в любом случае
    init();
});

// --- ЛОГИКА СОХРАНЕНИЯ В ОБЛАКО ---
async function saveProgress(episode, time = 0) {
    // Проверка всех условий перед сохранением
    if (!currentUserUid) return; // Нет юзера — не сохраняем
    if (!animeId || !currentAnimeName || !episode) {
        console.error("❌ [CLOUD] Пропуск сохранения: недостаточно данных", { animeId, currentAnimeName, episode });
        return;
    }

    const userRef = doc(db, "users", currentUserUid);
    
    try {
        const userSnap = await getDoc(userRef);
        let history = [];
        
        if (userSnap.exists()) {
            history = userSnap.data().h || [];
        }
        
        // Удаляем старую запись об этом аниме (чтобы не дублировать)
        history = history.filter(item => item.id !== animeId);
        
        // Добавляем новую запись в начало
        history.unshift({
            id: animeId,
            n: currentAnimeName,
            v: currentVoice || "Оригинал",
            e: episode.toString(),
            t: Date.now(),
            time: Math.floor(time) 
        });

        // Ограничиваем историю 50 записями
        if (history.length > 50) history.pop();

        // Запись в Firestore
        await setDoc(userRef, { h: history }, { merge: true });
        console.log(`☁️ [CLOUD] Синхронизировано: ${currentAnimeName} | Сер. ${episode} | ${Math.floor(time)} сек.`);
    } catch (e) {
        console.error("❌ [CLOUD] Ошибка записи в Firestore:", e);
    }
}

// --- ИНИЦИАЛИЗАЦИЯ ДАННЫХ ---
async function init() {
    if (!animeId) {
        console.error("❌ [INIT] ID аниме отсутствует в URL");
        return;
    }

    try {
        let response = await fetch(`https://kodikapi.com/search?token=${token}&id=${animeId}&with_material_data=true`);
        let data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const firstResult = data.results[0];
            const shikiId = firstResult.shikimori_id;

            if (shikiId) {
                const allRes = await fetch(`https://kodikapi.com/search?token=${token}&shikimori_id=${shikiId}&with_material_data=true`);
                const allData = await allRes.json();
                if (allData.results && allData.results.length > 0) {
                    updateUI(allData.results);
                    return;
                }
            }
            updateUI(data.results);
        }
    } catch (e) { console.error("❌ [INIT] Ошибка API Kodik:", e); }
}

// --- ЗАПОЛНЕНИЕ ИНТЕРФЕЙСА ---
async function updateUI(results) {
    const a = results[0];
    const main = a.material_data || {};
    currentAnimeName = main.anime_title || a.title;
    
    console.log("📺 [UI] Загрузка аниме:", currentAnimeName);

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

    const poster = document.getElementById('poster');
    if (poster && main.poster_url) poster.src = main.poster_url;

    const lastEp = a.last_episode || main.episodes_aired || a.episodes_count || '?';
    const totalEp = main.episodes_total || main.all_episodes || '?';
    const epEl = document.getElementById('pass-episodes');
    if (epEl) epEl.innerText = totalEp === 1 ? ` Фильм` : ` ${lastEp} / ${totalEp} серий`;

    renderTranslations(results);
    loadPlayer(a.link);
    if (document.getElementById('franchise-list')) renderFranchise(currentAnimeName);
}

// --- ПЛЕЕР С ПОДДЕРЖКОЙ ОБЛАКА ---
async function loadPlayer(link) {
    const iframe = document.getElementById('main-iframe');
    if (!iframe) return;

    let savedEpisode = localStorage.getItem(`ep_${animeId}`);
    let savedTime = localStorage.getItem(`time_${animeId}`);

    // Если локально нет — тянем из облака
    if (!savedEpisode && currentUserUid) {
        try {
            const userSnap = await getDoc(doc(db, "users", currentUserUid));
            if (userSnap.exists()) {
                const history = userSnap.data().h || [];
                const lastData = history.find(item => item.id === animeId);
                if (lastData) {
                    savedEpisode = lastData.e;
                    savedTime = lastData.time;
                    console.log("☁️ [LOAD] Подтянуто из Firebase:", savedEpisode, "сер.");
                }
            }
        } catch (e) { console.error("❌ [LOAD] Ошибка облака:", e); }
    }

    savedEpisode = savedEpisode || "1";
    savedTime = savedTime || "0";
    
    let finalLink = link.startsWith('http') ? link : `https:${link}`;
    const separator = finalLink.includes('?') ? '&' : '?';
    
    // Загружаем iframe
    iframe.src = `${finalLink}${separator}episode=${savedEpisode}&time=${savedTime}&translations=false`;
    
    // Опрос плеера каждые 10 секунд
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
        const res = await fetch(`https://kodikapi.com/search?token=${token}&title=${encodeURIComponent(title)}&types=anime-serial,anime&with_material_data=true`);
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
    } catch (e) { console.error("❌ [FRANCHISE] Ошибка:", e); }
}

// --- СЛУШАЕМ СООБЩЕНИЯ ОТ ПЛЕЕРА ---
window.addEventListener('message', (e) => {
    if (e.data.key === 'kodik_player_video_info') {
        const ep = e.data.value.episode;
        const time = e.data.value.time;
        
        if (ep) {
            // 1. Сохраняем локально (всегда)
            localStorage.setItem(`ep_${animeId}`, ep);
            localStorage.setItem(`time_${animeId}`, time);
            
            // 2. Отправляем в облако
            saveProgress(ep, time);
        }
    }
});