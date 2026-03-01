// watch.js - Команда CyAnime (Интеграция с Firebase + Самосвал)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

// Инициализация
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const wParams = new URLSearchParams(window.location.search);
const animeId = wParams.get('id'); 
const token = 'cc25b08a2d09435ad1818ce358fd407d';

let currentAnimeName = "";
let currentVoice = "";

// --- ЛОГИКА СОХРАНЕНИЯ В FIREBASE ---
async function saveProgress(episode) {
    const user = auth.currentUser;
    if (!user || !animeId || !currentAnimeName) return;

    const userRef = doc(db, "users", user.uid);
    
    try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            let history = userSnap.data().h || [];
            
            // 🔥 АНТИ-ПОВТОР: Удаляем старую запись об этом аниме, если она есть
            history = history.filter(item => item.id !== animeId);
            
            // Добавляем новую запись В НАЧАЛО (unshift)
            history.unshift({
                id: animeId,
                n: currentAnimeName,
                v: currentVoice,
                e: episode || localStorage.getItem(`ep_${animeId}`) || "1",
                t: Date.now()
            });

            // Ограничиваем историю (например, последние 50 тайтлов), чтобы база не раздувалась
            if (history.length > 50) history.pop();

            await updateDoc(userRef, { h: history });
            console.log("CyAnime: Прогресс сохранен в облако");
        }
    } catch (e) {
        console.error("Ошибка сохранения:", e);
    }
}

// --- ОСНОВНАЯ ЛОГИКА ПЛЕЕРА ---
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
    } catch (e) {
        console.error("Ошибка CyAnime:", e);
    }
}

async function updateUI(results) {
    const a = results[0];
    const main = a.material_data || {};

    currentAnimeName = main.anime_title || a.title;
    
    document.getElementById('title').innerText = currentAnimeName;
    document.getElementById('meta').innerText = `${a.type} | ${main.shikimori_rating || 0} ★ | ${main.year || a.year}`;
    document.getElementById('description').innerText = main.description || "Описания нет.";
    if (main.poster_url) document.getElementById('poster').src = main.poster_url;

    // Паспорт
    const duration = main.duration ? main.duration : '?';
    document.getElementById('pass-duration').innerText = ` ${duration} мин.`;
    const lastEp = a.last_episode || main.episodes_aired || a.episodes_count || '?';
    const totalEp = main.episodes_total || main.all_episodes || '?';
    document.getElementById('pass-episodes').innerText = totalEp === 1 ? ` Фильм` : ` ${lastEp} / ${totalEp} серий`;
    document.getElementById('pass-year').innerText = main.year || a.year || 'Неизвестно';
    document.getElementById('pass-director').innerText = main.directors ? main.directors.join(', ') : 'Неизвестно';
    document.getElementById('pass-studio').innerText = main.studios ? main.studios.join(', ') : 'Неизвестно';
    
    const genres = main.anime_genres || main.genres || [];
    document.getElementById('pass-genres').innerText = genres.length > 0 ? genres.join(', ') : 'Неизвестно';
    
    const authors = main.writers || main.authors || [];
    document.getElementById('pass-author').innerText = authors.length > 0 ? authors.join(', ') : 'Неизвестно';

    renderTranslations(results);
    loadPlayer(a.link);
    if (main.anime_title) renderFranchise(main.anime_title);
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
            currentVoice = item.translation.title; // Запоминаем озвучку
            loadPlayer(item.link);
            saveProgress(); // Сохраняем при смене озвучки
        };

        if (index === 0) {
            btn.classList.add('active');
            currentVoice = item.translation.title;
        }
        container.appendChild(btn);
    });
}

function loadPlayer(link) {
    const iframe = document.getElementById('main-iframe');
    const savedEpisode = localStorage.getItem(`ep_${animeId}`) || "1";
    let finalLink = link.startsWith('http') ? link : `https:${link}`;
    const separator = finalLink.includes('?') ? '&' : '?';
    iframe.src = `${finalLink}${separator}episode=${savedEpisode}&translations=false&auto_translation=false`;
    
    // Сохраняем в историю сразу при загрузке плеера
    setTimeout(saveProgress, 2000); 
}

// Умная франшиза (код без изменений...)
async function renderFranchise(title) {
    const container = document.getElementById('franchise-list');
    if (!container) return;
    try {
        const res = await fetch(`https://kodikapi.com/search?token=${token}&title=${encodeURIComponent(title)}&types=anime-serial,anime&with_material_data=true`);
        const data = await res.json();
        if (!data.results) return;
        container.innerHTML = '';
        const sorted = data.results.sort((x, y) => (x.year || 0) - (y.year || 0));
        const uniqueSeasons = [];
        const seenShiki = new Set();
        for (const item of sorted) {
            if (!seenShiki.has(item.shikimori_id)) {
                seenShiki.add(item.shikimori_id);
                uniqueSeasons.push(item);
            }
        }
        uniqueSeasons.forEach(item => {
            const div = document.createElement('div');
            div.className = 'franchise-item';
            if (item.id === animeId || (item.material_data?.anime_title === title && item.year === parseInt(document.getElementById('pass-year').innerText))) {
                div.classList.add('active');
            }
            div.innerText = `${item.title} (${item.year})`;
            div.onclick = () => { window.location.href = `watch.html?id=${item.id}`; };
            container.appendChild(div);
        });
    } catch (e) { console.error("Ошибка франшизы:", e); }
}

// Слушаем плеер для автосохранения серии
window.addEventListener('message', (e) => {
    if (e.data.key === 'kodik_player_video_info') {
        const ep = e.data.value.episode;
        if (ep) {
            localStorage.setItem(`ep_${animeId}`, ep);
            saveProgress(ep); // СРАЗУ отправляем новую серию в Firebase
        }
    }
});

// Ждем авторизации перед запуском
onAuthStateChanged(auth, (user) => {
    init();
});