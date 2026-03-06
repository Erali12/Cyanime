// firebase-check.js
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

// Глобальная функция для кнопки входа (вызывается из HTML хедера)
window.toggleAuth = function() {
    window.location.href = 'auth.html';
};

// Глобальная функция для выхода
window.logout = function() {
    if(confirm("Выйти из аккаунта?")) {
        signOut(auth).then(() => {
            location.reload();
        }).catch((error) => {
            console.error("Ошибка при выходе:", error);
        });
    }
};

// Проверка состояния
onAuthStateChanged(auth, (user) => {
    const authBlock = document.getElementById('auth-block');
    
    // Если скрипт сработал быстрее, чем создался хедер (хотя теперь это маловероятно)
    if (!authBlock) return; 

    if (user) {
        // Юзер авторизован - рисуем аватар
        const photoURL = user.photoURL || "Assets/user-avatar.png";
        
        authBlock.innerHTML = `
            <img src="${photoURL}" class="user-avatar" 
                 onclick="logout()" 
                 title="Выйти: ${user.email}" 
                 onerror="this.src='https://ui-avatars.com/api/?name=${user.email}&background=00e5ff&color=fff'"
                 style="cursor:pointer; width:36px; height:36px; border-radius:50%; border: 2px solid #00e5ff;">
        `;
    } else {
        // Гость - рисуем кнопку входа в точности как было у тебя
        authBlock.innerHTML = `
            <button class="auth-btn login-btn" onclick="toggleAuth()" title="Войти">
                <img src="Assets/login.png" alt="Войти" class="login-icon" onerror="this.style.display='none'; this.parentElement.innerText='Вход';">
            </button>
        `;
    }
});