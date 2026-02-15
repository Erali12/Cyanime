const themeBtn = document.getElementById('theme-btn');
const authBlock = document.getElementById('auth-block');
const grid = document.getElementById('anime-list');
const currentPage = document.body.getAttribute('data-page');

// 1. Тема
if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
}
themeBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// 2. Авторизация
window.toggleAuth = function() {
    const isLoggedIn = authBlock.querySelector('span');
    authBlock.innerHTML = !isLoggedIn 
        ? `<span style="color:var(--accent-color); font-weight:bold; cursor:pointer;">👾 User_Kun</span>`
        : `<button class="auth-btn" onclick="toggleAuth()">Войти</button>`;
}

// 3. Загрузка данных (Jikan v4)
async function fetchAnime() {
    let url = 'https://api.jikan.moe/v4/top/anime?limit=20'; // По умолчанию популярное

    if (currentPage === 'ongoing') {
        url = 'https://api.jikan.moe/v4/seasons/now?limit=20';
    } else if (currentPage === 'new') {
        // Берем текущий сезон, но только те, что УЖЕ выходят (чтобы не было N/A)
        url = 'https://api.jikan.moe/v4/seasons/now?limit=20&filter=tv'; 
    }

    try {
        const response = await fetch(url);
        const resData = await response.json();
        // Фильтруем данные: убираем те, где совсем нет рейтинга или картинки
        const cleanData = resData.data.filter(item => item.images.jpg.large_image_url);
        renderCards(cleanData);
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<p style="color:red; padding:20px;">Ошибка связи с сервером MAL</p>';
    }
}

// 4. Отрисовка с исправленной версткой
function renderCards(data) {
    grid.innerHTML = data.map(anime => {
        const title = anime.title_english || anime.title; 
        const posterUrl = anime.images.jpg.large_image_url;
        const rating = anime.score ? `⭐️ ${anime.score}` : '⭐️ Новинка';

        // Найди этот кусок в своем renderCards и замени:
        return `
            <div class="card-stub" onclick="location.href='watch.html?title=${encodeURIComponent(title)}'">
                <img src="${posterUrl}" 
                    alt="${title}" 
                    class="anime-poster"
                    onerror="this.src='assets/Cyanime.jpg';">
                <div class="card-info">
                    <div class="card-title">${title}</div>
                    <div class="card-rating">${rating}</div>
                </div>
            </div>
        `;
    }).join('');
}

fetchAnime();

