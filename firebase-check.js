import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

window.toggleAuth = () => window.location.href = 'auth.html';

// Переключатель видимости меню
window.toggleUserMenu = () => {
    const menu = document.getElementById('user-dropdown');
    if (menu) menu.classList.toggle('show');
};

// Закрытие меню при клике вне его области
document.addEventListener('click', (e) => {
    const menu = document.getElementById('user-dropdown');
    const avatar = document.querySelector('.user-avatar');
    if (menu && !menu.contains(e.target) && e.target !== avatar) {
        menu.classList.remove('show');
    }
});

window.logout = function() {
    if(confirm("Выйти из аккаунта?")) {
        signOut(auth).then(() => location.reload());
    }
};

onAuthStateChanged(auth, (user) => {
    const authBlock = document.getElementById('auth-block');
    if (!authBlock) return; 

    if (user) {
        const photoURL = user.photoURL || "Assets/user-avatar.png";
        
        authBlock.innerHTML = `
            <div class="profile-wrapper">
                <img src="${photoURL}" class="user-avatar" onclick="toggleUserMenu()" 
                     onerror="this.src='https://ui-avatars.com/api/?name=${user.email}&background=00e5ff&color=fff'">
                
                <div id="user-dropdown" class="dropdown-menu">
                    <div class="dropdown-header">Настройки профиля</div>
                    <ul class="dropdown-list">
                        <li><a href="settings.html">⚙️ Настройки</a></li>
                        <li><a href="favorites.html">⭐ Избранные</a></li>
                        <li class="disabled">👥 Друзья (soon)</li>
                        <li class="divider"></li>
                        <li onclick="logout()" class="logout-btn">🚪 Выйти</li>
                    </ul>
                </div>
            </div>
        `;
    } else {
        authBlock.innerHTML = `
            <button class="auth-btn login-btn" onclick="toggleAuth()">
                <img src="Assets/login.png" alt="Войти" class="login-icon">
            </button>
        `;
    }
});