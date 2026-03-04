// auth.js - Команда CyAnime (Исправленная версия)
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// 1. Инициализация (Безопасная, чтобы не было дублей)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

window.currentAuthType = 'login';

// 2. ОЖИВЛЯЕМ КНОПКИ ТАБОВ (Привязываем к глобальному окну)
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

// 3. Логика формы (Email + Pass)
const authForm = document.getElementById('auth-form');
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-pass').value;

        try {
            if (window.currentAuthType === 'reg') {
                const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    h: [], 
                    p: { theme: 'dark' }
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
}

// 4. Логика Google (Твоя старая проверенная версия)
const googleBtn = document.getElementById('google-auth');
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const userRef = doc(db, "users", user.uid);

            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    h: [],
                    p: { theme: 'dark' }
                });
            } else {
                await setDoc(userRef, {
                    p: { theme: 'dark' }
                }, { merge: true });
            }

            alert(`Привет, ${user.displayName}!`);
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Ошибка Google Auth:", error);
            alert('Ошибка Google: ' + error.message);
        }
    });
}