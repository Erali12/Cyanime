import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Инициализируем здесь
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

window.currentAuthType = 'login';

// Переключение вкладок Вход/Регистрация
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

// 1. Логика формы (Email + Pass)
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const type = window.currentAuthType;

    try {
        if (type === 'reg') {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            // Создаем чистый профиль. Используем ключ 'h' для истории
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

// 2. Логика Google (Защищенная)
const googleBtn = document.getElementById('google-auth');
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const userRef = doc(db, "users", user.uid);

            // 🔥 ПРОВЕРКА: Чтобы не затереть 'h' при повторном входе
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    h: [],
                    p: { theme: 'dark' }
                });
            } else {
                // Только обновляем настройки, историю не трогаем
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