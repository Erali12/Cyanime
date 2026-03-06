// script.js

const KODIK_TOKEN = 'cc25b08a2d09435ad1818ce358fd407d';

// Оборачиваем всё в событие загрузки, чтобы дождаться отрисовки DOM
document.addEventListener('DOMContentLoaded', () => {
    // 1. Находим элементы
    const themeBtn = document.getElementById('theme-btn');
    const searchInput = document.getElementById('search-input');
    const grid = document.getElementById('anime-list');
    const sectionTitle = document.querySelector('.section-title');

    // --- 2. ТЕМА (С ИСПРАВЛЕНИЕМ ЛУНЫ) ---
    function updateThemeIcons(theme) {
        const sunIcon = document.querySelector('.sun-icon');
        const moonIcon = document.querySelector('.moon-icon');
        
        if (theme === 'dark') {
            if (sunIcon) sunIcon.style.display = 'none';
            if (moonIcon) moonIcon.style.display = 'block';
        } else {
            if (sunIcon) sunIcon.style.display = 'block';
            if (moonIcon) moonIcon.style.display = 'none';
        }
    }

    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Небольшая задержка для корректного отображения иконок в хедере
    setTimeout(() => updateThemeIcons(savedTheme), 0);

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcons(newTheme);
        });
    }

    // --- 3. ЛОГИКА ПОИСКА (ENTER) ---
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    window.location.href = `search.html?q=${encodeURIComponent(query)}`;
                }
            }
        });
    }

    // --- 4. ЗАГРУЗКА ДАННЫХ И ОТРИСОВКА КАРТОЧЕК (С СКЕЛЕТОНАМИ) ---
    if (grid) {
        async function fetchAnime() {
            const urlParams = new URLSearchParams(window.location.search);
            const searchQuery = urlParams.get('q');
            const currentTab = urlParams.get('tab') || 'ongoing'; 

            // 🔥 ВСТАВЛЯЕМ СКЕЛЕТОНЫ ПЕРЕД ЗАПРОСОМ 🔥
            grid.innerHTML = Array(14).fill('<div class="skeleton-card"></div>').join('');

            let url = `https://kodikapi.com/list?token=${KODIK_TOKEN}&types=anime-serial&with_material_data=true&limit=100`;

            document.querySelectorAll('.nav-tabs a').forEach(link => link.classList.remove('active'));

            if (searchQuery) {
                url = `https://kodikapi.com/search?token=${KODIK_TOKEN}&title=${encodeURIComponent(searchQuery)}&types=anime-serial&with_material_data=true`;
                if (sectionTitle) sectionTitle.innerText = `Результаты по запросу: ${searchQuery}`;
            } 
            else if (currentTab === 'popular') {
                url += '&sort=shikimori_rating'; 
                if (sectionTitle) sectionTitle.innerText = 'Популярное в CyAnime';
                document.querySelector('.nav-tabs a[href*="tab=popular"]')?.classList.add('active');
            } 
            else {
                url += '&anime_status=ongoing'; 
                if (sectionTitle) sectionTitle.innerText = 'Смотрят сейчас в CyAnime';
                const homeBtn = document.querySelector('.nav-tabs a[href*="tab=ongoing"]') || document.querySelector('.nav-tabs a[href="index.html"]');
                homeBtn?.classList.add('active');
            }

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Ошибка сети');
                const resData = await response.json();
                
                if (resData.results && resData.results.length > 0) {
                    const seenIds = new Set();
                    const uniqueAnime = resData.results.filter(anime => {
                        const sId = anime.shikimori_id;
                        if (!sId || seenIds.has(sId)) return false;
                        seenIds.add(sId);
                        return true;
                    });
                    renderCards(uniqueAnime.slice(0, 24));
                } else {
                    grid.innerHTML = '<p style="text-align:center; grid-column:1/-1; padding: 40px;">Ничего не найдено :(</p>';
                }
            } catch (e) {
                console.error('Ошибка:', e);
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align:center; padding:50px;">
                        <p style="color:var(--accent-color); font-size:1.2rem;">База Kodik отдыхает...</p>
                        <button onclick="location.reload()" class="auth-btn" style="margin-top:10px;">Обновить</button>
                    </div>`;
            }
        }

        function renderCards(data) {
            // Отрисовка заменяет содержимое grid (скелетоны исчезают автоматически)
            grid.innerHTML = data.map(anime => {
                const material = anime.material_data || {};
                const title = material.anime_title || anime.title; 
                const posterUrl = material.poster_url || 'Assets/Cyanime.jpg';
                const rating = material.shikimori_rating ? `⭐ ${material.shikimori_rating}` : '⭐ 0.0';
                const year = material.year || anime.year || '';

                return `
                    <div class="card-stub" onclick="location.href='watch.html?id=${anime.id}'">
                        <img src="${posterUrl}" alt="${title}" class="anime-poster" onerror="this.src='Assets/Cyanime.jpg';">
                        <div class="card-info">
                            <div class="card-title">${title}</div>
                            <div class="card-rating">${rating} <span style="font-size: 0.8em; opacity: 0.7;">| ${year}</span></div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        fetchAnime();
    }
});