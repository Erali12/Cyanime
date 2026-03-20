import { supabase } from './supabase-config.js';

window.currentAuthType = 'login';

// Переключение вкладок
window.switchAuth = (type) => {
    const loginTab = document.getElementById('login-tab');
    const regTab = document.getElementById('reg-tab');
    const submitBtn = document.getElementById('auth-submit');
    const passInput = document.getElementById('auth-pass'); // Находим поле пароля
    
    window.currentAuthType = type;
    
    if (type === 'login') {
        loginTab?.classList.add('active');
        regTab?.classList.remove('active');
        if (submitBtn) submitBtn.innerText = 'Поехали!';
        
        // Для входа: предлагать автозаполнение сохраненного пароля
        passInput?.setAttribute('autocomplete', 'current-password');
    } else {
        regTab?.classList.add('active');
        loginTab?.classList.remove('active');
        if (submitBtn) submitBtn.innerText = 'Создать аккаунт';
        
        // Для регистрации: предлагать генерацию НОВОГО пароля
        passInput?.setAttribute('autocomplete', 'new-password');
    }
}

// Почта + Пароль
document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-pass').value;

    try {
        if (window.currentAuthType === 'reg') {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (error) throw error;

            if (data.user) {
                alert('Регистрация успешна! Если подтверждение включено, проверьте почту.');
                await supabase.from('profiles').insert([
                    { id: data.user.id, username: email.split('@')[0], avatar_url: '' }
                ]);
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;
            window.location.href = 'index.html';
        }
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
});

// Google Авторизация
document.getElementById('google-auth')?.addEventListener('click', async () => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/index.html',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            }
        });
        if (error) throw error;
    } catch (error) {
        console.error("OAuth Error:", error);
        alert('Ошибка Google: ' + error.message);
    }
});