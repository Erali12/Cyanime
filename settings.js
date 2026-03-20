import { supabase } from "./supabase-config.js";

async function initSettings() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = 'auth.html';
        return;
    }

    // Заполняем данные (Supabase хранит инфу от Google в user_metadata)
    const displayName = user.user_metadata?.full_name || user.email.split('@')[0] || 'Пользователь CyAnime';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || 'Assets/user-avatar.png';

    document.getElementById('settings-username').innerText = displayName;
    document.getElementById('settings-email').innerText = user.email;
    document.getElementById('settings-avatar').src = avatarUrl;
    
    // Загружаем возраст из памяти
    const savedAge = localStorage.getItem(`age_${user.id}`);
    if (savedAge) document.getElementById('settings-age').value = savedAge;

    // Проверяем способ входа (если email — показываем кнопку смены)
    const isPasswordUser = user.app_metadata?.provider === 'email';
    if (isPasswordUser) {
        const changePassBlock = document.getElementById('password-change-block');
        if (changePassBlock) changePassBlock.style.display = 'block';
    }

    // Сохранение настроек (возраст)
    document.getElementById('save-settings')?.addEventListener('click', () => {
        const age = document.getElementById('settings-age').value;
        localStorage.setItem(`age_${user.id}`, age);
        alert('Настройки сохранены в памяти браузера!');
    });

    // Логика смены пароля Supabase
    document.getElementById('btn-change-pass')?.addEventListener('click', async () => {
        const newPass = prompt("Введите новый пароль (минимум 6 символов):");
        if (newPass && newPass.length >= 6) {
            const { error } = await supabase.auth.updateUser({ password: newPass });
            if (error) {
                alert("Ошибка: " + error.message);
            } else {
                alert("Пароль успешно изменен!");
            }
        } else if (newPass) {
            alert("Пароль слишком короткий.");
        }
    });

    // Добавляем кнопку выхода на всякий случай, если ты захочешь её добавить в HTML
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });
}

initSettings();