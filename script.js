const KODIK_TOKEN = 'cc25b08a2d09435ad1818ce358fd407d';

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const grid = document.getElementById('anime-list');
    const sectionTitle = document.querySelector('.section-title');

    // 1. Поиск
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) window.location.href = `search.html?q=${encodeURIComponent(query)}`;
            }
        });
    }

    // 2. Загрузка данных
    if (grid) {
        async function fetchAnime() {
            const urlParams = new URLSearchParams(window.location.search);
            const searchQuery = urlParams.get('q');
            const currentTab = urlParams.get('tab') || 'ongoing'; 

            // Скелетоны (твои 14 штук)
            grid.innerHTML = Array(14).fill('<div class="skeleton-card"></div>').join('');

            let url = `https://kodikapi.com/list?token=${KODIK_TOKEN}&types=anime-serial&with_material_data=true&limit=100`;

            if (searchQuery) {
                url = `https://kodikapi.com/search?token=${KODIK_TOKEN}&title=${encodeURIComponent(searchQuery)}&types=anime-serial&with_material_data=true`;
                if (sectionTitle) sectionTitle.innerText = `Результаты по запросу: ${searchQuery}`;
            } else if (currentTab === 'popular') {
                url += '&sort=shikimori_rating'; 
                if (sectionTitle) sectionTitle.innerText = 'Популярное в CyAnime';
            } else {
                url += '&anime_status=ongoing'; 
                if (sectionTitle) sectionTitle.innerText = 'Смотрят сейчас в CyAnime';
            }

            try {
                const response = await fetch(url);
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
                grid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Ошибка загрузки базы...</p>';
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
                            <div class="card-rating">${rating} <span style="font-size: 0.8em; opacity: 0.7;">| ${year}</span></div>
                        </div>
                    </div>`;
            }).join('');
        }
        fetchAnime();
    }
});