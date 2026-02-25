// Конфигурация команды CyAnime
const KODIK_TOKEN = 'cc25b08a2d09435ad1818ce358fd407d';
const themeBtn = document.getElementById('theme-btn');
const authBlock = document.getElementById('auth-block');
const grid = document.getElementById('anime-list');
const currentPage = document.body.getAttribute('data-page');

// 1. Тема (без изменений)
if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
}
themeBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// 2. Авторизация (без изменений)
window.toggleAuth = function() {
    const isLoggedIn = authBlock.querySelector('span');
    authBlock.innerHTML = !isLoggedIn 
        ? `<span style="color:var(--accent-color); font-weight:bold; cursor:pointer;">👾 User_Kun</span>`
        : `<button class="auth-btn" onclick="toggleAuth()">Войти</button>`;
}

// 3. Загрузка данных из KODIK API
async function fetchAnime() {
    // Базовый URL для списка аниме
    // with_material_data=true позволяет сразу получить постеры и описания
    let url = `https://kodikapi.com/list?token=${KODIK_TOKEN}&types=anime-serial,anime&with_material_data=true&limit=24`;

    if (currentPage === 'ongoing') {
        url += '&anime_status=ongoing';
    } else if (currentPage === 'new') {
        url += '&order=updated_at'; // Последние обновленные (новые серии)
    }

    try {
        const response = await fetch(url);
        const resData = await response.json();
        
        // В Kodik данные лежат в поле .results
        if (resData.results && resData.results.length > 0) {
            renderCards(resData.results);
        } else {
            grid.innerHTML = '<p>Ничего не найдено</p>';
        }
    } catch (e) {
        console.error('Ошибка CyAnime:', e);
        grid.innerHTML = '<p style="color:red; padding:20px;">Ошибка связи с базой Kodik</p>';
    }
}

// 4. Отрисовка карточек
function renderCards(data) {
    grid.innerHTML = data.map(anime => {
        // Берем данные из material_data (там постеры и описания)
        const material = anime.material_data || {};
        const title = material.anime_title || anime.title; 
        const posterUrl = material.poster_url || 'assets/Cyanime.jpg'; // Заглушка, если нет постера
        const rating = material.shikimori_rating ? `⭐ ${material.shikimori_rating}` : '⭐ 0.0';
        const year = material.year || anime.year || '';

        // Передаем ID в watch.html, чтобы там сразу открыть нужный плеер
        return `
            <div class="card-stub" onclick="location.href='watch.html?id=${anime.id}'">
                <img src="${posterUrl}" 
                    alt="${title}" 
                    class="anime-poster"
                    onerror="this.src='assets/Cyanime.jpg';">
                <div class="card-info">
                    <div class="card-title">${title}</div>
                    <div class="card-rating">${rating} <span style="font-size: 0.8em; opacity: 0.7;">| ${year}</span></div>
                </div>
            </div>
        `;
    }).join('');
}

fetchAnime();