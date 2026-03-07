const KODIK_TOKEN = 'cc25b08a2d09435ad1818ce358fd407d';

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('anime-list');
    const sectionTitle = document.querySelector('.section-title');
    
    // Элементы фильтров
    const openBtn = document.getElementById('open-filters');
    const closeBtn = document.getElementById('close-filters');
    const overlay = document.getElementById('filter-overlay');
    const aside = document.getElementById('filter-aside');
    const applyBtn = document.getElementById('apply-filters');
    const resetBtn = document.getElementById('reset-filters');

    /* ---------------------------------------------------------
       0. ФИКС ВЫСОТЫ ХЕДЕРА (Чтобы фильтры не лезли на меню)
    ---------------------------------------------------------- */
    const updateHeaderHeight = () => {
        const header = document.querySelector('.main-header'); // Сверяем с твоим классом в CSS
        if (header) {
            const h = header.offsetHeight;
            document.documentElement.style.setProperty('--header-height', h + 'px');
        }
    };
    
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);

    /* ---------------------------------------------------------
       1. УПРАВЛЕНИЕ ПАНЕЛЬЮ (С блокировкой скролла)
    ---------------------------------------------------------- */
    const toggleFilters = (state) => {
        if (aside && overlay) {
            aside.classList.toggle('active', state);
            overlay.style.display = state ? 'block' : 'none';
            // Блокируем скролл body, чтобы не прокручивался сайт под фильтрами
            document.body.style.overflow = state ? 'hidden' : ''; 
        }
    };

    if (openBtn) openBtn.addEventListener('click', () => toggleFilters(true));
    if (closeBtn) closeBtn.addEventListener('click', () => toggleFilters(false));
    if (overlay) overlay.addEventListener('click', () => toggleFilters(false));

    /* ---------------------------------------------------------
       2. ЗАГРУЗКА ДАННЫХ (API KODIK)
    ---------------------------------------------------------- */
    async function fetchAnime(filterParams = null) {
        if (!grid) return; // Если на странице нет контейнера для списка, выходим
        
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('q');
        const currentTab = urlParams.get('tab') || 'ongoing'; 

        // Показываем скелетоны перед запросом
        grid.innerHTML = Array(14).fill('<div class="skeleton-card"></div>').join('');

        // Формируем URL
        let url = `https://kodikapi.com/list?token=${KODIK_TOKEN}&with_material_data=true&limit=100`;

        if (filterParams) {
            url += `&types=${filterParams.types}`;
            if (filterParams.year) url += `&year=${filterParams.year}`;
            if (filterParams.status) url += `&anime_status=${filterParams.status}`;
            if (sectionTitle) sectionTitle.innerText = 'Результаты фильтрации';
        } else if (searchQuery) {
            url = `https://kodikapi.com/search?token=${KODIK_TOKEN}&title=${encodeURIComponent(searchQuery)}&types=anime-serial,anime&with_material_data=true`;
            if (sectionTitle) sectionTitle.innerText = `Поиск: ${searchQuery}`;
        } else if (currentTab === 'popular') {
            url += '&types=anime-serial&sort=shikimori_rating';
            if (sectionTitle) sectionTitle.innerText = 'Популярное в CyAnime';
        } else {
            url += '&types=anime-serial&anime_status=ongoing';
            if (sectionTitle) sectionTitle.innerText = 'Смотрят сейчас в CyAnime';
        }

        try {
            const response = await fetch(url);
            const resData = await response.json();
            
            if (resData.results && resData.results.length > 0) {
                // Фильтруем дубликаты по Shikimori ID
                const seenIds = new Set();
                const uniqueAnime = resData.results.filter(anime => {
                    const sId = anime.shikimori_id;
                    if (!sId || seenIds.has(sId)) return false;
                    seenIds.add(sId);
                    return true;
                });
                renderCards(uniqueAnime.slice(0, 30));
            } else {
                grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; opacity:0.5;">Ничего не найдено...</div>';
            }
        } catch (e) {
            console.error('Ошибка API:', e);
            grid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Ошибка соединения с сервером.</p>';
        }
    }

    function renderCards(data) {
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
                        <div class="card-rating">${rating} <span style="font-size: 0.85em; opacity: 0.7;">| ${year}</span></div>
                    </div>
                </div>`;
        }).join('');
    }

    /* ---------------------------------------------------------
       3. ОБРАБОТКА КНОПОК ФИЛЬТРОВ
    ---------------------------------------------------------- */
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            const statusArr = [];
            const ong = document.getElementById('status-ongoing');
            const rel = document.getElementById('status-released');
            
            if (ong && ong.checked) statusArr.push('ongoing');
            if (rel && rel.checked) statusArr.push('released');

            const params = {
                types: document.getElementById('filter-type').value,
                year: document.getElementById('filter-year').value,
                status: statusArr.join(',')
            };

            toggleFilters(false);
            fetchAnime(params);
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            document.getElementById('filter-type').value = 'anime-serial,anime';
            document.getElementById('filter-year').value = '';
            if(document.getElementById('status-ongoing')) document.getElementById('status-ongoing').checked = false;
            if(document.getElementById('status-released')) document.getElementById('status-released').checked = false;
            toggleFilters(false);
            fetchAnime();
        });
    }

    /* ---------------------------------------------------------
       4. ПОИСК
    ---------------------------------------------------------- */
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) window.location.href = `search.html?q=${encodeURIComponent(query)}`;
            }
        });
    }

    // Запуск
    fetchAnime();
});