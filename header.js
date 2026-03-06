// header.js - Полная и точная копия твоего старого хедера
(function() {
    const headerElement = document.getElementById('main-header');
    if (!headerElement) return;

    // Узнаем текущую страницу (например, 'ongoing', 'history', 'auth', 'player')
    const page = document.body.getAttribute('data-page');

    let headerHTML = `
        <div class="header-top-wrapper">
            <div class="header-content">
                <div class="header-top">
                    
                    <div class="header-left">
                        <a href="index.html" class="logo-section">
                            <img src="Assets/Cyanime.jpg" class="logo-img" alt="Logo">
                            <div class="logo-text">Cy<span>Anime</span></div>
                        </a>
                        ${page !== 'auth' ? `
                        <a href="history.html" class="btn-cyan eye-btn ${page === 'history' ? 'active' : ''}" title="Смотрю">
                            <img src="Assets/eye.png" alt="Смотрю" class="eye-icon">
                        </a>` : ''}
                    </div>

                    <div class="header-right">
                        <div class="user-section">
                            <div id="auth-block">
                                <button class="auth-btn login-btn" onclick="toggleAuth()" title="Войти">
                                <img src="Assets/login.png" alt="Войти" class="login-icon" onerror="this.parentElement.innerText='Вход'">
                            </button>
                        </div>
                            
                            ${page !== 'auth' ? `
                            <button class="icon-btn">
                                <img src="Assets/bell.png" class="header-icon" alt="Bell">
                            </button>` : ''}
                        </div>
                        
                        <div class="settings-section">
                            <button id="theme-btn" class="theme-toggle">
                                <img src="Assets/sun.png" class="sun-icon header-icon" alt="Sun">
                                <img src="Assets/Moon.png" class="moon-icon header-icon" alt="Moon" style="display:none;">
                            </button>
                            ${page !== 'auth' ? `
                            <button class="icon-btn">
                                <img src="Assets/settings.png" class="header-icon" alt="Settings">
                            </button>` : ''}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;

    // Нижняя часть (Поиск и табы) нужна не везде (на странице просмотра и авторизации ее нет)
    if (page !== 'player' && page !== 'auth') {
        headerHTML += `
        <div class="header-bottom-wrapper">
            <div class="header-content">
                <div class="header-bottom">
                    <div class="search-box">
                        <input type="text" placeholder="${page === 'history' ? 'Поиск в истории...' : 'Поиск аниме...'}" id="${page === 'history' ? 'search-history' : 'search-input'}">
                    </div>
                    <nav class="nav-tabs">
                        <a href="index.html?tab=ongoing" class="nav-link ${page === 'ongoing' ? 'active' : ''}" id="tab-ongoing">Смотрят сейчас</a>
                        <a href="index.html?tab=popular" class="nav-link ${page === 'popular' ? 'active' : ''}" id="tab-popular">Популярное</a>
                    </nav>
                </div>
            </div>
        </div>`;
    } else if (page === 'auth') {
        // На странице авторизации кнопка "назад"
        headerHTML += `
        <div class="header-bottom-wrapper">
            <div class="header-content">
                <div class="header-bottom">
                    <div class="search-box">
                        <a href="index.html" class="btn-cyan back-btn">← Назад на главную</a>
                    </div>
                </div>
            </div>
        </div>`;
    }

    // Вставляем HTML в страницу
    headerElement.innerHTML = headerHTML;
})();