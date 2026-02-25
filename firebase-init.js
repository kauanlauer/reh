(function () {
    const firebaseConfig = {
        apiKey: "AIzaSyCM9tMvnRV-o7X66euCBKuLmuz-kIrClWY",
        authDomain: "renata-26079.firebaseapp.com",
        projectId: "renata-26079",
        storageBucket: "renata-26079.firebasestorage.app",
        messagingSenderId: "995787482442",
        appId: "1:995787482442:web:fdbca404a0e251cc278db3"
    };

    if (!window.firebase) {
        console.error('Firebase SDK nao carregado.');
        return;
    }

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    window.db = firebase.firestore();
    window.auth = firebase.auth();
    window.storage = typeof firebase.storage === 'function' ? firebase.storage() : null;
})();
