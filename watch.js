/* --- 1. ИМПОРТЫ И КОНСТАНТЫ --- */
import { supabase } from "./supabase-config.js";

const KODIK_TOKEN = 'cc25b08a2d09435ad1818ce358fd407d';
const wParams = new URLSearchParams(window.location.search);
const animeId = wParams.get('id'); 
const targetVoice = wParams.get('voice'); 

/* --- 2. СОСТОЯНИЕ --- */
let currentAnimeName = "";
let currentVoice = "";
let currentPoster = "";
let currentUserUid = null;
let saveInterval = null;
let currentEpisode = localStorage.getItem(`ep_${animeId}`) || "1";

/* --- 3. СТАРТ --- */
if (animeId) {
    init();
}

// Получаем текущего пользователя через Supabase
supabase.auth.getUser().then(({ data: { user } }) => {
    currentUserUid = user ? user.id : null;
});

/* --- 4. ОСНОВНАЯ ЛОГИКА ЗАГРУЗКИ --- */
async function init() {
    try {
        let res = await fetch(`https://kodikapi.com/search?token=${KODIK_TOKEN}&id=${animeId}&with_material_data=true`);
        let data = await res.json();
        
        if (data.results && data.results.length > 0) {
            const base = data.results[0];
            const shikiId = base.shikimori_id;

            // УМНОЕ ОПРЕДЕЛЕНИЕ БАЗОВОГО ИМЕНИ
            let rawTitle = (base.material_data?.anime_title || base.title).split('/')[0].split(':')[0].trim();
            let words = rawTitle.split(' ');
            const shortBase = words.length > 2 ? words.slice(0, 3).join(' ') : words.join(' ');

            if (shikiId) {
                const allRes = await fetch(`https://kodikapi.com/search?token=${KODIK_TOKEN}&shikimori_id=${shikiId}&with_material_data=true`);
                const allData = await allRes.json();
                
                let preferredVariant = allData.results.find(r => r.translation.title === targetVoice) || allData.results[0];
                
                updateUI(allData.results, preferredVariant);
                renderFranchise(shortBase, shikiId);
            } else {
                updateUI(data.results, data.results[0]);
                renderFranchise(shortBase, null);
            }
            handleBookmarks();
        }
    } catch (e) { console.error("API Error:", e); }
}

/* --- 5. ОБНОВЛЕНИЕ ИНТЕРФЕЙСА --- */
function updateUI(allVariants, activeVariant) {
    const main = activeVariant.material_data || {};
    
    const realYear = activeVariant.year || main.year || '—';
    
    currentAnimeName = main.anime_title || activeVariant.title;
    currentPoster = main.poster_url || 'Assets/Cyanime.jpg';
    
    const fill = (id, val) => { 
        const el = document.getElementById(id);
        if(el) el.innerText = val; 
    };

    fill('title', currentAnimeName);
    fill('description', main.description || "Описание временно отсутствует.");
    fill('meta', `${(activeVariant.type || 'Аниме').toUpperCase()} • ${main.shikimori_rating || 0} ⭐ • ${realYear}`);
    
    const poster = document.getElementById('poster');
    if(poster) poster.src = currentPoster;

    fill('pass-duration', `${main.duration || '?'} мин.`);
    fill('pass-episodes', `${activeVariant.last_episode || '?'} / ${main.episodes_total || '?'}`);
    fill('pass-year', realYear); 
    fill('pass-genres', (main.anime_genres || []).join(', ') || '—');
    fill('pass-studio', (main.anime_studios || []).join(', ') || '—');

    renderTranslations(allVariants, activeVariant.translation.title);
    loadPlayer(activeVariant.link, activeVariant.translation.title);
}

/* --- 6. ПЛЕЕР И ПЕРЕВОДЫ --- */
function loadPlayer(link, voiceTitle) {
    const iframe = document.getElementById('main-iframe');
    if (!iframe || !link) return;

    currentVoice = voiceTitle;
    let finalLink = link.startsWith('http') ? link : `https:${link}`;
    const sep = finalLink.includes('?') ? '&' : '?';
    
    iframe.src = `${finalLink}${sep}episode=${currentEpisode}&translations=false&api=true`;

    if (saveInterval) clearInterval(saveInterval);
    saveInterval = setInterval(() => {
        if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({ key: 'kodik_player_get_info' }, '*');
        }
    }, 15000); // Пингуем плеер каждые 15 сек
}

function renderTranslations(results, activeName) {
    const container = document.getElementById('translation-list');
    if (!container) return;
    container.innerHTML = '';
    
    results.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'translation-btn' + (item.translation.title === activeName ? ' active' : '');
        btn.innerText = item.translation.title;
        btn.onclick = () => {
            document.querySelectorAll('.translation-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadPlayer(item.link, item.translation.title);
        };
        container.appendChild(btn);
    });
}

/* --- 7. УМНАЯ ХРОНОЛОГИЯ --- */
async function renderFranchise(searchBase, currentShikiId) {
    const container = document.getElementById('franchise-list');
    if (!container) return;

    try {
        const res = await fetch(`https://kodikapi.com/search?token=${KODIK_TOKEN}&title=${encodeURIComponent(searchBase)}&types=anime-serial,anime&with_material_data=true`);
        const data = await res.json();
        
        if (data.results) {
            container.innerHTML = '';
            const seenShiki = new Set();
            const searchLower = searchBase.toLowerCase();
            
            let franchiseItems = data.results.filter(item => {
                const sId = item.shikimori_id;
                const itemTitle = (item.material_data?.anime_title || item.title).toLowerCase();
                return sId && !seenShiki.has(sId) && itemTitle.includes(searchLower) && seenShiki.add(sId);
            });

            franchiseItems.sort((a, b) => (a.year || 0) - (b.year || 0));

            franchiseItems.forEach(item => {
                const div = document.createElement('div');
                const isActive = item.shikimori_id === currentShikiId;
                div.className = 'franchise-item' + (isActive ? ' active' : '');
                
                const dTitle = item.material_data?.anime_title || item.title;
                div.innerText = `${dTitle} (${item.year || '?'})`;
                
                div.onclick = () => { 
                    if (!isActive) {
                        const voiceParam = currentVoice ? `&voice=${encodeURIComponent(currentVoice)}` : '';
                        location.href = `watch.html?id=${item.id}${voiceParam}`; 
                    }
                };
                container.appendChild(div);
            });
        }
    } catch (e) { console.warn("Franchise error"); }
}

/* --- 8. ЗАКЛАДКИ --- */
function handleBookmarks() {
    const btn = document.getElementById('btn-bookmark');
    const txt = document.getElementById('bookmark-text');
    if (!btn) return;
    let favs = JSON.parse(localStorage.getItem('cyanime_favs') || '[]');
    const isSaved = favs.some(item => item.id === animeId);
    if (isSaved) { btn.classList.add('active'); txt.innerText = 'В закладках'; }

    btn.onclick = () => {
        favs = JSON.parse(localStorage.getItem('cyanime_favs') || '[]');
        const idx = favs.findIndex(i => i.id === animeId);
        if (idx > -1) {
            favs.splice(idx, 1);
            btn.classList.remove('active');
            txt.innerText = 'Сохранить это аниме';
        } else {
            favs.push({ id: animeId, title: currentAnimeName, poster: currentPoster, year: document.getElementById('pass-year')?.innerText || '' });
            btn.classList.add('active');
            txt.innerText = 'В закладках';
        }
        localStorage.setItem('cyanime_favs', JSON.stringify(favs));
    };
}

/* --- 9. ПРОГРЕСС И СИНХРОНИЗАЦИЯ С ОБЛАКОМ --- */
window.addEventListener('message', (e) => {
    let data = e.data;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch (err) { return; } }
    
    if (data.key === 'kodik_player_video_info' || data.key === 'kodik_player_time_update') {
        if (data.value && data.value.episode) {
            const newEp = data.value.episode.toString();
            
            // 1. Сохраняем локально всегда
            if (newEp !== currentEpisode) {
                currentEpisode = newEp;
                localStorage.setItem(`ep_${animeId}`, currentEpisode);
            }

            // 2. Отправляем в облако через history.js (вызывается каждые 15 сек через saveInterval)
            if (window.saveToHistoryCloud && currentUserUid) {
                window.saveToHistoryCloud(currentUserUid, {
                    id: animeId,
                    n: currentAnimeName,
                    e: currentEpisode,
                    v: currentVoice,
                    p: currentPoster // Добавил постер!
                });
            }
        }
    }
});