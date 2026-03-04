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

// Исправленная инициализация (чтобы не было дублей)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

window.currentAuthType = 'login';

// Делаем функцию доступной для HTML кнопок
window.switchAuth = (type) => {
    console.log("Переключение на:", type);
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

// 1. Форма (Email + Pass)
const authForm = document.getElementById('auth-form');
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-pass').value;
        
        try {
            if (window.currentAuthType === 'reg') {
                const res = await createUserWithEmailAndPassword(auth, email, pass);
                await setDoc(doc(db, "users", res.user.uid), { h: [], p: { theme: 'dark' } });
                alert('Аккаунт создан!');
            } else {
                await signInWithEmailAndPassword(auth, email, pass);
            }
            window.location.href = 'index.html';
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    });
}

// 2. Google Auth
const googleBtn = document.getElementById('google-auth');
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        console.log("Кнопка Google нажата");
        try {
            const result = await signInWithPopup(auth, provider);
            const userRef = doc(db, "users", result.user.uid);
            const snap = await getDoc(userRef);
            
            if (!snap.exists()) {
                await setDoc(userRef, { h: [], p: { theme: 'dark' } });
            }
            window.location.href = 'index.html';
        } catch (error) {
            console.error(error);
            alert('Ошибка Google: ' + error.message);
        }
    });
}