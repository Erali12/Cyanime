// watch.js - Команда CyAnime (Полная синхронизация + Таймкоды)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const wParams = new URLSearchParams(window.location.search);
const animeId = wParams.get('id'); 
const token = 'cc25b08a2d09435ad1818ce358fd407d';

let currentAnimeName = "";
let currentVoice = "";
let currentUserUid = null; // ФИКС: Жестко храним UID текущего пользователя
let saveInterval = null;   // Для автоматической проверки таймкода

// --- СЛУШАЕМ АВТОРИЗАЦИЮ (Исправляет баг с аккаунтами) ---
onAuthStateChanged(auth, (user) => { 
    if (user) {
        currentUserUid = user.uid;
        init(); 
    } else {
        currentUserUid = null;
    }
});

// --- ЛОГИКА СОХРАНЕНИЯ В FIREBASE (С таймкодом) ---
async function saveProgress(episode, time = 0) {
    // ЛОГ ДЛЯ ДЕБАГА
    console.log("🛠 Попытка сохранения:", {
        uid: currentUserUid,
        id: animeId,
        ep: episode,
        time: time
    });

    if (!currentUserUid || !animeId || !currentAnimeName || !episode) {
        console.warn("⚠️ Сохранение отменено: не все данные готовы.");
        return;
    }

    const userRef = doc(db, "users", currentUserUid);
    
    try {
        const userSnap = await getDoc(userRef);
        let history = [];
        
        if (userSnap.exists()) {
            history = userSnap.data().h || [];
        }
        
        // АНТИ-ПОВТОР: Вырезаем старую запись об этом аниме
        history = history.filter(item => item.id !== animeId);
        
        // Добавляем свежую запись в начало очереди
        history.unshift({
            id: animeId,
            n: currentAnimeName,
            v: currentVoice || "Оригинал",
            e: episode.toString(),
            t: Date.now(),
            time: time // 🔥 Сохраняем секунды просмотра
        });

        // Ограничение истории
        if (history.length > 50) history.pop();

        // setDoc с merge: true создаст документ, если его не существовало
        await setDoc(userRef, { h: history }, { merge: true });
        
        console.log(`✅ CyAnime Cloud: ${episode} сер. | ${time} сек.`);
    } catch (e) {
        console.error("❌ Ошибка синхронизации:", e);
    }
}

// --- ИНИЦИАЛИЗАЦИЯ ---
async function init() {
    if (!animeId) return;
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
    } catch (e) { console.error("Ошибка загрузки данных:", e); }
}

async function updateUI(results) {
    const a = results[0];
    const main = a.material_data || {};
    currentAnimeName = main.anime_title || a.title;
    
    document.getElementById('title').innerText = currentAnimeName;
    document.getElementById('meta').innerText = `${a.type} | ${main.shikimori_rating || 0} ★ | ${main.year || a.year}`;
    document.getElementById('description').innerText = main.description || "Описания нет.";
    if (document.getElementById('poster')) document.getElementById('poster').src = main.poster_url;

    if (document.getElementById('pass-duration')) document.getElementById('pass-duration').innerText = ` ${main.duration || '?'} мин.`;
    const lastEp = a.last_episode || main.episodes_aired || a.episodes_count || '?';
    const totalEp = main.episodes_total || main.all_episodes || '?';
    if (document.getElementById('pass-episodes')) document.getElementById('pass-episodes').innerText = totalEp === 1 ? ` Фильм` : ` ${lastEp} / ${totalEp} серий`;
    if (document.getElementById('pass-year')) document.getElementById('pass-year').innerText = main.year || a.year || 'Неизвестно';
    if (document.getElementById('pass-director')) document.getElementById('pass-director').innerText = main.directors ? main.directors.join(', ') : 'Неизвестно';
    if (document.getElementById('pass-studio')) document.getElementById('pass-studio').innerText = main.studios ? main.studios.join(', ') : 'Неизвестно';
    if (document.getElementById('pass-genres')) document.getElementById('pass-genres').innerText = (main.anime_genres || main.genres || []).join(', ') || 'Неизвестно';
    if (document.getElementById('pass-author')) document.getElementById('pass-author').innerText = (main.writers || main.authors || []).join(', ') : 'Неизвестно';

    renderTranslations(results);
    loadPlayer(a.link);
    if (main.anime_title && document.getElementById('franchise-list')) renderFranchise(main.anime_title);
}

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

        if (index === 0) {
            btn.classList.add('active');
            currentVoice = item.translation.title;
        }
        container.appendChild(btn);
    });
}

// --- ЗАГРУЗКА ПЛЕЕРА И АВТОМАТИЗАЦИЯ ---
function loadPlayer(link) {
    const iframe = document.getElementById('main-iframe');
    // Берем сохраненные данные из локального хранилища
    const savedEpisode = localStorage.getItem(`ep_${animeId}`) || "1";
    const savedTime = localStorage.getItem(`time_${animeId}`) || "0";
    
    let finalLink = link.startsWith('http') ? link : `https:${link}`;
    const separator = finalLink.includes('?') ? '&' : '?';
    
    // 🔥 Передаем серию и время в iframe
    iframe.src = `${finalLink}${separator}episode=${savedEpisode}&time=${savedTime}&translations=false`;
    
    // 🔥 АВТОМАТИЗАЦИЯ: Каждые 10 секунд спрашиваем прогресс у плеера
    if (saveInterval) clearInterval(saveInterval);
    saveInterval = setInterval(() => {
        iframe.contentWindow.postMessage({
            key: 'kodik_player_get_info'
        }, '*');
    }, 10000);
}

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
    } catch (e) { console.error("Ошибка франшизы:", e); }
}

// --- СЛУШАЕМ ОТВЕТЫ ОТ ПЛЕЕРА (Фикс таймкодов) ---
window.addEventListener('message', (e) => {
    if (e.data.key === 'kodik_player_video_info') {
        const ep = e.data.value.episode;
        const time = e.data.value.time; // 🔥 Время в секундах
        
        if (ep) {
            localStorage.setItem(`ep_${animeId}`, ep);
            localStorage.setItem(`time_${animeId}`, time); // 🔥 Локальное сохранение
            
            // Если имя аниме еще не подтянулось, подождем и попробуем снова
            if (!currentAnimeName) {
                setTimeout(() => saveProgress(ep, time), 1500);
            } else {
                saveProgress(ep, time); // 🔥 Сохраняем серию и время
            }
        }
    }
});