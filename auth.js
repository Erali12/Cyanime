// auth.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Конфиг (вставь свои данные, если импорт из firebase-config не работает)
const firebaseConfig = {
    apiKey: "AIzaSyArmd5exJXyzQUjmCorgYJ4Dp8ABoDL5H4",
    authDomain: "cyanime-b815d.firebaseapp.com",
    projectId: "cyanime-b815d",
    storageBucket: "cyanime-b815d.firebasestorage.app",
    messagingSenderId: "164002168918",
    appId: "1:164002168918:web:4a2ebb5295a996a41efbf7"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

window.currentAuthType = 'login';

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

// Почта + Пароль
document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;

    try {
        if (window.currentAuthType === 'reg') {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", userCredential.user.uid), { h: [], p: { theme: 'dark' } });
            alert('Регистрация успешна!');
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
        window.location.href = 'index.html';
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
});

// Google Кнопка (Исправлено)
document.getElementById('google-auth')?.addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, { h: [], p: { theme: 'dark' } });
        }
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Google Auth Error:", error);
        alert('Ошибка Google: ' + error.message);
    }
});