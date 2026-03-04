// firebase-check.js
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

const authBlock = document.getElementById('auth-block');

// Функция перехода на страницу входа
window.toggleAuth = function() {
    window.location.href = 'auth.html';
}

// Живая проверка состояния пользователя
onAuthStateChanged(auth, (user) => {
    if (!authBlock) return;

    if (user) {
        // Юзер вошел - показываем аватарку
        authBlock.innerHTML = `
            <img src="Assets/user-avatar.png" class="user-avatar" onclick="logout()" title="Выйти: ${user.email}">
        `;
    } else {
        // Юзер вышел - показываем замочек
        authBlock.innerHTML = `
            <button class="auth-btn login-btn" onclick="toggleAuth()" title="Войти">
                <img src="Assets/login.png" alt="Войти" class="login-icon">
            </button>
        `;
    }
});

window.logout = () => {
    signOut(auth).then(() => {
        location.reload(); // Перезагружаем страницу после выхода
    });
};