// auth.js - Команда CyAnime (Система аккаунтов + Оптимизация "Самосвал")
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Инициализация
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

window.currentAuthType = 'login'; // По умолчанию

// Логика переключения Табов (Вход/Регистрация)
window.switchAuth = (type) => {
    const loginTab = document.getElementById('login-tab');
    const regTab = document.getElementById('reg-tab');
    const submitBtn = document.getElementById('auth-submit');
    
    window.currentAuthType = type;
    
    if (type === 'login') {
        loginTab.classList.add('active');
        regTab.classList.remove('active');
        submitBtn.innerText = 'Поехали!';
    } else {
        regTab.classList.add('active');
        loginTab.classList.remove('active');
        submitBtn.innerText = 'Создать аккаунт';
    }
}

// 1. Отправка формы (Email + Пароль)
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const type = window.currentAuthType;

    try {
        if (type === 'reg') {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            // 🔥 ОПТИМИЗАЦИЯ: Создаем профиль с короткими ключами
            await setDoc(doc(db, "users", userCredential.user.uid), {
                s: [], // Список аниме
                p: { theme: 'dark' } // Предпочтения
            });
            alert('Регистрация успешна!');
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
            alert('Вход выполнен!');
        }
        window.location.href = 'index.html';
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
});

// 2. Логика входа через Google
const googleBtn = document.getElementById('google-auth');
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Создаем/обновляем профиль в Firestore
            // Используем merge: true, чтобы не затереть существующие списки
            await setDoc(doc(db, "users", user.uid), {
                s: [], 
                p: { theme: 'dark' }
            }, { merge: true });

            alert(`Привет, ${user.displayName}!`);
            window.location.href = 'index.html';
        } catch (error) {
            alert('Ошибка Google: ' + error.message);
        }
    });
}