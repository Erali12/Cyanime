// watch.js - Команда CyAnime (Расширенный поиск озвучек)
const wParams = new URLSearchParams(window.location.search);
const animeId = wParams.get('id'); 
const token = 'cc25b08a2d09435ad1818ce358fd407d';

async function init() {
    if (!animeId) return;

    try {
        // ШАГ 1: Ищем по тому ID, который пришел из ссылки
        let response = await fetch(`https://kodikapi.com/search?token=${token}&id=${animeId}&with_material_data=true`);
        let data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const firstResult = data.results[0];
            const shikiId = firstResult.shikimori_id; // Получаем общий ID

            // ШАГ 2: Если есть Shikimori ID, ищем ВСЕ доступные переводы
            if (shikiId) {
                const allRes = await fetch(`https://kodikapi.com/search?token=${token}&shikimori_id=${shikiId}&with_material_data=true`);
                const allData = await allRes.json();
                
                if (allData.results && allData.results.length > 0) {
                    // Теперь у нас в results ВСЕ озвучки!
                    updateUI(allData.results);
                    return;
                }
            }
            
            // Если вдруг Shikimori ID нет, показываем хотя бы то, что нашли вначале
            updateUI(data.results);
        }
    } catch (e) {
        console.error("Ошибка CyAnime:", e);
    }
}

function updateUI(results) {
    const main = results[0].material_data || {};
    const a = results[0];

    // Заполняем инфо
    document.getElementById('title').innerText = main.anime_title || a.title;
    document.getElementById('meta').innerText = `${a.type} | ${main.shikimori_rating || 0} ★ | ${main.year || a.year}`;
    document.getElementById('description').innerText = main.description || "Описания нет.";
    if (main.poster_url) document.getElementById('poster').src = main.poster_url;

    // Рисуем кнопки всех озвучек
    renderTranslations(results);
    
    // Грузим плеер (первый из списка)
    loadPlayer(results[0].link);
}

function renderTranslations(results) {
    const container = document.getElementById('translation-list');
    if (!container) return;
    container.innerHTML = ''; 

    // Сортируем, чтобы первыми шли популярные или полные озвучки (опционально)
    results.forEach((item, index) => {
        const btn = document.createElement('button');
        btn.className = 'translation-btn';
        btn.innerText = item.translation.title;
        
        btn.onclick = () => {
            document.querySelectorAll('.translation-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadPlayer(item.link);
        };

        if (index === 0) btn.classList.add('active');
        container.appendChild(btn);
    });
}

function loadPlayer(link) {
    const iframe = document.getElementById('main-iframe');
    const savedEpisode = localStorage.getItem(`ep_${animeId}`) || "1";
    let finalLink = link.startsWith('http') ? link : `https:${link}`;
    
    // Параметр translations=false убирает внутреннее меню Kodik
    const separator = finalLink.includes('?') ? '&' : '?';
    iframe.src = `${finalLink}${separator}episode=${savedEpisode}&translations=false&auto_translation=false`;
}

// Сохранение серии
window.addEventListener('message', (e) => {
    if (e.data.key === 'kodik_player_video_info') {
        const ep = e.data.value.episode;
        if (ep) localStorage.setItem(`ep_${animeId}`, ep);
    }
});

init();