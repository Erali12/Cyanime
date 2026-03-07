document.addEventListener('DOMContentLoaded', () => {
    renderFavorites();
});

function renderFavorites() {
    const listContainer = document.getElementById('favorites-list');
    const countText = document.getElementById('fav-count');
    
    let favs = [];
    try {
        favs = JSON.parse(localStorage.getItem('cyanime_favs') || '[]');
    } catch (e) {
        favs = [];
    }

    if (favs.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; opacity: 0.7;">
                <h3>Список пуст</h3>
                <p>Вы еще ничего не добавили в закладки.</p>
            </div>
        `;
        countText.innerText = 'У вас пока нет сохраненных тайтлов';
        return;
    }

    countText.innerText = `Всего в закладках: ${favs.length}`;
    
    let htmlContent = '';
    favs.forEach(item => {
        htmlContent += `
            <div class="fav-item" onclick="location.href='watch.html?id=${item.id}'">
                <img src="${item.poster || 'Assets/Cyanime.jpg'}" alt="Постер" class="fav-poster-full" onerror="this.src='Assets/Cyanime.jpg';">
                
                <div class="fav-text-center">
                    <h3>${item.title || 'Неизвестное аниме'}</h3>
                    <p>${item.year || 'Год не указан'}</p>
                </div>

                <div class="fav-delete-zone" data-id="${item.id}" title="Удалить">
                    &times;
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = htmlContent;

    // Слушатели на красную зону удаления
    document.querySelectorAll('.fav-delete-zone').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Блокируем переход в плеер при клике на крестик
            const idToRemove = e.target.getAttribute('data-id');
            removeFromFavs(idToRemove);
        });
    });
}

function removeFromFavs(id) {
    try {
        let favs = JSON.parse(localStorage.getItem('cyanime_favs') || '[]');
        favs = favs.filter(item => item.id !== id);
        localStorage.setItem('cyanime_favs', JSON.stringify(favs));
        renderFavorites();
    } catch (e) {
        console.error("Ошибка при удалении:", e);
    }
}