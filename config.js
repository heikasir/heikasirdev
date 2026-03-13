// ==================== config.js ====================
// Konfigurasi Firebase Kasir Pro

const firebaseConfig = {
    apiKey: "AIzaSyBkoz3onX4IRWium_QUjq-Nf-pnNsiMRU8",
    authDomain: "heikasir.firebaseapp.com",
    projectId: "heikasir",
    storageBucket: "heikasir.firebasestorage.app",
    messagingSenderId: "246718427847",
    appId: "1:246718427847:web:4912ff8280132f71c344e2"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);

// Ekspor auth dan db ke global window
window.auth = firebase.auth();
window.db = firebase.firestore();

// Aktifkan Offline Persistence dengan Safe-Handling
// Ini sering jadi penyebab BLANK jika ada 2 tab terbuka (database terkunci)
db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
        console.log("✅ Firestore Persistence Aktif");
    })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            // Biasanya terjadi karena aplikasi dibuka di banyak tab sekaligus
            console.warn("⚠️ Persistence Gagal: Banyak tab terbuka. Aplikasi tetap berjalan mode online.");
        } else if (err.code == 'unimplemented') {
            // Browser tidak mendukung (misal: mode incognito tertentu)
            console.warn("⚠️ Persistence Gagal: Browser tidak mendukung mode offline.");
        } else {
            console.error("❌ Error Persistence:", err);
        }
    });