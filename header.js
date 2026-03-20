import { supabase } from './supabase-config.js';

(async function() {
    const headerElement = document.getElementById('main-header');
    if (!headerElement) return;

    const page = document.body.getAttribute('data-page');

    // --- 1. Функции управления меню ---
    window.toggleNotifyMenu = (e) => {
        if (e) e.stopPropagation();
        const notifyMenu = document.getElementById('notify-dropdown');
        const profileMenu = document.getElementById('user-dropdown');
        
        profileMenu?.classList.remove('show'); // Закрываем профиль
        notifyMenu?.classList.toggle('show');
    };

    window.toggleUserMenu = (e) => {
        if (e) e.stopPropagation();
        const notifyMenu = document.getElementById('notify-dropdown');
        const profileMenu = document.getElementById('user-dropdown');

        notifyMenu?.classList.remove('show'); // Закрываем уведомления
        profileMenu?.classList.toggle('show');
    };

    window.closeAllMenus = () => {
        document.getElementById('notify-dropdown')?.classList.remove('show');
        document.getElementById('user-dropdown')?.classList.remove('show');
    };

    window.handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    };

    // Закрытие при клике в любое место экрана
    document.addEventListener('click', (e) => {
        const isButton = e.target.closest('.icon-btn') || e.target.closest('.auth-btn');
        const isMenu = e.target.closest('.dropdown-menu');
        if (!isButton && !isMenu) {
            window.closeAllMenus();
        }
    });

    // --- 2. Сборка HTML ---
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
                            <div id="auth-block" class="auth-container" style="position: relative;">
                                <button class="auth-btn login-btn" onclick="window.location.href='auth.html'">
                                    <img src="Assets/login.png" alt="Войти" class="login-icon">
                                </button>
                                </div>

                            ${page !== 'auth' ? `
                            <div class="notification-container" style="position: relative;">
                                <button class="icon-btn" onclick="window.toggleNotifyMenu(event)">
                                    <img src="Assets/bell.png" class="header-icon" alt="Bell">
                                </button>
                                
                                <div id="notify-dropdown" class="dropdown-menu">
                                    <div class="dropdown-header">Уведомления</div>
                                    <div class="notify-content" style="padding: 20px; text-align: center; opacity: 0.6; font-size: 14px;">
                                        У вас нет новых уведомлений
                                    </div>
                                </div>
                            </div>` : ''}
                        </div>
                        
                        <div class="settings-section">
                            <button id="theme-btn" class="theme-toggle">
                                <img src="Assets/sun.png" class="sun-icon header-icon" alt="Sun">
                                <img src="Assets/Moon.png" class="moon-icon header-icon" alt="Moon" style="display:none;">
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Нижняя часть (поиск/табы)
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
        headerHTML += `
        <div class="header-bottom-wrapper">
            <div class="header-content">
                <div class="header-bottom">
                    <div class="search-box">
                        <a href="index.html" class="btn-cyan back-btn" style="text-decoration:none;">← Назад на главную</a>
                    </div>
                </div>
            </div>
        </div>`;
    }

    headerElement.innerHTML = headerHTML;

    // --- 3. Проверка авторизации и замена кнопки на выпадающее меню ---
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const authBlock = document.getElementById('auth-block');
        if (authBlock) {
            const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || 'Assets/user-avatar.png';
            
            authBlock.innerHTML = `
                <button class="icon-btn" onclick="window.toggleUserMenu(event)" style="padding: 0; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer;">
                    <img src="${avatarUrl}" alt="Профиль" class="header-icon" style="border-radius:50%; width:32px; height:32px; min-width:32px; flex-shrink:0; object-fit:cover; border: 2px solid var(--accent-color);">
                </button>
                
                <div id="user-dropdown" class="dropdown-menu">
                    <div class="dropdown-header">Профиль</div>
                    <div class="dropdown-content">
                        <a href="settings.html" class="dropdown-item">
                            <img src="Assets/settings.png" alt="Settings" style="width:18px;"> Настройки
                        </a>
                        <a href="favourite.html" class="dropdown-item">
                            <img src="Assets/favourite.png" alt="Favs" style="width:18px;"> Избранные
                        </a>
                        <div class="dropdown-divider"></div>
                        <button onclick="window.handleLogout()" class="dropdown-logout">Выйти</button>
                    </div>
                </div>
            `;
        }
    }

    // --- 4. Логика темы ---
    const themeBtn = document.getElementById('theme-btn');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');

    function updateIcons(theme) {
        if (!sunIcon || !moonIcon) return;
        sunIcon.style.display = (theme === 'dark') ? 'none' : 'block';
        moonIcon.style.display = (theme === 'dark') ? 'block' : 'none';
    }

    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateIcons(savedTheme);

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateIcons(newTheme);
        });
    }
})();