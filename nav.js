// ==================== nav.js ====================
// Mesin Navigasi Halaman Kasir Pro

window.nav = {
    pages: ['transaksi', 'riwayat', 'stok', 'laporan', 'absen', 'setting'],

    init: () => {
        console.log("🛠️ nav.init dipanggil...");
        
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems.length === 0) {
            console.warn("⚠️ Tidak ada elemen .nav-item di HTML.");
            return;
        }

        navItems.forEach(btn => {
            // Hapus listener lama jika ada (mencegah double klik)
            btn.removeEventListener('click', nav.handleNavClick);
            btn.addEventListener('click', nav.handleNavClick);
        });

        console.log("✅ nav.init selesai: Event Listener terpasang.");
    },

    handleNavClick: (e) => {
        const btn = e.currentTarget;
        const page = btn.dataset.page;
        if (page) {
            console.log(`🖱️ Navigasi ke: ${page}`);
            nav.goto(page);
        }
    },

    goto: (page) => {
        if (state.page === page) {
            console.log(`ℹ️ Sudah di halaman ${page}, tidak perlu reload.`);
            return;
        }
        state.page = page;
        nav.load(page);
    },

    load: async (page) => {
        console.log(`⏳ Memulai load halaman: ${page}...`);
        
        if (!pages[page]) {
            console.error(`❌ Objek halaman "pages.${page}" tidak ditemukan! Pastikan file ${page}-render.js sudah di-import di HTML.`);
            utils.hideLoading();
            return;
        }

        utils.showLoading();

        // Feedback visual: fade out
        if (els.pageContent) {
            els.pageContent.style.opacity = '0';
        }

        // Beri jeda sedikit untuk transisi animasi
        setTimeout(async () => {
            try {
                console.log(`🎨 Menjalankan pages.${page}.render()...`);
                
                // EKSEKUSI RENDER HALAMAN
                await pages[page].render();
                
                // Feedback visual: fade in
                if (els.pageContent) {
                    els.pageContent.style.opacity = '1';
                }
                
                window.scrollTo(0, 0);
                console.log(`✅ Halaman ${page} berhasil dimuat.`);
            } catch (err) {
                console.error(`❌ Gagal Render Halaman "${page}":`, err);
                utils.showToast(`Error: ${err.message}`, 'error');
            } finally {
                // Jaminan loading hilang
                utils.hideLoading();
            }
        }, 200);
    }
};