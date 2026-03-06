import { auth } from "./firebase-config.js";
import { onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }

    // Заполняем данные
    document.getElementById('settings-username').innerText = user.displayName || 'Пользователь CyAnime';
    document.getElementById('settings-email').innerText = user.email;
    document.getElementById('settings-avatar').src = user.photoURL || 'Assets/user-avatar.png';
    
    // Загружаем возраст из памяти
    const savedAge = localStorage.getItem(`age_${user.uid}`);
    if (savedAge) document.getElementById('settings-age').value = savedAge;

    // Проверяем способ входа (если пароль — показываем кнопку смены)
    const isPasswordUser = user.providerData.some(p => p.providerId === 'password');
    if (isPasswordUser) {
        document.getElementById('password-change-block').style.display = 'block';
    }
});

// Сохранение настроек
document.getElementById('save-settings').addEventListener('click', () => {
    const user = auth.currentUser;
    if (user) {
        const age = document.getElementById('settings-age').value;
        localStorage.setItem(`age_${user.uid}`, age);
        alert('Настройки сохранены в памяти браузера!');
    }
});

// Логика смены пароля
document.getElementById('btn-change-pass')?.addEventListener('click', () => {
    const newPass = prompt("Введите новый пароль:");
    if (newPass && newPass.length >= 6) {
        updatePassword(auth.currentUser, newPass)
            .then(() => alert("Пароль успешно изменен!"))
            .catch(err => alert("Ошибка: " + err.message));
    }
});