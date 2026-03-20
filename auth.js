import { supabase } from './supabase-config.js';

window.currentAuthType = 'login';

// Переключение вкладок (Вход / Регистрация)
window.switchAuth = (type) => {
    const loginTab = document.getElementById('login-tab');
    const regTab = document.getElementById('reg-tab');
    const submitBtn = document.getElementById('auth-submit');
    window.currentAuthType = type;
    
    if (type === 'login') {
        loginTab?.classList.add('active');
        regTab?.classList.remove('active');
        if (submitBtn) submitBtn.innerText = 'Поехали!';
    } else {
        regTab?.classList.add('active');
        loginTab?.classList.remove('active');
        if (submitBtn) submitBtn.innerText = 'Создать аккаунт';
    }
}

// Почта + Пароль (Supabase Auth)
document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-pass').value;

    try {
        if (window.currentAuthType === 'reg') {
            // Регистрация
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (error) throw error;

            if (data.user) {
                alert('Регистрация успешна! Проверьте почту для подтверждения.');
                // Автоматически создаем профиль в нашей таблице profiles
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([{ id: data.user.id, username: email.split('@')[0] }]);
                
                if (profileError) console.error("Ошибка профиля:", profileError);
            }
        } else {
            // Вход
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;
            window.location.href = 'index.html';
        }
    } catch (error) {
        alert('Ошибка: ' + error.message); [cite: 30]
    }
});

// Google Авторизация через Supabase
document.getElementById('google-auth')?.addEventListener('click', async () => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/index.html'
            }
        });
        if (error) throw error;
    } catch (error) {
        console.error("OAuth Error:", error);
        alert('Ошибка Google: ' + error.message);
    }
});